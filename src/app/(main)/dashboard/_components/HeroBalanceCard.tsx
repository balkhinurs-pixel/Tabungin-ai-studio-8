'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Users } from 'lucide-react';

interface HeroBalanceCardProps {
  totalBalance: number;
  studentCount: number;
  studentQuota: number;
  plan?: string;
}

const HIDE_BALANCE_STORAGE_KEY = 'tabungin_hide_dashboard_balance';

export default function HeroBalanceCard({
  totalBalance,
  studentCount,
  studentQuota,
}: HeroBalanceCardProps) {
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIDE_BALANCE_STORAGE_KEY);
      if (saved === 'true') setHideBalance(true);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleHideBalance = () => {
    setHideBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIDE_BALANCE_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const formattedBalance = `Rp ${totalBalance.toLocaleString('id-ID')}`;

  return (
    <div className="relative overflow-hidden rounded-[22px] h-[176px] sm:h-[216px] shadow-[0_14px_30px_-8px_rgba(9,74,178,0.48)] border border-white/25 bg-[#0A58CA]">
      {/* Optimized 41KB WebP Hero Banner Asset */}
      <Image
        src="/Assets/hero-dashboard.webp"
        alt="Ilustrasi Tabungin Santri"
        fill
        priority
        sizes="(max-width: 640px) 100vw, 768px"
        className="object-cover object-right select-none pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* Left readability scrim so balance stays high-contrast on any digit length */}
      <div className="absolute inset-y-0 left-0 w-[72%] sm:w-[64%] bg-gradient-to-r from-[#0648B3]/85 via-[#095AD3]/45 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 h-full px-5 py-4 sm:px-7 sm:py-5 flex flex-col justify-between max-w-[74%] sm:max-w-[65%]">
        {/* Saldo Block with Vertical Cyan Accent Line */}
        <div className="flex items-stretch gap-3 my-auto pt-1">
          <div className="w-[3px] rounded-full bg-gradient-to-b from-cyan-300 via-sky-300 to-blue-400/20 shrink-0 shadow-[0_0_8px_rgba(103,232,249,0.5)]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] sm:text-sm font-medium text-white/95 tracking-normal">
                Total Saldo Terkumpul
              </span>
              <button
                type="button"
                onClick={toggleHideBalance}
                aria-label={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                className="text-white/80 hover:text-white transition-colors p-0.5 rounded-md active:scale-90"
              >
                {hideBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[31px] sm:text-[40px] font-extrabold text-white tracking-tight leading-tight mt-0.5 tabular-nums drop-shadow-sm truncate">
              {hideBalance ? 'Rp ••••••' : formattedBalance}
            </p>
          </div>
        </div>

        {/* Compact Kuota Pill */}
        <div className="inline-flex items-center gap-2 self-start bg-[#063A91]/55 backdrop-blur-md border border-white/15 rounded-full pl-2.5 pr-1.5 py-1 shadow-inner">
          <Users className="h-3.5 w-3.5 text-sky-200 shrink-0" />
          <span className="text-[11.5px] sm:text-xs font-medium text-white/95 whitespace-nowrap">
            Kuota Siswa Terpakai
          </span>
          <span className="text-[11.5px] sm:text-xs font-bold text-white bg-sky-400/35 border border-white/20 px-2.5 py-0.5 rounded-full tabular-nums leading-tight">
            {studentCount} / {studentQuota}
          </span>
        </div>
      </div>
    </div>
  );
}
