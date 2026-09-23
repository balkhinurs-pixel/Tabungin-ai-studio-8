/**
 * High-resolution canvas renderer for printing Santri ID Cards.
 * Coordinates are mapped 1:1 to the official 848x1264 px template assets
 * (public/Assets/Kartu-depan.webp & public/Assets/Kartublakang.webp).
 */

export interface CardRenderConfig {
  schoolCode: string;
  frontBgUrl?: string;
  backBgUrl?: string;
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
 * Render Front Card to an HTML Canvas at 848 x 1264 px (native asset resolution)
 */
export async function renderFrontCardToCanvas(
  student: StudentCardInfo,
  config: CardRenderConfig
): Promise<HTMLCanvasElement> {
  const width = 848;
  const height = 1264;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Draw background image containing all card borders, headers, arch, ribbon, and pillars
  const candidateUrls = [
    config.frontBgUrl,
    '/Assets/Kartu-depan.webp',
    '/Assets/Kartu-dpn.webp',
    '/Assets/Kartu-depan.png'
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
    // Fallback if background image couldn't load
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#032e20');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#022116');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Draw Student Photo inside the Mihrab Arch Window
  // Coordinates based on 848x1264 asset:
  // Arch inner: x=200 to 648 (w=448), y=242 to 690 (h=448)
  const archX = 200;
  const archY = 242;
  const archW = 448;
  const archH = 448;

  ctx.save();
  ctx.beginPath();
  // Islamic arch path: straight bottom, vertical sides, and curved dome at top
  ctx.moveTo(archX, archY + archH);
  ctx.lineTo(archX, archY + 160);
  ctx.bezierCurveTo(archX, archY - 10, archX + archW, archY - 10, archX + archW, archY + 160);
  ctx.lineTo(archX + archW, archY + archH);
  ctx.closePath();
  ctx.clip();

  // Background behind photo (in case photo is transparent)
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(archX, archY, archW, archH);

  if (student.avatar_url) {
    try {
      const avatarImg = await loadImage(student.avatar_url);
      // Center and cover the photo in the arch
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
        drawY = archY; // align to top
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
  // Asset ribbon center: x = 424, y = 798
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(student.name.toUpperCase(), 424, 798, 520);

  // 4. Draw Class & NIS inside the Green Pill Badge
  // Asset green pill center: x = 424, y = 856
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const classText = student.class ? (student.class.toLowerCase().startsWith('kelas') ? student.class : `Kelas ${student.class}`) : '';
  const label = classText ? `${classText.toUpperCase()}  •  NIS: ${student.nis}` : `NIS: ${student.nis}`;
  ctx.fillText(label, 424, 856, 420);

  return canvas;
}

/**
 * Render Back Card to an HTML Canvas at 848 x 1264 px (native asset resolution)
 */
export async function renderBackCardToCanvas(
  student: StudentCardInfo,
  config: CardRenderConfig
): Promise<HTMLCanvasElement> {
  const width = 848;
  const height = 1264;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Draw background image containing header, arch, white QR box, gold badge, and Quran verse
  const candidateUrls = [
    config.backBgUrl,
    '/Assets/Kartublakang.webp',
    '/Assets/Kartu-blkng.webp',
    '/Assets/Kartublakang.png'
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
  // The asset's white box is from x=228 to 619 (w=391), y=370 to 749 (h=379)
  // With 22px internal padding for clean framing:
  const qrX = 250;
  const qrY = 392;
  const qrSize = 348;

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
    ctx.fillText('QR Code Gagal Dimuat', 424, 560);
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
