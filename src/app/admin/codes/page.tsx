
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Key, Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ActivationCode {
    id: number;
    code: string;
    created_at: string;
    is_used: boolean;
    used_by: string | null;
    used_at: string | null;
    // Joined property
    profiles: {
        email: string;
    } | null;
}

export default function AdminCodesPage() {
    const supabase = createClient();
    const [codes, setCodes] = useState<ActivationCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCodes = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('activation_codes')
                .select(`
                    *,
                    profiles (
                        email
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                toast({ title: 'Gagal memuat kode', description: error.message, variant: 'destructive' });
            } else {
                setCodes(data as ActivationCode[]);
            }
            setLoading(false);
        };
        fetchCodes();
    }, [supabase, toast]);

    const generateNewCode = async () => {
        setGenerating(true);
        const newCode = `PRO-${[...Array(3)].map(() => Math.random().toString(36).substring(2, 7).toUpperCase()).join('-')}`;
        
        const { data, error } = await supabase
            .from('activation_codes')
            .insert({ code: newCode })
            .select(`
                *,
                profiles (
                    email
                )
            `)
            .single();

        if (error) {
            toast({ title: 'Gagal membuat kode baru', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Kode baru telah dibuat!', description: newCode });
            setCodes(prev => [data as ActivationCode, ...prev]);
        }
        setGenerating(false);
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast({ title: 'Kode disalin ke clipboard!' });
        setTimeout(() => setCopiedCode(null), 2000);
    };
    
    const getUsedByDisplay = (code: ActivationCode) => {
        if (code.profiles?.email) {
            return code.profiles.email;
        }
        if (code.used_by) {
            // Fallback to UUID if profile is not found
            return code.used_by;
        }
        return '-';
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Kode Aktivasi</h1>
            <p className="text-muted-foreground">Buat dan kelola kode aktivasi untuk akun premium.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Buat Kode Baru</CardTitle>
                    <CardDescription>Klik tombol di bawah untuk membuat kode aktivasi premium baru.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={generateNewCode} disabled={generating}>
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                        Buat Kode Aktivasi
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Daftar Kode</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Tanggal Dibuat</TableHead>
                                    <TableHead>Digunakan Oleh</TableHead>
                                    <TableHead>Tanggal Digunakan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">Memuat kode...</TableCell>
                                    </TableRow>
                                ) : codes.length > 0 ? (
                                    codes.map(code => (
                                        <TableRow key={code.id}>
                                            <TableCell className="font-mono">
                                                <div className="flex items-center gap-2">
                                                    <span>{code.code}</span>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(code.code)}>
                                                        {copiedCode === code.code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={code.is_used ? 'secondary' : 'default'}>
                                                    {code.is_used ? 'Digunakan' : 'Tersedia'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(code.created_at), 'd MMM yyyy', { locale: id })}</TableCell>
                                            <TableCell>{getUsedByDisplay(code)}</TableCell>
                                            <TableCell>{code.used_at ? format(new Date(code.used_at), 'd MMM yyyy', { locale: id }) : '-'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada kode yang dibuat.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="md:hidden">
                        {loading ? (
                             <p className="text-center text-muted-foreground">Memuat kode...</p>
                        ) : codes.length > 0 ? (
                            <div className="space-y-4">
                                {codes.map(code => (
                                    <div key={code.id} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-mono text-sm break-all font-semibold">{code.code}</p>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleCopy(code.code)}>
                                                {copiedCode === code.code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Status:</span>
                                                <Badge variant={code.is_used ? 'secondary' : 'default'}>
                                                    {code.is_used ? 'Digunakan' : 'Tersedia'}
                                                </Badge>
                                            </div>
                                             <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Dibuat:</span>
                                                <span>{format(new Date(code.created_at), 'd MMM yyyy', { locale: id })}</span>
                                            </div>
                                             <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Digunakan Oleh:</span>
                                                <span className="truncate">{getUsedByDisplay(code)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Digunakan Pada:</span>
                                                <span>{code.used_at ? format(new Date(code.used_at), 'd MMM yyyy', { locale: id }) : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className="text-center text-muted-foreground">Belum ada kode yang dibuat.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
