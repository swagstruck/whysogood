'use client';
import { zipSync } from 'fflate';

let pdfjsInstance: any = null;

/**
 * Loads the PDF.js library with the offline client worker.
 */
export async function getPdfJs() {
  if (typeof window === 'undefined') return null;
  if (!pdfjsInstance) {
    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    pdfjs.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;
    pdfjsInstance = pdfjs;
  }
  return pdfjsInstance;
}

export interface PageThumbnail {
  pageNumber: number; // 1-indexed
  dataUrl: string;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Renders thumbnail previews for all pages in a PDF document buffer.
 */
export async function renderAllThumbnails(
  data: ArrayBuffer | Uint8Array,
  maxDimension = 240,
  onProgress?: (current: number, total: number) => void
): Promise<PageThumbnail[]> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) return [];

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const thumbnails: PageThumbnail[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const initialViewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(
      maxDimension / initialViewport.width,
      maxDimension / initialViewport.height
    );
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
      thumbnails.push({
        pageNumber: i,
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        width: viewport.width,
        height: viewport.height,
        rotation: initialViewport.rotation || 0,
      });
    }

    if (onProgress) {
      onProgress(i, numPages);
    }
  }

  return thumbnails;
}

/**
 * Parses user input like "1, 3-5, 8" into unique 0-indexed page indices.
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Formats an array of 0-indexed page numbers into a readable range string (e.g. "1-3, 5, 8-10").
 */
export function formatPageRange(zeroIndexedPages: number[]): string {
  if (!zeroIndexedPages.length) return '';
  const sorted = [...new Set(zeroIndexedPages)].sort((a, b) => a - b).map(p => p + 1);

  const ranges: string[] = [];
  let start = sorted[0];
  let prev = start;

  for (let i = 1; i <= sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      if (start === prev) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}-${prev}`);
      }
      start = curr;
      prev = curr;
    }
  }

  return ranges.join(', ');
}

/**
 * Creates a zip archive from a record of filenames and byte arrays using fflate.
 */
export function createZipArchive(files: Record<string, Uint8Array>): Blob {
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
}

/**
 * Triggers a browser download of a Blob.
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
