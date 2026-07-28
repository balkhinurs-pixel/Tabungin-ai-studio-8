
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase';


export default function SearchStudent() {
  const [nis, setNis] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleSearch = async () => {
    if (!nis) {
      toast({
        title: 'NIS Kosong',
        description: 'Silakan masukkan NIS siswa untuk mencari.',
        variant: 'destructive',
      });
      return;
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id')
      .eq('nis', nis)
      .single();

    if (student && !error) {
      router.push(`/profiles/${student.id}`);
    } else {
      toast({
        title: 'Siswa Tidak Ditemukan',
        description: `Tidak ada siswa dengan NIS "${nis}".`,
        variant: 'destructive',
      });
    }
  };

  return (
     <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm">Cari Siswa (via NIS)</p>
          <div className="flex gap-2">
            <Input 
              placeholder="Masukkan NIS siswa..." 
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" /> Cari
            </Button>
          </div>
        </CardContent>
      </Card>
  )
}
