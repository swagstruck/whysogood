// @ts-check
/**
 * Challenger M3: Adversarial Stress & Integrity Challenge Suite
 * 
 * Adversarially challenges lib/archiveUtils.ts and archive packaging entry points across 5 challenge vectors:
 * - Challenge 1: Filename collision stress (5 identical filenames, massive 25-file collisions, pre-existing indexes, extensionless, multi-dot)
 * - Challenge 2: Zip-slip / path traversal inputs (relative ../, absolute /, Windows \\, traversal collision convergence)
 * - Challenge 3: Mixed format streaming throughput (100 files mixing JPEGs, SVGs, JSONs, method 0 vs method 8, benchmark)
 * - Challenge 4: Corrupted / 0-byte entries in archive (pure 0-byte, truncated headers, corrupt streams, 22-byte empty ZIP)
 * - Challenge 5: Byte-level recovery test (fflate.unzipSync byte comparisons on all unpacked entries, 1.5MB multi-chunk boundaries)
 * 
 * Executable via: `node tests/e2e/m3_archive_challenger.test.mjs`
 */

import './helpers/ts_resolver.mjs';
import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertFalse,
  assertIncludes,
} from './helpers/assertions.mjs';
import { unzipSync } from 'fflate';

// Load TypeScript modules dynamically after ts_resolver hook is active
const { createStreamingZip, isAlreadyCompressedFormat } = await import('../../lib/archiveUtils.ts');
const { createOutputsZip } = await import('../../lib/simpleMode/runners.ts');
const { createZipArchive, createZipArchiveSync } = await import('../../lib/pdfUtils.ts');

/**
 * Extracts Central Directory file headers from a ZIP buffer to inspect compression methods.
 * Central Directory Header Signature: 0x02014b50
 * Compression method offset: +10 (uint16)
 * Filename length offset: +28 (uint16)
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

  return headers;
}

export async function runM3ArchiveChallengerTests() {
  const tracker = new TestResultTracker('Challenger M3: Archive & Streaming ZIP Adversarial Challenge');
  const domEnv = setupMockBrowserEnvironment();

  console.log('\n================================================================');
  console.log(' ⚔️ RUNNING CHALLENGER M3: ADVERSARIAL STREAMING ZIP CHALLENGE');
  console.log('================================================================\n');

  try {
    // ==========================================================================
    // CHALLENGE 1: FILENAME COLLISION STRESS
    // ==========================================================================
    console.log('--- Challenge 1: Filename Collision Stress & Deduplication Invariant ---');

    await tracker.runTest('C1.1: 5 identical filenames image.png deduplicate cleanly without silent overwrites', async () => {
      const payloads = [
        new Uint8Array([10, 11, 12]),
        new Uint8Array([20, 21, 22, 23]),
        new Uint8Array([30, 31, 32, 33, 34]),
        new Uint8Array([40, 41]),
        new Uint8Array([50, 51, 52, 53, 54, 55]),
      ];

      const entries = payloads.map(data => ({
        name: 'image.png',
        data,
      }));

      const zipBlob = await createStreamingZip(entries);
      assertTrue(zipBlob instanceof Blob, 'Output must be a Blob');
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 5, 'All 5 duplicate entries must be preserved');
      const expectedKeys = [
        'image.png',
        'image (1).png',
        'image (2).png',
        'image (3).png',
        'image (4).png',
      ];

      for (let i = 0; i < expectedKeys.length; i++) {
        const k = expectedKeys[i];
        assertTrue(keys.includes(k), `Archive must contain entry: ${k}`);
        const extracted = unzipped[k];
        assertEqual(extracted.length, payloads[i].length, `Payload length for ${k} must match`);
        for (let b = 0; b < payloads[i].length; b++) {
          assertEqual(extracted[b], payloads[i][b], `Byte ${b} of ${k} must match`);
        }
      }
    });

    await tracker.runTest('C1.2: Massive collision stress: 25 identical filenames report.json preserve all entries', async () => {
      const entries = [];
      const originalContents = [];

      for (let i = 0; i < 25; i++) {
        const text = JSON.stringify({ index: i, nonce: `val_${i * 19}` });
        originalContents.push(text);
        entries.push({
          name: 'report.json',
          data: new TextEncoder().encode(text),
        });
      }

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 25, 'All 25 collision entries must be present');

      for (let i = 0; i < 25; i++) {
        const key = i === 0 ? 'report.json' : `report (${i}).json`;
        assertTrue(keys.includes(key), `Expected key ${key} in archive`);
        const decoded = new TextDecoder().decode(unzipped[key]);
        assertEqual(decoded, originalContents[i], `Content for ${key} must match original index ${i}`);
      }
    });

    await tracker.runTest('C1.3: Pre-existing numbered names collision avoidance skips existing candidate numbers', async () => {
      // Test A: Ordered pre-existing numbers followed by duplicates
      const orderedEntries = [
        { name: 'photo.jpg', data: new TextEncoder().encode('photo_base') },
        { name: 'photo (1).jpg', data: new TextEncoder().encode('photo_one') },
        { name: 'photo (2).jpg', data: new TextEncoder().encode('photo_two') },
        { name: 'photo.jpg', data: new TextEncoder().encode('photo_fourth') },
        { name: 'photo.jpg', data: new TextEncoder().encode('photo_fifth') },
      ];

      const zipA = await createStreamingZip(orderedEntries);
      const unzippedA = unzipSync(new Uint8Array(await zipA.arrayBuffer()));
      const keysA = Object.keys(unzippedA);

      assertEqual(keysA.length, 5, 'All 5 files must exist in ordered archive');
      assertEqual(new TextDecoder().decode(unzippedA['photo.jpg']), 'photo_base');
      assertEqual(new TextDecoder().decode(unzippedA['photo (1).jpg']), 'photo_one');
      assertEqual(new TextDecoder().decode(unzippedA['photo (2).jpg']), 'photo_two');
      assertEqual(new TextDecoder().decode(unzippedA['photo (3).jpg']), 'photo_fourth');
      assertEqual(new TextDecoder().decode(unzippedA['photo (4).jpg']), 'photo_fifth');

      // Test B: Interleaved duplicates with future-numbered collision avoidance
      const interleavedEntries = [
        { name: 'data.csv', data: new TextEncoder().encode('first') },
        { name: 'data (1).csv', data: new TextEncoder().encode('already numbered') },
        { name: 'data.csv', data: new TextEncoder().encode('second root') },
        { name: 'data (2).csv', data: new TextEncoder().encode('already numbered 2') },
        { name: 'data.csv', data: new TextEncoder().encode('third root') },
      ];

      const zipB = await createStreamingZip(interleavedEntries);
      const unzippedB = unzipSync(new Uint8Array(await zipB.arrayBuffer()));
      const keysB = Object.keys(unzippedB);

      assertEqual(keysB.length, 5, 'All 5 files must exist in interleaved archive');
      const allExtractedTexts = Object.values(unzippedB).map(b => new TextDecoder().decode(b));
      assertTrue(allExtractedTexts.includes('first'));
      assertTrue(allExtractedTexts.includes('already numbered'));
      assertTrue(allExtractedTexts.includes('second root'));
      assertTrue(allExtractedTexts.includes('already numbered 2'));
      assertTrue(allExtractedTexts.includes('third root'));
    });

    await tracker.runTest('C1.4: Extensionless filename collisions deduplicate without dots', async () => {
      const entries = [
        { name: 'README', data: new TextEncoder().encode('Readme 0') },
        { name: 'README', data: new TextEncoder().encode('Readme 1') },
        { name: 'README', data: new TextEncoder().encode('Readme 2') },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 3);
      assertTrue(keys.includes('README'));
      assertTrue(keys.includes('README (1)'));
      assertTrue(keys.includes('README (2)'));
      assertEqual(new TextDecoder().decode(unzipped['README']), 'Readme 0');
      assertEqual(new TextDecoder().decode(unzipped['README (1)']), 'Readme 1');
      assertEqual(new TextDecoder().decode(unzipped['README (2)']), 'Readme 2');
    });

    await tracker.runTest('C1.5: Multi-dot filename collisions preserve extension correctly', async () => {
      const entries = [
        { name: 'backup.tar.gz', data: new Uint8Array([1, 2]) },
        { name: 'backup.tar.gz', data: new Uint8Array([3, 4]) },
        { name: 'backup.tar.gz', data: new Uint8Array([5, 6]) },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 3);
      assertTrue(keys.includes('backup.tar.gz'));
      assertTrue(keys.includes('backup.tar (1).gz'));
      assertTrue(keys.includes('backup.tar (2).gz'));
    });

    await tracker.runTest('C1.6: Empty and whitespace-only filenames sanitize to file and deduplicate', async () => {
      const entries = [
        { name: '', data: new Uint8Array([1]) },
        { name: '   ', data: new Uint8Array([2]) },
        { name: '\t\n', data: new Uint8Array([3]) },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 3);
      assertTrue(keys.includes('file'));
      assertTrue(keys.includes('file (1)'));
      assertTrue(keys.includes('file (2)'));
    });

    await tracker.runTest('C1.7: Application SimpleMode runner createOutputsZip handles duplicate output names', async () => {
      const outputs = [
        {
          id: 'out-1',
          toolSlug: 'image-compressor',
          toolName: 'Image Compressor',
          sourceFilename: 'photo.jpg',
          outputFilename: 'photo_compressed.jpg',
          mimeType: 'image/jpeg',
          size: 100,
          originalSize: 200,
          blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
          previewUrl: 'blob:1',
          createdAt: 1000,
        },
        {
          id: 'out-2',
          toolSlug: 'image-compressor',
          toolName: 'Image Compressor',
          sourceFilename: 'photo.jpg',
          outputFilename: 'photo_compressed.jpg',
          mimeType: 'image/jpeg',
          size: 90,
          originalSize: 200,
          blob: new Blob([new Uint8Array([4, 5, 6, 7])], { type: 'image/jpeg' }),
          previewUrl: 'blob:2',
          createdAt: 1001,
        },
      ];

      const zipBlob = await createOutputsZip(outputs);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 2);
      assertTrue(keys.includes('photo_compressed.jpg'));
      assertTrue(keys.includes('photo_compressed_(1).jpg') || keys.includes('photo_compressed (1).jpg'));
    });

    // ==========================================================================
    // CHALLENGE 2: ZIP-SLIP & PATH TRAVERSAL SANITIZATION
    // ==========================================================================
    console.log('\n--- Challenge 2: Zip-Slip / Path Traversal Inputs ---');

    await tracker.runTest('C2.1: Relative path traversals (../../secret.txt, ../../../etc/shadow) sanitized', async () => {
      const entries = [
        { name: '../../secret.txt', data: new TextEncoder().encode('top_secret') },
        { name: '../../../etc/shadow', data: new TextEncoder().encode('hash') },
        { name: '../escape.bin', data: new Uint8Array([99]) },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 3);
      for (const k of keys) {
        assertFalse(k.startsWith('..'), `Key must not start with ..: ${k}`);
        assertFalse(k.includes('/../'), `Key must not contain /../: ${k}`);
      }
      assertTrue(keys.includes('secret.txt'));
      assertTrue(keys.includes('etc/shadow'));
      assertTrue(keys.includes('escape.bin'));
    });

    await tracker.runTest('C2.2: Unix root & absolute path traversals (/etc/passwd, ///root/id_rsa) stripped', async () => {
      const entries = [
        { name: '/etc/passwd', data: new TextEncoder().encode('root:x:0:0') },
        { name: '/var/log/system.log', data: new TextEncoder().encode('log') },
        { name: '///root/id_rsa', data: new TextEncoder().encode('ssh_key') },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 3);
      for (const k of keys) {
        assertFalse(k.startsWith('/'), `Key must not start with leading slash: ${k}`);
      }
      assertTrue(keys.includes('etc/passwd'));
      assertTrue(keys.includes('var/log/system.log'));
      assertTrue(keys.includes('root/id_rsa'));
    });

    await tracker.runTest('C2.3: Windows backslash traversals (..\\..\\windows\\win.ini) stripped safely', async () => {
      const entries = [
        { name: '..\\..\\windows\\win.ini', data: new TextEncoder().encode('[fonts]') },
        { name: '\\Windows\\System32\\calc.exe', data: new Uint8Array([77, 90]) },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 2);
      for (const k of keys) {
        assertFalse(k.startsWith('..\\'), `Key must not start with ..\\: ${k}`);
        assertFalse(k.startsWith('\\'), `Key must not start with leading backslash: ${k}`);
      }
    });

    await tracker.runTest('C2.4: Pure traversal roots (../, /, ../../) fallback cleanly to file', async () => {
      const entries = [
        { name: '../', data: new Uint8Array([1]) },
        { name: '/', data: new Uint8Array([2]) },
        { name: '../../', data: new Uint8Array([3]) },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 3);
      assertTrue(keys.includes('file'));
      assertTrue(keys.includes('file (1)'));
      assertTrue(keys.includes('file (2)'));
    });

    await tracker.runTest('C2.5: Traversal collision convergence deduplicates sanitized results safely', async () => {
      // 5 different traversal variants of 'secret.txt' must sanitize to 'secret.txt' and deduplicate cleanly
      const entries = [
        { name: '../../secret.txt', data: new TextEncoder().encode('entry_1') },
        { name: 'secret.txt', data: new TextEncoder().encode('entry_2') },
        { name: '/secret.txt', data: new TextEncoder().encode('entry_3') },
        { name: '..\\secret.txt', data: new TextEncoder().encode('entry_4') },
        { name: '////secret.txt', data: new TextEncoder().encode('entry_5') },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 5, 'All 5 collided entries must be preserved');
      assertTrue(keys.includes('secret.txt'));
      assertTrue(keys.includes('secret (1).txt'));
      assertTrue(keys.includes('secret (2).txt'));
      assertTrue(keys.includes('secret (3).txt'));
      assertTrue(keys.includes('secret (4).txt'));

      assertEqual(new TextDecoder().decode(unzipped['secret.txt']), 'entry_1');
      assertEqual(new TextDecoder().decode(unzipped['secret (1).txt']), 'entry_2');
      assertEqual(new TextDecoder().decode(unzipped['secret (2).txt']), 'entry_3');
      assertEqual(new TextDecoder().decode(unzipped['secret (3).txt']), 'entry_4');
      assertEqual(new TextDecoder().decode(unzipped['secret (4).txt']), 'entry_5');
    });

    await tracker.runTest('C2.6: Unpacked entry namespace safety invariant: zero directory breakouts', async () => {
      const maliciousNames = [
        '../../danger.sh',
        '/etc/hosts',
        '..\\system32\\cmd.exe',
        'normal.txt',
      ];

      const entries = maliciousNames.map(name => ({
        name,
        data: new TextEncoder().encode(`payload for ${name}`),
      }));

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

      for (const key of Object.keys(unzipped)) {
        assertFalse(key.startsWith('..'), `Security violation: key starts with .. (${key})`);
        assertFalse(key.startsWith('/'), `Security violation: key starts with / (${key})`);
        assertFalse(key.startsWith('\\'), `Security violation: key starts with \\ (${key})`);
      }
    });

    // ==========================================================================
    // CHALLENGE 3: MIXED FORMAT STREAMING THROUGHPUT (100 FILES)
    // ==========================================================================
    console.log('\n--- Challenge 3: Mixed Format Streaming Throughput (100 Files) ---');

    let benchmarkZipBlob = null;
    let original100Entries = [];

    await tracker.runTest('C3.1: 100-file mixed payload streaming executes with high throughput (< 500ms)', async () => {
      original100Entries = [];

      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          // Pre-compressed JPEG simulation with valid SOI marker
          const jpgData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, (i * 13) % 256, (i * 37) % 256]);
          original100Entries.push({
            name: `photo_${i}.jpg`,
            data: jpgData,
            format: 'jpg',
          });
        } else if (i % 3 === 1) {
          // Compressible SVG vector markup
          const svgText = `<svg viewBox="0 0 100 100" id="svg_${i}"><rect width="100" height="100" fill="rgb(${i},${i * 2 % 255},100)"/></svg>`;
          original100Entries.push({
            name: `vector_${i}.svg`,
            data: new TextEncoder().encode(svgText),
            format: 'svg',
          });
        } else {
          // Compressible JSON payload
          const jsonText = JSON.stringify({ fileId: i, name: `item_${i}`, active: true, tags: ['m3', 'challenge', `tag_${i}`] });
          original100Entries.push({
            name: `record_${i}.json`,
            data: new TextEncoder().encode(jsonText),
            format: 'json',
          });
        }
      }

      assertEqual(original100Entries.length, 100);

      const startTime = Date.now();
      benchmarkZipBlob = await createStreamingZip(original100Entries);
      const durationMs = Date.now() - startTime;

      console.log(`     [Metric] 100 files packaged in ${durationMs}ms (Blob size: ${benchmarkZipBlob.size} bytes)`);
      assertTrue(benchmarkZipBlob instanceof Blob, 'Packaged output must be a Blob');
      assertTrue(benchmarkZipBlob.size > 0, 'Blob size must be positive');
      assertTrue(durationMs < 1000, `Packaging 100 files took ${durationMs}ms (threshold: < 1000ms)`);
    });

    await tracker.runTest('C3.2: Central Directory inspects Method 0 (STORE) for JPEGs and Method 8 (DEFLATE) for SVGs & JSONs', async () => {
      assertTrue(benchmarkZipBlob !== null, 'Benchmark ZIP must exist');
      const zipBytes = new Uint8Array(await benchmarkZipBlob.arrayBuffer());
      const headers = extractZipCentralDirectoryHeaders(zipBytes);

      assertEqual(headers.length, 100, 'Central Directory must contain all 100 entries');
      const headersMap = Object.fromEntries(headers.map(h => [h.filename, h]));

      for (let i = 0; i < 100; i++) {
        const item = original100Entries[i];
        const h = headersMap[item.name];
        assertTrue(h !== undefined, `Header for ${item.name} must exist`);

        if (item.format === 'jpg') {
          assertEqual(h.method, 0, `JPEG entry ${item.name} must use Method 0 STORE (Pass-Through)`);
          assertEqual(h.compSize, h.uncompSize, `Store mode compSize must equal uncompSize for ${item.name}`);
        } else {
          assertEqual(h.method, 8, `Vector/Text entry ${item.name} must use Method 8 DEFLATE`);
        }
      }
    });

    await tracker.runTest('C3.3: 100-file complete unpack and byte-for-byte exact recovery', async () => {
      assertTrue(benchmarkZipBlob !== null);
      const zipBytes = new Uint8Array(await benchmarkZipBlob.arrayBuffer());
      const unzipped = unzipSync(zipBytes);

      assertEqual(Object.keys(unzipped).length, 100, 'All 100 files must be unzipped');

      for (let i = 0; i < 100; i++) {
        const item = original100Entries[i];
        const extracted = unzipped[item.name];
        assertTrue(extracted !== undefined, `Missing unpacked file ${item.name}`);
        assertEqual(extracted.length, item.data.length, `Length mismatch on ${item.name}`);

        for (let b = 0; b < item.data.length; b++) {
          if (extracted[b] !== item.data[b]) {
            throw new Error(`Byte mismatch at index ${b} for entry ${item.name}`);
          }
        }
      }
    });

    await tracker.runTest('C3.4: Mixed container stream (Uint8Array, Blob, and File) packs seamlessly', async () => {
      const mixedEntries = [
        { name: 'buffer.bin', data: new Uint8Array([1, 2, 3, 4]) },
        { name: 'blob.txt', data: new Blob(['Blob text content'], { type: 'text/plain' }) },
        { name: 'file.json', data: new File(['{"fromFile": true}'], 'file.json', { type: 'application/json' }) },
      ];

      const zipBlob = await createStreamingZip(mixedEntries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

      assertEqual(Object.keys(unzipped).length, 3);
      assertEqual(unzipped['buffer.bin'].length, 4);
      assertEqual(new TextDecoder().decode(unzipped['blob.txt']), 'Blob text content');
      assertEqual(new TextDecoder().decode(unzipped['file.json']), '{"fromFile": true}');
    });

    await tracker.runTest('C3.5: Progress callback reports monotonically from 0% to 100%', async () => {
      const progressSteps = [];
      const entries = [
        { name: 'f1.jpg', data: new Uint8Array([1]) },
        { name: 'f2.svg', data: new Uint8Array([2]) },
        { name: 'f3.json', data: new Uint8Array([3]) },
        { name: 'f4.pdf', data: new Uint8Array([4]) },
      ];

      await createStreamingZip(entries, {
        onProgress: (percent, currentFile) => {
          progressSteps.push({ percent, currentFile });
        },
      });

      assertTrue(progressSteps.length >= 4, 'Progress must be called at least once per entry');
      assertEqual(progressSteps[0].percent, 0, 'First progress step should be 0%');
      assertEqual(progressSteps[progressSteps.length - 1].percent, 100, 'Final progress step must be 100%');

      // Verify monotonic progression
      for (let i = 1; i < progressSteps.length; i++) {
        assertTrue(progressSteps[i].percent >= progressSteps[i - 1].percent, 'Progress must be monotonic');
      }
    });

    // ==========================================================================
    // CHALLENGE 4: CORRUPTED & 0-BYTE ENTRIES IN ARCHIVE
    // ==========================================================================
    console.log('\n--- Challenge 4: Corrupted / 0-Byte Entries in Archive ---');

    await tracker.runTest('C4.1: Pure 0-byte archive (Uint8Array and Blob) produces valid readable ZIP', async () => {
      const entries = [
        { name: 'zero_u8.bin', data: new Uint8Array(0) },
        { name: 'zero_blob.txt', data: new Blob([]) },
      ];

      const zipBlob = await createStreamingZip(entries);
      assertTrue(zipBlob instanceof Blob);
      assertTrue(zipBlob.size > 22, 'ZIP with entries must have header and directory records');

      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      assertEqual(Object.keys(unzipped).length, 2);
      assertEqual(unzipped['zero_u8.bin'].length, 0);
      assertEqual(unzipped['zero_blob.txt'].length, 0);
    });

    await tracker.runTest('C4.2: Duplicate 0-byte entries deduplicate and unpack safely', async () => {
      const entries = [
        { name: 'empty.dat', data: new Uint8Array(0) },
        { name: 'empty.dat', data: new Uint8Array(0) },
        { name: 'empty.dat', data: new Blob([]) },
      ];

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const keys = Object.keys(unzipped);

      assertEqual(keys.length, 3);
      assertTrue(keys.includes('empty.dat'));
      assertTrue(keys.includes('empty (1).dat'));
      assertTrue(keys.includes('empty (2).dat'));
      assertEqual(unzipped['empty.dat'].length, 0);
      assertEqual(unzipped['empty (1).dat'].length, 0);
      assertEqual(unzipped['empty (2).dat'].length, 0);
    });

    await tracker.runTest('C4.3: Malformed & truncated headers assemble without throwing and unpack cleanly', async () => {
      const corruptEntries = [
        { name: 'truncated.jpg', data: new Uint8Array([0xFF, 0xD8]) }, // partial JPEG SOI
        { name: 'corrupt.png', data: new Uint8Array([0x89, 0x50, 0x00, 0x00]) }, // malformed PNG magic
        { name: 'corrupt.pdf', data: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]) }, // %PDF- with no EOF
        { name: 'broken.svg', data: new TextEncoder().encode('<svg><broken unclosed') },
        { name: 'malformed.json', data: new TextEncoder().encode('{ key: invalid json') },
      ];

      const zipBlob = await createStreamingZip(corruptEntries);
      assertTrue(zipBlob instanceof Blob);

      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      assertEqual(Object.keys(unzipped).length, 5);

      assertEqual(unzipped['truncated.jpg'].length, 2);
      assertEqual(unzipped['corrupt.png'].length, 4);
      assertEqual(unzipped['corrupt.pdf'].length, 5);
      assertEqual(new TextDecoder().decode(unzipped['broken.svg']), '<svg><broken unclosed');
      assertEqual(new TextDecoder().decode(unzipped['malformed.json']), '{ key: invalid json');
    });

    await tracker.runTest('C4.4: High-entropy pseudo-random noise stream (10KB) simulates corrupted compressed bitstream', async () => {
      const noiseSize = 10 * 1024;
      const noiseData = new Uint8Array(noiseSize);
      for (let i = 0; i < noiseSize; i++) {
        noiseData[i] = (i * 197 + 79) % 256;
      }

      const zipBlob = await createStreamingZip([{ name: 'noise.bin', data: noiseData }]);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

      assertEqual(unzipped['noise.bin'].length, noiseSize);
      for (let i = 0; i < noiseSize; i += 128) {
        assertEqual(unzipped['noise.bin'][i], noiseData[i]);
      }
    });

    await tracker.runTest('C4.5: Empty archive (0 entries) returns standard 22-byte valid empty ZIP', async () => {
      const emptyBlob = await createStreamingZip([]);
      assertEqual(emptyBlob.size, 22, 'Empty archive must be 22 bytes (End of Central Directory)');

      const unzipped = unzipSync(new Uint8Array(await emptyBlob.arrayBuffer()));
      assertEqual(Object.keys(unzipped).length, 0);
    });

    await tracker.runTest('C4.6: Null entry data fallback creates 0-byte valid file', async () => {
      // @ts-ignore
      const zipBlob = await createStreamingZip([{ name: 'null_fallback.bin', data: null }]);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

      assertEqual(Object.keys(unzipped).length, 1);
      assertEqual(unzipped['null_fallback.bin'].length, 0);
    });

    // ==========================================================================
    // CHALLENGE 5: BYTE-LEVEL RECOVERY TEST
    // ==========================================================================
    console.log('\n--- Challenge 5: Byte-Level Recovery Test ---');

    await tracker.runTest('C5.1: Deterministic byte recovery across varied payload sizes (1B to 64KB)', async () => {
      const testSizes = [1, 7, 32, 127, 256, 1024, 8192, 65536];
      const entries = testSizes.map(size => {
        const buf = new Uint8Array(size);
        for (let i = 0; i < size; i++) buf[i] = (i * 23 + 11) % 256;
        return { name: `size_${size}.bin`, data: buf };
      });

      const zipBlob = await createStreamingZip(entries);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

      for (const entry of entries) {
        const extracted = unzipped[entry.name];
        assertTrue(extracted !== undefined, `Missing ${entry.name}`);
        assertEqual(extracted.length, entry.data.length, `Length mismatch on ${entry.name}`);
        for (let i = 0; i < entry.data.length; i++) {
          if (extracted[i] !== entry.data[i]) {
            throw new Error(`Byte mismatch at index ${i} for ${entry.name}`);
          }
        }
      }
    });

    await tracker.runTest('C5.2: Multi-chunk streaming boundary verification (1.5 MB Uint8Array spanning >3 chunks)', async () => {
      const largeSize = 1.5 * 1024 * 1024; // 1,572,864 bytes spanning >3 512KB slices
      const original = new Uint8Array(largeSize);
      for (let i = 0; i < largeSize; i++) {
        original[i] = (i * 47 + 103) & 0xFF;
      }

      const zipBlob = await createStreamingZip([{ name: 'large_u8.bin', data: original }]);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const extracted = unzipped['large_u8.bin'];

      assertEqual(extracted.length, largeSize, 'Unpacked length must match 1.5MB');

      // Thorough byte comparison verifying boundary transitions at 512KB and 1MB
      for (let i = 0; i < largeSize; i++) {
        if (extracted[i] !== original[i]) {
          throw new Error(`Byte mismatch at index ${i} (chunk boundary error)`);
        }
      }

      // Check boundary edges explicitly
      assertEqual(extracted[524287], original[524287], 'Last byte of chunk 1');
      assertEqual(extracted[524288], original[524288], 'First byte of chunk 2');
      assertEqual(extracted[1048575], original[1048575], 'Last byte of chunk 2');
      assertEqual(extracted[1048576], original[1048576], 'First byte of chunk 3');
    });

    await tracker.runTest('C5.3: Multi-chunk streaming boundary verification (1.5 MB Blob async slice streaming)', async () => {
      const largeSize = 1.5 * 1024 * 1024;
      const original = new Uint8Array(largeSize);
      for (let i = 0; i < largeSize; i++) {
        original[i] = (i * 61 + 89) & 0xFF;
      }

      const blobData = new Blob([original]);
      const zipBlob = await createStreamingZip([{ name: 'large_blob.bin', data: blobData }]);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const extracted = unzipped['large_blob.bin'];

      assertEqual(extracted.length, largeSize);

      for (let i = 0; i < largeSize; i++) {
        if (extracted[i] !== original[i]) {
          throw new Error(`Byte mismatch at index ${i} in Blob streaming`);
        }
      }
    });

    await tracker.runTest('C5.4: Simple Mode createOutputsZip byte-for-byte recovery', async () => {
      const samplePng = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3]);
      const samplePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 49, 46, 52]);

      const outputs = [
        {
          id: 'out-png',
          toolSlug: 'image-resizer',
          toolName: 'Image Resizer',
          sourceFilename: 'photo.png',
          outputFilename: 'photo_resized.png',
          mimeType: 'image/png',
          size: samplePng.length,
          originalSize: 100,
          blob: new Blob([samplePng], { type: 'image/png' }),
          previewUrl: 'blob:mock-png',
          createdAt: 1000,
        },
        {
          id: 'out-pdf',
          toolSlug: 'pdf-compressor',
          toolName: 'PDF Compressor',
          sourceFilename: 'doc.pdf',
          outputFilename: 'doc_compressed.pdf',
          mimeType: 'application/pdf',
          size: samplePdf.length,
          originalSize: 200,
          blob: new Blob([samplePdf], { type: 'application/pdf' }),
          previewUrl: 'blob:mock-pdf',
          createdAt: 2000,
        },
      ];

      const zipBlob = await createOutputsZip(outputs);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));

      const extractedPng = unzipped['photo_resized.png'];
      assertEqual(extractedPng.length, samplePng.length);
      for (let i = 0; i < samplePng.length; i++) {
        assertEqual(extractedPng[i], samplePng[i]);
      }

      const extractedPdf = unzipped['doc_compressed.pdf'];
      assertEqual(extractedPdf.length, samplePdf.length);
      for (let i = 0; i < samplePdf.length; i++) {
        assertEqual(extractedPdf[i], samplePdf[i]);
      }
    });

    await tracker.runTest('C5.5: PDF batch archive createZipArchive byte-for-byte recovery', async () => {
      const page1 = new Uint8Array([37, 80, 68, 70, 49, 10, 20, 30]);
      const page2 = new Uint8Array([37, 80, 68, 70, 50, 40, 50, 60]);

      const zipBlob = await createZipArchive({
        'page_1.pdf': page1,
        'page_2.pdf': page2,
      });

      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      assertEqual(Object.keys(unzipped).length, 2);

      const exp1 = unzipped['page_1.pdf'];
      for (let i = 0; i < page1.length; i++) {
        assertEqual(exp1[i], page1[i]);
      }

      const exp2 = unzipped['page_2.pdf'];
      for (let i = 0; i < page2.length; i++) {
        assertEqual(exp2[i], page2[i]);
      }
    });

  } finally {
    domEnv.cleanup();
  }

  const summary = tracker.summary();
  console.log('\n================================================================');
  console.log(` 🏁 CHALLENGER M3 TEST SUITE RESULTS: ${summary.passed}/${summary.total} passed in ${summary.durationMs}ms`);
  console.log('================================================================\n');

  if (summary.failed > 0) {
    throw new Error(`${summary.failed} tests failed in Challenger M3 suite`);
  }

  return summary;
}

// Standalone CLI execution
if (process.argv[1] && process.argv[1].endsWith('m3_archive_challenger.test.mjs')) {
  runM3ArchiveChallengerTests().catch(err => {
    console.error('Fatal error in Challenger M3 runner:', err);
    process.exit(1);
  });
}
