import type { ToolRunner, ToolRunnerResult, RunnerOptions, SimpleModeOutput } from './types';
import { calcReductionPct } from '../utils';
import { zipSync } from 'fflate';

// ── Shared Helpers ────────────────────────────────────────────────────────────

export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      while (i < bytes.length) out.push(bytes[i++]);
      break;
    }
    const marker = bytes[i + 1];
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xd9) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }
    if (marker === 0xda) {
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      for (let j = 0; j < len + 2 && i + j < bytes.length; j++) out.push(bytes[i + j]);
      i += len + 2;
      while (i < bytes.length) {
        out.push(bytes[i]);
        if (bytes[i] === 0xff && i + 1 < bytes.length && bytes[i + 1] === 0xd9) {
          out.push(bytes[i + 1]);
          i += 2;
          break;
        }
        i++;
      }
      break;
    }
    if (i + 4 > bytes.length) break;
    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
    const strip = marker === 0xe1 || (marker >= 0xe2 && marker <= 0xef) || marker === 0xfe;
    if (!strip) {
      for (let j = 0; j < segLen + 2 && i + j < bytes.length; j++) out.push(bytes[i + j]);
    }
    i += segLen + 2;
  }
  return new Uint8Array(out);
}

export function minifySvg(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
    .replace(/\s+xmlns:(inkscape|sodipodi|sketch|i|adobe)="[^"]*"/gi, '')
    .replace(/\s+(inkscape|sodipodi|sketch):[a-zA-Z0-9_-]+="[^"]*"/gi, '')
    .replace(/\s+version="1\.[01]"/gi, '')
    .replace(/\s+xml:space="preserve"/gi, '')
    .replace(/>\s+</g, '><')
    .trim();
}

export function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image into browser canvas'));
    };
    img.src = url;
  });
}

export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r') {
        // Skip CR
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        if (currentRow.some(val => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(val => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ── Image Runners ─────────────────────────────────────────────────────────────

async function runImageCompressor(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const quality = typeof options?.quality === 'number' ? options.quality : 80;
  const buffer = await file.arrayBuffer();
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'svg' || file.type.includes('svg')) {
    const text = new TextDecoder().decode(buffer);
    const minified = minifySvg(text);
    const outBlob = new Blob([minified], { type: 'image/svg+xml' });
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return {
      blob: outBlob,
      filename: `${baseName}_compressed.svg`,
      metadata: {
        'Original Size': file.size,
        'Compressed Size': outBlob.size,
        'Saved': Math.max(0, file.size - outBlob.size),
        'Reduction': `${calcReductionPct(file.size, outBlob.size)}%`,
      },
    };
  }

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.drawImage(img, 0, 0);

  const qFactor = Math.max(0.05, Math.min(1, quality / 100));
  let targetMime = file.type || 'image/jpeg';
  if (!targetMime.startsWith('image/')) targetMime = 'image/jpeg';

  let rawBlob: Blob;
  if (targetMime === 'image/jpeg') {
    rawBlob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), 'image/jpeg', qFactor)
    );
    const stripped = stripJpegMetadata(new Uint8Array(await rawBlob.arrayBuffer()));
    rawBlob = new Blob([stripped as unknown as BlobPart], { type: 'image/jpeg' });
  } else if (targetMime === 'image/webp') {
    rawBlob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), 'image/webp', qFactor)
    );
  } else {
    rawBlob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime)
    );
  }

  // Use smaller between original and compressed
  const finalBlob = rawBlob.size < file.size ? rawBlob : new Blob([buffer], { type: file.type });
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const outExt = ext || (targetMime === 'image/png' ? 'png' : targetMime === 'image/webp' ? 'webp' : 'jpg');

  return {
    blob: finalBlob,
    filename: `${baseName}_compressed.${outExt}`,
    metadata: {
      'Quality': `${quality}%`,
      'Dimensions': `${canvas.width} × ${canvas.height}`,
      'Reduction': `${calcReductionPct(file.size, finalBlob.size)}%`,
    },
  };
}

async function runImageResizer(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  let targetW = options?.width ? Number(options.width) : Math.round(origW * 0.5);
  let targetH = options?.height ? Number(options.height) : Math.round(origH * 0.5);

  if (options?.lockRatio !== false) {
    if (options?.width && !options?.height) {
      targetH = Math.round((targetW / origW) * origH);
    } else if (options?.height && !options?.width) {
      targetW = Math.round((targetH / origH) * origW);
    }
  }

  targetW = Math.max(1, Math.min(16384, targetW));
  targetH = Math.max(1, Math.min(16384, targetH));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const targetMime = (typeof options?.format === 'string' ? options.format : file.type) || 'image/jpeg';
  const rawQ = typeof options?.quality === 'number' ? options.quality : 90;
  const quality = rawQ / 100;
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, quality)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = targetMime === 'image/png' ? 'png' : targetMime === 'image/webp' ? 'webp' : 'jpg';

  return {
    blob,
    filename: `${baseName}_resized_${targetW}x${targetH}.${ext}`,
    metadata: {
      'Original Dimensions': `${origW} × ${origH}`,
      'New Dimensions': `${targetW} × ${targetH}`,
    },
  };
}

async function runImageRotator(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const angle = Number(options?.angle ?? 90);
  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  const rad = (angle * Math.PI) / 180;
  const is90or270 = Math.abs(angle % 180) === 90;

  canvas.width = is90or270 ? origH : origW;
  canvas.height = is90or270 ? origW : origH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -origW / 2, -origH / 2);

  const targetMime = file.type || 'image/png';
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, 0.92)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop() || 'png';

  return {
    blob,
    filename: `${baseName}_rotated_${angle}deg.${ext}`,
    metadata: {
      'Rotation': `${angle}°`,
      'Dimensions': `${canvas.width} × ${canvas.height}`,
    },
  };
}

async function runImageFlipper(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const direction = (options?.direction as string) || 'horizontal';
  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = origW;
  canvas.height = origH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const scaleX = direction === 'horizontal' || direction === 'both' ? -1 : 1;
  const scaleY = direction === 'vertical' || direction === 'both' ? -1 : 1;

  ctx.translate(scaleX === -1 ? origW : 0, scaleY === -1 ? origH : 0);
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(img, 0, 0);

  const targetMime = file.type || 'image/png';
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, 0.92)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop() || 'png';

  return {
    blob,
    filename: `${baseName}_flipped_${direction}.${ext}`,
    metadata: {
      'Direction': direction,
      'Dimensions': `${canvas.width} × ${canvas.height}`,
    },
  };
}

async function runImageConverter(
  file: File,
  targetMime: string,
  targetExt: string,
  quality = 0.9
): Promise<ToolRunnerResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Fill white background for non-alpha formats like JPEG
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, quality)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return {
    blob,
    filename: `${baseName}.${targetExt}`,
    metadata: {
      'Converted Format': targetExt.toUpperCase(),
      'Dimensions': `${canvas.width} × ${canvas.height}`,
    },
  };
}

async function runImageCropper(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Default to 1:1 center crop or custom aspect ratio
  const ratio = (options?.aspectRatio as string) || '1:1';
  let cropW = origW;
  let cropH = origH;

  if (ratio === '1:1') {
    const size = Math.min(origW, origH);
    cropW = size;
    cropH = size;
  } else if (ratio === '16:9') {
    if (origW / origH > 16 / 9) {
      cropH = origH;
      cropW = Math.round(origH * (16 / 9));
    } else {
      cropW = origW;
      cropH = Math.round(origW * (9 / 16));
    }
  } else if (ratio === '4:3') {
    if (origW / origH > 4 / 3) {
      cropH = origH;
      cropW = Math.round(origH * (4 / 3));
    } else {
      cropW = origW;
      cropH = Math.round(origW * (3 / 4));
    }
  }

  const startX = Math.round((origW - cropW) / 2);
  const startY = Math.round((origH - cropH) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

  const targetMime = file.type || 'image/png';
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, 0.92)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop() || 'png';

  return {
    blob,
    filename: `${baseName}_cropped_${cropW}x${cropH}.${ext}`,
    metadata: {
      'Ratio': ratio,
      'Dimensions': `${cropW} × ${cropH}`,
    },
  };
}

async function runImageGrayscale(file: File): Promise<ToolRunnerResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.filter = 'grayscale(100%)';
  ctx.drawImage(img, 0, 0);

  const targetMime = file.type || 'image/png';
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, 0.9)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop() || 'png';

  return {
    blob,
    filename: `${baseName}_grayscale.${ext}`,
    metadata: {
      'Filter': 'Grayscale 100%',
      'Dimensions': `${canvas.width} × ${canvas.height}`,
    },
  };
}

async function runImageBlur(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const radius = Number(options?.radius ?? 8);
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(img, 0, 0);

  const targetMime = file.type || 'image/png';
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, 0.9)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop() || 'png';

  return {
    blob,
    filename: `${baseName}_blurred_${radius}px.${ext}`,
    metadata: {
      'Blur Radius': `${radius}px`,
      'Dimensions': `${canvas.width} × ${canvas.height}`,
    },
  };
}

async function runImageWatermark(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const text = (options?.text as string) || 'whysogood.app';
  const opacity = Number(options?.opacity ?? 0.35);
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(img, 0, 0);

  // Draw semi-transparent watermark across center
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, Math.min(1, opacity));
  const fontSize = Math.max(16, Math.round(canvas.width / 20));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-25 * Math.PI) / 180);
  ctx.fillText(text, 0, 0);
  ctx.restore();

  const targetMime = file.type || 'image/png';
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), targetMime, 0.92)
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop() || 'png';

  return {
    blob,
    filename: `${baseName}_watermarked.${ext}`,
    metadata: {
      'Watermark Text': text,
      'Dimensions': `${canvas.width} × ${canvas.height}`,
    },
  };
}

async function runBackgroundRemover(file: File): Promise<ToolRunnerResult> {
  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const resultBlob = await removeBackground(file, {
      model: 'isnet_quint8',
    });
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return {
      blob: resultBlob,
      filename: `${baseName}_no_bg.png`,
      metadata: {
        'Engine': 'On-Device AI (ISNet)',
        'Output Format': 'PNG (Transparent)',
      },
    };
  } catch (err: unknown) {
    console.warn('AI model execution failed, creating clean transparent cutout fallback:', err);
    // Graceful fallback for environments where WebAssembly ONNX runtimes are constrained
    const img = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Sample corner pixel color as background candidate
    const bgR = d[0];
    const bgG = d[1];
    const bgB = d[2];
    const threshold = 35;

    for (let i = 0; i < d.length; i += 4) {
      const diff = Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB);
      if (diff < threshold) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const outBlob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), 'image/png')
    );
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return {
      blob: outBlob,
      filename: `${baseName}_no_bg.png`,
      metadata: {
        'Engine': 'Client-Side Cutout',
        'Output Format': 'PNG (Transparent)',
      },
    };
  }
}

// ── PDF Runners ───────────────────────────────────────────────────────────────

async function runPdfCompressor(file: File): Promise<ToolRunnerResult> {
  const { PDFDocument } = await import('pdf-lib');
  const buffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  // Clean heavy metadata strings
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('whysogood');
  pdfDoc.setCreator('whysogood');

  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  const finalBytes = compressedBytes.length < file.size ? compressedBytes : new Uint8Array(buffer);
  const outBlob = new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return {
    blob: outBlob,
    filename: `${baseName}_compressed.pdf`,
    metadata: {
      'Page Count': pdfDoc.getPageCount(),
      'Original Size': file.size,
      'Compressed Size': outBlob.size,
      'Reduction': `${calcReductionPct(file.size, outBlob.size)}%`,
    },
  };
}

async function runPdfRotator(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const { PDFDocument, degrees } = await import('pdf-lib');
  const buffer = await file.arrayBuffer();
  const angle = Number(options?.angle ?? 90);

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  pages.forEach(page => {
    const currentRot = page.getRotation().angle;
    page.setRotation(degrees((currentRot + angle) % 360));
  });

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const outBlob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return {
    blob: outBlob,
    filename: `${baseName}_rotated_${angle}deg.pdf`,
    metadata: {
      'Rotation': `${angle}°`,
      'Pages Rotated': pages.length,
    },
  };
}

async function runPdfWatermark(file: File, options?: RunnerOptions): Promise<ToolRunnerResult> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');
  const buffer = await file.arrayBuffer();
  const text = (options?.text as string) || 'CONFIDENTIAL';

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  pages.forEach(page => {
    const { width, height } = page.getSize();
    const fontSize = Math.max(20, Math.round(width / 14));
    page.drawText(text, {
      x: width / 6,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.35,
      rotate: degrees(45),
    });
  });

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const outBlob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return {
    blob: outBlob,
    filename: `${baseName}_watermarked.pdf`,
    metadata: {
      'Watermark Text': text,
      'Pages Watermarked': pages.length,
    },
  };
}

async function runPdfToImages(
  file: File,
  format: 'image/jpeg' | 'image/png',
  ext: 'jpg' | 'png',
  options?: RunnerOptions
): Promise<ToolRunnerResult> {
  const { getPdfJs } = await import('../pdfUtils');
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error('PDF.js renderer not available in browser');

  const buffer = await file.arrayBuffer();
  const safeData = new Uint8Array(buffer).slice();
  const doc = await pdfjs.getDocument({ data: safeData }).promise;
  const dpi = Number(options?.dpi ?? 150);
  const scale = dpi / 72;

  // Render first page as standard output (or all pages if multi)
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), format, 0.9)
  );

  const baseName = file.name.replace(/\.pdf$/i, '');
  return {
    blob,
    filename: `${baseName}_page1.${ext}`,
    metadata: {
      'Total PDF Pages': doc.numPages,
      'Resolution': `${Math.round(viewport.width)} × ${Math.round(viewport.height)}`,
      'DPI': dpi,
    },
  };
}

async function runPdfToText(file: File): Promise<ToolRunnerResult> {
  const { getPdfJs } = await import('../pdfUtils');
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error('PDF.js renderer not available');

  const buffer = await file.arrayBuffer();
  const safeData = new Uint8Array(buffer).slice();
  const doc = await pdfjs.getDocument({ data: safeData }).promise;

  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items as Array<{ str?: string }>).map(item => item.str || '').filter(Boolean);
    fullText += `=== Page ${i} ===\n\n${strings.join(' ')}\n\n`;
  }

  const outBlob = new Blob([fullText.trim()], { type: 'text/plain;charset=utf-8' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return {
    blob: outBlob,
    filename: `${baseName}_extracted_text.txt`,
    metadata: {
      'Total Pages': doc.numPages,
      'Extracted Characters': fullText.length,
    },
  };
}

// ── Data, Developer & Text Runners ─────────────────────────────────────────────

async function runCsvToJson(file: File): Promise<ToolRunnerResult> {
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('CSV file appears empty or unparseable');

  const headers = rows[0];
  const items = rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h || `column_${idx + 1}`] = row[idx] ?? '';
    });
    return obj;
  });

  const jsonStr = JSON.stringify(items, null, 2);
  const outBlob = new Blob([jsonStr], { type: 'application/json' });
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob: outBlob,
    filename: `${baseName}.json`,
    metadata: {
      'Rows Parsed': items.length,
      'Columns': headers.length,
    },
  };
}

async function runJsonFormatter(file: File): Promise<ToolRunnerResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON syntax: ' + (err instanceof Error ? err.message : String(err)));
  }

  const formatted = JSON.stringify(parsed, null, 2);
  const outBlob = new Blob([formatted], { type: 'application/json' });
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob: outBlob,
    filename: `${baseName}_formatted.json`,
    metadata: {
      'Formatted Bytes': outBlob.size,
    },
  };
}

async function runWordCounter(file: File): Promise<ToolRunnerResult> {
  const text = await file.text();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s+/g, '').length;
  const lines = text.split('\n').length;
  const readTimeMin = Math.max(1, Math.ceil(words / 200));

  const report = [
    `Word & Text Analysis Report`,
    `Source: ${file.name}`,
    `Generated: ${new Date().toLocaleString()}`,
    `----------------------------------------`,
    `Words: ${words.toLocaleString()}`,
    `Characters (with spaces): ${chars.toLocaleString()}`,
    `Characters (without spaces): ${charsNoSpaces.toLocaleString()}`,
    `Lines: ${lines.toLocaleString()}`,
    `Estimated Reading Time: ~${readTimeMin} minute(s)`,
    `----------------------------------------`,
  ].join('\n');

  const outBlob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob: outBlob,
    filename: `${baseName}_word_count.txt`,
    metadata: {
      'Words': words,
      'Characters': chars,
      'Reading Time': `~${readTimeMin} min`,
    },
  };
}

async function runBase64Encoder(file: File): Promise<ToolRunnerResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const base64 = btoa(binary);

  const outBlob = new Blob([base64], { type: 'text/plain;charset=utf-8' });
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob: outBlob,
    filename: `${baseName}_base64.txt`,
    metadata: {
      'Input Size': file.size,
      'Base64 Length': base64.length,
    },
  };
}

// ── Tool Runner Registry Mapping ─────────────────────────────────────────────

export const TOOL_RUNNERS: Record<string, ToolRunner> = {
  // Images
  'image-compressor': {
    slug: 'image-compressor',
    name: 'Image Compressor',
    category: 'Images',
    description: 'Compress JPG, PNG, WebP, SVG with quality control',
    run: runImageCompressor,
  },
  'image-resizer': {
    slug: 'image-resizer',
    name: 'Image Resizer',
    category: 'Images',
    description: 'Resize dimensions maintaining aspect ratio',
    run: runImageResizer,
  },
  'image-rotator': {
    slug: 'image-rotator',
    name: 'Image Rotator',
    category: 'Images',
    description: 'Rotate 90°, 180°, or 270°',
    run: runImageRotator,
  },
  'image-flipper': {
    slug: 'image-flipper',
    name: 'Image Flipper',
    category: 'Images',
    description: 'Flip horizontally or vertically',
    run: runImageFlipper,
  },
  'image-cropper': {
    slug: 'image-cropper',
    name: 'Image Cropper',
    category: 'Images',
    description: 'Crop to standard ratios (1:1, 16:9, 4:3)',
    run: runImageCropper,
  },
  'image-converter': {
    slug: 'image-converter',
    name: 'Image Converter',
    category: 'Images',
    description: 'Convert between PNG, JPG, and WebP',
    run: (file, opts) => {
      const format = (opts?.targetFormat as string) || 'image/png';
      const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
      const rawQ = typeof opts?.quality === 'number' ? opts.quality : 90;
      return runImageConverter(file, format, ext, rawQ / 100);
    },
  },
  'image-grayscale': {
    slug: 'image-grayscale',
    name: 'Image Grayscale',
    category: 'Images',
    description: 'Convert image to black & white grayscale',
    run: runImageGrayscale,
  },
  'image-blur': {
    slug: 'image-blur',
    name: 'Image Blur',
    category: 'Images',
    description: 'Apply soft or heavy gaussian blur',
    run: runImageBlur,
  },
  'image-watermark': {
    slug: 'image-watermark',
    name: 'Image Watermark',
    category: 'Images',
    description: 'Overlay custom watermark text',
    run: runImageWatermark,
  },
  'background-remover': {
    slug: 'background-remover',
    name: 'Background Remover',
    category: 'Images',
    description: 'AI-powered on-device transparent cutout',
    run: runBackgroundRemover,
  },
  'jpg-to-png': {
    slug: 'jpg-to-png',
    name: 'JPG → PNG',
    category: 'Images',
    description: 'Convert JPEG image to PNG format',
    run: file => runImageConverter(file, 'image/png', 'png'),
  },
  'png-to-jpg': {
    slug: 'png-to-jpg',
    name: 'PNG → JPG',
    category: 'Images',
    description: 'Convert PNG image to JPEG format',
    run: file => runImageConverter(file, 'image/jpeg', 'jpg'),
  },
  'jpg-to-webp': {
    slug: 'jpg-to-webp',
    name: 'JPG → WebP',
    category: 'Images',
    description: 'Convert JPEG image to modern WebP format',
    run: file => runImageConverter(file, 'image/webp', 'webp'),
  },
  'png-to-webp': {
    slug: 'png-to-webp',
    name: 'PNG → WebP',
    category: 'Images',
    description: 'Convert PNG image to modern WebP format',
    run: file => runImageConverter(file, 'image/webp', 'webp'),
  },
  'webp-to-jpg': {
    slug: 'webp-to-jpg',
    name: 'WebP → JPG',
    category: 'Images',
    description: 'Convert WebP image to standard JPEG',
    run: file => runImageConverter(file, 'image/jpeg', 'jpg'),
  },
  'webp-to-png': {
    slug: 'webp-to-png',
    name: 'WebP → PNG',
    category: 'Images',
    description: 'Convert WebP image to PNG format',
    run: file => runImageConverter(file, 'image/png', 'png'),
  },
  'svg-to-png': {
    slug: 'svg-to-png',
    name: 'SVG → PNG',
    category: 'Images',
    description: 'Rasterize vector SVG to crisp PNG',
    run: file => runImageConverter(file, 'image/png', 'png'),
  },
  'svg-to-jpg': {
    slug: 'svg-to-jpg',
    name: 'SVG → JPG',
    category: 'Images',
    description: 'Rasterize vector SVG to JPEG',
    run: file => runImageConverter(file, 'image/jpeg', 'jpg'),
  },

  // PDF
  'pdf-compressor': {
    slug: 'pdf-compressor',
    name: 'PDF Compressor',
    category: 'PDF',
    description: 'Optimize PDF streams and clean metadata',
    run: runPdfCompressor,
  },
  'pdf-rotator': {
    slug: 'pdf-rotator',
    name: 'PDF Rotator',
    category: 'PDF',
    description: 'Rotate all PDF pages 90°, 180°, or 270°',
    run: runPdfRotator,
  },
  'pdf-watermark': {
    slug: 'pdf-watermark',
    name: 'PDF Watermark',
    category: 'PDF',
    description: 'Stamp diagonal watermark text on pages',
    run: runPdfWatermark,
  },
  'pdf-to-jpg': {
    slug: 'pdf-to-jpg',
    name: 'PDF → JPG',
    category: 'PDF',
    description: 'Render PDF page into high-res JPG',
    run: (file, opts) => runPdfToImages(file, 'image/jpeg', 'jpg', opts),
  },
  'pdf-to-png': {
    slug: 'pdf-to-png',
    name: 'PDF → PNG',
    category: 'PDF',
    description: 'Render PDF page into crisp PNG',
    run: (file, opts) => runPdfToImages(file, 'image/png', 'png', opts),
  },
  'pdf-to-text': {
    slug: 'pdf-to-text',
    name: 'PDF → Text',
    category: 'PDF',
    description: 'Extract raw text content into .txt file',
    run: runPdfToText,
  },

  // Data
  'csv-to-json': {
    slug: 'csv-to-json',
    name: 'CSV → JSON',
    category: 'Data',
    description: 'Convert CSV spreadsheet to structured JSON',
    run: runCsvToJson,
  },

  // Developer
  'json-formatter': {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    category: 'Developer',
    description: 'Validate and pretty-print JSON',
    run: runJsonFormatter,
  },

  // Text
  'word-counter': {
    slug: 'word-counter',
    name: 'Word Counter',
    category: 'Text',
    description: 'Analyze word count, reading time, and metrics',
    run: runWordCounter,
  },

  // Security
  'base64-encoder': {
    slug: 'base64-encoder',
    name: 'Base64 Encoder',
    category: 'Security',
    description: 'Encode any file into Base64 text string',
    run: runBase64Encoder,
  },
};

/**
 * Checks whether a given tool slug has an active in-browser execution runner.
 */
export function isToolExecutable(slug: string): boolean {
  return Boolean(TOOL_RUNNERS[slug]);
}

/**
 * Executes a tool runner against the provided File instance.
 */
export async function executeTool(
  slug: string,
  file: File,
  options?: RunnerOptions
): Promise<ToolRunnerResult> {
  const runner = TOOL_RUNNERS[slug];
  if (!runner) {
    throw new Error(`Execution runner for "${slug}" is not currently available.`);
  }
  return runner.run(file, options);
}

/**
 * Bundles all generated outputs into a single .zip archive using fflate.
 */
export async function createOutputsZip(outputs: SimpleModeOutput[]): Promise<Blob> {
  const filesMap: Record<string, Uint8Array> = {};
  const nameCount: Record<string, number> = {};

  for (const item of outputs) {
    let name = item.outputFilename;
    if (nameCount[name]) {
      const parts = name.split('.');
      const ext = parts.pop() || '';
      name = `${parts.join('.')}_(${nameCount[name]}).${ext}`;
      nameCount[item.outputFilename]++;
    } else {
      nameCount[name] = 1;
    }
    const buf = new Uint8Array(await item.blob.arrayBuffer());
    filesMap[name] = buf;
  }

  const zipData = zipSync(filesMap, { level: 6 });
  return new Blob([zipData as unknown as BlobPart], { type: 'application/zip' });
}
