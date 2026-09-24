// @ts-check
/**
 * Milestone 3 Unit Test Suite: High-Reliability Archive & Memory-Safe Streaming Packaging
 * 
 * Verifies:
 * 1. Format-Aware Classification (`isAlreadyCompressedFormat`)
 * 2. Streaming ZIP Creation of Mixed Formats (JPEG, PNG, WebP, SVG, TXT, JSON, PDF)
 * 3. Byte-Level Verification via `fflate.unzipSync`
 * 4. Fast Pass-Through on Pre-Compressed Binaries (Method 0 STORE vs Method 8 DEFLATE)
 * 5. Edge Cases & Zero Unhandled Exceptions (empty archive, 0-byte file, duplicate names, unicode/emojis, path traversal)
 * 6. Streaming Chunking & AbortSignal Cancellation
 * 7. Call Site Integrations (`createOutputsZip`, `createZipArchive`, `createZipArchiveSync`)
 * 
 * Executable via: `node tests/archive_compression_m3.test.mjs`
 */

import './e2e/helpers/ts_resolver.mjs';
import { setupMockBrowserEnvironment } from './e2e/helpers/dom_env.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertFalse,
} from './e2e/helpers/assertions.mjs';
import { unzipSync } from 'fflate';

// Load TypeScript modules dynamically after ts_resolver hook is registered
const { createStreamingZip, isAlreadyCompressedFormat } = await import('../lib/archiveUtils.ts');
const { createOutputsZip } = await import('../lib/simpleMode/runners.ts');
const { createZipArchive, createZipArchiveSync } = await import('../lib/pdfUtils.ts');

/**
 * Reads Central Directory file headers from a ZIP buffer to inspect compression methods.
 * Central Directory Header Signature: 0x02014b50
 * Method offset: +10 (uint16)
 * Filename offset: +46 (string)
 */
function extractZipCentralDirectoryHeaders(zipBuffer) {
  const view = new DataView(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength);
  const headers = [];
  let offset = 0;

  while (offset < zipBuffer.length - 4) {
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
        zipBuffer.subarray(offset + 46, offset + 46 + nameLen)
      );

      headers.push({
        filename,
        method, // 0 = STORE (pass-through), 8 = DEFLATE
        crc,
        compSize,
        uncompSize,
      });

      offset += 46 + nameLen + extraLen + commLen;
    } else {
      offset++;
    }
  }

  return headers;
}

export async function runArchiveCompressionM3Tests() {
  const tracker = new TestResultTracker('Milestone 3: Archive & Streaming ZIP Packaging');

  console.log('\n================================================================');
  console.log(' 📦 RUNNING MILESTONE 3: ARCHIVE & STREAMING ZIP UNIT TESTS');
  console.log('================================================================\n');

  // --- Group 1: Format-Aware Classification ---
  console.log('--- Group 1: Format-Aware Classification ---');

  await tracker.runTest('M3.1.1: Pre-compressed image formats identified for Store pass-through', async () => {
    assertTrue(isAlreadyCompressedFormat('photo.jpg'));
    assertTrue(isAlreadyCompressedFormat('image.JPEG'));
    assertTrue(isAlreadyCompressedFormat('graphic.png'));
    assertTrue(isAlreadyCompressedFormat('picture.webp'));
    assertTrue(isAlreadyCompressedFormat('modern.avif'));
    assertTrue(isAlreadyCompressedFormat('animation.gif'));
  });

  await tracker.runTest('M3.1.2: Pre-compressed archive and media formats identified for Store pass-through', async () => {
    assertTrue(isAlreadyCompressedFormat('doc.pdf'));
    assertTrue(isAlreadyCompressedFormat('bundle.zip'));
    assertTrue(isAlreadyCompressedFormat('song.mp3'));
    assertTrue(isAlreadyCompressedFormat('video.mp4'));
    assertTrue(isAlreadyCompressedFormat('archive.tar.gz'));
    assertTrue(isAlreadyCompressedFormat('archive.tgz'));
    assertTrue(isAlreadyCompressedFormat('font.woff2'));
  });

  await tracker.runTest('M3.1.3: Uncompressed text and vector formats identified for Deflate compression', async () => {
    assertFalse(isAlreadyCompressedFormat('vector.svg'));
    assertFalse(isAlreadyCompressedFormat('notes.txt'));
    assertFalse(isAlreadyCompressedFormat('data.json'));
    assertFalse(isAlreadyCompressedFormat('spreadsheet.csv'));
    assertFalse(isAlreadyCompressedFormat('page.html'));
    assertFalse(isAlreadyCompressedFormat('config.xml'));
    assertFalse(isAlreadyCompressedFormat('readme.md'));
  });

  await tracker.runTest('M3.1.4: Safe handling of filenames without extensions or abnormal inputs', async () => {
    assertFalse(isAlreadyCompressedFormat('noextension'));
    assertFalse(isAlreadyCompressedFormat(''));
    // @ts-ignore
    assertFalse(isAlreadyCompressedFormat(null));
    // @ts-ignore
    assertFalse(isAlreadyCompressedFormat(undefined));
  });

  // --- Group 2: Mixed-Format Streaming ZIP Creation & Unpack Integrity ---
  console.log('\n--- Group 2: Mixed-Format Streaming ZIP Creation & Unpack ---');

  await tracker.runTest('M3.2.1: Streaming ZIP creation bundles mixed formats with PK magic header', async () => {
    const mixedEntries = [
      { name: 'photo.jpg', data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]) },
      { name: 'graphic.png', data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
      { name: 'vector.svg', data: new TextEncoder().encode('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>') },
      { name: 'document.txt', data: new TextEncoder().encode('High-reliability archive packaging verification string.') },
    ];

    const zipBlob = await createStreamingZip(mixedEntries);
    assertTrue(zipBlob instanceof Blob, 'Output must be a Blob instance');
    assertEqual(zipBlob.type, 'application/zip', 'Blob type must be application/zip');
    assertTrue(zipBlob.size > 0, 'ZIP Blob must have non-zero length');

    const zipBuffer = new Uint8Array(await zipBlob.arrayBuffer());
    assertEqual(zipBuffer[0], 0x50, 'Byte 0 must be P (0x50)');
    assertEqual(zipBuffer[1], 0x4b, 'Byte 1 must be K (0x4B)');
    assertEqual(zipBuffer[2], 0x03, 'Byte 2 must be 0x03');
    assertEqual(zipBuffer[3], 0x04, 'Byte 3 must be 0x04');
  });

  await tracker.runTest('M3.2.2: Byte-level exact verification of unpacked files using fflate.unzipSync', async () => {
    const rawJpg = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const rawPng = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const rawSvgText = '<svg width="200" height="200"><rect width="100%" height="100%" fill="blue"/></svg>';
    const rawTxtText = 'WhySoGood High Reliability Streaming Packager 2026';

    const entries = [
      { name: 'image.jpg', data: rawJpg },
      { name: 'diagram.png', data: rawPng },
      { name: 'logo.svg', data: new TextEncoder().encode(rawSvgText) },
      { name: 'readme.txt', data: new TextEncoder().encode(rawTxtText) },
    ];

    const zipBlob = await createStreamingZip(entries);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());
    const unzipped = unzipSync(zipBytes);

    assertEqual(Object.keys(unzipped).length, 4, 'Unpacked archive must have exactly 4 files');

    // Byte-for-byte check for JPEG
    assertEqual(unzipped['image.jpg'].length, rawJpg.length);
    for (let i = 0; i < rawJpg.length; i++) {
      assertEqual(unzipped['image.jpg'][i], rawJpg[i]);
    }

    // Byte-for-byte check for PNG
    assertEqual(unzipped['diagram.png'].length, rawPng.length);
    for (let i = 0; i < rawPng.length; i++) {
      assertEqual(unzipped['diagram.png'][i], rawPng[i]);
    }

    // Content check for SVG
    const unzippedSvg = new TextDecoder().decode(unzipped['logo.svg']);
    assertEqual(unzippedSvg, rawSvgText);

    // Content check for TXT
    const unzippedTxt = new TextDecoder().decode(unzipped['readme.txt']);
    assertEqual(unzippedTxt, rawTxtText);
  });

  await tracker.runTest('M3.2.3: Support for Blob and File entry data inputs', async () => {
    const blob1 = new Blob(['Blob text content'], { type: 'text/plain' });
    const blob2 = new Blob([new Uint8Array([100, 101, 102])], { type: 'application/octet-stream' });

    const entries = [
      { name: 'from_blob1.txt', data: blob1 },
      { name: 'from_blob2.bin', data: blob2 },
    ];

    const zipBlob = await createStreamingZip(entries);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

    assertEqual(new TextDecoder().decode(unzipped['from_blob1.txt']), 'Blob text content');
    assertEqual(unzipped['from_blob2.bin'].length, 3);
    assertEqual(unzipped['from_blob2.bin'][0], 100);
  });

  // --- Group 3: Fast Pass-Through Verification ---
  console.log('\n--- Group 3: Fast Pass-Through Verification (Store vs Deflate) ---');

  await tracker.runTest('M3.3.1: Pre-compressed files use Method 0 (STORE) and text files use Method 8 (DEFLATE)', async () => {
    const entries = [
      { name: 'photo.jpg', data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
      { name: 'illustration.png', data: new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2]) },
      { name: 'report.pdf', data: new Uint8Array([50, 51, 52, 53, 54]) },
      { name: 'bundle.zip', data: new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) },
      { name: 'markup.svg', data: new TextEncoder().encode('<svg><circle r="10"/></svg>') },
      { name: 'notes.txt', data: new TextEncoder().encode('Plain text sample string for compression testing.') },
    ];

    const zipBlob = await createStreamingZip(entries);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());
    const headers = extractZipCentralDirectoryHeaders(zipBytes);

    assertEqual(headers.length, 6, 'Central directory must record all 6 files');

    const headersMap = Object.fromEntries(headers.map(h => [h.filename, h]));

    // Compressed formats must use Method 0 (Store pass-through)
    assertEqual(headersMap['photo.jpg'].method, 0, 'photo.jpg must use Method 0 (STORE)');
    assertEqual(headersMap['illustration.png'].method, 0, 'illustration.png must use Method 0 (STORE)');
    assertEqual(headersMap['report.pdf'].method, 0, 'report.pdf must use Method 0 (STORE)');
    assertEqual(headersMap['bundle.zip'].method, 0, 'bundle.zip must use Method 0 (STORE)');

    // Text/vector formats must use Method 8 (Deflate)
    assertEqual(headersMap['markup.svg'].method, 8, 'markup.svg must use Method 8 (DEFLATE)');
    assertEqual(headersMap['notes.txt'].method, 8, 'notes.txt must use Method 8 (DEFLATE)');

    // Size check on Store mode: uncompressedSize == compSize
    assertEqual(headersMap['photo.jpg'].compSize, headersMap['photo.jpg'].uncompSize);
    assertEqual(headersMap['report.pdf'].compSize, headersMap['report.pdf'].uncompSize);
  });

  // --- Group 4: Edge Cases & Zero Unhandled Exceptions ---
  console.log('\n--- Group 4: Edge Cases & Zero Unhandled Exceptions ---');

  await tracker.runTest('M3.4.1: Empty archive (0 entries) returns standard 22-byte valid empty ZIP', async () => {
    const emptyBlob = await createStreamingZip([]);
    assertTrue(emptyBlob instanceof Blob);
    assertEqual(emptyBlob.size, 22, 'Empty ZIP archive must be exactly 22 bytes (End of Central Directory)');

    const unzipped = unzipSync(new Uint8Array(await emptyBlob.arrayBuffer()));
    assertEqual(Object.keys(unzipped).length, 0, 'Empty ZIP must unpack cleanly to 0 entries');
  });

  await tracker.runTest('M3.4.2: Zero-byte files unpack safely with length 0', async () => {
    const entries = [
      { name: 'empty_bytes.bin', data: new Uint8Array(0) },
      { name: 'empty_blob.txt', data: new Blob([]) },
    ];

    const zipBlob = await createStreamingZip(entries);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

    assertEqual(Object.keys(unzipped).length, 2);
    assertEqual(unzipped['empty_bytes.bin'].length, 0);
    assertEqual(unzipped['empty_blob.txt'].length, 0);
  });

  await tracker.runTest('M3.4.3: Path traversal protection strips ../ and leading slashes safely', async () => {
    const entries = [
      { name: '../../etc/passwd.txt', data: new TextEncoder().encode('safe content') },
      { name: '/absolute/path/file.jpg', data: new Uint8Array([1, 2, 3]) },
      { name: '..\\windows\\style.png', data: new Uint8Array([4, 5, 6]) },
    ];

    const zipBlob = await createStreamingZip(entries);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    const keys = Object.keys(unzipped);

    assertFalse(keys.some(k => k.startsWith('..')), 'Keys must not start with ..');
    assertFalse(keys.some(k => k.startsWith('/')), 'Keys must not start with /');
    assertTrue(keys.includes('etc/passwd.txt') || keys.includes('passwd.txt'));
  });

  await tracker.runTest('M3.4.4: Duplicate filename de-duplication prevents archive entry collisions', async () => {
    const entries = [
      { name: 'duplicate.jpg', data: new Uint8Array([1]) },
      { name: 'duplicate.jpg', data: new Uint8Array([2, 2]) },
      { name: 'duplicate.jpg', data: new Uint8Array([3, 3, 3]) },
    ];

    const zipBlob = await createStreamingZip(entries);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    const keys = Object.keys(unzipped);

    assertEqual(keys.length, 3, 'All 3 duplicate files must be preserved in ZIP');
    assertTrue(keys.includes('duplicate.jpg'));
    assertTrue(keys.includes('duplicate (1).jpg'));
    assertTrue(keys.includes('duplicate (2).jpg'));

    assertEqual(unzipped['duplicate.jpg'].length, 1);
    assertEqual(unzipped['duplicate (1).jpg'].length, 2);
    assertEqual(unzipped['duplicate (2).jpg'].length, 3);
  });

  await tracker.runTest('M3.4.5: Filenames with spaces, Unicode, parentheses, and emojis handled properly', async () => {
    const entries = [
      { name: '📷 Vacation Photo (July 2026).jpg', data: new Uint8Array([1, 2, 3]) },
      { name: '東京タワー_日本語.png', data: new Uint8Array([4, 5, 6]) },
      { name: 'document [final] (v2.1).pdf', data: new Uint8Array([7, 8, 9]) },
    ];

    const zipBlob = await createStreamingZip(entries);
    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    const keys = Object.keys(unzipped);

    assertEqual(keys.length, 3);
    assertTrue(keys.includes('📷 Vacation Photo (July 2026).jpg'));
    assertTrue(keys.includes('東京タワー_日本語.png'));
    assertTrue(keys.includes('document [final] (v2.1).pdf'));
  });

  await tracker.runTest('M3.4.6: AbortSignal cancellation aborts cleanly without unhandled rejection', async () => {
    const ac = new AbortController();
    ac.abort();

    let threwAbort = false;
    try {
      await createStreamingZip(
        [{ name: 'aborted.txt', data: new TextEncoder().encode('abort test') }],
        { signal: ac.signal }
      );
    } catch (err) {
      threwAbort = true;
      assertEqual(err.name, 'AbortError');
    }

    assertTrue(threwAbort, 'Expected AbortError when AbortSignal is already aborted');
  });

  await tracker.runTest('M3.4.7: Progress callback emits progress from 0% to 100% reliably', async () => {
    const progressEvents = [];
    const entries = [
      { name: 'step1.jpg', data: new Uint8Array([1]) },
      { name: 'step2.jpg', data: new Uint8Array([2]) },
      { name: 'step3.jpg', data: new Uint8Array([3]) },
      { name: 'step4.jpg', data: new Uint8Array([4]) },
    ];

    await createStreamingZip(entries, {
      onProgress: (percent, currentFile) => {
        progressEvents.push({ percent, currentFile });
      },
    });

    assertTrue(progressEvents.length >= 4, 'Progress should report for each entry');
    assertEqual(progressEvents[0].percent, 0);
    assertEqual(progressEvents[progressEvents.length - 1].percent, 100);
  });

  // --- Group 5: Streaming Chunking Simulation ---
  console.log('\n--- Group 5: Streaming Chunking Simulation ---');

  await tracker.runTest('M3.5.1: Multi-chunk streaming handles large payloads (> 1MB) across 512KB slices', async () => {
    // Generate 1.2 MB buffer spanning 3 chunks
    const largeSize = 1200 * 1024;
    const largePayload = new Uint8Array(largeSize);
    for (let i = 0; i < largeSize; i++) {
      largePayload[i] = i % 256;
    }

    const zipBlob = await createStreamingZip([
      { name: 'large_chunked.bin', data: largePayload },
    ]);

    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    assertEqual(unzipped['large_chunked.bin'].length, largeSize);

    // Verify first and last bytes match
    assertEqual(unzipped['large_chunked.bin'][0], 0);
    assertEqual(unzipped['large_chunked.bin'][largeSize - 1], (largeSize - 1) % 256);
  });

  // --- Group 6: Application Call Sites Integration ---
  console.log('\n--- Group 6: Application Call Sites Integration ---');

  await tracker.runTest('M3.6.1: runners.ts createOutputsZip bundles SimpleMode outputs using streaming engine', async () => {
    const mockOutputs = [
      {
        id: 'out-1',
        toolSlug: 'image-compressor',
        toolName: 'Image Compressor',
        sourceFilename: 'banner.png',
        outputFilename: 'banner_compressed.png',
        mimeType: 'image/png',
        size: 5,
        originalSize: 10,
        blob: new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/png' }),
        previewUrl: 'blob:mock-1',
        createdAt: Date.now(),
      },
      {
        id: 'out-2',
        toolSlug: 'image-resizer',
        toolName: 'Image Resizer',
        sourceFilename: 'banner.png',
        outputFilename: 'banner_resized.png',
        mimeType: 'image/png',
        size: 8,
        originalSize: 10,
        blob: new Blob([new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80])], { type: 'image/png' }),
        previewUrl: 'blob:mock-2',
        createdAt: Date.now() + 1,
      },
    ];

    const zipBlob = await createOutputsZip(mockOutputs);
    assertTrue(zipBlob instanceof Blob);
    assertEqual(zipBlob.type, 'application/zip');

    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    assertEqual(Object.keys(unzipped).length, 2);
    assertEqual(unzipped['banner_compressed.png'].length, 5);
    assertEqual(unzipped['banner_resized.png'].length, 8);
  });

  await tracker.runTest('M3.6.2: pdfUtils.ts createZipArchive and createZipArchiveSync produce valid archives', async () => {
    const pdfPageFiles = {
      'page_1.pdf': new Uint8Array([37, 80, 68, 70, 49]), // %PDF1
      'page_2.pdf': new Uint8Array([37, 80, 68, 70, 50]), // %PDF2
    };

    // Async streaming version
    const asyncBlob = await createZipArchive(pdfPageFiles);
    assertTrue(asyncBlob instanceof Blob);
    const unzippedAsync = unzipSync(new Uint8Array(await asyncBlob.arrayBuffer()));
    assertEqual(Object.keys(unzippedAsync).length, 2);
    assertEqual(unzippedAsync['page_1.pdf'].length, 5);

    // Sync fallback version
    const syncBlob = createZipArchiveSync(pdfPageFiles);
    assertTrue(syncBlob instanceof Blob);
    const unzippedSync = unzipSync(new Uint8Array(await syncBlob.arrayBuffer()));
    assertEqual(Object.keys(unzippedSync).length, 2);
    assertEqual(unzippedSync['page_2.pdf'].length, 5);
  });

  const summary = tracker.summary();
  console.log('\n================================================================');
  console.log(` 🏁 MILESTONE 3 TEST SUITE RESULTS: ${summary.passed}/${summary.total} passed in ${summary.durationMs}ms`);
  console.log('================================================================\n');

  if (summary.failed > 0) {
    throw new Error(`${summary.failed} tests failed in Milestone 3 suite`);
  }

  return summary;
}

// Execute standalone if directly invoked
if (process.argv[1] && process.argv[1].endsWith('archive_compression_m3.test.mjs')) {
  runArchiveCompressionM3Tests().catch(err => {
    console.error('Fatal error in Milestone 3 test runner:', err);
    process.exit(1);
  });
}
