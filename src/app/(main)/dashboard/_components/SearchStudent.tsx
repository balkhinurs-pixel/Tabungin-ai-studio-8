
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase';

export default function SearchStudent() {
  const [nis, setNis] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleSearch = async () => {
    const cleanNis = nis.trim();
    if (!cleanNis) {
      toast({
        title: 'NIS Kosong',
        description: 'Silakan masukkan NIS siswa untuk mencari.',
        variant: 'destructive',
      });
      return;
    }

    if (isSearching) return;
    setIsSearching(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase
        .from('students')
        .select('id')
        .eq('nis', cleanNis);

      if (user) {
        query = query.eq('user_id', user.id);
      }

      const { data: student, error } = await query.limit(1).maybeSingle();

      if (student && !error) {
        router.push(`/profiles/${student.id}`);
      } else {
        toast({
          title: 'Siswa Tidak Ditemukan',
          description: `Tidak ada siswa dengan NIS "${cleanNis}".`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] border border-blue-100/80 shadow-[0_6px_22px_-6px_rgba(30,64,175,0.09)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-[18px] w-[18px] text-[#0D6EFD] stroke-[2.3]" />
        <p className="font-bold text-[14.5px] text-slate-900 tracking-tight">Cari Siswa (via NIS)</p>
      </div>
      <div className="flex items-center gap-2.5">
        <Input
          placeholder="Masukkan NIS siswa..."
          value={nis}
          onChange={(e) => setNis(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className="h-11 flex-1 rounded-xl bg-[#F1F5F9] border-transparent focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-white text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 shadow-none px-3.5"
        />
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="h-11 px-4 rounded-xl bg-gradient-to-b from-[#1677FF] to-[#0853C8] hover:from-[#1677FF]/95 hover:to-[#0853C8]/95 text-white font-semibold text-[13.5px] shadow-[0_6px_14px_-3px_rgba(13,110,253,0.45)] border-none active:scale-95 transition-all shrink-0"
        >
          {isSearching ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-1.5 h-4 w-4 stroke-[2.5]" />
          )}
          Cari
        </Button>
      </div>
    </div>
  );
}
