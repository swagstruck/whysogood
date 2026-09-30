export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function md5Cycle(x: number[], k: number[]): void {
  let a = x[0],
    b = x[1],
    c = x[2],
    d = x[3];

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (((a + q) | 0) + (((x + t) | 0) | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  a = ff(a, b, c, d, k[0], 7, -680876936);
  d = ff(d, a, b, c, k[1], 12, -389564586);
  c = ff(c, d, a, b, k[2], 17, 606105819);
  b = ff(b, c, d, a, k[3], 22, -1044525330);
  a = ff(a, b, c, d, k[4], 7, -176418897);
  d = ff(d, a, b, c, k[5], 12, 1200080426);
  c = ff(c, d, a, b, k[6], 17, -1473231341);
  b = ff(b, c, d, a, k[7], 22, -45705983);
  a = ff(a, b, c, d, k[8], 7, 1770035416);
  d = ff(d, a, b, c, k[9], 12, -1958414417);
  c = ff(c, d, a, b, k[10], 17, -42063);
  b = ff(b, c, d, a, k[11], 22, -1990404162);
  a = ff(a, b, c, d, k[12], 7, 1804603682);
  d = ff(d, a, b, c, k[13], 12, -40341101);
  c = ff(c, d, a, b, k[14], 17, -1502002290);
  b = ff(b, c, d, a, k[15], 22, 1236535329);

  a = gg(a, b, c, d, k[1], 5, -165796510);
  d = gg(d, a, b, c, k[6], 9, -1069501632);
  c = gg(c, d, a, b, k[11], 14, 643717713);
  b = gg(b, c, d, a, k[0], 20, -373897302);
  a = gg(a, b, c, d, k[5], 5, -701558691);
  d = gg(d, a, b, c, k[10], 9, 38016083);
  c = gg(c, d, a, b, k[15], 14, -660478335);
  b = gg(b, c, d, a, k[4], 20, -405537848);
  a = gg(a, b, c, d, k[9], 5, 568446438);
  d = gg(d, a, b, c, k[14], 9, -1019803690);
  c = gg(c, d, a, b, k[3], 14, -187363961);
  b = gg(b, c, d, a, k[8], 20, 1163531501);
  a = gg(a, b, c, d, k[13], 5, -1444681467);
  d = gg(d, a, b, c, k[2], 9, -51403784);
  c = gg(c, d, a, b, k[7], 14, 1735328473);
  b = gg(b, c, d, a, k[12], 20, -1926607734);

  a = hh(a, b, c, d, k[5], 4, -378558);
  d = hh(d, a, b, c, k[8], 11, -2022574463);
  c = hh(c, d, a, b, k[11], 16, 1839030562);
  b = hh(b, c, d, a, k[14], 23, -35309556);
  a = hh(a, b, c, d, k[1], 4, -1530992060);
  d = hh(d, a, b, c, k[4], 11, 1272893353);
  c = hh(c, d, a, b, k[7], 16, -155497632);
  b = hh(b, c, d, a, k[10], 23, -1094730640);
  a = hh(a, b, c, d, k[13], 4, 681279174);
  d = hh(d, a, b, c, k[0], 11, -358537222);
  c = hh(c, d, a, b, k[3], 16, -722521979);
  b = hh(b, c, d, a, k[6], 23, 76029189);
  a = hh(a, b, c, d, k[9], 4, -640364487);
  d = hh(d, a, b, c, k[12], 11, -421815835);
  c = hh(c, d, a, b, k[15], 16, 530742520);
  b = hh(b, c, d, a, k[2], 23, -995338651);

  a = ii(a, b, c, d, k[0], 6, -198630844);
  d = ii(d, a, b, c, k[7], 10, 1126891415);
  c = ii(c, d, a, b, k[14], 15, -1416354905);
  b = ii(b, c, d, a, k[5], 21, -57434055);
  a = ii(a, b, c, d, k[12], 6, 1700485571);
  d = ii(d, a, b, c, k[3], 10, -1894986606);
  c = ii(c, d, a, b, k[10], 15, -1051523);
  b = ii(b, c, d, a, k[1], 21, -2054922799);
  a = ii(a, b, c, d, k[8], 6, 1873313359);
  d = ii(d, a, b, c, k[15], 10, -30611744);
  c = ii(c, d, a, b, k[6], 15, -1560198380);
  b = ii(b, c, d, a, k[13], 21, 1309151649);
  a = ii(a, b, c, d, k[4], 6, -145523070);
  d = ii(d, a, b, c, k[11], 10, -1120210379);
  c = ii(c, d, a, b, k[2], 15, 718787259);
  b = ii(b, c, d, a, k[9], 21, -343485551);

  x[0] = (a + x[0]) | 0;
  x[1] = (b + x[1]) | 0;
  x[2] = (c + x[2]) | 0;
  x[3] = (d + x[3]) | 0;
}

function md5Raw(bytes: Uint8Array): Uint8Array {
  const n = bytes.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];

  const paddedLength = ((n + 8) >> 6) + 1;
  const words = new Array(paddedLength * 16).fill(0);

  for (let i = 0; i < n; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }

  words[n >> 2] |= 0x80 << ((n % 4) * 8);
  words[paddedLength * 16 - 2] = (n * 8) & 0xffffffff;
  words[paddedLength * 16 - 1] = Math.floor((n * 8) / 0x100000000);

  for (let i = 0; i < words.length; i += 16) {
    md5Cycle(state, words.slice(i, i + 16));
  }

  const result = new Uint8Array(16);
  for (let i = 0; i < 4; i++) {
    result[i * 4] = state[i] & 0xff;
    result[i * 4 + 1] = (state[i] >>> 8) & 0xff;
    result[i * 4 + 2] = (state[i] >>> 16) & 0xff;
    result[i * 4 + 3] = (state[i] >>> 24) & 0xff;
  }
  return result;
}

export async function hashFileMd5(buffer: ArrayBuffer): Promise<string> {
  return bytesToHex(md5Raw(new Uint8Array(buffer)));
}

export async function hashFileSha1(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', buffer);
  return bytesToHex(new Uint8Array(hash));
}

export async function hashFileSha256(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(new Uint8Array(hash));
}

export async function hashFileSha512(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-512', buffer);
  return bytesToHex(new Uint8Array(hash));
}

export interface MimeDetectionResult {
  detected: string;
  confidence: 'high' | 'medium' | 'low';
  extension: string;
  description: string;
  headerBytes: string;
}

export function detectMimeBySignature(buffer: ArrayBuffer): MimeDetectionResult {
  const bytes = new Uint8Array(buffer.slice(0, 32));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  const headerBytes = Array.from(new Uint8Array(buffer.slice(0, 16))).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

  let detected = 'application/octet-stream';
  let extension = 'bin';
  let description = 'Unknown binary file';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  const str = Array.from(bytes).map(b => String.fromCharCode(b)).join('');

  if (hex.startsWith('89 50 4E 47')) {
    detected = 'image/png'; extension = 'png'; description = 'PNG image'; confidence = 'high';
  } else if (hex.startsWith('FF D8 FF')) {
    detected = 'image/jpeg'; extension = 'jpg'; description = 'JPEG image'; confidence = 'high';
  } else if (hex.startsWith('25 50 44 46')) {
    detected = 'application/pdf'; extension = 'pdf'; description = 'PDF document'; confidence = 'high';
  } else if (hex.startsWith('50 4B 03 04')) {
    detected = 'application/zip'; extension = 'zip'; description = 'ZIP archive (or DOCX/XLSX/PPTX)'; confidence = 'high';
  } else if (hex.startsWith('47 49 46 38')) {
    detected = 'image/gif'; extension = 'gif'; description = 'GIF image'; confidence = 'high';
  } else if (hex.startsWith('49 44 33') || hex.startsWith('FF FB') || hex.startsWith('FF FA') || hex.startsWith('FF F3')) {
    detected = 'audio/mpeg'; extension = 'mp3'; description = 'MP3 audio'; confidence = 'high';
  } else if (str.startsWith('RIFF') && str.slice(8, 12) === 'WAVE') {
    detected = 'audio/wav'; extension = 'wav'; description = 'WAV audio'; confidence = 'high';
  } else if (str.startsWith('RIFF') && str.slice(8, 12) === 'WEBP') {
    detected = 'image/webp'; extension = 'webp'; description = 'WebP image'; confidence = 'high';
  } else if (str.slice(4, 8) === 'ftyp') {
    detected = 'video/mp4'; extension = 'mp4'; description = 'MP4 video'; confidence = 'high';
  } else if (hex.startsWith('00 00 00') || hex.startsWith('1A 45 DF A3')) {
    if (hex.startsWith('1A 45 DF A3')) {
      detected = 'video/webm'; extension = 'webm'; description = 'WebM video/audio'; confidence = 'high';
    } else {
      confidence = 'low';
    }
  }

  return { detected, confidence, extension, description, headerBytes };
}

import { formatFileSize } from '@/lib/utils';

export interface FileMetadata {
  name: string; 
  lastModified: string; 
  lastModifiedTimestamp: number;
  size: number; 
  formattedSize: string; 
  type: string; 
  extension: string;
  estimatedEncoding?: string;
}

export function extractFileMetadata(file: File): FileMetadata {
  const parts = file.name.split('.');
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  
  return {
    name: file.name,
    lastModified: new Date(file.lastModified).toLocaleString(),
    lastModifiedTimestamp: file.lastModified,
    size: file.size,
    formattedSize: formatFileSize(file.size),
    type: file.type || 'application/octet-stream',
    extension
  };
}
