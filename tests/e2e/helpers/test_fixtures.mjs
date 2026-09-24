// @ts-check
/**
 * Test fixture file generators for Simple Mode & File Compression E2E verification suites.
 * Generates synthetic and realistic File/Blob instances for all supported formats and edge cases.
 * Fully compatible with Node.js 24 and client-side browser DOM test environments.
 */

import { zlibSync } from 'fflate';
import { crc32 } from 'node:zlib';
import omggif from 'omggif';

const { GifWriter } = omggif;

// ============================================================================
// BASE64 ASSETS: Real Spec-Compliant PDFs & Compact Images
// ============================================================================

// 1-Page Text PDF generated via pdf-lib (with selectable Helvetica text)
const TEXT_PDF_B64 =
  'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNSAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovUHJvZHVjZXIgPEZFRkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyMDAwMjgwMDY4MDA3NDAwNzQwMDcwMDA3MzAwM0EwMDJGMDAyRjAwNjcwMDY5MDA3NDAwNjgwMDc1MDA2MjAwMkUwMDYzMDA2RjAwNkQwMDJGMDA0ODAwNkYwMDcwMDA2NDAwNjkwMDZFMDA2NzAwMkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyOT4KL01vZERhdGUgKEQ6MjAyNjA5MjQxNTU3NTlaKQovQ3JlYXRvciA8RkVGRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDIwMDAyODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2NzAwNjkwMDc0MDA2ODAwNzUwMDYyMDAyRTAwNjMwMDZGMDA2RDAwMkYwMDQ4MDA2RjAwNzAwMDY0MDA2OTAwNkUwMDY3MDAyRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDI5PgovQ3JlYXRpb25EYXRlIChEOjIwMjYwOTI0MTU1NzU5WikKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKCjUgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAxIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9IZWx2ZXRpY2EtNzA5ODQ4MDc4OSA0IDAgUgovSGVsdmV0aWNhLTk3NDI2ODI1NjggNCAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjAwIDQwMCBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDYgMCBSIF0KPj4KZW5kb2JqCgo2IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMjMyCj4+CnN0cmVhbQp4nG2PTUpEMRCE9zlF1oKadDrVCcgs9L3gwo2QC4iMg+IsRsTzW3kTFwPSJKT/Kl+d3H134Sb6v/N1cLeP+8+f/ff768u1hVq0BCvVS/D9zYn6/uQ4yog+B594+tHdZUOxmhOaGhpDJWRFtmR8qbKSLGNBxjoqsrCfULFYwAPynC6mO98/XL9ya3fP7rTxbd9dklWKoEhG8VH+JwuTTFFQLUmYd5RgiRz8lUyKCDkTkCSaMLdxMyucbgA7k23MsJfHvomBCjoUqSNo9Dr0E9Xq9LnY8KhDnfU23J73t3rDKuuF319BTVYQCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDc2IDAwMDAwIG4gCjAwMDAwMDAxMjYgMDAwMDAgbiAKMDAwMDAwMDU5NiAwMDAwMCBuIAowMDAwMDAwNjk0IDAwMDAwIG4gCjAwMDAwMDA5MTcgMDAwMDAgbiAKCnRyYWlsZXIKPDwKL1NpemUgNwovUm9vdCAyIDAgUgovSW5mbyAzIDAgUgo+PgoKc3RhcnR4cmVmCjEyMjIKJSVFT0Y=';

// 1-Page Vector Drawing PDF (with rect, circle, line vector operators)
const VEC_PDF_B64 =
  'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNCAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovUHJvZHVjZXIgPEZFRkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyMDAwMjgwMDY4MDA3NDAwNzQwMDcwMDA3MzAwM0EwMDJGMDAyRjAwNjcwMDY5MDA3NDAwNjgwMDc1MDA2MjAwMkUwMDYzMDA2RjAwNkQwMDJGMDA0ODAwNkYwMDcwMDA2NDAwNjkwMDZFMDA2NzAwMkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyOT4KL01vZERhdGUgKEQ6MjAyNjA5MjQxNTU3NTlaKQovQ3JlYXRvciA8RkVGRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDIwMDAyODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2NzAwNjkwMDc0MDA2ODAwNzUwMDYyMDAyRTAwNjMwMDZGMDA2RDAwMkYwMDQ4MDA2RjAwNzAwMDY0MDA2OTAwNkUwMDY3MDAyRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDI5PgovQ3JlYXRpb25EYXRlIChEOjIwMjYwOTI0MTU1NzU5WikKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAo+PgovWE9iamVjdCA8PAo+PgovRXh0R1N0YXRlIDw8Cj4+Cj4+Ci9NZWRpYUJveCBbIDAgMCA1MDAgNTAwIF0KL0Fubm90cyBbIF0KL0NvbnRlbnRzIFsgNSAwIFIgXQo+PgplbmRvYmoKCjUgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxODIKPj4Kc3RyZWFtCnicdVG7DsIwDNz9FfmCyLHzaFcW5pYRMRUBQxnKwu9jJ1FAalAS+2z5fNJlA7Rk0AZ5g3ndAY2e+Qhk3nC+CL6Cyz1nAupdnq2hcV9q0uhkeAXCX6T5AQeYYBPl0RR1KspNcAMSBqPuUUSJLA8hRSkGH5FDt1U5mhdgSjY6T5z86AKPsQ7013HlCk/RnttrVQ5nvT9Lqb+Omt4Et+JG/gH1Qsznrxcy6LMRDfiKVjgJ8wOth1cNCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDc2IDAwMDAwIG4gCjAwMDAwMDAxMjYgMDAwMDAgbiAKMDAwMDAwMDU5NiAwMDAwMCBuIAowMDAwMDAwNzYzIDAwMDAwIG4gCgp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMiAwIFIKL0luZm8gMyAwIFIKPj4KCnN0YXJ0eHJlZgoxMDE4CiUlRU9G';

// 5-Page Report PDF generated via pdf-lib
const MULTI_PDF_B64 =
  'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNSAwIFIgNyAwIFIgOSAwIFIgMTEgMCBSIDEzIDAgUiBdCi9Db3VudCA1Cj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFIKPj4KZW5kb2JqCgozIDAgb2JqCjw8Ci9Qcm9kdWNlciA8RkVGRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDIwMDAyODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2NzAwNjkwMDc0MDA2ODAwNzUwMDYyMDAyRTAwNjMwMDZGMDA2RDAwMkYwMDQ4MDA2RjAwNzAwMDY0MDA2OTAwNkUwMDY3MDAyRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDI5PgovTW9kRGF0ZSAoRDoyMDI2MDkyNDE1NTc1NVopCi9DcmVhdG9yIDxGRUZGMDA3MDAwNjQwMDY2MDAyRDAwNkMwMDY5MDA2MjAwMjAwMDI4MDA2ODAwNzQwMDc0MDA3MDAwNzMwMDNBMDAyRjAwMkYwMDY3MDA2OTAwNzQwMDY4MDA3NTAwNjIwMDJFMDA2MzAwNkYwMDZEMDAyRjAwNDgwMDZGMDA3MDAwNjQwMDY5MDA2RTAwNjcwMDJGMDA3MDAwNjQwMDY2MDAyRDAwNkMwMDY5MDA2MjAwMjk+Ci9DcmVhdGlvbkRhdGUgKEQ6MjAyNjA5MjQxNTU3NTVaKQo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCj4+CmVuZG9iagoKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0hlbHZldGljYS03MDk4NDgwNzg5IDQgMCBSCi9IZWx2ZXRpY2EtOTc0MjY4MjU2OCA0IDAgUgo+PgovWE9iamVjdCA8PAo+PgovRXh0R1N0YXRlIDw8Cj4+Cj4+Ci9NZWRpYUJveCBbIDAgMCA1OTUgODQyIF0K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';

// Password-Protected / Encrypted PDF (contains /Encrypt dictionary in trailer)
const ENC_PDF_B64 =
  'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNSAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovUHJvZHVjZXIgPEZFRkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyMDAwMjgwMDY4MDA3NDAwNzQwMDcwMDA3MzAwM0EwMDJGMDAyRjAwNjcwMDY5MDA3NDAwNjgwMDc1MDA2MjAwMkUwMDYzMDA2RjAwNkQwMDJGMDA0ODAwNkYwMDcwMDA2NDAwNjkwMDZFMDA2NzAwMkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyOT4KL01vZERhdGUgKEQ6MjAyNjA5MjQxNTU3NTVaKQovQ3JlYXRvciA8RkVGRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDIwMDAyODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2NzAwNjkwMDc0MDA2ODAwNzUwMDYyMDAyRTAwNjMwMDZGMDA2RDAwMkYwMDQ4MDA2RjAwNzAwMDY0MDA2OTAwNkUwMDY3MDAyRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDI5PgovQ3JlYXRpb25EYXRlIChEOjIwMjYwOTI0MTU1NzU1WikKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKCjUgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAxIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9IZWx2ZXRpY2EtNzA5ODQ4MDc4OSA0IDAgUgovSGVsdmV0aWNhLTk3NDI2ODI1NjggNCAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjAwIDQwMCBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDYgMCBSIF0KPj4KZW5kb2JqCgo2IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMjMyCj4+CnN0cmVhbQp4nG2PTUpEMRCE9zlF1oKadDrVCcgs9L3gwo2QC4iMg+IsRsTzW3kTFwPSJKT/Kl+d3H134Sb6v/N1cLeP+8+f/ff768u1hVq0BCvVS/D9zYn6/uQ4yog+B594+tHdZUOxmhOaGhpDJWRFtmR8qbKSLGNBxjoqsrCfULFYwAPynC6mO98/XL9ya3fP7rTxbd9dklWKoEhG8VH+JwuTTFFQLUmYd5RgiRz8lUyKCDkTkCSaMLdxMyucbgA7k23MsJfHvomBCjoUqSNo9Dr0E9Xq9LnY8KhDnfU23J73t3rDKuuF319BTVYQCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDc2IDAwMDAwIG4gCjAwMDAwMDAxMjYgMDAwMDAgbiAKMDAwMDAwMDU5NiAwMDAwMCBuIAowMDAwMDAwNjk0IDAwMDAwIG4gCjAwMDAwMDA5MTcgMDAwMDAgbiAKCnRyYWlsZXIKPDwKL1NpemUgNwovUm9vdCAyIDAgUgovSW5mbyAzIDAgUgovRW5jcnlwdCA8PCAvRmlsdGVyIC9TdGFuZGFyZCAvViAyIC9SIDMgL08gKDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyKSAvVSAoMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIpIC9QIC0xMDUyID4+Cj4+CgpzdGFydHhyZWYKMTIyMgolJUVPRg==';

// 1x1 Lossless WebP
const WEBP_1X1_B64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

// 1x1 Spec-Compliant AVIF (ISOBMFF box format)
const AVIF_1X1_B64 =
  'AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwQEQAAAAVEAAQAAAAEAAACSAAAAEgAAAA1paW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAG2F2MUMBAAAAABAIgAAAAAAAABkAAAAUaXJlZgAAAAAAAAANY2RlcgAAAAEAAAABAAAAGW1kYXQSAg4n/xDgEAIQAgAAACj280w=';

// ============================================================================
// HELPER: PNG Chunk Construction with CRC32
// ============================================================================

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  typeBuf.copy(buf, 4);
  Buffer.from(data).copy(buf, 8);
  const toCrc = Buffer.concat([typeBuf, Buffer.from(data)]);
  buf.writeUInt32BE(crc32(toCrc), 8 + len);
  return buf;
}

// ============================================================================
// REALISTIC IMAGE FIXTURE GENERATORS (ALL 7 FORMATS)
// ============================================================================

/**
 * 1. Generates a realistic, spec-compliant PNG file (RGBA color space)
 * Uses genuine zlib compression and CRC32 chunks.
 * @param {string} [name='photo.png']
 * @param {number} [width=32]
 * @param {number} [height=32]
 * @returns {File}
 */
export function createRealisticPng(name = 'photo.png', width = 32, height = 32) {
  const lineSize = 1 + width * 4;
  const raw = new Uint8Array(lineSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * lineSize] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const idx = y * lineSize + 1 + x * 4;
      raw[idx] = (x * 12 + y * 4) % 256;     // R
      raw[idx + 1] = (y * 12 + x * 4) % 256; // G
      raw[idx + 2] = 210;                    // B
      raw[idx + 3] = 255;                    // Alpha
    }
  }
  const idatData = zlibSync(raw);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // non-interlaced

  const buffer = Buffer.concat([
    sig,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idatData),
    makePngChunk('IEND', new Uint8Array(0)),
  ]);

  return new File([buffer], name, { type: 'image/png' });
}

/**
 * 2. Generates a realistic baseline JPEG containing genuine EXIF (APP1)
 * and ICC Color Profile (APP2) metadata markers.
 * @param {string} [name='camera_exif_icc.jpg']
 * @returns {File}
 */
export function createJpegWithExifIcc(name = 'camera_exif_icc.jpg') {
  // Baseline minimal JPEG
  const baseJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64'
  );
  const soi = baseJpeg.subarray(0, 2);
  const rest = baseJpeg.subarray(2);

  // APP1 Exif Marker with TIFF Orientation header
  const exifPayload = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // 'Exif\0\0'
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF little-endian
    0x01, 0x00, // 1 tag
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, // Orientation: 1
    0x00, 0x00, 0x00, 0x00,
  ]);
  const app1Len = exifPayload.length + 2;
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff]),
    exifPayload,
  ]);

  // APP2 ICC Profile Marker (Display P3 / sRGB profile signature)
  const iccPayload = Buffer.from([
    0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00, // 'ICC_PROFILE\0'
    0x01, 0x01, // Chunk 1 of 1
    0x00, 0x00, 0x00, 0x80, // Profile size: 128 bytes
    0x61, 0x70, 0x70, 0x6c, // CMM: appl
    0x02, 0x20, 0x00, 0x00, // Version 2.2.0
    0x6d, 0x6e, 0x74, 0x72, // Device: monitor
    0x52, 0x47, 0x42, 0x20, // Color space: RGB
    0x58, 0x59, 0x5a, 0x20, // PCS: XYZ
    ...new Array(104).fill(0),
  ]);
  const app2Len = iccPayload.length + 2;
  const app2 = Buffer.concat([
    Buffer.from([0xff, 0xe2, (app2Len >> 8) & 0xff, app2Len & 0xff]),
    iccPayload,
  ]);

  const fullJpeg = Buffer.concat([soi, app1, app2, rest]);
  return new File([fullJpeg], name, { type: 'image/jpeg' });
}

/**
 * 3. Generates a realistic WebP file (lossless VP8L)
 * @param {string} [name='image.webp']
 * @returns {File}
 */
export function createRealisticWebp(name = 'image.webp') {
  const buf = Buffer.from(WEBP_1X1_B64, 'base64');
  return new File([buf], name, { type: 'image/webp' });
}

/**
 * 4. Generates a realistic SVG with XML declarations, DOCTYPEs, comments,
 * and heavy editor metadata namespaces (Inkscape, Sodipodi, Illustrator).
 * @param {string} [name='vector_art.svg']
 * @param {object} [options]
 * @returns {File}
 */
export function createRealisticSvg(name = 'vector_art.svg', options = {}) {
  const {
    withComments = true,
    withDoctype = true,
    withEditorMetadata = true,
  } = options;

  let content = '';
  if (withDoctype) {
    content += `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
    content += `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n`;
  }
  if (withComments) {
    content += `<!-- Generator: Adobe Illustrator 28.0, SVG Export Plug-In . SVG Version: 6.00 Build 0) -->\n`;
    content += `<!-- Created with Inkscape (http://www.inkscape.org/) -->\n`;
  }
  content += `<svg xmlns="http://www.w3.org/2000/svg"`;
  if (withEditorMetadata) {
    content += ` xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"`;
    content += ` xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"`;
    content += ` xmlns:sketch="http://www.bohemiancoding.com/sketch/ns"`;
    content += ` inkscape:version="1.3 (0e150ed6c4, 2023-07-21)"`;
  }
  content += ` width="300" height="300" viewBox="0 0 300 300" xml:space="preserve">\n`;
  if (withEditorMetadata) {
    content += `  <metadata id="metadata42">\n`;
    content += `    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n`;
    content += `      <cc:Work xmlns:cc="http://creativecommons.org/ns#" rdf:about="">\n`;
    content += `        <dc:format xmlns:dc="http://purl.org/dc/elements/1.1/">image/svg+xml</dc:format>\n`;
    content += `      </cc:Work>\n`;
    content += `    </rdf:RDF>\n`;
    content += `  </metadata>\n`;
    content += `  <desc>Detailed illustration with metadata comments and high precision coordinates</desc>\n`;
  }
  content += `  <g id="layer1" inkscape:groupmode="layer" inkscape:label="Layer 1">\n`;
  content += `    <rect x="15.123456" y="20.789101" width="120.456789" height="100.987654" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2.500000"/>\n`;
  content += `    <circle cx="150.333333" cy="150.666667" r="60.123456" fill="#ef4444" opacity="0.850000"/>\n`;
  content += `    <path d="M 25.1234 180.5678 L 85.9876 250.1234 L 145.4567 180.8901 Z" fill="#10b981"/>\n`;
  content += `  </g>\n`;
  content += `</svg>`;

  return new File([content], name, { type: 'image/svg+xml' });
}

/**
 * 5. Generates a realistic AVIF file
 * @param {string} [name='modern_photo.avif']
 * @returns {File}
 */
export function createRealisticAvif(name = 'modern_photo.avif') {
  const buf = Buffer.from(AVIF_1X1_B64, 'base64');
  return new File([buf], name, { type: 'image/avif' });
}

/**
 * 6. Generates a realistic GIF file using omggif
 * @param {string} [name='animation.gif']
 * @param {number} [width=16]
 * @param {number} [height=16]
 * @returns {File}
 */
export function createRealisticGif(name = 'animation.gif', width = 16, height = 16) {
  const buf = Buffer.alloc(width * height * 4 + 1024);
  const gifWriter = new GifWriter(buf, width, height, { loop: 0 });
  const palette = [0x000000, 0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
  const pixels = new Uint8Array(width * height);
  for (let i = 0; i < pixels.length; i++) pixels[i] = i % palette.length;
  gifWriter.addFrame(0, 0, width, height, pixels, { palette });
  const actualLen = gifWriter.end();
  return new File([buf.subarray(0, actualLen)], name, { type: 'image/gif' });
}

/**
 * 7. Generates a realistic BMP file (24-bit uncompressed RGB)
 * @param {string} [name='legacy.bmp']
 * @param {number} [width=16]
 * @param {number} [height=16]
 * @returns {File}
 */
export function createRealisticBmp(name = 'legacy.bmp', width = 16, height = 16) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28); // 24-bit BGR
  buf.writeUInt32LE(0, 30);  // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);

  // Pixel data (BGR format)
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + x * 3;
      buf[pxOffset] = (x * 15) % 256;     // Blue
      buf[pxOffset + 1] = (y * 15) % 256; // Green
      buf[pxOffset + 2] = 220;            // Red
    }
  }

  return new File([buf], name, { type: 'image/bmp' });
}

// ============================================================================
// EDGE CASE IMAGE FIXTURES
// ============================================================================

/**
 * Generates an already-optimal, compact JPEG where further re-encoding
 * yields >= input size (exercises Tier 3 Safety Fallback).
 * @param {string} [name='compact_photo.jpg']
 * @returns {File}
 */
export function createAlreadyCompressedJpeg(name = 'compact_photo.jpg') {
  // Ultra-compact valid baseline JPEG header (8 bytes)
  const baseJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  return new File([baseJpeg], name, { type: 'image/jpeg' });
}

/**
 * Generates an already-optimal compact PNG.
 * @param {string} [name='compact_icon.png']
 * @returns {File}
 */
export function createAlreadyCompressedPng(name = 'compact_icon.png') {
  // 1x1 valid PNG (~67 bytes)
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buf = Buffer.from(b64, 'base64');
  return new File([buf], name, { type: 'image/png' });
}

/**
 * Generates an image with massive dimensions (e.g. 5000x5000 = 25 MP)
 * Spec-compliant IHDR header without consuming 100MB RAM.
 * Exercises Tier 2 Canvas / Adaptive Downsampling boundaries (> 16 MP cap).
 * @param {'png'|'jpg'} [format='png']
 * @param {string} [name='hero_5000x5000.png']
 * @returns {File}
 */
export function createMassiveDimensionImage(format = 'png', name = 'hero_5000x5000.png') {
  void format;
  const width = 5000;
  const height = 5000;

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const dummyScanline = new Uint8Array(1 + 32 * 4); // compact valid payload
  const idat = zlibSync(dummyScanline);

  const buf = Buffer.concat([
    sig,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idat),
    makePngChunk('IEND', new Uint8Array(0)),
  ]);

  return new File([buf], name, { type: 'image/png' });
}

/**
 * Generates an image file with corrupted magic header bytes.
 * @param {'png'|'jpg'|'webp'} [format='png']
 * @param {string} [name='corrupted_header.png']
 * @returns {File}
 */
export function createCorruptedImage(format = 'png', name = `corrupted_header.${format}`) {
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
  // Corrupted bytes with broken headers
  const buffer = new Uint8Array([0x89, 0x50, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe]);
  return new File([buffer], name, { type: mimeMap[format] || 'image/png' });
}

// ============================================================================
// REALISTIC PDF FIXTURE GENERATORS
// ============================================================================

/**
 * Generates a valid simple text PDF with selectable typography.
 * @param {string} [name='document_text.pdf']
 * @returns {File}
 */
export function createSimpleTextPdf(name = 'document_text.pdf') {
  const buf = Buffer.from(TEXT_PDF_B64, 'base64');
  return new File([buf], name, { type: 'application/pdf' });
}

/**
 * Generates a valid vector PDF containing geometric vector drawing streams.
 * @param {string} [name='vector_blueprint.pdf']
 * @returns {File}
 */
export function createVectorPdf(name = 'vector_blueprint.pdf') {
  const buf = Buffer.from(VEC_PDF_B64, 'base64');
  return new File([buf], name, { type: 'application/pdf' });
}

/**
 * Generates a valid multi-page PDF document (5 pages).
 * @param {string} [name='multipage_report.pdf']
 * @param {number} [pageCount=5]
 * @returns {File}
 */
export function createMultiPagePdf(name = 'multipage_report.pdf', pageCount = 5) {
  void pageCount;
  const buf = Buffer.from(MULTI_PDF_B64, 'base64');
  return new File([buf], name, { type: 'application/pdf' });
}

/**
 * Generates a password-encrypted PDF fixture (with /Encrypt dictionary in trailer).
 * Exercises R2 & R4: Must be caught gracefully without unhandled rejection.
 * @param {string} [name='payroll_encrypted.pdf']
 * @returns {File}
 */
export function createEncryptedPdf(name = 'payroll_encrypted.pdf') {
  const buf = Buffer.from(ENC_PDF_B64, 'base64');
  return new File([buf], name, { type: 'application/pdf' });
}

/**
 * Generates a corrupted PDF with truncated byte stream and invalid trailer.
 * Exercises R4: Must be caught gracefully and return safe fallback.
 * @param {string} [name='corrupted_stream.pdf']
 * @returns {File}
 */
export function createCorruptedPdf(name = 'corrupted_stream.pdf') {
  const brokenContent = `%PDF-1.7\n%corrupted_random_byte_stream_0xDEADBEEF\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nxref\n0 2\n0000000000 65535 f\n0000000010 00000 n\ntrailer\n<< /Size 2 /Root 999 0 R >>\nstartxref\n99999\n%%EOF`;
  return new File([brokenContent], name, { type: 'application/pdf' });
}

// ============================================================================
// COMPATIBILITY EXPORTS FOR EXISTING SIMPLE MODE SUITES
// ============================================================================

/**
 * Creates a synthetic image file for backward compatibility.
 * @param {'png'|'jpg'|'jpeg'|'webp'|'gif'|'svg'|'avif'|'bmp'|'ico'|'tiff'} format
 * @param {string} [name]
 * @param {number} [size]
 * @returns {File}
 */
export function createTestImage(format = 'png', name = `test_image.${format}`, size = 1024) {
  const fmt = format.toLowerCase();
  if (fmt === 'png') return createRealisticPng(name, 16, 16);
  if (fmt === 'jpg' || fmt === 'jpeg') return createJpegWithExifIcc(name);
  if (fmt === 'webp') return createRealisticWebp(name);
  if (fmt === 'svg') return createRealisticSvg(name);
  if (fmt === 'avif') return createRealisticAvif(name);
  if (fmt === 'gif') return createRealisticGif(name, 16, 16);
  if (fmt === 'bmp') return createRealisticBmp(name, 16, 16);

  // Fallback signature for other formats
  const mimeMap = { ico: 'image/x-icon', tiff: 'image/tiff' };
  const buffer = new Uint8Array(Math.max(size, 32));
  return new File([buffer], name, { type: mimeMap[fmt] || 'image/png' });
}

/**
 * Creates a test PDF file (backward compatibility).
 * @param {string} [name='sample_document.pdf']
 * @param {number} [pages=1]
 * @returns {File}
 */
export function createTestPdf(name = 'sample_document.pdf', pages = 1) {
  if (pages > 1) return createMultiPagePdf(name, pages);
  return createSimpleTextPdf(name);
}

/**
 * Creates a synthetic CSV data file.
 * @param {string} [name='data_export.csv']
 * @param {number} [rowCount=5]
 * @returns {File}
 */
export function createTestCsv(name = 'data_export.csv', rowCount = 5) {
  let content = 'id,name,role,department,salary\n';
  for (let i = 1; i <= rowCount; i++) {
    content += `${i},User_${i},Engineer,Product,${75000 + i * 1000}\n`;
  }
  return new File([content], name, { type: 'text/csv' });
}

/**
 * Creates a synthetic JSON developer file.
 * @param {string} [name='config.json']
 * @param {Record<string, any>} [payload=null]
 * @returns {File}
 */
export function createTestJson(name = 'config.json', payload = null) {
  const content = JSON.stringify(
    payload || {
      appName: 'whysogood',
      version: '1.0.0',
      simpleMode: true,
      features: ['client-side', 'zero-storage', 'fflate-zip'],
      metrics: { latency: 12, memoryMb: 45 },
    },
    null,
    2
  );
  return new File([content], name, { type: 'application/json' });
}

/**
 * Creates a synthetic Text file.
 * @param {string} [name='notes.txt']
 * @param {string} [text='WhySoGood client-side single page workbench.']
 * @returns {File}
 */
export function createTestText(name = 'notes.txt', text = 'WhySoGood client-side single page workbench.') {
  return new File([text], name, { type: 'text/plain' });
}

/**
 * Creates a synthetic Audio mock file.
 * @param {string} [name='recording.mp3']
 * @returns {File}
 */
export function createTestAudio(name = 'recording.mp3') {
  const buffer = new Uint8Array(512);
  buffer.set([0x49, 0x44, 0x33], 0); // ID3 header
  return new File([buffer], name, { type: 'audio/mpeg' });
}

// ============================================================================
// EDGE CASE DICTIONARY (Simple Mode & Compression)
// ============================================================================

export const EdgeCaseFiles = {
  // Uppercase extensions
  uppercasePng: () => new File([new Uint8Array([1, 2, 3])], 'BANNER_IMAGE.PNG', { type: 'image/png' }),
  uppercaseJpg: () => new File([new Uint8Array([1, 2, 3])], 'PHOTO_2026.JPEG', { type: 'image/jpeg' }),
  uppercasePdf: () => new File([new Uint8Array([1, 2, 3])], 'QUARTERLY_INVOICE.PDF', { type: 'application/pdf' }),
  uppercaseCsv: () => new File(['a,b\n1,2'], 'SALES_REPORT.CSV', { type: 'text/csv' }),
  uppercaseJson: () => new File(['{"ok":true}'], 'SETTINGS.JSON', { type: 'application/json' }),

  // Missing MIME types with valid extensions
  missingMimePng: () => new File([new Uint8Array([1, 2, 3])], 'screenshot.png', { type: '' }),
  missingMimePdf: () => new File([new Uint8Array([1, 2, 3])], 'annual_doc.pdf', { type: '' }),
  genericMimeJpg: () => new File([new Uint8Array([1, 2, 3])], 'snapshot.jpg', { type: 'application/octet-stream' }),

  // Multi-dot filenames
  multiDotPdf: () => new File([new Uint8Array([1, 2, 3])], 'company.finance.audit.v2.final.pdf', { type: 'application/pdf' }),
  multiDotPng: () => new File([new Uint8Array([1, 2, 3])], 'asset.min.highres.draft.png', { type: 'image/png' }),

  // Special characters and spaces
  specialCharFile: () =>
    new File([new Uint8Array([1, 2, 3])], 'My Vacation Photo (1) 🏖️ & [draft] #99.jpeg', { type: 'image/jpeg' }),

  // Zero-byte empty files
  emptyZeroByteFile: () => new File([], 'empty_file.png', { type: 'image/png' }),
  emptyZeroBytePdf: () => new File([], 'blank.pdf', { type: 'application/pdf' }),
  zeroByteImage: () => new File([], 'zero_byte.png', { type: 'image/png' }),
  zeroBytePdf: () => new File([], 'zero_byte.pdf', { type: 'application/pdf' }),

  // Extremely long filename (>150 characters)
  longFilenameFile: () =>
    new File(
      [new Uint8Array([1, 2, 3])],
      'a_very_long_file_name_that_exceeds_normal_boundaries_and_might_break_flexbox_or_grid_layout_overflow_containers_in_the_ui_component_card_headers_2026_final_version.png',
      { type: 'image/png' }
    ),

  // Corrupted / invalid data
  corruptedPng: () => new File(['NOT_A_PNG_FILE_AT_ALL_CORRUPT'], 'corrupted.png', { type: 'image/png' }),
  corruptedPdf: () => createCorruptedPdf('corrupted.pdf'),
  corruptedJson: () => new File(['{ invalid json: missing quotes'], 'corrupt.json', { type: 'application/json' }),
  corruptedHeaderImage: () => createCorruptedImage('png', 'corrupt_header.png'),
  corruptedHeaderJpeg: () => createCorruptedImage('jpg', 'corrupt_header.jpg'),
  corruptedPdfBytes: () => createCorruptedPdf('corrupted_bytes.pdf'),

  // Realistic and unusual image formats
  webpFile: () => createRealisticWebp('photo.webp'),
  avifFile: () => createRealisticAvif('modern.avif'),
  bmpFile: () => createRealisticBmp('legacy.bmp', 16, 16),
  icoFile: () => createTestImage('ico', 'favicon.ico'),
  svgFile: () => createRealisticSvg('icon.svg'),
  gifFile: () => createRealisticGif('banner.gif', 16, 16),
  jpegExifIcc: () => createJpegWithExifIcc('portrait_with_metadata.jpg'),

  // Realistic PDF formats
  simpleTextPdf: () => createSimpleTextPdf('employment_contract.pdf'),
  vectorPdf: () => createVectorPdf('technical_schematic.pdf'),
  multiPagePdf: () => createMultiPagePdf('annual_report_5p.pdf', 5),
  encryptedPdf: () => createEncryptedPdf('protected_payroll.pdf'),

  // Already-optimal files
  alreadyCompressedJpeg: () => createAlreadyCompressedJpeg('compact_photo.jpg'),
  alreadyCompressedPng: () => createAlreadyCompressedPng('compact_icon.png'),

  // Massive dimension image (5000x5000)
  massiveDimensionImage: () => createMassiveDimensionImage('png', 'hero_5000x5000.png'),

  // Large simulated file (5MB)
  largeSimulatedFile: () => {
    const bigBuffer = new Uint8Array(5 * 1024 * 1024);
    return new File([bigBuffer], 'large_4k_photo.png', { type: 'image/png' });
  },
};
