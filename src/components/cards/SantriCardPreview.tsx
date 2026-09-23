'use client';

import React from 'react';

export interface SantriCardData {
  name: string;
  nis: string;
  className?: string;
  avatarUrl?: string | null;
  qrUrl?: string;
  frontBgUrl?: string;
  backBgUrl?: string;
  onlyPhotoAndName?: boolean;
  // Kept for backward compatibility if passed
  schoolName?: string;
  schoolType?: string;
  schoolLocation?: string;
  schoolMotto?: string;
  quote?: string;
  logoUrl?: string | null;
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
    qrUrl,
    frontBgUrl = '/Assets/Kartu-dpn.webp',
    backBgUrl = '/Assets/Kartu-blkng.webp',
    onlyPhotoAndName,
  } = data;

  const [frontSrc, setFrontSrc] = React.useState(frontBgUrl);
  const [backSrc, setBackSrc] = React.useState(backBgUrl);

  React.useEffect(() => {
    setFrontSrc(frontBgUrl);
  }, [frontBgUrl]);

  React.useEffect(() => {
    setBackSrc(backBgUrl);
  }, [backBgUrl]);

  const handleFrontError = () => {
    if (frontSrc === '/Assets/Kartu-dpn.webp') {
      setFrontSrc('/Assets/Kartu-depan.webp');
    } else if (frontSrc === '/Assets/Kartu-depan.webp') {
      setFrontSrc('/Assets/Kartu-dpn.webp');
    } else if (frontSrc !== '/Assets/Kartu-depan.png') {
      setFrontSrc('/Assets/Kartu-depan.png');
    }
  };

  const handleBackError = () => {
    if (backSrc === '/Assets/Kartu-blkng.webp') {
      setBackSrc('/Assets/Kartublakang.webp');
    } else if (backSrc === '/Assets/Kartublakang.webp') {
      setBackSrc('/Assets/Kartu-blkng.webp');
    } else if (backSrc !== '/Assets/Kartublakang.png') {
      setBackSrc('/Assets/Kartublakang.png');
    }
  };

  const isDpnBlkng =
    onlyPhotoAndName ||
    frontSrc.includes('Kartu-dpn') ||
    frontBgUrl.includes('Kartu-dpn');

  // Render Front Side of the Card
  if (side === 'front') {
    return (
      <div
        className={`relative w-full aspect-[848/1264] rounded-2xl overflow-hidden select-none bg-[#032e20] ${
          showShadow ? 'shadow-2xl shadow-emerald-950/40' : ''
        } ${className}`}
      >
        {/* 1. Base Template Asset (unmodified official asset) */}
        <img
          src={frontSrc}
          alt="Kartu Santri Depan"
          onError={handleFrontError}
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          referrerPolicy="no-referrer"
        />

        {/* 2. Foto Santri inside the Mihrab Arch window */}
        <div 
          className="absolute z-10 overflow-hidden pointer-events-none"
          style={
            isDpnBlkng
              ? {
                  left: '29.5%',
                  top: '27.8%',
                  width: '41.0%',
                  height: '41.8%',
                  borderRadius: '45% 45% 0 0 / 28% 28% 0 0',
                }
              : {
                  left: '23.6%',
                  top: '19.2%',
                  width: '52.8%',
                  height: '35.4%',
                  borderRadius: '45% 45% 0 0 / 38% 38% 0 0',
                }
          }
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover object-top"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-emerald-800 to-emerald-950 text-amber-100">
              {/* Default Santri Silhouette with Peci */}
              <div className="w-10 h-12 relative flex flex-col items-center justify-center">
                <div className="w-8 h-2.5 bg-white/90 rounded-t-sm shadow-sm" /> {/* Peci */}
                <div className="w-7 h-7 rounded-full bg-amber-100/90 mt-0.5" />
                <div className="w-12 h-4 rounded-t-full bg-white/80 mt-0.5" />
              </div>
              <span className="text-[7.5px] font-bold tracking-wider text-amber-200 mt-1 uppercase">Santri</span>
            </div>
          )}
        </div>

        {/* 3. Nama Santri in the White Ribbon Slot (Foto & Nama Saja) */}
        <div 
          className="absolute z-10 flex items-center justify-center pointer-events-none px-2 text-center"
          style={
            isDpnBlkng
              ? {
                  left: '14.5%',
                  top: '71.2%',
                  width: '71.0%',
                  height: '5.2%',
                }
              : {
                  left: '16%',
                  top: '61.1%',
                  width: '68%',
                  height: '4.4%',
                }
          }
        >
          <span className="text-[10.5px] sm:text-[12.5px] font-black uppercase tracking-tight text-slate-900 truncate leading-none">
            {name}
          </span>
        </div>

        {/* 4. Kelas & NIS in the Green Pill Slot (ONLY shown if NOT isDpnBlkng) */}
        {!isDpnBlkng && (
          <div 
            className="absolute z-10 flex items-center justify-center pointer-events-none px-1 text-center"
            style={{
              left: '22%',
              top: '66.2%',
              width: '56%',
              height: '3.2%',
            }}
          >
            <span className="text-[7.5px] sm:text-[8.5px] font-extrabold uppercase tracking-wider text-white truncate leading-none">
              {studentClass ? (studentClass.toLowerCase().startsWith('kelas') ? studentClass : `Kelas ${studentClass}`) : 'SANTRI'}
              <span className="text-amber-300 mx-1">•</span>
              NIS: {nis}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Render Back Side of the Card
  return (
    <div
      className={`relative w-full aspect-[848/1264] rounded-2xl overflow-hidden select-none bg-[#032e20] ${
        showShadow ? 'shadow-2xl shadow-emerald-950/40' : ''
      } ${className}`}
    >
      {/* 1. Base Template Asset (unmodified official asset) */}
      <img
        src={backSrc}
        alt="Kartu Santri Belakang"
        onError={handleBackError}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* 2. QR Code placed precisely inside the native white square container */}
      <div 
        className="absolute z-10 flex items-center justify-center p-2 sm:p-2.5 pointer-events-none"
        style={
          isDpnBlkng
            ? {
                left: '29.5%',
                top: '37.5%',
                width: '41.0%',
                height: '25.0%',
              }
            : {
                left: '28.5%',
                top: '30.4%',
                width: '43.0%',
                height: '28.0%',
              }
        }
      >
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="Student QR Code"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
            <span className="text-[9px] text-gray-400 font-bold">QR CODE</span>
          </div>
        )}
      </div>
    </div>
  );
}
