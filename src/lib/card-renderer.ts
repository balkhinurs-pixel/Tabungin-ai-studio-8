/**
 * Utility for rendering high-resolution Santri ID Cards to HTML Canvas
 * and exporting to jsPDF with 300 DPI clarity.
 */

export interface CardRenderConfig {
  schoolName: string;
  schoolType: string;
  schoolLocation: string;
  schoolMotto: string;
  quote: string;
  schoolCode: string;
  logoUrl?: string | null;
  frontBgUrl?: string;
  backBgUrl?: string;
}

export interface StudentCardInfo {
  nis: string;
  name: string;
  class: string;
  avatar_url?: string | null;
}

// Load image asynchronously
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Render Front Card to an HTML Canvas (dimensions 640 x 1015 px ~ 300 DPI for CR80)
 */
export async function renderFrontCardToCanvas(
  student: StudentCardInfo,
  config: CardRenderConfig
): Promise<HTMLCanvasElement> {
  const width = 640;
  const height = 1015;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Draw base background
  let bgLoaded = false;
  const bgUrl = config.frontBgUrl || '/Assets/Kartu-depan.png';
  try {
    const bgImg = await loadImage(bgUrl);
    ctx.drawImage(bgImg, 0, 0, width, height);
    bgLoaded = true;
  } catch {
    // Fallback if background image couldn't load
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#032e20');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#022116');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Outer gold rim border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Inner thin border
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // 2. Header: Logo & School Identity
  const headerY = 35;
  if (config.logoUrl) {
    try {
      const logoImg = await loadImage(config.logoUrl);
      ctx.drawImage(logoImg, 35, headerY, 80, 80);
    } catch {
      // Draw shield logo placeholder
      drawShieldLogo(ctx, 35, headerY, 80, 80);
    }
  } else {
    drawShieldLogo(ctx, 35, headerY, 80, 80);
  }

  // School text
  const textX = 130;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(config.schoolType.toUpperCase(), textX, headerY + 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 23px sans-serif';
  ctx.fillText(config.schoolName, textX, headerY + 48);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '600 14px sans-serif';
  ctx.fillText(config.schoolLocation.toUpperCase(), textX, headerY + 68);

  ctx.fillStyle = '#fde047';
  ctx.font = 'italic 500 13px sans-serif';
  ctx.fillText(config.schoolMotto, textX, headerY + 86);

  // 3. Left Calligraphy Text
  ctx.textAlign = 'left';
  ctx.font = 'italic bold 17px Georgia, serif';
  ctx.fillStyle = '#eab308';
  ctx.fillText('Santri', 35, 360);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Hari Ini', 35, 385);
  ctx.fillStyle = '#eab308';
  ctx.fillText('Pemimpin', 35, 415);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Masa Depan', 35, 440);

  // 4. Central Islamic Arch Photo Frame
  const archW = 240;
  const archH = 320;
  const archX = (width - archW) / 2 + 30; // slightly shifted right to balance script
  const archY = 220;

  ctx.save();
  // Create Arch path
  ctx.beginPath();
  ctx.moveTo(archX, archY + archH);
  ctx.lineTo(archX, archY + 120);
  ctx.quadraticCurveTo(archX, archY, archX + archW / 2, archY);
  ctx.quadraticCurveTo(archX + archW, archY, archX + archW, archY + 120);
  ctx.lineTo(archX + archW, archY + archH);
  ctx.closePath();

  // Shadow and border for arch
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#d4af37';
  ctx.stroke();

  // Clip inside arch to draw photo
  ctx.clip();

  // Backdrop inside arch
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(archX, archY, archW, archH);

  if (student.avatar_url) {
    try {
      const avatarImg = await loadImage(student.avatar_url);
      ctx.drawImage(avatarImg, archX, archY, archW, archH);
    } catch {
      drawSantriSilhouette(ctx, archX, archY, archW, archH);
    }
  } else {
    drawSantriSilhouette(ctx, archX, archY, archW, archH);
  }
  ctx.restore();

  // 5. Name Ribbon
  const ribbonY = 620;
  const ribbonW = 460;
  const ribbonH = 64;
  const ribbonX = (width - ribbonW) / 2;

  // Ribbon shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, ribbonX + 3, ribbonY + 3, ribbonW, ribbonH, 32);
  ctx.fill();

  // White ribbon background
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 32);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Rosettes
  ctx.fillStyle = '#eab308';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('۞', ribbonX + 30, ribbonY + 41);
  ctx.fillText('۞', ribbonX + ribbonW - 30, ribbonY + 41);

  // Student Name
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 24px sans-serif';
  ctx.fillText(student.name.toUpperCase(), width / 2, ribbonY + 42, ribbonW - 100);

  // 6. Class & NIS Badge
  const badgeW = 340;
  const badgeH = 38;
  const badgeX = (width - badgeW) / 2;
  const badgeY = ribbonY + 54;

  ctx.fillStyle = '#064e3b';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 19);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  const classLabel = student.class.toLowerCase().startsWith('kelas') ? student.class : `Kelas ${student.class}`;
  ctx.fillText(`${classLabel}  •  NIS: ${student.nis}`, width / 2, badgeY + 25);

  // 7. Values Bar
  const valY = 765;
  const valW = 540;
  const valH = 95;
  const valX = (width - valW) / 2;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, valX, valY, valW, valH, 20);
  ctx.fill();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4 Columns
  const colW = valW / 4;
  const labels = ['SANTRI', 'ILMU', 'AMAL', 'MANFAAT'];
  const symbols = ['📖', '🎓', '🌱', '📈'];

  for (let i = 0; i < 4; i++) {
    const cx = valX + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.font = '26px sans-serif';
    ctx.fillText(symbols[i], cx, valY + 45);

    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(labels[i], cx, valY + 76);

    // Dividers
    if (i < 3) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(valX + colW * (i + 1), valY + 15);
      ctx.lineTo(valX + colW * (i + 1), valY + valH - 15);
      ctx.stroke();
    }
  }

  // Footer micro-text
  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ILMU • ADAB • AMAL • MANFAAT', 55, 930);

  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'right';
  ctx.fillText('★ RNH KARTU DIGITAL', width - 55, 930);

  return canvas;
}

/**
 * Render Back Card to an HTML Canvas (dimensions 640 x 1015 px)
 */
export async function renderBackCardToCanvas(
  student: StudentCardInfo,
  config: CardRenderConfig
): Promise<HTMLCanvasElement> {
  const width = 640;
  const height = 1015;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Draw base background
  const bgUrl = config.backBgUrl || '/Assets/Kartublakang.png';
  try {
    const bgImg = await loadImage(bgUrl);
    ctx.drawImage(bgImg, 0, 0, width, height);
  } catch {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#032e20');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#022116');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Outer gold borders
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Top right star rosette
  ctx.fillStyle = '#eab308';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('۞', width - 50, 60);

  // 2. Header
  const headerY = 55;
  drawShieldLogo(ctx, (width - 70) / 2, headerY, 70, 70);

  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(config.schoolType.toUpperCase(), width / 2, headerY + 105);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px sans-serif';
  ctx.fillText(config.schoolName, width / 2, headerY + 138);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '600 14px sans-serif';
  ctx.fillText(config.schoolLocation.toUpperCase(), width / 2, headerY + 160);

  ctx.fillStyle = '#fde047';
  ctx.font = 'italic 500 13px sans-serif';
  ctx.fillText(config.schoolMotto, width / 2, headerY + 180);

  // 3. Central QR Code Box
  const qrBoxSize = 290;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 410;

  // Box shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, qrBoxX + 4, qrBoxY + 4, qrBoxSize, qrBoxSize, 28);
  ctx.fill();

  // White container
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Load and draw QR Code
  const qrData = `${student.nis},${config.schoolCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  try {
    const qrImg = await loadImage(qrUrl);
    ctx.drawImage(qrImg, qrBoxX + 25, qrBoxY + 25, qrBoxSize - 50, qrBoxSize - 50);
  } catch {
    ctx.fillStyle = '#64748b';
    ctx.font = '16px sans-serif';
    ctx.fillText('QR Code Gagal Dimuat', width / 2, qrBoxY + qrBoxSize / 2);
  }

  // Label: SCAN UNTUK VERIFIKASI DATA
  const labelY = qrBoxY + qrBoxSize + 40;
  ctx.fillStyle = '#02261b';
  roundRect(ctx, width / 2 - 180, labelY - 26, 360, 42, 21);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('✔  SCAN UNTUK VERIFIKASI DATA', width / 2, labelY + 2);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`NIS: ${student.nis}`, width / 2, labelY + 36);

  // 4. Motivational Quote at Bottom
  const quoteY = 875;
  ctx.fillStyle = '#fef08a';
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText(`“${config.quote}”`, width / 2, quoteY);

  ctx.fillStyle = '#eab308';
  ctx.font = '14px sans-serif';
  ctx.fillText('◆  ─────  ۞  ─────  ◆', width / 2, quoteY + 32);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 12px sans-serif';
  ctx.fillText('SISTEM TABUNGAN & PRESENSI SANTRI', width / 2, quoteY + 60);

  return canvas;
}

// Helpers
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShieldLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.fillStyle = '#064e3b';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★★★', x + w / 2, y + 18);

  ctx.font = '900 19px sans-serif';
  ctx.fillText('RNH', x + w / 2, y + 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('TEGAL', x + w / 2, y + 62);
  ctx.restore();
}

function drawSantriSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2 + 10;

  // Peci (white cap)
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, cx - 35, cy - 70, 70, 24, 6);
  ctx.fill();

  // Face
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(cx, cy - 20, 36, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders & Shirt
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 50, 65, 45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SANTRI', cx, y + h - 15);
  ctx.restore();
}
