// src/lib/patientExport.ts
//
// "Exportar para paciente": turn the current movement-lab pose into a clean,
// branded, plain-language handout the physiotherapist can print or send. This is
// what turns the lab from a study tool into a CONSULTATION tool (the thing that
// justifies paying for it).
//
// Fully CLIENT-SIDE: it grabs the rig's WebGL canvas (RigViewer tags it
// #rig-gl-canvas and runs with preserveDrawingBuffer:true, so its pixels can be
// read back), composites a 2D card around the snapshot, and downloads a PNG. No
// backend, no upload, no patient data leaves the device.

export interface PatientCardInfo {
  /** Big card title, e.g. "Abducción · Hombro". */
  title: string;
  /** Plain-language line of what to do. */
  instruction: string;
  /** Optional free note the therapist typed (reps / sets / frequency). */
  note?: string;
  /** Labelled facts shown as a list (label -> value). */
  facts: { label: string; value: string }[];
  /** File name stem (without extension). */
  fileStem: string;
}

/** Sky accent used across the card. */
const ACCENT = '#0ea5e9';
const INK = '#0f172a';
const MUTED = '#64748b';
const PANEL = '#0b1220';

const CARD_W = 1080;
const CARD_H = 1440;
const PAD = 64;

/** Locate the movement-lab WebGL canvas (tagged in RigViewer). */
function findRigCanvas(): HTMLCanvasElement | null {
  const byId = document.getElementById('rig-gl-canvas');
  if (byId instanceof HTMLCanvasElement) return byId;
  // Fallback: the only <canvas> on screen in the lab is the rig's.
  const all = Array.from(document.querySelectorAll('canvas'));
  return (all.find((c) => c.width > 100 && c.height > 100) as HTMLCanvasElement) ?? null;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Word-wrap `text` into lines that fit `maxW`, returns the y after the block. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineH;
  }
  return cy;
}

/**
 * Bounding box of the actual figure inside the WebGL capture, so we can crop
 * away the huge empty margins and let the body FILL the panel (the lab camera is
 * usually zoomed out to the whole body, which otherwise renders as a tiny
 * centered figure). Returns source-pixel {x,y,w,h}, or null if nothing found.
 */
function figureBBox(src: HTMLCanvasElement): { x: number; y: number; w: number; h: number } | null {
  const w = src.width;
  const h = src.height;
  if (w < 4 || h < 4) return null;
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  if (!tctx) return null;
  try {
    tctx.drawImage(src, 0, 0);
  } catch {
    return null;
  }
  let data: Uint8ClampedArray;
  try {
    data = tctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }
  // The rig canvas is transparent around the body (its dark studio bg is CSS, not
  // in the GL buffer), so alpha marks the figure. If it came back opaque, fall back
  // to luminance-difference from the top-left corner pixel.
  const alphaMode = data[3] < 250;
  const bg = [data[0], data[1], data[2]];
  const step = Math.max(1, Math.floor(Math.min(w, h) / 500));
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const content = alphaMode
        ? data[i + 3] > 24
        : Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 36;
      if (content) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const padX = (maxX - minX) * 0.08 + 12;
  const padY = (maxY - minY) * 0.08 + 12;
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(w, maxX + padX);
  maxY = Math.min(h, maxY + padY);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Draw the rig snapshot CONTAINED (whole pose visible) inside a dark panel,
 *  auto-cropped to the figure so it fills the panel instead of floating tiny. */
function drawSnapshot(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // Dark studio panel (letterbox), rounded.
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#0e1726');
  grad.addColorStop(1, PANEL);
  ctx.save();
  roundRect(ctx, x, y, w, h, 28);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();
  // Crop to the figure (falls back to the whole canvas).
  const box = figureBBox(src) ?? { x: 0, y: 0, w: src.width, h: src.height };
  const sAsp = box.w / box.h;
  const dAsp = w / h;
  let dw = w;
  let dh = h;
  if (sAsp > dAsp) {
    dh = w / sAsp;
  } else {
    dw = h * sAsp;
  }
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  try {
    ctx.drawImage(src, box.x, box.y, box.w, box.h, dx, dy, dw, dh);
  } catch {
    // Tainted/again-blank buffer: leave the panel as-is.
  }
  ctx.restore();
}

/** Trigger a browser download of a Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has grabbed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build and download the patient card as a PNG. Resolves once the download has
 * been triggered; rejects if the rig canvas can't be found or is blank.
 */
export async function exportPatientCard(info: PatientCardInfo): Promise<void> {
  const rig = findRigCanvas();
  if (!rig) throw new Error('No se encontró la escena 3D para capturar.');

  const card = document.createElement('canvas');
  card.width = CARD_W;
  card.height = CARD_H;
  const ctx = card.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la tarjeta.');

  // --- Background ---
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // --- Header: brand + "Para tu paciente" pill ---
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = '700 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('Anatris', PAD, 84);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(PAD, 98, 132, 4);

  const pill = 'PARA TU PACIENTE';
  ctx.font = '600 20px system-ui, sans-serif';
  const pillW = ctx.measureText(pill).width + 40;
  roundRect(ctx, CARD_W - PAD - pillW, 52, pillW, 40, 20);
  ctx.fillStyle = '#e0f2fe';
  ctx.fill();
  ctx.fillStyle = '#0369a1';
  ctx.fillText(pill, CARD_W - PAD - pillW + 20, 79);

  // --- Title ---
  ctx.fillStyle = INK;
  ctx.font = '800 58px system-ui, sans-serif';
  let cy = wrapText(ctx, info.title, PAD, 190, CARD_W - PAD * 2, 66);

  // --- 3D snapshot ---
  const snapY = cy + 24;
  const snapH = 560;
  drawSnapshot(ctx, rig, PAD, snapY, CARD_W - PAD * 2, snapH);

  // --- Facts list ---
  let fy = snapY + snapH + 60;
  ctx.font = '400 30px system-ui, sans-serif';
  for (const f of info.facts) {
    // accent dot
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(PAD + 8, fy - 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.font = '600 30px system-ui, sans-serif';
    const label = `${f.label}: `;
    ctx.fillText(label, PAD + 30, fy);
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = INK;
    ctx.font = '400 30px system-ui, sans-serif';
    ctx.fillText(f.value, PAD + 30 + lw, fy);
    fy += 48;
  }

  // --- Instruction / note box ---
  fy += 8;
  const boxX = PAD;
  const boxW = CARD_W - PAD * 2;
  const boxTop = fy;
  const text = info.note?.trim() ? info.note.trim() : info.instruction;
  const boxTitle = info.note?.trim() ? 'Indicaciones de tu fisioterapeuta' : 'Cómo hacerlo';
  // measure text height first
  ctx.font = '400 30px system-ui, sans-serif';
  // draw box background sized to content (title + wrapped text)
  const innerX = boxX + 28;
  const innerW = boxW - 56;
  // pre-measure wrapped lines
  const measureLines = (t: string): number => {
    const words = t.split(/\s+/);
    let line = '';
    let n = 0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > innerW && line) {
        n += 1;
        line = w;
      } else line = test;
    }
    if (line) n += 1;
    return n;
  };
  const lines = measureLines(text);
  const boxH = 34 + 40 + lines * 40 + 28;
  roundRect(ctx, boxX, boxTop, boxW, boxH, 22);
  ctx.fillStyle = '#f0f9ff';
  ctx.fill();
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, boxTop, boxW, boxH, 22);
  ctx.stroke();
  ctx.fillStyle = '#0369a1';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(boxTitle.toUpperCase(), innerX, boxTop + 44);
  ctx.fillStyle = INK;
  ctx.font = '400 30px system-ui, sans-serif';
  wrapText(ctx, text, innerX, boxTop + 90, innerW, 40);

  // --- Footer: disclaimer + date ---
  ctx.fillStyle = MUTED;
  ctx.font = '400 22px system-ui, sans-serif';
  const date = new Date().toLocaleDateString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  ctx.fillText(
    'Material educativo. No sustituye la indicación de tu fisioterapeuta.',
    PAD,
    CARD_H - 60,
  );
  ctx.fillText(`Anatris · ${date}`, PAD, CARD_H - 30);

  await new Promise<void>((resolve, reject) => {
    card.toBlob((blob) => {
      if (!blob) return reject(new Error('No se pudo generar la imagen.'));
      downloadBlob(blob, `${info.fileStem}.png`);
      resolve();
    }, 'image/png');
  });
}
