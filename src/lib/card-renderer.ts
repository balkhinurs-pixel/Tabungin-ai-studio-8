/**
 * High-resolution canvas renderer for printing Santri ID Cards.
 * Coordinates are mapped 1:1 to the official 848x1264 px template assets
 * (public/Assets/Kartu-depan.webp & public/Assets/Kartublakang.webp).
 */

export interface CardRenderConfig {
  schoolCode: string;
  frontBgUrl?: string;
  backBgUrl?: string;
  onlyPhotoAndName?: boolean;
  // Optional legacy fields if needed
  schoolName?: string;
  schoolType?: string;
  schoolLocation?: string;
  schoolMotto?: string;
  quote?: string;
  logoUrl?: string | null;
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
 * Render Front Card to an HTML Canvas
 * Supports both high-res templates:
 * - Kartu-dpn.webp (512x768 -> scaled to 1024x1536, only photo and name)
 * - Kartu-depan.webp (848x1264, photo, name, class & NIS)
 */
export async function renderFrontCardToCanvas(
  student: StudentCardInfo,
  config: CardRenderConfig
): Promise<HTMLCanvasElement> {
  const isDpnTemplate =
    config.onlyPhotoAndName ||
    config.frontBgUrl === '/Assets/Kartu-dpn.webp' ||
    Boolean(config.frontBgUrl?.includes('Kartu-dpn'));

  const width = isDpnTemplate ? 1024 : 848;
  const height = isDpnTemplate ? 1536 : 1264;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Draw background image
  const primaryBg = config.frontBgUrl || (isDpnTemplate ? '/Assets/Kartu-dpn.webp' : '/Assets/Kartu-depan.webp');
  const candidateUrls = [
    primaryBg,
    isDpnTemplate ? '/Assets/Kartu-dpn.webp' : '/Assets/Kartu-depan.webp',
    isDpnTemplate ? '/Assets/Kartu-depan.webp' : '/Assets/Kartu-dpn.webp',
    '/Assets/Kartu-depan.png',
  ].filter(Boolean) as string[];

  let bgImg: HTMLImageElement | null = null;
  for (const url of candidateUrls) {
    try {
      bgImg = await loadImage(url);
      if (bgImg) break;
    } catch {}
  }

  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#032e20');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#022116');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Draw Student Photo inside the Mihrab Arch Window
  let archX: number, archY: number, archW: number, archH: number;
  if (isDpnTemplate) {
    // Exact mapping for 1024x1536 (2x scale of 512x768):
    // 512x768 arch: x=155..355 (w=200), y=215..535 (h=320)
    archX = 306;
    archY = 428;
    archW = 412;
    archH = 638;
  } else {
    // 848x1264 layout
    archX = 200;
    archY = 242;
    archW = 448;
    archH = 448;
  }

  ctx.save();
  ctx.beginPath();
  // Islamic arch dome path: straight bottom, vertical sides, and curved dome at top
  const domeHeight = isDpnTemplate ? 230 : 160;
  ctx.moveTo(archX, archY + archH);
  ctx.lineTo(archX, archY + domeHeight);
  ctx.bezierCurveTo(archX, archY - 10, archX + archW, archY - 10, archX + archW, archY + domeHeight);
  ctx.lineTo(archX + archW, archY + archH);
  ctx.closePath();
  ctx.clip();

  // Background behind photo
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(archX, archY, archW, archH);

  if (student.avatar_url) {
    try {
      const avatarImg = await loadImage(student.avatar_url);
      const imgAspect = avatarImg.width / avatarImg.height;
      const boxAspect = archW / archH;
      let drawW = archW;
      let drawH = archH;
      let drawX = archX;
      let drawY = archY;

      if (imgAspect > boxAspect) {
        drawW = archH * imgAspect;
        drawX = archX - (drawW - archW) / 2;
      } else {
        drawH = archW / imgAspect;
        drawY = archY;
      }

      ctx.drawImage(avatarImg, drawX, drawY, drawW, drawH);
    } catch {
      drawSantriSilhouette(ctx, archX, archY, archW, archH);
    }
  } else {
    drawSantriSilhouette(ctx, archX, archY, archW, archH);
  }
  ctx.restore();

  // 3. Draw Student Name inside the White Ribbon
  if (isDpnTemplate) {
    // 1024x1536 ribbon center: x = 512, y = 1130
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(student.name.toUpperCase(), 512, 1130, 720);
    // 4. Draw NIS Number inside the Green Pill Badge below Name
    if (student.nis) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`NIS: ${student.nis}`, 512, 1204, 480);
    }
  } else {
    // 848x1264 ribbon center: x = 424, y = 798
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(student.name.toUpperCase(), 424, 798, 520);

    // 4. Draw Class & NIS inside the Green Pill Badge (standard Ribath template only)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const classText = student.class ? (student.class.toLowerCase().startsWith('kelas') ? student.class : `Kelas ${student.class}`) : '';
    const label = classText ? `${classText.toUpperCase()}  •  NIS: ${student.nis}` : `NIS: ${student.nis}`;
    ctx.fillText(label, 424, 856, 420);
  }

  return canvas;
}

/**
 * Render Back Card to an HTML Canvas
 */
export async function renderBackCardToCanvas(
  student: StudentCardInfo,
  config: CardRenderConfig
): Promise<HTMLCanvasElement> {
  const isBlkngTemplate =
    config.onlyPhotoAndName ||
    config.backBgUrl === '/Assets/Kartu-blkng.webp' ||
    Boolean(config.backBgUrl?.includes('Kartu-blkng'));

  const width = isBlkngTemplate ? 1024 : 848;
  const height = isBlkngTemplate ? 1536 : 1264;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Draw background image
  const primaryBg = config.backBgUrl || (isBlkngTemplate ? '/Assets/Kartu-blkng.webp' : '/Assets/Kartublakang.webp');
  const candidateUrls = [
    primaryBg,
    isBlkngTemplate ? '/Assets/Kartu-blkng.webp' : '/Assets/Kartublakang.webp',
    isBlkngTemplate ? '/Assets/Kartublakang.webp' : '/Assets/Kartu-blkng.webp',
    '/Assets/Kartublakang.png',
  ].filter(Boolean) as string[];

  let bgImg: HTMLImageElement | null = null;
  for (const url of candidateUrls) {
    try {
      bgImg = await loadImage(url);
      if (bgImg) break;
    } catch {}
  }

  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#032e20');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#022116');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Draw QR Code inside the Native White Box
  let qrX: number, qrY: number, qrSize: number;
  if (isBlkngTemplate) {
    // 1024x1536 box is x=306..718 (w=412), y=578..958 (h=380)
    // QR code with clean padding inside box:
    qrSize = 340;
    qrX = 306 + (412 - qrSize) / 2;
    qrY = 578 + (380 - qrSize) / 2;
  } else {
    // 848x1264 layout
    qrX = 250;
    qrY = 392;
    qrSize = 348;
  }

  const qrData = `${student.nis},${config.schoolCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrData)}`;

  try {
    const qrImg = await loadImage(qrUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QR Code Gagal Dimuat', width / 2, height / 2);
  }

  return canvas;
}

// Helper: Silhouette if student has no photo
function drawSantriSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2 + 15;

  // Peci (white cap)
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, cx - 45, cy - 90, 90, 30, 8);
  ctx.fill();

  // Face
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(cx, cy - 25, 46, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders & Shirt
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 65, 85, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SANTRI', cx, y + h - 20);
  ctx.restore();
}

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
