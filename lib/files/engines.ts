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

export async function hashFileMd5(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return bytesToHex(md5Raw(bytes));
}

export async function hashFileSha1(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const data = (buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)) as unknown as BufferSource;
  const hash = await crypto.subtle.digest('SHA-1', data);
  return bytesToHex(new Uint8Array(hash));
}

export async function hashFileSha256(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const data = (buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)) as unknown as BufferSource;
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hash));
}

export async function hashFileSha512(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const data = (buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)) as unknown as BufferSource;
  const hash = await crypto.subtle.digest('SHA-512', data);
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
  const bytes = new Uint8Array(buffer.slice(0, 64));
  const hex = Array.from(bytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  const headerBytes = Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

  let detected = 'application/octet-stream';
  let extension = 'bin';
  let description = 'Unknown binary file';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  const str = Array.from(bytes).map(b => String.fromCharCode(b)).join('');

  if (hex.startsWith('89 50 4E 47')) {
    detected = 'image/png'; extension = 'png'; description = 'PNG Portable Network Graphics'; confidence = 'high';
  } else if (hex.startsWith('FF D8 FF')) {
    detected = 'image/jpeg'; extension = 'jpg'; description = 'JPEG Image'; confidence = 'high';
  } else if (hex.startsWith('25 50 44 46')) {
    detected = 'application/pdf'; extension = 'pdf'; description = 'PDF Adobe Portable Document Format'; confidence = 'high';
  } else if (hex.startsWith('50 4B 03 04')) {
    detected = 'application/zip'; extension = 'zip'; description = 'ZIP Archive / Open Packaging (DOCX/XLSX/PPTX/JAR)'; confidence = 'high';
  } else if (hex.startsWith('47 49 46 38')) {
    detected = 'image/gif'; extension = 'gif'; description = 'GIF Graphics Interchange Format'; confidence = 'high';
  } else if (hex.startsWith('49 44 33') || hex.startsWith('FF FB') || hex.startsWith('FF FA') || hex.startsWith('FF F3')) {
    detected = 'audio/mpeg'; extension = 'mp3'; description = 'MP3 MPEG Audio Layer III'; confidence = 'high';
  } else if (str.startsWith('RIFF') && str.slice(8, 12) === 'WAVE') {
    detected = 'audio/wav'; extension = 'wav'; description = 'WAV Waveform Audio'; confidence = 'high';
  } else if (str.startsWith('RIFF') && str.slice(8, 12) === 'WEBP') {
    detected = 'image/webp'; extension = 'webp'; description = 'WebP Image'; confidence = 'high';
  } else if (str.slice(4, 8) === 'ftyp') {
    detected = 'video/mp4'; extension = 'mp4'; description = 'MP4 ISO Media / MPEG-4 Video'; confidence = 'high';
  } else if (hex.startsWith('1A 45 DF A3')) {
    detected = 'video/webm'; extension = 'webm'; description = 'WebM Matroska Video/Audio'; confidence = 'high';
  } else if (hex.startsWith('42 4D')) {
    detected = 'image/bmp'; extension = 'bmp'; description = 'BMP Windows Bitmap'; confidence = 'high';
  } else if (hex.startsWith('49 49 2A 00') || hex.startsWith('4D 4D 00 2A')) {
    detected = 'image/tiff'; extension = 'tiff'; description = 'TIFF Tagged Image File Format'; confidence = 'high';
  } else if (hex.startsWith('66 4C 61 43')) {
    detected = 'audio/flac'; extension = 'flac'; description = 'FLAC Free Lossless Audio Codec'; confidence = 'high';
  } else if (hex.startsWith('4F 67 67 53')) {
    detected = 'audio/ogg'; extension = 'ogg'; description = 'OGG Ogg Vorbis/Opus Container'; confidence = 'high';
  } else if (hex.startsWith('37 7A BC AF 27 1C')) {
    detected = 'application/x-7z-compressed'; extension = '7z'; description = '7-Zip Compressed Archive'; confidence = 'high';
  } else if (hex.startsWith('52 61 72 21 1A 07')) {
    detected = 'application/vnd.rar'; extension = 'rar'; description = 'RAR Compressed Archive'; confidence = 'high';
  } else if (hex.startsWith('1F 8B')) {
    detected = 'application/gzip'; extension = 'gz'; description = 'GZIP Compressed Archive'; confidence = 'high';
  } else if (str.trim().startsWith('<?xml') || str.trim().startsWith('<svg')) {
    detected = str.includes('<svg') ? 'image/svg+xml' : 'application/xml';
    extension = str.includes('<svg') ? 'svg' : 'xml';
    description = str.includes('<svg') ? 'SVG Scalable Vector Graphics' : 'XML Extensible Markup Language';
    confidence = 'high';
  } else if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
    try {
      JSON.parse(new TextDecoder().decode(bytes));
      detected = 'application/json';
      extension = 'json';
      description = 'JSON JavaScript Object Notation';
      confidence = 'high';
    } catch {
      // Possible partial JSON
      detected = 'text/plain';
      extension = 'txt';
      description = 'Plain text file';
      confidence = 'medium';
    }
  } else {
    // Check if ASCII text
    let isText = true;
    for (let i = 0; i < Math.min(bytes.length, 32); i++) {
      const code = bytes[i];
      if (code < 9 || (code > 13 && code < 32)) {
        isText = false;
        break;
      }
    }
    if (isText && bytes.length > 0) {
      detected = 'text/plain';
      extension = 'txt';
      description = 'Plain text document';
      confidence = 'medium';
    }
  }

  return { detected, confidence, extension, description, headerBytes };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

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

export interface MimeTypeEntry {
  mime: string;
  extensions: string[];
  description: string;
  category: 'Image' | 'Audio' | 'Video' | 'Document' | 'Archive' | 'Code' | 'Data';
}

export const COMMON_MIME_TYPES: MimeTypeEntry[] = [
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], description: 'JPEG Image', category: 'Image' },
  { mime: 'image/png', extensions: ['png'], description: 'PNG Image', category: 'Image' },
  { mime: 'image/webp', extensions: ['webp'], description: 'WebP Image', category: 'Image' },
  { mime: 'image/gif', extensions: ['gif'], description: 'GIF Animated Image', category: 'Image' },
  { mime: 'image/svg+xml', extensions: ['svg'], description: 'Scalable Vector Graphics', category: 'Image' },
  { mime: 'image/bmp', extensions: ['bmp'], description: 'Windows Bitmap', category: 'Image' },
  { mime: 'image/tiff', extensions: ['tiff', 'tif'], description: 'Tagged Image File Format', category: 'Image' },
  { mime: 'image/x-icon', extensions: ['ico'], description: 'ICO Icon format', category: 'Image' },
  { mime: 'image/avif', extensions: ['avif'], description: 'AV1 Image File Format', category: 'Image' },
  { mime: 'application/pdf', extensions: ['pdf'], description: 'Portable Document Format', category: 'Document' },
  { mime: 'application/zip', extensions: ['zip'], description: 'ZIP Archive', category: 'Archive' },
  { mime: 'application/x-7z-compressed', extensions: ['7z'], description: '7-Zip Archive', category: 'Archive' },
  { mime: 'application/x-tar', extensions: ['tar'], description: 'TAR Unix Tape Archive', category: 'Archive' },
  { mime: 'application/gzip', extensions: ['gz'], description: 'GZIP Compressed File', category: 'Archive' },
  { mime: 'application/vnd.rar', extensions: ['rar'], description: 'RAR Compressed Archive', category: 'Archive' },
  { mime: 'audio/mpeg', extensions: ['mp3'], description: 'MP3 Audio', category: 'Audio' },
  { mime: 'audio/wav', extensions: ['wav'], description: 'WAV Waveform Audio', category: 'Audio' },
  { mime: 'audio/ogg', extensions: ['ogg'], description: 'OGG Vorbis Audio', category: 'Audio' },
  { mime: 'audio/flac', extensions: ['flac'], description: 'FLAC Lossless Audio', category: 'Audio' },
  { mime: 'audio/aac', extensions: ['aac'], description: 'Advanced Audio Coding', category: 'Audio' },
  { mime: 'video/mp4', extensions: ['mp4'], description: 'MPEG-4 Part 14 Video', category: 'Video' },
  { mime: 'video/webm', extensions: ['webm'], description: 'WebM Video', category: 'Video' },
  { mime: 'video/quicktime', extensions: ['mov'], description: 'Apple QuickTime Movie', category: 'Video' },
  { mime: 'video/x-msvideo', extensions: ['avi'], description: 'Audio Video Interleave', category: 'Video' },
  { mime: 'text/plain', extensions: ['txt'], description: 'Plain Text File', category: 'Document' },
  { mime: 'text/html', extensions: ['html', 'htm'], description: 'HTML Hypertext Markup Language', category: 'Code' },
  { mime: 'text/css', extensions: ['css'], description: 'Cascading Style Sheets', category: 'Code' },
  { mime: 'text/javascript', extensions: ['js', 'mjs'], description: 'JavaScript Source Code', category: 'Code' },
  { mime: 'application/json', extensions: ['json'], description: 'JavaScript Object Notation', category: 'Data' },
  { mime: 'text/csv', extensions: ['csv'], description: 'Comma-Separated Values', category: 'Data' },
  { mime: 'application/xml', extensions: ['xml'], description: 'Extensible Markup Language', category: 'Data' },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], description: 'Microsoft Word Document', category: 'Document' },
  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['xlsx'], description: 'Microsoft Excel Spreadsheet', category: 'Document' },
  { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extensions: ['pptx'], description: 'Microsoft PowerPoint Presentation', category: 'Document' },
  { mime: 'application/octet-stream', extensions: ['bin'], description: 'Binary Data / Executable Stream', category: 'Data' },
];

export function searchMimeDatabase(query: string): MimeTypeEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return COMMON_MIME_TYPES.filter(
    item =>
      item.mime.toLowerCase().includes(q) ||
      item.extensions.some(ext => ext.toLowerCase().includes(q) || ext === q.replace(/^\./, '')) ||
      item.description.toLowerCase().includes(q)
  );
}
