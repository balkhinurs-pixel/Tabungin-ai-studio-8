
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Upload, 
  Loader2, 
  DatabaseZap, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { exportUserData, importUserData } from '../actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function BackupRestore() {
  const [loading, setLoading] = useState(false);
  const [restoreData, setRestoreData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `backup-tabungin-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Berhasil",
        description: "File cadangan telah berhasil diunduh.",
      });
    } catch (error) {
      toast({
        title: "Gagal Backup",
        description: "Terjadi kesalahan saat mengekspor data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setRestoreData(json);
      } catch (err) {
        toast({
          title: "File Tidak Valid",
          description: "File yang Anda unggah bukan format JSON yang benar.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restoreData) return;
    setLoading(true);

    const result = await importUserData(restoreData);

    if (result.success) {
      toast({
        title: "Restorasi Berhasil",
        description: result.message,
      });
      setRestoreData(null);
    } else {
      toast({
        title: "Restorasi Gagal",
        description: result.message,
        variant: "destructive",
      });
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Cadangkan Data</p>
          <p className="text-xs text-muted-foreground">Unduh seluruh data siswa dan transaksi dalam format JSON.</p>
          <Button 
            variant="outline" 
            className="w-full justify-start border-primary/20 hover:bg-primary/5" 
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4 text-primary" />}
            Unduh Cadangan (.json)
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Pulihkan Data</p>
          <p className="text-xs text-muted-foreground">Unggah file cadangan untuk memulihkan data yang hilang.</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
          
          <AlertDialog open={!!restoreData} onOpenChange={(open) => !open && setRestoreData(null)}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start border-orange-200 hover:bg-orange-50" 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4 text-orange-500" />}
                Unggah & Pulihkan Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <AlertTriangle className="h-6 w-6" />
                  <AlertDialogTitle>Konfirmasi Pemulihan Data</AlertDialogTitle>
                </div>
                <AlertDialogDescription className="space-y-3">
                  <p>Anda akan memulihkan data dari file cadangan tanggal <strong>{restoreData && new Date(restoreData.exportDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</strong>.</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    <li>Data siswa yang sudah ada akan diperbarui jika terjadi duplikasi NIS.</li>
                    <li>Riwayat transaksi akan ditambahkan atau diperbarui.</li>
                    <li>Akun login siswa yang hilang akan dibuat kembali dengan PIN default (123456).</li>
                  </ul>
                  <p className="font-semibold text-destructive">Tindakan ini tidak dapat dibatalkan. Lanjutkan?</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault();
                    handleRestore();
                  }}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ya, Pulihkan Sekarang
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg animate-pulse">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Sedang memproses data...</span>
        </div>
      )}
    </div>
  );
}
