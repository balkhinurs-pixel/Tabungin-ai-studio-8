'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
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
  Printer,
  Sparkles,
  Layers,
  Settings2,
  Columns,
  RotateCw,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Student, Profile } from '@/types';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { SantriCardPreview, SantriCardData } from '@/components/cards/SantriCardPreview';
import { renderFrontCardToCanvas, renderBackCardToCanvas } from '@/lib/card-renderer';

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
    { name: 'Emerald Gold (Ribath)', value: '#064e3b' },
    { name: 'Biru Tabungin', value: '#3B82F6' },
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
  const [cardTemplate, setCardTemplate] = useState('santri-ribath'); // Default to new Ribath template
  const [previewSide, setPreviewSide] = useState<'both' | 'front' | 'back'>('both');
  const [printMode, setPrintMode] = useState<'duplex' | 'side-by-side' | 'front-only' | 'back-only'>('duplex');
  const [accentColor, setAccentColor] = useState('#064e3b');
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  // Template Typography & Identity overrides
  const [schoolType, setSchoolType] = useState('PONDOK PESANTREN');
  const [schoolName, setSchoolName] = useState('RIBATH NURUL HIDAYAH 2');
  const [schoolLocation, setSchoolLocation] = useState('PANGKAH - TEGAL');
  const [schoolMotto, setSchoolMotto] = useState('Berilmu | Berakhlak | Berdaya | Untuk Umat');
  const [cardQuote, setCardQuote] = useState('Menuntut ilmu adalah jalan menuju ridha Allah');
  
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
             supabase.from('students').select('id, nis, name, class, avatar_url').order('name', { ascending: true }),
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
            const prof = profileData as Profile;
            setProfile(prof);
            if (prof?.school_name) {
              setSchoolName(prof.school_name);
            }
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
            toast({ title: "Logo Berhasil Diunggah", description: "Logo akan muncul di kartu santri." });
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
    ] : [6, 78, 59];
  };

  // Draw legacy horizontal card
  const drawLegacyCard = async (
    doc: jsPDF, 
    x: number, 
    y: number, 
    student: { nis: string; name: string; class: string; avatar_url?: string | null }, 
    schoolCode: string
  ) => {
    const cardWidth = 85.6;
    const cardHeight = 53.98;
    const qrData = `${student.nis},${schoolCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    const [r, g, b] = hexToRgb(accentColor);
    
    let logoBase64 = customLogo;
    let qrBase64: string | null = null;
    let avatarBase64: string | null = null;

    try {
        if (!logoBase64) {
            logoBase64 = await getImageAsBase64('/logo-icon.png');
        }
        qrBase64 = await getImageAsBase64(qrUrl);
        if (student.avatar_url) {
            try {
                avatarBase64 = await getImageAsBase64(student.avatar_url);
            } catch (err) {
                console.warn("Could not fetch avatar for PDF:", err);
            }
        }
    } catch (error) {
        console.error("Failed to fetch images for PDF:", error);
    }

    doc.setDrawColor(224, 224, 224);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);
    
    if (cardTemplate === 'modern') {
        doc.setFillColor(r, g, b);
        doc.rect(x, y, 5, cardHeight, 'F');
    } else if (cardTemplate === 'elegant') {
        doc.setFillColor(r, g, b);
        doc.rect(x, y, cardWidth, 12, 'F');
    }

    if (logoBase64) {
        const logoY = cardTemplate === 'elegant' ? y + 2 : y + 5;
        try {
          doc.addImage(logoBase64, 'PNG', x + cardWidth - 15, logoY, 10, 10);
        } catch {}
    }

    doc.setFont('helvetica', 'bold');
    if (cardTemplate === 'elegant') {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('KARTU TABUNGAN SISWA', x + 5, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(schoolName, x + 5, y + 8);
    } else {
        doc.setTextColor(r, g, b);
        doc.setFontSize(8);
        doc.text('KARTU TABUNGAN SISWA', x + (cardTemplate === 'modern' ? 10 : 5), y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(6);
        doc.text(schoolName, x + (cardTemplate === 'modern' ? 10 : 5), y + 10);
    }
  
    if (avatarBase64) {
        const photoX = x + (cardTemplate === 'modern' ? 9 : 5);
        const photoY = y + (cardTemplate === 'elegant' ? 15 : 14);
        const photoW = 16;
        const photoH = 20;

        doc.setDrawColor(210, 210, 210);
        doc.roundedRect(photoX, photoY, photoW, photoH, 1, 1);
        try {
            doc.addImage(avatarBase64, 'JPEG', photoX, photoY, photoW, photoH);
        } catch {
            try {
                doc.addImage(avatarBase64, 'PNG', photoX, photoY, photoW, photoH);
            } catch {}
        }

        const textX = photoX + photoW + 3;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(student.name, textX, photoY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(7);
        doc.text(`NIS: ${student.nis}`, textX, photoY + 10);
        doc.text(`Kelas: ${student.class}`, textX, photoY + 14);
        doc.text(`Kode: ${schoolCode}`, textX, photoY + 18);

        if (qrBase64) {
            const qrSize = 19;
            const qrX = x + cardWidth - qrSize - 4;
            const qrY = photoY + 0.5;
            doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize);
        }
    } else {
        if (qrBase64) {
            doc.addImage(qrBase64, 'PNG', x + (cardTemplate === 'modern' ? 10 : 5), y + 15, 22, 22);
        }
        
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
    }
  
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text('Gunakan kartu ini untuk transaksi & login', x + cardWidth / 2, y + cardHeight - 4, { align: 'center' });
  };

  // High-Resolution Print Handler for Santri Ribath (Front & Back)
  const handlePrintSelected = async () => {
    if (selectedIds.length === 0 || !profile?.school_code) return;
    setIsGenerating(true);
    toast({ 
      title: "Memproses Kartu Santri...", 
      description: `Menyiapkan cetak PDF 300 DPI untuk ${selectedIds.length} santri.` 
    });

    try {
      const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4'
      });

      const studentsToPrint = students.filter(s => selectedIds.includes(s.id));
      const schoolCode = profile.school_code;

      if (cardTemplate === 'santri-ribath') {
        // Vertical Portrait Cards (54mm x 85.6mm standard CR80 ISO format)
        const cardW = 54;
        const cardH = 85.6;
        const marginX = 15;
        const marginY = 12;
        const gapX = 8;
        const gapY = 8;
        const cols = 3;
        const rows = 3;
        const cardsPerPage = cols * rows; // 9 cards per page

        const config = {
          schoolCode,
          frontBgUrl: '/Assets/Kartu-depan.webp',
          backBgUrl: '/Assets/Kartublakang.webp',
        };

        if (printMode === 'side-by-side') {
          // 4 students per page, each with [Front | Back] paired
          const pairCols = 2;
          const pairRows = 3;
          const pairsPerPage = pairCols * pairRows;

          for (let index = 0; index < studentsToPrint.length; index++) {
            const student = studentsToPrint[index];
            if (index > 0 && index % 3 === 0) {
              doc.addPage();
            }

            const rowIdx = index % 3;
            const yPos = marginY + rowIdx * (cardH + 8);

            // Front card
            const frontCanvas = await renderFrontCardToCanvas(student, config);
            const frontDataUrl = frontCanvas.toDataURL('image/jpeg', 0.95);
            doc.addImage(frontDataUrl, 'JPEG', marginX + 15, yPos, cardW, cardH);

            // Back card right next to it
            const backCanvas = await renderBackCardToCanvas(student, config);
            const backDataUrl = backCanvas.toDataURL('image/jpeg', 0.95);
            doc.addImage(backDataUrl, 'JPEG', marginX + 15 + cardW + 8, yPos, cardW, cardH);

            // Cut / fold line between them
            doc.setDrawColor(200, 200, 200);
            doc.setLineDashPattern([2, 2], 0);
            doc.line(marginX + 15 + cardW + 4, yPos, marginX + 15 + cardW + 4, yPos + cardH);
            doc.setLineDashPattern([], 0);
          }
        } else if (printMode === 'duplex') {
          // Duplex printing: Page 1 Front cards, Page 2 Back cards (mirrored columns for double-sided print)
          for (let chunkIdx = 0; chunkIdx < studentsToPrint.length; chunkIdx += cardsPerPage) {
            const batch = studentsToPrint.slice(chunkIdx, chunkIdx + cardsPerPage);
            
            if (chunkIdx > 0) doc.addPage();

            // Page: Sisi Depan (Front)
            for (let i = 0; i < batch.length; i++) {
              const student = batch[i];
              const col = i % cols;
              const row = Math.floor(i / cols);
              const x = marginX + col * (cardW + gapX);
              const y = marginY + row * (cardH + gapY);

              const frontCanvas = await renderFrontCardToCanvas(student, config);
              doc.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, cardW, cardH);
            }

            // Next Page: Sisi Belakang (Back) - columns mirrored for accurate duplex alignment
            doc.addPage();
            for (let i = 0; i < batch.length; i++) {
              const student = batch[i];
              const col = i % cols;
              const mirroredCol = (cols - 1) - col; // Mirror column for back-to-back print!
              const row = Math.floor(i / cols);
              const x = marginX + mirroredCol * (cardW + gapX);
              const y = marginY + row * (cardH + gapY);

              const backCanvas = await renderBackCardToCanvas(student, config);
              doc.addImage(backCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, cardW, cardH);
            }
          }
        } else if (printMode === 'front-only') {
          // Only Front
          for (let index = 0; index < studentsToPrint.length; index++) {
            const student = studentsToPrint[index];
            if (index > 0 && index % cardsPerPage === 0) {
              doc.addPage();
            }
            const i = index % cardsPerPage;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = marginX + col * (cardW + gapX);
            const y = marginY + row * (cardH + gapY);

            const frontCanvas = await renderFrontCardToCanvas(student, config);
            doc.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, cardW, cardH);
          }
        } else if (printMode === 'back-only') {
          // Only Back
          for (let index = 0; index < studentsToPrint.length; index++) {
            const student = studentsToPrint[index];
            if (index > 0 && index % cardsPerPage === 0) {
              doc.addPage();
            }
            const i = index % cardsPerPage;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = marginX + col * (cardW + gapX);
            const y = marginY + row * (cardH + gapY);

            const backCanvas = await renderBackCardToCanvas(student, config);
            doc.addImage(backCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, cardW, cardH);
          }
        }

        doc.save(`kartu-santri-rnh-${new Date().getTime()}.pdf`);
      } else {
        // Legacy templates (classic horizontal)
        const cardWidth = 85.6;
        const cardHeight = 53.98;
        const marginX = 10;
        const marginY = 15;
        const cardsPerRow = 2;
        const cardsPerCol = 5;
        const cardsPerPage = cardsPerRow * cardsPerCol;

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

            await drawLegacyCard(doc, x, y, student, profile.school_code);
        }

        doc.save(`kartu-tabungan-pilihan-${new Date().getTime()}.pdf`);
      }

      toast({
        title: "PDF Berhasil Dibuat!",
        description: `Berhasil mengunduh dokumen kartu untuk ${selectedIds.length} santri.`
      });
    } catch (error: any) {
      console.error("Print Error:", error);
      toast({
        title: "Gagal Mencetak",
        description: error?.message || "Terjadi kesalahan saat membuat file PDF.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const previewStudent = selectedIds.length > 0 
    ? students.find(s => s.id === selectedIds[0]) 
    : students[0];

  const qrPreviewUrl = previewStudent && profile?.school_code 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${previewStudent.nis},${profile.school_code}`)}` 
    : '';

  const santriCardData: SantriCardData = {
    name: previewStudent?.name || 'M. SYAHRUL RIDHO',
    nis: previewStudent?.nis || '12345678',
    className: previewStudent?.class || 'XII MIPA 1',
    avatarUrl: previewStudent?.avatar_url,
    qrUrl: qrPreviewUrl,
    frontBgUrl: '/Assets/Kartu-depan.webp',
    backBgUrl: '/Assets/Kartublakang.webp',
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-full h-11 w-11 border-gray-200 hover:bg-gray-50">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Cetak Kartu Siswa & Santri</h2>
              <Badge className="bg-emerald-600 text-white border-none text-[10px] font-bold px-2 py-0.5">
                Template Baru RNH
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
              Kustomisasi Identitas, Aksen Emas & Pratinjau Bolak-Balik
            </p>
          </div>
        </div>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-9 px-4 rounded-full font-black text-xs animate-in fade-in zoom-in self-start sm:self-auto">
            <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
            {selectedIds.length} SANTRI TERPILIH
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration & Identity Settings */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100/60 pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-emerald-800 flex items-center gap-2">
                <Palette className="h-4 w-4 text-emerald-600" /> Desain & Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Template Style Selector */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pilihan Template
                </Label>
                <Select value={cardTemplate} onValueChange={setCardTemplate}>
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50/70 border-gray-200 font-bold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="santri-ribath" className="font-bold text-emerald-800">
                      ★ Santri Ribath (Emerald Gold - Sesuai Foto)
                    </SelectItem>
                    <SelectItem value="standard">Standar (Klasik Tabungan)</SelectItem>
                    <SelectItem value="modern">Modern (Sidebar Minimal)</SelectItem>
                    <SelectItem value="elegant">Elegan (Header Penuh)</SelectItem>
                  </SelectContent>
                </Select>
                {cardTemplate === 'santri-ribath' && (
                  <p className="text-[10px] text-emerald-700 bg-emerald-50 p-2.5 rounded-xl font-medium leading-relaxed border border-emerald-100">
                    Template menggunakan aset <strong>Kartu-depan.webp</strong> &amp; <strong>Kartublakang.webp</strong> dengan bingkai kubah Mihrab dan aksen emas.
                  </p>
                )}
              </div>

              {/* Print Layout Mode */}
              {cardTemplate === 'santri-ribath' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Format &amp; Mode Cetak PDF
                  </Label>
                  <Select value={printMode} onValueChange={(v: any) => setPrintMode(v)}>
                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/70 border-gray-200 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duplex">
                        Bolak-Balik (Halaman 1 Depan, Halaman 2 Belakang)
                      </SelectItem>
                      <SelectItem value="side-by-side">
                        Berdampingan (Depan &amp; Belakang di 1 Lembar)
                      </SelectItem>
                      <SelectItem value="front-only">
                        Hanya Sisi Depan
                      </SelectItem>
                      <SelectItem value="back-only">
                        Hanya Sisi Belakang
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Template Configuration Details */}
              {cardTemplate === 'santri-ribath' ? (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100/80 space-y-2 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Aset Desain Resmi Terintegrasi
                    </span>
                    <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                      Aset latar belakang telah memuat identitas lembaga, logo perisai, kaligrafi, dan ayat Al-Qur&apos;an secara permanen.
                    </p>
                    <div className="space-y-1.5 pt-1 text-[10.5px] text-emerald-950 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span><strong>Foto Santri:</strong> Presisi di dalam Kubah Mihrab</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span><strong>Nama Santri:</strong> Presisi di pita nama</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span><strong>Kelas &amp; NIS:</strong> Di badge nomor induk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span><strong>QR Code:</strong> Terpasang rapi di kotak putih belakang</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-1 border-t border-gray-100">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Nama Lembaga / Sekolah
                    </Label>
                    <Input 
                      value={schoolName} 
                      onChange={(e) => setSchoolName(e.target.value)} 
                      className="h-10 text-xs rounded-xl"
                      placeholder="Nama Sekolah"
                    />
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

                  {/* Logo Upload */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logo Lembaga</Label>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-11 rounded-xl border-dashed border-2 hover:bg-emerald-50 hover:border-emerald-500 transition-all text-xs font-bold" 
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4 text-emerald-600" /> {customLogo ? 'Ganti Logo' : 'Unggah Logo'}
                      </Button>
                      {customLogo && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-red-600 hover:bg-red-50 h-11 px-3 rounded-xl"
                          onClick={() => setCustomLogo(null)}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Large Print Action Button */}
          <Button 
            className="w-full h-16 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-black shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
            onClick={handlePrintSelected}
            disabled={isGenerating || selectedIds.length === 0}
          >
            {isGenerating ? (
              <><Loader2 className="mr-2.5 h-5 w-5 animate-spin" /> MEMPROSES PDF 300 DPI...</>
            ) : (
              <><Printer className="mr-2.5 h-5 w-5" /> CETAK {selectedIds.length} KARTU PILIHAN</>
            )}
          </Button>

          {selectedIds.length === 0 && (
            <p className="text-center text-xs text-gray-400 font-medium">
              Pilih minimal 1 santri di daftar untuk mengaktifkan tombol cetak.
            </p>
          )}
        </div>

        {/* Center Column: Student Selection & Search Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden h-full flex flex-col bg-white">
            <CardHeader className="bg-gray-50/60 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" /> Daftar Siswa ({students.length})
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-8 rounded-lg"
                  onClick={handleSelectAll}
                >
                  {selectedIds.length === filteredStudents.length ? 'Batal Semua' : 'Pilih Semua'}
                </Button>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Cari nama atau NIS santri..." 
                  className="pl-9 h-10 bg-white rounded-xl border-gray-200 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[480px]">
                <div className="p-2.5 space-y-1">
                  {loading ? (
                    <div className="p-10 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 opacity-40" />
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const isSelected = selectedIds.includes(student.id);
                      return (
                        <div 
                          key={student.id}
                          onClick={() => handleToggleStudent(student.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border",
                            isSelected 
                              ? "bg-emerald-50/80 border-emerald-300 shadow-sm" 
                              : "bg-transparent border-transparent hover:bg-gray-50"
                          )}
                        >
                          <div className={cn(
                            "h-5 w-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0",
                            isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300"
                          )}>
                            {isSelected && <CheckSquare className="h-3.5 w-3.5" />}
                          </div>
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-emerald-600/70" />
                            )}
                          </div>
                          <div className="flex flex-col flex-1 truncate">
                            <p className={cn("text-xs font-bold truncate", isSelected ? "text-emerald-950 font-black" : "text-gray-800")}>
                              {student.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono font-medium text-muted-foreground">{student.nis}</span>
                              <span className="h-1 w-1 rounded-full bg-gray-300" />
                              <span className="text-[10px] font-black uppercase text-emerald-700">{student.class}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-10 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">
                      Santri tidak ditemukan
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Card Preview */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold flex items-center gap-2 text-muted-foreground uppercase text-[10px] tracking-[0.2em]">
                <Eye className="h-3.5 w-3.5 text-emerald-600" /> Live Card Preview
              </h3>
              {cardTemplate === 'santri-ribath' && (
                <div className="flex bg-gray-100 p-0.5 rounded-xl">
                  <button
                    onClick={() => setPreviewSide('both')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all",
                      previewSide === 'both' ? "bg-white text-emerald-800 shadow-sm" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Berdampingan
                  </button>
                  <button
                    onClick={() => setPreviewSide('front')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all",
                      previewSide === 'front' ? "bg-white text-emerald-800 shadow-sm" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Depan
                  </button>
                  <button
                    onClick={() => setPreviewSide('back')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all",
                      previewSide === 'back' ? "bg-white text-emerald-800 shadow-sm" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Belakang
                  </button>
                </div>
              )}
            </div>

            {/* Preview Display Container */}
            {cardTemplate === 'santri-ribath' ? (
              <div className="space-y-4">
                {previewSide === 'both' ? (
                  /* Side by Side Preview matching user image */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 bg-gradient-to-br from-emerald-50/50 via-gray-50 to-amber-50/40 rounded-3xl border border-emerald-100/70">
                      <div>
                        <span className="block text-center text-[9px] font-black uppercase tracking-widest text-emerald-800 mb-2">
                          Sisi Depan
                        </span>
                        <SantriCardPreview data={santriCardData} side="front" />
                      </div>
                      <div>
                        <span className="block text-center text-[9px] font-black uppercase tracking-widest text-emerald-800 mb-2">
                          Sisi Belakang
                        </span>
                        <SantriCardPreview data={santriCardData} side="back" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single Card Preview */
                  <div className="max-w-[280px] mx-auto">
                    <SantriCardPreview data={santriCardData} side={previewSide} />
                  </div>
                )}
              </div>
            ) : (
              /* Legacy Horizontal Preview */
              <div className="flex justify-center">
                <div 
                  className="relative w-full max-w-[360px] aspect-[1.586/1] rounded-2xl shadow-2xl overflow-hidden bg-white border border-gray-100 transition-all duration-500 scale-95"
                  style={{ boxShadow: `0 20px 50px -12px ${accentColor}44` }}
                >
                  {cardTemplate === 'modern' && <div className="absolute left-0 top-0 bottom-0 w-4" style={{ backgroundColor: accentColor }} />}
                  {cardTemplate === 'elegant' && <div className="absolute top-0 left-0 right-0 h-16" style={{ backgroundColor: accentColor }} />}

                  <div className={`h-full flex flex-col p-6 relative z-10 ${cardTemplate === 'elegant' ? 'text-white' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-black text-[10px] tracking-tighter ${cardTemplate === 'elegant' ? 'text-white' : ''}`} style={{ color: cardTemplate === 'elegant' ? 'white' : accentColor }}>
                          KARTU TABUNGAN SISWA
                        </p>
                        <p className={`text-[8px] font-medium opacity-80 ${cardTemplate === 'elegant' ? 'text-white/80' : 'text-gray-500'}`}>
                          {schoolName}
                        </p>
                      </div>
                      <div className="h-8 w-8 relative bg-white rounded-full p-1 shadow-sm border border-gray-50">
                        <Image 
                          src={customLogo || '/logo-icon.png'} 
                          alt="Logo" 
                          fill 
                          className="object-contain rounded-full" 
                        />
                      </div>
                    </div>

                    <div className={`mt-5 flex gap-3 items-center ${cardTemplate === 'elegant' ? 'mt-9 text-gray-900' : ''}`}>
                      {previewStudent?.avatar_url ? (
                        <div className="w-[54px] h-[66px] rounded-lg overflow-hidden border border-gray-200 shadow-sm shrink-0 bg-gray-50">
                          <img 
                            src={previewStudent.avatar_url} 
                            alt={previewStudent.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : null}
                      <div className="bg-white p-1 rounded-lg shadow-md border border-gray-100 flex-shrink-0">
                        {qrPreviewUrl ? (
                          <Image src={qrPreviewUrl} width={previewStudent?.avatar_url ? 52 : 65} height={previewStudent?.avatar_url ? 52 : 65} alt="QR" className="rounded-sm" />
                        ) : (
                          <div className={cn("bg-gray-100 animate-pulse rounded-sm", previewStudent?.avatar_url ? "w-[52px] h-[52px]" : "w-[65px] h-[65px]")} />
                        )}
                      </div>
                      <div className={`flex flex-col gap-0.5 min-w-0 ${cardTemplate === 'elegant' ? 'translate-y-2' : ''}`}>
                        <p className="font-bold text-xs tracking-tight text-gray-900 leading-tight truncate max-w-[130px]">
                          {previewStudent?.name || 'Nama Lengkap Siswa'}
                        </p>
                        <div className="space-y-0.5 mt-1">
                          <p className="text-[7.5px] font-semibold text-gray-500 uppercase tracking-widest">NIS: <span className="text-gray-800">{previewStudent?.nis || '000000'}</span></p>
                          <p className="text-[7.5px] font-semibold text-gray-500 uppercase tracking-widest">KELAS: <span className="text-gray-800">{previewStudent?.class || 'X-A'}</span></p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-auto text-[7px] text-center font-black text-gray-400 uppercase tracking-[0.2em] opacity-40">
                      Digital Banking Solution
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instruction Tip */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 flex gap-3 text-[11px] text-emerald-900 leading-relaxed font-medium">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Aset Siap Cetak:</strong> Template menggunakan aset latar belakang <code>public/Assets/Kartu-depan.webp</code> dan <code>public/Assets/Kartublakang.webp</code> dengan resolusi tinggi.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
