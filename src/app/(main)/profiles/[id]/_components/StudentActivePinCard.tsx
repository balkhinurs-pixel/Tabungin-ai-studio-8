'use client';

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Copy, Check, ShieldCheck } from 'lucide-react';
import { type Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface StudentActivePinCardProps {
  student: Student;
}

export default function StudentActivePinCard({ student }: StudentActivePinCardProps) {
  const { toast } = useToast();
  const [showPin, setShowPin] = useState(true);
  const [copied, setCopied] = useState(false);

  // Jika student.pin belum tercatat di database (data lama sebelum update), fallback ke default 123456
  const activePin = student.pin || '123456';

  const handleCopyPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activePin);
      setCopied(true);
      toast({
        title: 'PIN Disalin',
        description: `PIN ${activePin} untuk ${student.name} berhasil disalin ke clipboard.`,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50/80 border border-indigo-200/70 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200/50">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-indigo-950 text-xs">PIN Akun Siswa</p>
            <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
              <ShieldCheck className="h-2.5 w-2.5" />
              Aktif
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {student.pin ? 'PIN aktif siswa tanpa perlu reset' : 'PIN bawaan sistem (123456)'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl flex items-center gap-2 shadow-xs">
          <span className="font-mono text-sm font-extrabold tracking-wider text-indigo-950">
            {showPin ? activePin : '••••••'}
          </span>
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="text-muted-foreground hover:text-indigo-600 transition-colors p-0.5"
            title={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
            aria-label={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
          >
            {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCopyPin}
          className="h-8 w-8 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100/50 rounded-xl"
          title="Salin PIN"
          aria-label="Salin PIN"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
