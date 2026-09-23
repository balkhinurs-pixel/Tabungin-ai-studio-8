'use client';

import React from 'react';
import Image from 'next/image';
import { BookOpen, GraduationCap, Sprout, TrendingUp, CheckCircle2 } from 'lucide-react';

export interface SantriCardData {
  name: string;
  nis: string;
  className?: string;
  avatarUrl?: string | null;
  schoolName?: string;
  schoolType?: string;
  schoolLocation?: string;
  schoolMotto?: string;
  quote?: string;
  logoUrl?: string | null;
  qrUrl?: string;
  frontBgUrl?: string;
  backBgUrl?: string;
}

interface SantriCardPreviewProps {
  data: SantriCardData;
  side?: 'front' | 'back';
  className?: string;
  showShadow?: boolean;
}

export function SantriCardPreview({
  data,
  side = 'front',
  className = '',
  showShadow = true,
}: SantriCardPreviewProps) {
  const {
    name = 'M. SYAHRUL RIDHO',
    nis = '12345678',
    className: studentClass = 'XII MIPA 1',
    avatarUrl,
    schoolName = 'RIBATH NURUL HIDAYAH 2',
    schoolType = 'PONDOK PESANTREN',
    schoolLocation = 'PANGKAH - TEGAL',
    schoolMotto = 'Berilmu | Berakhlak | Berdaya | Untuk Umat',
    quote = 'Menuntut ilmu adalah jalan menuju ridha Allah',
    logoUrl,
    qrUrl,
    frontBgUrl = '/Assets/Kartu-depan.webp',
    backBgUrl = '/Assets/Kartublakang.webp',
  } = data;

  // Render Front Side of the Card
  if (side === 'front') {
    return (
      <div
        className={`relative w-full aspect-[1/1.586] rounded-2xl overflow-hidden select-none bg-gradient-to-b from-[#032e20] via-[#064e3b] to-[#022116] text-white border-[2.5px] border-[#d4af37]/70 ${
          showShadow ? 'shadow-2xl shadow-emerald-950/40' : ''
        } ${className}`}
      >
        {/* Background Image Layer */}
        {frontBgUrl && (
          <img
            src={frontBgUrl}
            alt="Kartu Depan Background"
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Graceful fallback to background gradient if image is not yet loaded
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        )}

        {/* Subtle Decorative Golden Corner Trim */}
        <div className="absolute inset-1.5 border border-[#d4af37]/40 rounded-xl pointer-events-none z-10" />

        {/* Content Layer Overlay */}
        <div className="relative z-20 h-full flex flex-col justify-between p-3.5 sm:p-4">
          {/* Top Header: Logo and School Identity */}
          <div className="flex items-center gap-2.5 pt-1">
            {/* Logo Shield */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 relative flex-shrink-0 bg-gradient-to-br from-[#064e3b] to-[#02261b] rounded-xl border border-[#d4af37] p-1 flex flex-col items-center justify-center shadow-md">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="School Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <div className="flex gap-0.5 text-[#eab308] text-[6px]">
                    <span>★</span><span>★</span><span>★</span>
                  </div>
                  <span className="text-[7.5px] font-black tracking-tighter text-[#eab308] leading-none">RNH</span>
                  <span className="text-[4.5px] text-emerald-200 font-semibold leading-tight">TEGAL</span>
                </div>
              )}
            </div>

            {/* School Header Text */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[7.5px] sm:text-[8px] font-extrabold uppercase tracking-[0.18em] text-[#eab308] drop-shadow-sm leading-tight truncate">
                {schoolType}
              </span>
              <h4 className="text-[11px] sm:text-[12.5px] font-black tracking-tight text-white drop-shadow-sm leading-tight truncate">
                {schoolName}
              </h4>
              <span className="text-[7px] sm:text-[7.5px] font-semibold tracking-wider text-emerald-100 uppercase opacity-90 truncate">
                {schoolLocation}
              </span>
              <span className="text-[6px] sm:text-[6.5px] text-[#eab308] font-medium tracking-tight truncate italic opacity-95">
                {schoolMotto}
              </span>
            </div>
          </div>

          {/* Central Section: Islamic Arch Window with Student Photo */}
          <div className="relative my-auto flex items-center justify-center py-1">
            {/* Left Vertical Calligraphy/Script */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-start z-20 pointer-events-none pl-1">
              <span className="text-[8px] sm:text-[9.5px] font-serif italic text-[#eab308] leading-tight drop-shadow font-bold">
                Santri
              </span>
              <span className="text-[7px] sm:text-[8px] font-serif italic text-white/90 leading-tight">
                Hari Ini
              </span>
              <span className="text-[8px] sm:text-[9.5px] font-serif italic text-[#eab308] leading-tight drop-shadow font-bold">
                Pemimpin
              </span>
              <span className="text-[7px] sm:text-[8px] font-serif italic text-white/90 leading-tight">
                Masa Depan
              </span>
            </div>

            {/* Mihrab Islamic Arch Photo Frame */}
            <div className="relative w-28 h-36 sm:w-32 sm:h-40 flex items-center justify-center">
              {/* Outer Golden Arch Frame */}
              <div 
                className="w-full h-full rounded-t-[3.5rem] rounded-b-xl border-[2.5px] border-[#d4af37] bg-emerald-950/60 p-1 shadow-lg backdrop-blur-[2px] relative overflow-hidden flex flex-col items-center justify-end"
                style={{
                  boxShadow: '0 8px 24px -4px rgba(6, 78, 59, 0.6), inset 0 0 12px rgba(212, 175, 55, 0.3)'
                }}
              >
                {/* Mosque Silhouette / Backdrop */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200 via-emerald-800 to-emerald-950 pointer-events-none" />

                {/* Student Photo */}
                <div className="w-full h-full rounded-t-[3.2rem] rounded-b-lg overflow-hidden relative bg-emerald-900/40 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 bg-gradient-to-b from-emerald-800 to-emerald-950">
                      {/* Santri default silhouette with peci */}
                      <div className="w-12 h-14 relative flex flex-col items-center justify-center">
                        <div className="w-9 h-3 bg-white/90 rounded-t-sm shadow-sm" /> {/* Peci */}
                        <div className="w-8 h-8 rounded-full bg-amber-100/90 mt-0.5" />
                        <div className="w-14 h-5 rounded-t-full bg-white/80 mt-1" />
                      </div>
                      <span className="text-[7.5px] font-bold text-amber-200 mt-1 uppercase">Santri</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Name Ribbon, Class Badge, Values Bar */}
          <div className="space-y-1.5 pb-0.5">
            {/* Name Ribbon with Islamic Star Accents */}
            <div className="relative mx-auto w-full max-w-[230px]">
              <div className="bg-white text-slate-900 rounded-full px-3 py-1 shadow-lg border border-[#d4af37] flex items-center justify-between">
                <span className="text-[#eab308] text-[9px] font-black select-none">۞</span>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight text-slate-900 truncate mx-1.5 text-center flex-1">
                  {name}
                </span>
                <span className="text-[#eab308] text-[9px] font-black select-none">۞</span>
              </div>

              {/* Class & NIS Badge */}
              <div className="flex justify-center -mt-1 relative z-10">
                <div className="bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#064e3b] text-white border border-[#d4af37]/80 rounded-full px-3 py-0.5 text-[7px] sm:text-[8px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <span>{studentClass.toLowerCase().startsWith('kelas') ? studentClass : `Kelas ${studentClass}`}</span>
                  <span className="w-1 h-1 rounded-full bg-[#eab308]" />
                  <span>NIS: {nis}</span>
                </div>
              </div>
            </div>

            {/* 4 Pillars of Character / Values Bar */}
            <div className="pt-1">
              <div className="bg-white/95 text-emerald-950 rounded-xl p-1.5 shadow-md border border-[#d4af37]/50 grid grid-cols-4 divide-x divide-emerald-100 text-center">
                <div className="flex flex-col items-center justify-center px-0.5">
                  <BookOpen className="w-3 h-3 text-[#047857]" />
                  <span className="text-[6.5px] font-black tracking-tight uppercase mt-0.5 text-emerald-900">SANTRI</span>
                </div>
                <div className="flex flex-col items-center justify-center px-0.5">
                  <GraduationCap className="w-3 h-3 text-[#047857]" />
                  <span className="text-[6.5px] font-black tracking-tight uppercase mt-0.5 text-emerald-900">ILMU</span>
                </div>
                <div className="flex flex-col items-center justify-center px-0.5">
                  <Sprout className="w-3 h-3 text-[#047857]" />
                  <span className="text-[6.5px] font-black tracking-tight uppercase mt-0.5 text-emerald-900">AMAL</span>
                </div>
                <div className="flex flex-col items-center justify-center px-0.5">
                  <TrendingUp className="w-3 h-3 text-[#047857]" />
                  <span className="text-[6.5px] font-black tracking-tight uppercase mt-0.5 text-emerald-900">MANFAAT</span>
                </div>
              </div>

              {/* Bottom Islamic Golden Curve Accent */}
              <div className="flex items-center justify-between px-1 pt-1 text-[5.5px] sm:text-[6px] text-emerald-200/80 font-bold uppercase tracking-widest">
                <span>ILMU • ADAB • AMAL • MANFAAT</span>
                <span className="text-[#eab308]">★ RNH KARTU DIGITAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Back Side of the Card
  return (
    <div
      className={`relative w-full aspect-[1/1.586] rounded-2xl overflow-hidden select-none bg-gradient-to-b from-[#032e20] via-[#064e3b] to-[#022116] text-white border-[2.5px] border-[#d4af37]/70 ${
        showShadow ? 'shadow-2xl shadow-emerald-950/40' : ''
      } ${className}`}
    >
      {/* Background Image Layer */}
      {backBgUrl && (
        <img
          src={backBgUrl}
          alt="Kartu Belakang Background"
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      )}

      {/* Decorative Outer Border */}
      <div className="absolute inset-1.5 border border-[#d4af37]/40 rounded-xl pointer-events-none z-10" />

      {/* Top Right Islamic Star Emblem */}
      <div className="absolute top-3 right-3 text-[#eab308] text-base z-20 drop-shadow">
        ۞
      </div>

      {/* Content Layer Overlay */}
      <div className="relative z-20 h-full flex flex-col justify-between p-4 sm:p-5 text-center">
        {/* Top Header inside Golden Arch */}
        <div className="pt-1 flex flex-col items-center">
          {/* Logo Badge */}
          <div className="w-10 h-10 relative bg-emerald-900/90 rounded-xl border border-[#d4af37] p-1 flex items-center justify-center shadow-md mb-1.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-center">
                <span className="text-[#eab308] text-[7px] font-black leading-none block">RNH</span>
                <span className="text-[5px] text-white leading-none block mt-0.5">TEGAL</span>
              </div>
            )}
          </div>

          <span className="text-[7.5px] font-extrabold uppercase tracking-[0.16em] text-[#eab308] drop-shadow-sm">
            {schoolType}
          </span>
          <h4 className="text-[11px] sm:text-[12px] font-black tracking-tight text-white drop-shadow-sm leading-tight">
            {schoolName}
          </h4>
          <span className="text-[7px] font-semibold tracking-wider text-emerald-100 uppercase opacity-90">
            {schoolLocation}
          </span>
          <span className="text-[6px] text-[#eab308] font-medium tracking-tight italic opacity-95">
            {schoolMotto}
          </span>
        </div>

        {/* Center: Dynamic QR Code Container */}
        <div className="my-auto flex flex-col items-center">
          <div className="p-2.5 bg-white rounded-2xl shadow-xl border-2 border-[#d4af37] flex flex-col items-center">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Student QR Code"
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-400">QR Code</span>
              </div>
            )}
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-950/80 px-3 py-1 rounded-full border border-[#d4af37]/60 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-[#eab308]" />
            <span className="text-[7.5px] sm:text-[8px] font-black tracking-[0.12em] text-[#eab308] uppercase">
              SCAN UNTUK VERIFIKASI DATA
            </span>
          </div>

          <span className="text-[6.5px] text-emerald-200/90 font-mono tracking-wider mt-1">
            NIS: {nis}
          </span>
        </div>

        {/* Bottom Section: Islamic Arch & Motivational Quote */}
        <div className="pt-2 border-t border-[#d4af37]/30 flex flex-col items-center">
          <p className="text-[8.5px] sm:text-[9.5px] font-serif italic text-amber-100/95 leading-relaxed max-w-[240px] drop-shadow-sm">
            &ldquo;{quote}&rdquo;
          </p>
          <div className="flex items-center gap-1 mt-1 text-[#eab308] text-[7px]">
            <span>◆</span>
            <div className="w-8 h-[1px] bg-[#d4af37]/60" />
            <span>۞</span>
            <div className="w-8 h-[1px] bg-[#d4af37]/60" />
            <span>◆</span>
          </div>
          <span className="text-[6px] text-emerald-300/70 font-semibold tracking-widest uppercase mt-1">
            Sistem Tabungan & Presensi Santri
          </span>
        </div>
      </div>
    </div>
  );
}
