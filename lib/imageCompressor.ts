/**
 * whysogood.app — Unified Resilient Image Compression Engine
 * 
 * 3-Tier Fallback Architecture:
 * - Tier 1 (Primary): UPNG 8-bit palette quantization, safe JPEG metadata stripping (preserving APP2 ICC),
 *                     native WebP canvas, omggif animation preservation, UTIF TIFF decoding, DOMParser SVG minification.
 * - Tier 2 (Adaptive Downsampling): Canvas dimension capping (4096px / 16 MP) with progressive 50% scale steps.
 * - Tier 3 (Safety Passthrough): 100% success rate guarantee returning original valid file blob on failure/inflation.
 */

// @ts-expect-error upng-js has no bundled types
import UPNG_RAW from 'upng-js';
// @ts-expect-error omggif has no bundled types
import omggif_RAW from 'omggif';
// @ts-expect-error utif has no bundled types
import UTIF_RAW from 'utif';

// Interface definitions for untyped modules
interface UpngEngine {
  encode(bufs: ArrayBuffer[], w: number, h: number, ps: number, dels?: number[], forbidPlte?: boolean): ArrayBuffer;
  decode(buffer: ArrayBuffer | Uint8Array): {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: Array<{
      rect: { x: number; y: number; width: number; height: number };
      delay: number;
      dispose: number;
      blend: number;
      data: ArrayBuffer;
    }>;
    data: ArrayBuffer;
  };
  toRGBA8(out: unknown): ArrayBuffer[];
}

interface OmggifEngine {
  GifReader: new (buffer: Uint8Array) => {
    width: number;
    height: number;
    numFrames(): number;
    loopCount(): number;
    decodeAndBlitFrameRGBA(frameNumber: number, pixels: Uint8Array | Uint8ClampedArray): void;
  };
}

interface UtifEngine {
  decode(buffer: ArrayBuffer | Uint8Array): Array<{
    width: number;
    height: number;
    data: Uint8Array;
    [key: string]: unknown;
  }>;
  decodeImage(buffer: ArrayBuffer | Uint8Array, ifd: { width: number; height: number; data: Uint8Array; [key: string]: unknown }): void;
  toRGBA8(ifd: { width: number; height: number; data: Uint8Array; [key: string]: unknown }): Uint8Array;
}

const UPNG: UpngEngine = (UPNG_RAW?.default || UPNG_RAW) as UpngEngine;
const omggif: OmggifEngine = (omggif_RAW?.default || omggif_RAW) as OmggifEngine;
const UTIF: UtifEngine = (UTIF_RAW?.default || UTIF_RAW) as UtifEngine;

// ── Interface Contracts ───────────────────────────────────────────────────────

export interface ImageCompressOptions {
  quality?: number; // 0.1 to 1.0 (default: 0.8)
  format?: 'original' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
  maxDimension?: number; // default: 4096
  downsampleStep?: number; // default: 0.75
  onProgress?: (progress: number) => void;
}

export interface ImageCompressResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  reductionFormatted: string; // e.g., "45.2%" or "0%"
  format: string; // MIME type
  status: 'compressed' | 'optimal' | 'fallback' | 'original';
  tierUsed: 1 | 2 | 3;
  statusMessage?: string; // e.g. "File is already optimal"
  dimensions?: { width: number; height: number };
}

// ── Constants & Limits ────────────────────────────────────────────────────────

export const MAX_SAFE_DIMENSION = 4096;
export const MAX_SAFE_AREA = 16_777_216; // 16 Megapixels (iOS Safari canvas limit)

// ── Format & MIME Utilities ───────────────────────────────────────────────────

export function detectMimeType(fileOrBlob: File | Blob): string {
  if (fileOrBlob.type && fileOrBlob.type !== 'application/octet-stream') {
    return fileOrBlob.type.toLowerCase();
  }
  const name = (fileOrBlob as File).name;
  if (name) {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'tif':
      case 'tiff':
        return 'image/tiff';
      case 'avif':
        return 'image/avif';
      case 'ico':
        return 'image/x-icon';
    }
  }
  return fileOrBlob.type || 'image/jpeg';
}

export function calcReductionPct(original: number, compressed: number): number {
  if (original <= 0 || compressed >= original) return 0;
  return +((1 - compressed / original) * 100).toFixed(1);
}

// ── SVG Minifier ──────────────────────────────────────────────────────────────

export function minifySvgSync(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const minified = text
    .replace(/<!--[\s\S]*?-->/g, '') // strip comments
    .replace(/<\?xml[\s\S]*?\?>/gi, '') // strip XML declaration
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '') // strip DOCTYPE
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '') // strip <metadata>
    .replace(/<desc[\s\S]*?<\/desc>/gi, '') // strip <desc>
    .replace(/\s+xmlns:(inkscape|sodipodi|sketch|i|adobe)="[^"]*"/gi, '') // strip editor xmlns
    .replace(/\s+(inkscape|sodipodi|sketch):[a-zA-Z0-9_-]+="[^"]*"/gi, '') // strip editor attributes
    .replace(/\s+version="1\.[01]"/gi, '') // strip version
    .replace(/\s+xml:space="preserve"/gi, '') // strip xml:space
    .replace(/>\s+</g, '><') // collapse whitespace between tags
    .trim();

  // Validate with DOMParser if available
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(minified, 'image/svg+xml');
      const errorNode = doc.querySelector('parsererror');
      if (errorNode) {
        // If minified string had an XML parse error, revert to original text safely
        return text;
      }
    } catch {
      return text;
    }
  }
  return minified;
}

export async function minifySvgText(svgContent: string): Promise<string> {
  return minifySvgSync(svgContent);
}

// ── Safe JPEG Metadata Stripper ───────────────────────────────────────────────

/**
 * Strips non-essential JPEG metadata (EXIF/GPS/comments/Photoshop IPTC) while strictly:
 * 1. Preserving APP0 (JFIF: 0xe0)
 * 2. Preserving APP2 (ICC color profile: 0xe2) so Display P3 colors remain intact
 * 3. Preserving progressive scan markers and all scans after the first SOS (0xda)
 * 4. Avoiding excessive number[] memory reallocations
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const chunks: Uint8Array[] = [bytes.subarray(0, 2)]; // Keep SOI (0xff, 0xd8)
  let i = 2;

  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      chunks.push(bytes.subarray(i));
      break;
    }
    const marker = bytes[i + 1];

    // RST markers (0xd0-0xd7) or TEM (0x01) have no length bytes
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      chunks.push(bytes.subarray(i, i + 2));
      i += 2;
      continue;
    }

    // EOI (0xd9) - End of image
    if (marker === 0xd9) {
      chunks.push(bytes.subarray(i, i + 2));
      break;
    }

    // First SOS (0xda) - Start of scan
    // In standard JPEG, all metadata segments precede the first SOS.
    // Everything from the first SOS onward is image scan data (including multi-scans in progressive JPEGs).
    if (marker === 0xda) {
      chunks.push(bytes.subarray(i));
      break;
    }

    if (i + 4 > bytes.length) {
      chunks.push(bytes.subarray(i));
      break;
    }

    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];

    // Strip APP1 (EXIF/GPS 0xe1), APP13 (Photoshop 0xed), APP14 (Adobe 0xee), COM (0xfe),
    // and non-standard vendor markers (0xe3-0xec, 0xef).
    // PRESERVE APP0 (JFIF 0xe0) and APP2 (ICC color profile 0xe2).
    const shouldStrip =
      marker === 0xe1 ||
      marker === 0xed ||
      marker === 0xee ||
      marker === 0xfe ||
      (marker >= 0xe3 && marker <= 0xec) ||
      marker === 0xef;

    if (!shouldStrip) {
      chunks.push(bytes.subarray(i, i + 2 + segLen));
    }
    i += 2 + segLen;
  }

  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

// ── Adaptive Dimension & Canvas Helpers ───────────────────────────────────────

export function computeSafeDimensions(
  width: number,
  height: number,
  maxDimension = MAX_SAFE_DIMENSION
): { width: number; height: number; scaled: boolean } {
  let w = Math.max(1, width);
  let h = Math.max(1, height);
  let scaled = false;

  const maxDim = Math.max(w, h);
  if (maxDim > maxDimension) {
    const ratio = maxDimension / maxDim;
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
    scaled = true;
  }

  const area = w * h;
  if (area > MAX_SAFE_AREA) {
    const ratio = Math.sqrt(MAX_SAFE_AREA / area);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
    scaled = true;
  }

  return { width: w, height: h, scaled };
}

function createSafeCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const off = new OffscreenCanvas(width, height);
      off.width = width;
      off.height = height;
      return off;
    } catch {
      // Fallback to document.createElement
    }
  }
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error('No canvas implementation available in the current environment');
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality?: number
): Promise<Blob> {
  if ('convertToBlob' in canvas && typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
    return (canvas as OffscreenCanvas).convertToBlob({ type, quality });
  }
  if ('toBlob' in canvas && typeof (canvas as HTMLCanvasElement).toBlob === 'function') {
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed to produce blob'));
        },
        type,
        quality
      );
    });
  }
  throw new Error('Canvas does not support convertToBlob or toBlob');
}

interface DecodedSource {
  width: number;
  height: number;
  draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number): void;
  close?: () => void;
  rawRgba?: Uint8Array;
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const ImageCtor =
      typeof Image !== 'undefined'
        ? Image
        : typeof window !== 'undefined' && window.Image
        ? window.Image
        : null;

    if (!ImageCtor) {
      return reject(new Error('Image constructor not available in current environment'));
    }
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return reject(new Error('URL.createObjectURL not available in current environment'));
    }

    const url = URL.createObjectURL(blob);
    const img = new ImageCtor();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    };

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to decode image via Image element'));
    };

    img.src = url;
  });
}

async function decodeImageSource(fileOrBlob: File | Blob, mime: string): Promise<DecodedSource> {
  // 1. TIFF format: decode using UTIF
  if (mime === 'image/tiff' || (fileOrBlob as File).name?.match(/\.tiff?$/i)) {
    const buffer = await fileOrBlob.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds || !ifds.length) throw new Error('Invalid TIFF structure');
    const ifd = ifds[0];
    UTIF.decodeImage(buffer, ifd);
    const rgba = UTIF.toRGBA8(ifd);
    const width = ifd.width;
    const height = ifd.height;

    return {
      width,
      height,
      rawRgba: rgba,
      draw(ctx, dx, dy, dw, dh) {
        void dw;
        void dh;
        if (typeof ImageData !== 'undefined' && ctx.putImageData) {
          const clamped = new Uint8ClampedArray(rgba.length);
          clamped.set(rgba);
          const imgData = new ImageData(clamped, width, height);
          ctx.putImageData(imgData, dx, dy);
        }
      },
    };
  }

  // 2. Browser createImageBitmap (preferred for speed)
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(fileOrBlob);
      return {
        width: bmp.width,
        height: bmp.height,
        draw(ctx, dx, dy, dw, dh) {
          ctx.drawImage(bmp, dx, dy, dw, dh);
        },
        close: () => bmp.close(),
      };
    } catch {
      // Fall through to Image element
    }
  }

  // 3. Browser Image element
  const img = await loadImageElement(fileOrBlob);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error('Decoded image has zero dimensions');

  return {
    width,
    height,
    draw(ctx, dx, dy, dw, dh) {
      ctx.drawImage(img, dx, dy, dw, dh);
    },
  };
}

// ── Core Compression Engine ───────────────────────────────────────────────────

export async function compressImage(
  fileOrBlob: File | Blob,
  options?: ImageCompressOptions
): Promise<ImageCompressResult> {
  // Normalize quality (0.1 to 1.0)
  const rawQ = typeof options?.quality === 'number' ? options.quality : 0.8;
  const quality = Math.max(0.05, Math.min(1.0, rawQ > 1 ? rawQ / 100 : rawQ));
  const maxDim = options?.maxDimension || MAX_SAFE_DIMENSION;
  const downsampleStep = options?.downsampleStep || 0.75;
  const onProgress = options?.onProgress;

  // ── Tier 0: Boundary Guard (Empty or invalid file) ──
  if (!fileOrBlob || fileOrBlob.size === 0) {
    return {
      blob: fileOrBlob || new Blob([], { type: 'application/octet-stream' }),
      originalSize: 0,
      compressedSize: 0,
      reductionPercentage: 0,
      reductionFormatted: '0%',
      format: fileOrBlob?.type || 'application/octet-stream',
      status: 'original',
      tierUsed: 3,
      statusMessage: 'Empty file preserved',
      dimensions: { width: 0, height: 0 },
    };
  }

  const originalSize = fileOrBlob.size;
  const sourceMime = detectMimeType(fileOrBlob);
  const targetMime =
    options?.format && options.format !== 'original'
      ? options.format
      : sourceMime;

  onProgress?.(0.1);

  // ── SVG Minification Pipeline ──
  if (sourceMime === 'image/svg+xml' || (fileOrBlob as File).name?.endsWith('.svg')) {
    try {
      const buffer = await fileOrBlob.arrayBuffer();
      const rawText = new TextDecoder().decode(buffer);
      const minified = await minifySvgText(rawText);
      const outBlob = new Blob([minified], { type: 'image/svg+xml' });

      onProgress?.(1.0);
      if (outBlob.size < originalSize) {
        const pct = calcReductionPct(originalSize, outBlob.size);
        return {
          blob: outBlob,
          originalSize,
          compressedSize: outBlob.size,
          reductionPercentage: pct,
          reductionFormatted: `${pct}%`,
          format: 'image/svg+xml',
          status: 'compressed',
          tierUsed: 1,
          statusMessage: 'SVG minified successfully',
        };
      } else {
        return {
          blob: fileOrBlob,
          originalSize,
          compressedSize: originalSize,
          reductionPercentage: 0,
          reductionFormatted: '0%',
          format: 'image/svg+xml',
          status: 'optimal',
          tierUsed: 3,
          statusMessage: 'File is already optimal',
        };
      }
    } catch (err: unknown) {
      return {
        blob: fileOrBlob,
        originalSize,
        compressedSize: originalSize,
        reductionPercentage: 0,
        reductionFormatted: '0%',
        format: 'image/svg+xml',
        status: 'original',
        tierUsed: 3,
        statusMessage: err instanceof Error ? `Preserved original (${err.message})` : 'File preserved intact',
      };
    }
  }

  // ── Animated GIF Detection ──
  if (sourceMime === 'image/gif' || (fileOrBlob as File).name?.match(/\.gif$/i)) {
    try {
      const buffer = await fileOrBlob.arrayBuffer();
      const reader = new omggif.GifReader(new Uint8Array(buffer));
      if (reader.numFrames() > 1) {
        // Multi-frame animated GIF: preserve intact in Tier 3 to prevent destroying frames
        onProgress?.(1.0);
        return {
          blob: fileOrBlob,
          originalSize,
          compressedSize: originalSize,
          reductionPercentage: 0,
          reductionFormatted: '0%',
          format: 'image/gif',
          status: 'optimal',
          tierUsed: 3,
          statusMessage: 'Animated GIF preserved intact',
          dimensions: { width: reader.width, height: reader.height },
        };
      }
    } catch {
      // If omggif fails, proceed to standard canvas decode
    }
  }

  // ── Raster Image Pipeline (PNG, JPEG, WebP, AVIF, TIFF, BMP) ──
  let decoded: DecodedSource | null = null;
  try {
    decoded = await decodeImageSource(fileOrBlob, sourceMime);
    onProgress?.(0.4);

    const origW = decoded.width;
    const origH = decoded.height;

    // Determine initial dimensions via Tier 2 boundary check
    const safeBounds = computeSafeDimensions(origW, origH, maxDim);
    let targetW = safeBounds.width;
    let targetH = safeBounds.height;
    let tierUsed: 1 | 2 = safeBounds.scaled ? 2 : 1;

    let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

    // Retry loop with progressive downscaling if canvas creation or context acquisition fails
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        canvas = createSafeCanvas(targetW, targetH);
        ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (ctx) break;
      } catch {
        ctx = null;
      }

      // Progressive downscaling step on failure (respecting downsampleStep)
      targetW = Math.max(1, Math.round(targetW * downsampleStep));
      targetH = Math.max(1, Math.round(targetH * downsampleStep));
      tierUsed = 2;
    }

    if (!canvas || !ctx) {
      throw new Error('Could not allocate canvas context within safe memory boundaries');
    }

    // Canvas background preparation
    if (targetMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'; // prevent black backgrounds on transparent PNG -> JPEG conversions
      ctx.fillRect(0, 0, targetW, targetH);
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
    }

    decoded.draw(ctx, 0, 0, targetW, targetH);
    onProgress?.(0.6);

    let candidateBlob: Blob;

    // ── Tier 1: PNG Quantization Engine (upng-js) ──
    if (targetMime === 'image/png') {
      let upngSuccess = false;
      let upngBlob: Blob | null = null;

      try {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        if (imgData && imgData.data) {
          const rgbaBuf = imgData.data.buffer.slice(
            imgData.data.byteOffset,
            imgData.data.byteOffset + imgData.data.byteLength
          );

          // Quality to palette color count mapping
          // 8-bit palette: cnum = 256 yields 60-80% reduction
          const cnum = quality >= 0.95 ? 0 : quality >= 0.65 ? 256 : quality >= 0.40 ? 128 : 64;

          const quantizedBuf = UPNG.encode([rgbaBuf], targetW, targetH, cnum);
          let bestBuf = quantizedBuf;

          // If lossy quantization was requested, compare against lossless deflate
          if (cnum > 0) {
            try {
              const losslessBuf = UPNG.encode([rgbaBuf], targetW, targetH, 0);
              if (losslessBuf.byteLength < quantizedBuf.byteLength) {
                bestBuf = losslessBuf;
              }
            } catch {
              // Keep quantizedBuf
            }
          }

          upngBlob = new Blob([bestBuf], { type: 'image/png' });
          upngSuccess = true;
        }
      } catch {
        upngSuccess = false;
      }

      if (upngSuccess && upngBlob) {
        candidateBlob = upngBlob;
      } else {
        // Fallback to canvas PNG
        candidateBlob = await canvasToBlob(canvas, 'image/png');
      }
    }
    // ── Tier 1: JPEG Compression & Safe Metadata Stripping ──
    else if (targetMime === 'image/jpeg') {
      const rawJpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
      const rawBytes = new Uint8Array(await rawJpegBlob.arrayBuffer());
      const strippedBytes = stripJpegMetadata(rawBytes);
      candidateBlob = new Blob([strippedBytes as unknown as BlobPart], { type: 'image/jpeg' });
    }
    // ── Tier 1: WebP Compression ──
    else if (targetMime === 'image/webp') {
      candidateBlob = await canvasToBlob(canvas, 'image/webp', quality);
    }
    // ── Tier 1: AVIF / Other Formats ──
    else {
      try {
        candidateBlob = await canvasToBlob(canvas, targetMime, quality);
      } catch {
        // If targetMime encoding is unsupported in canvas, encode to WebP or PNG
        candidateBlob = await canvasToBlob(canvas, 'image/webp', quality);
      }
    }

    onProgress?.(0.9);

    // ── Tier 3: Safety Tier Decision ──
    // If output is smaller than original, adopt it
    if (candidateBlob.size < originalSize) {
      const pct = calcReductionPct(originalSize, candidateBlob.size);
      onProgress?.(1.0);
      return {
        blob: candidateBlob,
        originalSize,
        compressedSize: candidateBlob.size,
        reductionPercentage: pct,
        reductionFormatted: `${pct}%`,
        format: candidateBlob.type || targetMime,
        status: tierUsed === 2 ? 'fallback' : 'compressed',
        tierUsed,
        statusMessage: tierUsed === 2 ? 'Adaptive downsampled to safe dimensions' : 'Successfully compressed',
        dimensions: { width: targetW, height: targetH },
      };
    } else {
      // File is already optimal: return original valid blob intact
      onProgress?.(1.0);
      return {
        blob: fileOrBlob,
        originalSize,
        compressedSize: originalSize,
        reductionPercentage: 0,
        reductionFormatted: '0%',
        format: sourceMime,
        status: 'optimal',
        tierUsed: 3,
        statusMessage: 'File is already optimal',
        dimensions: { width: origW, height: origH },
      };
    }
  } catch (err: unknown) {
    // ── Tier 3: Catastrophic Safety Tier Fallback ──
    // Under ZERO circumstances may an unhandled exception be surfaced
    onProgress?.(1.0);
    return {
      blob: fileOrBlob,
      originalSize,
      compressedSize: originalSize,
      reductionPercentage: 0,
      reductionFormatted: '0%',
      format: sourceMime,
      status: 'original',
      tierUsed: 3,
      statusMessage: err instanceof Error ? `Preserved original (${err.message})` : 'Preserved original file intact',
      dimensions: decoded ? { width: decoded.width, height: decoded.height } : undefined,
    };
  } finally {
    decoded?.close?.();
  }
}
