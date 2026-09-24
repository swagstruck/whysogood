// @ts-check
/**
 * FORENSIC AUDITOR INDEPENDENT VERIFICATION SUITE — MILESTONE 3
 * 
 * Conducted independently by Forensic Auditor (teamwork_preview_auditor_m3).
 * Verifies:
 * 1. Genuine implementation: ZipPassThrough (Method 0) vs AsyncZipDeflate/ZipDeflate (Method 8)
 * 2. Memory safety: 512KB chunking slices for Blob and Uint8Array (> 3.5 MB)
 * 3. Path traversal (zip-slip) sanitization & filename deduplication
 * 4. Byte-level SHA-256 integrity verification across heterogeneous formats
 * 5. Simple Mode runners and PDF utils integration
 */

import './e2e/helpers/ts_resolver.mjs';
import { setupMockBrowserEnvironment } from './e2e/helpers/dom_env.mjs';
import { unzipSync } from 'fflate';
import crypto from 'node:crypto';

// Setup mock DOM environment
setupMockBrowserEnvironment();

const { createStreamingZip, isAlreadyCompressedFormat } = await import('../lib/archiveUtils.ts');
const { createOutputsZip } = await import('../lib/simpleMode/runners.ts');
const { createZipArchive, createZipArchiveSync } = await import('../lib/pdfUtils.ts');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function parseCentralDirectory(zipBytes) {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const records = [];
  let offset = 0;

  while (offset < zipBytes.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig === 0x02014b50) {
      const method = view.getUint16(offset + 10, true);
      const crc = view.getUint32(offset + 16, true);
      const compSize = view.getUint32(offset + 20, true);
      const uncompSize = view.getUint32(offset + 24, true);
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commLen = view.getUint16(offset + 32, true);
      const filename = new TextDecoder().decode(
        zipBytes.subarray(offset + 46, offset + 46 + nameLen)
      );

      records.push({
        filename,
        method, // 0 = STORE, 8 = DEFLATE
        crc,
        compSize,
        uncompSize,
      });

      offset += 46 + nameLen + extraLen + commLen;
    } else {
      offset++;
    }
  }
  return records;
}

async function runForensicAudit() {
  console.log('\n================================================================');
  console.log(' 🕵️ FORENSIC AUDITOR INDEPENDENT INTEGRITY VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  }

  // --- CHECK 1: Genuine Implementation: Method 0 (Store) vs Method 8 (Deflate) ---
  console.log('--- CHECK 1: Genuine Implementation & Method 0 vs Method 8 Verification ---');
  {
    const entries = [
      { name: 'photo.jpg', data: crypto.randomBytes(256) },
      { name: 'image.png', data: crypto.randomBytes(256) },
      { name: 'document.pdf', data: crypto.randomBytes(256) },
      { name: 'song.mp3', data: crypto.randomBytes(256) },
      { name: 'video.mp4', data: crypto.randomBytes(256) },
      { name: 'archive.zip', data: crypto.randomBytes(256) },
      { name: 'font.woff2', data: crypto.randomBytes(256) },
      { name: 'vector.svg', data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>') },
      { name: 'notes.txt', data: Buffer.from('Plain text entry for testing deflate compression efficiency.') },
      { name: 'data.json', data: Buffer.from(JSON.stringify({ test: 'integrity', valid: true, values: [1, 2, 3] })) },
      { name: 'table.csv', data: Buffer.from('col1,col2,col3\nval1,val2,val3\n') },
      { name: 'index.html', data: Buffer.from('<!DOCTYPE html><html><body><h1>Audit</h1></body></html>') },
    ];

    const zipBlob = await createStreamingZip(entries);
    assert(zipBlob instanceof Blob, 'Zip output is an instance of Blob');
    assert(zipBlob.type === 'application/zip', 'Zip output MIME type is application/zip');

    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());
    assert(zipBytes[0] === 0x50 && zipBytes[1] === 0x4b, 'Valid PK magic header');

    const cd = parseCentralDirectory(zipBytes);
    assert(cd.length === entries.length, `Central directory contains all ${entries.length} entries`);

    const cdMap = Object.fromEntries(cd.map(r => [r.filename, r]));

    // Pre-compressed binaries MUST be Method 0 (STORE, 0 CPU)
    for (const name of ['photo.jpg', 'image.png', 'document.pdf', 'song.mp3', 'video.mp4', 'archive.zip', 'font.woff2']) {
      assert(cdMap[name].method === 0, `${name} uses compression Method 0 (STORE pass-through)`);
      assert(cdMap[name].compSize === cdMap[name].uncompSize, `${name} uncompressedSize == compSize`);
    }

    // Text/vector files MUST be Method 8 (DEFLATE)
    for (const name of ['vector.svg', 'notes.txt', 'data.json', 'table.csv', 'index.html']) {
      assert(cdMap[name].method === 8, `${name} uses compression Method 8 (DEFLATE)`);
    }
  }

  // --- CHECK 2: Memory Safety & 512KB Chunking Slices (>3.5MB Payload) ---
  console.log('\n--- CHECK 2: Memory Safety & 512KB Chunking Slices (>3.5MB Payload) ---');
  {
    const largeSize = 3.5 * 1024 * 1024; // 3,670,016 bytes (spans exactly 7 chunks)
    const largeBuffer = crypto.randomBytes(largeSize);
    const largeHash = sha256(largeBuffer);

    // Test with Uint8Array
    const zipBlobU8 = await createStreamingZip([
      { name: 'large_stream.bin', data: new Uint8Array(largeBuffer) },
    ]);
    const unzippedU8 = unzipSync(new Uint8Array(await zipBlobU8.arrayBuffer()));
    assert(unzippedU8['large_stream.bin'].length === largeSize, 'Uint8Array >3.5MB unzips to exact length');
    assert(sha256(unzippedU8['large_stream.bin']) === largeHash, 'Uint8Array >3.5MB matches exact SHA-256 across all 7 chunk boundaries');

    // Test with Blob
    const largeBlob = new Blob([largeBuffer]);
    const zipBlobBlob = await createStreamingZip([
      { name: 'large_blob.bin', data: largeBlob },
    ]);
    const unzippedBlob = unzipSync(new Uint8Array(await zipBlobBlob.arrayBuffer()));
    assert(unzippedBlob['large_blob.bin'].length === largeSize, 'Blob >3.5MB unzips to exact length');
    assert(sha256(unzippedBlob['large_blob.bin']) === largeHash, 'Blob >3.5MB matches exact SHA-256 across all 7 chunk boundaries');
  }

  // --- CHECK 3: Path Traversal & Collision Protection ---
  console.log('\n--- CHECK 3: Path Traversal & Collision Protection ---');
  {
    const attackEntries = [
      { name: '../../../../etc/passwd', data: Buffer.from('passwd_content') },
      { name: '..\\..\\..\\boot.ini', data: Buffer.from('boot_content') },
      { name: '/absolute/dir/file.txt', data: Buffer.from('abs_content') },
      { name: 'normal_file.txt', data: Buffer.from('first') },
      { name: 'normal_file.txt', data: Buffer.from('second') },
      { name: 'normal_file.txt', data: Buffer.from('third') },
      { name: '   ', data: Buffer.from('whitespace_1') },
      { name: '\t\n', data: Buffer.from('whitespace_2') },
    ];

    const zipBlob = await createStreamingZip(attackEntries);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    const keys = Object.keys(unzipped);

    assert(keys.length === attackEntries.length, `All ${attackEntries.length} entries preserved without overwrites`);

    for (const key of keys) {
      assert(!key.startsWith('..'), `Key does not start with ..: ${key}`);
      assert(!key.startsWith('/'), `Key does not start with /: ${key}`);
      assert(!key.startsWith('\\'), `Key does not start with \\: ${key}`);
    }

    assert(keys.includes('normal_file.txt'), 'Base name preserved');
    assert(keys.includes('normal_file (1).txt'), 'First collision deduplicated');
    assert(keys.includes('normal_file (2).txt'), 'Second collision deduplicated');
    assert(keys.includes('file'), 'Whitespace sanitized to file');
    assert(keys.includes('file (1)'), 'Second whitespace collision deduplicated to file (1)');
  }

  // --- CHECK 4: Byte-Level Integrity Across Heterogeneous Formats ---
  console.log('\n--- CHECK 4: Byte-Level Integrity & Unicode Handling ---');
  {
    const randomBinary = crypto.randomBytes(64 * 1024);
    const unicodeText = 'Hello 🌍! 🚀 Unicode characters: 日本語, العربية, Кириллица, 👩‍💻';
    const emptyBytes = new Uint8Array(0);

    const entries = [
      { name: 'random.bin', data: randomBinary },
      { name: 'unicode.txt', data: Buffer.from(unicodeText) },
      { name: 'empty.dat', data: emptyBytes },
      { name: '🚀_emoji_file.png', data: crypto.randomBytes(128) },
    ];

    const zipBlob = await createStreamingZip(entries);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

    assert(sha256(unzipped['random.bin']) === sha256(randomBinary), 'Binary payload matches SHA-256');
    assert(new TextDecoder().decode(unzipped['unicode.txt']) === unicodeText, 'Unicode text matches character for character');
    assert(unzipped['empty.dat'].length === 0, 'Zero-byte file unzips to 0 length');
    assert(unzipped['🚀_emoji_file.png'].length === 128, 'Emoji-named file unzips correctly');
  }

  // --- CHECK 5: Simple Mode Runner createOutputsZip Integration ---
  console.log('\n--- CHECK 5: Simple Mode Runner Integration ---');
  {
    const payloadA = crypto.randomBytes(512);
    const payloadB = crypto.randomBytes(1024);

    const outputs = [
      {
        id: 'out-1',
        toolSlug: 'image-compressor',
        toolName: 'Image Compressor',
        sourceFilename: 'image.jpg',
        outputFilename: 'image_compressed.jpg',
        mimeType: 'image/jpeg',
        size: payloadA.length,
        originalSize: 1000,
        blob: new Blob([payloadA], { type: 'image/jpeg' }),
        previewUrl: 'blob:1',
        createdAt: 100,
      },
      {
        id: 'out-2',
        toolSlug: 'image-compressor',
        toolName: 'Image Compressor',
        sourceFilename: 'image.jpg',
        outputFilename: 'image_compressed.jpg',
        mimeType: 'image/jpeg',
        size: payloadB.length,
        originalSize: 1000,
        blob: new Blob([payloadB], { type: 'image/jpeg' }),
        previewUrl: 'blob:2',
        createdAt: 200,
      },
    ];

    const zipBlob = await createOutputsZip(outputs);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    const keys = Object.keys(unzipped);

    assert(keys.length === 2, 'createOutputsZip preserved both outputs');
    assert(sha256(unzipped['image_compressed.jpg']) === sha256(payloadA), 'First output matches payload A');
    assert(sha256(unzipped[keys.find(k => k !== 'image_compressed.jpg')]) === sha256(payloadB), 'Second output matches payload B');
  }

  // --- CHECK 6: PDF Utils createZipArchive Integration ---
  console.log('\n--- CHECK 6: PDF Utils Integration ---');
  {
    const page1 = Buffer.from('%PDF-1.4 page 1 content');
    const page2 = Buffer.from('%PDF-1.4 page 2 content');

    const files = {
      'page_1.pdf': new Blob([page1]),
      'page_2.pdf': new Uint8Array(page2),
    };

    const zipBlob = await createZipArchive(files);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

    assert(sha256(unzipped['page_1.pdf']) === sha256(page1), 'page_1.pdf Blob matches SHA-256');
    assert(sha256(unzipped['page_2.pdf']) === sha256(page2), 'page_2.pdf Uint8Array matches SHA-256');
  }

  console.log('\n================================================================');
  console.log(` 🏁 FORENSIC INTEGRITY AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runForensicAudit().catch(err => {
  console.error('Forensic audit failed with exception:', err);
  process.exit(1);
});
