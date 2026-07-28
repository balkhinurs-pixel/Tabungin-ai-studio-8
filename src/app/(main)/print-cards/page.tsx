'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Download, 
  Loader2, 
  Upload, 
  Palette, 
  Layout, 
  Search, 
  CheckSquare, 
  Square, 
  UserCheck, 
  Users,
  X,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Student, Profile } from '@/types';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';

// Helper function to fetch image as base64
const getImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            const reader = new FileReader();
            reader.onloadend = function () {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject('Failed to convert blob to base64');
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = reject;
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    });
};

const CARD_COLORS = [
    { name: 'Biru Tabungin', value: '#3B82F6' },
    { name: 'Emerald Green', value: '#10B981' },
    { name: 'Midnight Purple', value: '#6366F1' },
    { name: 'Deep Rose', value: '#E11D48' },
    { name: 'Sunset Orange', value: '#F59E0B' },
    { name: 'Dark Slate', value: '#1E293B' },
];

export default function PrintCardsPage() {
  const supabase = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Customization States
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [cardTemplate, setCardTemplate] = useState('standard');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast({ title: 'Anda tidak login', variant: 'destructive'});
            setLoading(false);
            return;
        }

        const [
            { data: studentsData, error: studentsError },
            { data: profileData, error: profileError }
        ] = await Promise.all([
             supabase.from('students').select('id, nis, name, class').order('name', { ascending: true }),
             supabase.from('profiles').select('*').eq('id', user.id).single()
        ]);
       
        if (studentsError || profileError) {
            toast({
                title: 'Gagal memuat data',
                description: studentsError?.message || profileError?.message,
                variant: 'destructive'
            });
        } else {
            setStudents(studentsData as Student[] || []);
            setProfile(profileData as Profile);
        }
        setLoading(false);
    };
    fetchData();
  }, [toast, supabase]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.nis.includes(searchTerm)
    );
  }, [students, searchTerm]);

  const handleToggleStudent = (id: string) => {
    setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
        setSelectedIds([]);
    } else {
        setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCustomLogo(reader.result as string);
            toast({ title: "Logo Berhasil Diunggah", description: "Logo akan muncul di preview kartu." });
        };
        reader.readAsDataURL(file);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [59, 130, 246];
  };

  const drawCard = async (doc: jsPDF, x: number, y: number, student: { nis: string, name: string, class: string }, schoolCode: string) => {
    const cardWidth = 85.6;
    const cardHeight = 53.98;
    const qrData = `${student.nis},${schoolCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    const [r, g, b] = hexToRgb(accentColor);
    
    let logoBase64 = customLogo;
    let qrBase64: string | null = null;

    try {
        if (!logoBase64) {
            logoBase64 = await getImageAsBase64('https://picsum.photos/seed/logoschool/200/200');
        }
        qrBase64 = await getImageAsBase64(qrUrl);
    } catch (error) {
        console.error("Failed to fetch images for PDF:", error);
        return;
    }

    // Background & Borders
    doc.setDrawColor(224, 224, 224);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);
    
    if (cardTemplate === 'modern') {
        doc.setFillColor(r, g, b);
        doc.rect(x, y, 5, cardHeight, 'F');
    } else if (cardTemplate === 'elegant') {
        doc.setFillColor(r, g, b);
        doc.rect(x, y, cardWidth, 12, 'F');
    }

    // Logo
    if (logoBase64) {
        const logoY = cardTemplate === 'elegant' ? y + 2 : y + 5;
        doc.addImage(logoBase64, 'PNG', x + cardWidth - 15, logoY, 10, 10);
    }

    // Header Text
    doc.setFont('helvetica', 'bold');
    if (cardTemplate === 'elegant') {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('KARTU TABUNGAN SISWA', x + 5, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(profile?.school_name || 'Sekolah Anda', x + 5, y + 8);
    } else {
        doc.setTextColor(r, g, b);
        doc.setFontSize(8);
        doc.text('KARTU TABUNGAN SISWA', x + (cardTemplate === 'modern' ? 10 : 5), y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(6);
        doc.text(profile?.school_name || 'Sekolah Anda', x + (cardTemplate === 'modern' ? 10 : 5), y + 10);
    }
  
    // QR Code
    if (qrBase64) {
        doc.addImage(qrBase64, 'PNG', x + (cardTemplate === 'modern' ? 10 : 5), y + 15, 22, 22);
    }
    
    // Student Info
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(student.name, x + 35, y + 24);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.text(`NIS: ${student.nis}`, x + 35, y + 30);
    doc.text(`Kelas: ${student.class}`, x + 35, y + 34);
    doc.text(`Kode: ${schoolCode}`, x + 35, y + 38);
  
    // Footer
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text('Gunakan kartu ini untuk transaksi & login', x + cardWidth / 2, y + cardHeight - 4, { align: 'center' });
  };
  
  const handlePrintSelected = async () => {
    if (selectedIds.length === 0 || !profile?.school_code) return;
    setIsGenerating(true);
    toast({ title: "Memproses Kartu...", description: `Membuat file PDF untuk ${selectedIds.length} siswa.` });

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const cardWidth = 85.6;
    const cardHeight = 53.98;
    const marginX = 10;
    const marginY = 15;
    const cardsPerRow = 2;
    const cardsPerCol = 5;
    const cardsPerPage = cardsPerRow * cardsPerCol;

    const studentsToPrint = students.filter(s => selectedIds.includes(s.id));

    for (let index = 0; index < studentsToPrint.length; index++) {
        const student = studentsToPrint[index];
        if (index > 0 && index % cardsPerPage === 0) {
            doc.addPage();
        }

        const i = index % cardsPerPage;
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;

        const x = marginX + col * (cardWidth + 10);
        const y = marginY + row * (cardHeight + 5);

        await drawCard(doc, x, y, student, profile.school_code);
    }

    doc.save(`kartu-tabungan-pilihan-${new Date().getTime()}.pdf`);
    setIsGenerating(false);
  };

  const previewStudent = selectedIds.length > 0 
    ? students.find(s => s.id === selectedIds[0]) 
    : students[0];

  const qrPreviewUrl = previewStudent && profile?.school_code 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${previewStudent.nis},${profile.school_code}`)}` 
    : '';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full">
            <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
            </Link>
            </Button>
            <div>
                <h2 className="text-xl font-bold tracking-tight">Cetak Kartu Siswa</h2>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Kustomisasi & Manajemen Kartu</p>
            </div>
        </div>
        {selectedIds.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 h-8 px-4 rounded-full font-black animate-in fade-in zoom-in">
                {selectedIds.length} SISWA TERPILIH
            </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                        <Palette className="h-4 w-4 text-primary" /> Desain Kartu
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Template Gaya</Label>
                        <Select value={cardTemplate} onValueChange={setCardTemplate}>
                            <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-100">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">Standar (Klasik)</SelectItem>
                                <SelectItem value="modern">Modern (Sidebar)</SelectItem>
                                <SelectItem value="elegant">Elegan (Header)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Warna Aksen</Label>
                        <div className="grid grid-cols-6 gap-2">
                            {CARD_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => setAccentColor(color.value)}
                                    className={cn(
                                        "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                                        accentColor === color.value ? "border-primary scale-110 shadow-md ring-2 ring-primary/20" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logo Instansi</Label>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-primary/5 hover:border-primary transition-all" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Ganti Logo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Button 
                className="w-full h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-base font-black shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                onClick={handlePrintSelected}
                disabled={isGenerating || selectedIds.length === 0}
            >
                {isGenerating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> MENYIAPKAN PDF...</>
                ) : (
                    <><Printer className="mr-2 h-5 w-5" /> CETAK {selectedIds.length} KARTU PILIHAN</>
                )}
            </Button>
        </div>

        {/* Selection & Search Panel */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" /> Pilih Siswa
                        </CardTitle>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] font-black uppercase tracking-widest text-primary h-8"
                            onClick={handleSelectAll}
                        >
                            {selectedIds.length === filteredStudents.length ? 'Hapus Semua' : 'Pilih Semua'}
                        </Button>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Cari nama atau NIS..." 
                            className="pl-10 h-10 bg-white rounded-xl border-gray-100"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-[400px]">
                        <div className="p-2 space-y-1">
                            {loading ? (
                                <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-20" /></div>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map((student) => {
                                    const isSelected = selectedIds.includes(student.id);
                                    return (
                                        <div 
                                            key={student.id}
                                            onClick={() => handleToggleStudent(student.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border",
                                                isSelected ? "bg-primary/5 border-primary/20" : "bg-transparent border-transparent hover:bg-gray-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-5 w-5 rounded-md flex items-center justify-center border-2 transition-all",
                                                isSelected ? "bg-primary border-primary text-white" : "border-gray-200"
                                            )}>
                                                {isSelected && <CheckSquare className="h-4 w-4" />}
                                            </div>
                                            <div className="flex flex-col flex-1 truncate">
                                                <p className={cn("text-sm font-bold truncate", isSelected ? "text-primary" : "text-gray-700")}>{student.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-medium text-muted-foreground">{student.nis}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                                                    <span className="text-[10px] font-black uppercase text-muted-foreground">{student.class}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="p-10 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-30">
                                    Siswa tidak ditemukan
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-4">
            <div className="sticky top-24">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-bold flex items-center gap-2 text-muted-foreground uppercase text-[10px] tracking-[0.2em]">
                        <Layout className="h-3 w-3" /> Live Preview
                    </h3>
                    <div className="h-px flex-1 bg-gray-100 mx-4" />
                </div>

                <div className="flex justify-center">
                    <div 
                        className="relative w-full max-w-[360px] aspect-[1.586/1] rounded-2xl shadow-2xl overflow-hidden bg-white border border-gray-100 transition-all duration-500 scale-95"
                        style={{ boxShadow: `0 20px 50px -12px ${accentColor}44` }}
                    >
                        {/* Template Elements */}
                        {cardTemplate === 'modern' && <div className="absolute left-0 top-0 bottom-0 w-4" style={{ backgroundColor: accentColor }} />}
                        {cardTemplate === 'elegant' && <div className="absolute top-0 left-0 right-0 h-16" style={{ backgroundColor: accentColor }} />}

                        <div className={`h-full flex flex-col p-6 relative z-10 ${cardTemplate === 'elegant' ? 'text-white' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`font-black text-[10px] tracking-tighter ${cardTemplate === 'elegant' ? 'text-white' : ''}`} style={{ color: cardTemplate === 'elegant' ? 'white' : accentColor }}>
                                        KARTU TABUNGAN SISWA
                                    </p>
                                    <p className={`text-[8px] font-medium opacity-80 ${cardTemplate === 'elegant' ? 'text-white/80' : 'text-gray-500'}`}>
                                        {profile?.school_name || 'Nama Sekolah Anda'}
                                    </p>
                                </div>
                                <div className="h-8 w-8 relative bg-white rounded-full p-1 shadow-sm border border-gray-50">
                                    <Image 
                                        src={customLogo || 'https://picsum.photos/seed/logoschool/100/100'} 
                                        alt="Logo" 
                                        fill 
                                        className="object-contain rounded-full" 
                                    />
                                </div>
                            </div>

                            <div className={`mt-6 flex gap-4 items-center ${cardTemplate === 'elegant' ? 'mt-10 text-gray-900' : ''}`}>
                                <div className="bg-white p-1.5 rounded-lg shadow-md border border-gray-100 flex-shrink-0">
                                    {qrPreviewUrl ? (
                                        <Image src={qrPreviewUrl} width={65} height={65} alt="QR" className="rounded-sm" />
                                    ) : (
                                        <div className="w-[65px] h-[65px] bg-gray-100 animate-pulse rounded-sm" />
                                    )}
                                </div>
                                <div className={`flex flex-col gap-0.5 ${cardTemplate === 'elegant' ? 'translate-y-2' : ''}`}>
                                    <p className="font-bold text-sm tracking-tight text-gray-900 leading-tight truncate max-w-[150px]">
                                        {previewStudent?.name || 'Nama Lengkap Siswa'}
                                    </p>
                                    <div className="space-y-0.5 mt-1">
                                        <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest">NIS: <span className="text-gray-800">{previewStudent?.nis || '000000'}</span></p>
                                        <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest">KELAS: <span className="text-gray-800">{previewStudent?.class || 'X-A'}</span></p>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-auto text-[7px] text-center font-black text-gray-400 uppercase tracking-[0.2em] opacity-40">
                                Digital Banking Solution
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <UserCheck className="h-5 w-5 text-blue-500 shrink-0" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        Anda akan mencetak <strong>{selectedIds.length} kartu</strong>. Hasil cetak akan disusun secara rapi di kertas A4 (10 kartu per halaman).
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
