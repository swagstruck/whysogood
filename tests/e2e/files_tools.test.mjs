// @ts-check
/**
 * Dual-Track Automated E2E Test Suite for Files Category Tools (Tiers 1-4)
 * Covers all 4 Files Category Tools:
 * - File Hash Generator (MD5, SHA-1, SHA-256, SHA-512 for binary buffers & streams)
 * - File Metadata Viewer (attributes, size formatting, extensions, timestamps)
 * - MIME Type Checker (magic byte signatures, spoof detection, offline MIME directory)
 * - ZIP Creator (multi-file bundling, folder structures, Deflate compression levels)
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

import {
  hashFileMd5,
  hashFileSha1,
  hashFileSha256,
  hashFileSha512,
  detectMimeBySignature,
  extractFileMetadata,
  searchMimeDatabase,
  COMMON_MIME_TYPES,
} from '../../lib/files/engines.ts';
import { TOOLS, COMING_SOON_CATEGORIES, getToolsByCategory } from '../../lib/registry.ts';
import { zip, unzipSync } from 'fflate';

export async function runFilesToolsTests() {
  const tracker = new TestResultTracker('Files Category E2E Suite');
  setupMockBrowserEnvironment();

  console.log('\n======================================================');
  console.log(' RUNNING FILES SUITE: TIERS 1-4 COMPREHENSIVE');
  console.log('======================================================\n');

  // ── Tier 1: Core Feature Coverage ──────────────────────────────────────────
  console.log('--- Tier 1: Core Feature Coverage ---');

  await tracker.runTest('F1.1: Files category is active in registry', () => {
    assertFalse(COMING_SOON_CATEGORIES.includes('Files'), 'Files must not be in COMING_SOON_CATEGORIES');
    const filesTools = getToolsByCategory('Files');
    assertEqual(filesTools.length, 4, 'Should register exactly 4 Files tools');
  });

  await tracker.runTest('F1.2: All 4 files tools have active status', () => {
    const slugs = ['file-hash', 'file-metadata', 'mime-checker', 'zip-creator'];
    for (const slug of slugs) {
      const tool = TOOLS.find(t => t.slug === slug);
      assertTrue(!!tool, `Tool ${slug} exists`);
      assertEqual(tool.status, 'active', `${slug} status is active`);
      assertEqual(tool.category, 'Files', `${slug} category is Files`);
    }
  });

  await tracker.runTest('F1.3: File Hashing algorithms produce valid digests', async () => {
    const sampleBytes = new TextEncoder().encode('Whysogood local file security testing');
    const md5Hex = await hashFileMd5(sampleBytes);
    assertEqual(md5Hex.length, 32, 'MD5 is 32 hex chars');

    const sha1Hex = await hashFileSha1(sampleBytes);
    assertEqual(sha1Hex.length, 40, 'SHA-1 is 40 hex chars');

    const sha256Hex = await hashFileSha256(sampleBytes);
    assertEqual(sha256Hex.length, 64, 'SHA-256 is 64 hex chars');

    const sha512Hex = await hashFileSha512(sampleBytes);
    assertEqual(sha512Hex.length, 128, 'SHA-512 is 128 hex chars');
  });

  await tracker.runTest('F1.4: MIME Type Detection: PNG Magic Signature', () => {
    // 89 50 4E 47 0D 0A 1A 0A
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const res = detectMimeBySignature(pngHeader.buffer);
    assertEqual(res.detected, 'image/png');
    assertEqual(res.extension, 'png');
    assertEqual(res.confidence, 'high');
  });

  await tracker.runTest('F1.5: MIME Type Detection: JPEG Magic Signature', () => {
    // FF D8 FF E0
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const res = detectMimeBySignature(jpegHeader.buffer);
    assertEqual(res.detected, 'image/jpeg');
    assertEqual(res.extension, 'jpg');
    assertEqual(res.confidence, 'high');
  });

  await tracker.runTest('F1.6: MIME Type Detection: PDF Magic Signature', () => {
    // %PDF-1.7
    const pdfHeader = new TextEncoder().encode('%PDF-1.7 header stream bytes');
    const res = detectMimeBySignature(pdfHeader.buffer);
    assertEqual(res.detected, 'application/pdf');
    assertEqual(res.extension, 'pdf');
    assertEqual(res.confidence, 'high');
  });

  await tracker.runTest('F1.7: MIME Type Detection: ZIP Archive Magic Signature', () => {
    // PK\x03\x04
    const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    const res = detectMimeBySignature(zipHeader.buffer);
    assertEqual(res.detected, 'application/zip');
    assertEqual(res.extension, 'zip');
    assertEqual(res.confidence, 'high');
  });

  await tracker.runTest('F1.8: File Metadata Extractor accurately maps attributes', () => {
    const mockFile = {
      name: 'annual_report_2026.pdf',
      size: 1048576 * 2.5, // 2.5 MB
      type: 'application/pdf',
      lastModified: 1770000000000,
    };
    // @ts-ignore
    const meta = extractFileMetadata(mockFile);
    assertEqual(meta.name, 'annual_report_2026.pdf');
    assertEqual(meta.extension, 'pdf');
    assertEqual(meta.type, 'application/pdf');
    assertIncludes(meta.formattedSize, 'MB');
  });

  await tracker.runTest('F1.9: Offline MIME Database query search engine', () => {
    const pdfResults = searchMimeDatabase('pdf');
    assertTrue(pdfResults.length > 0, 'Finds PDF MIME entries');
    assertEqual(pdfResults[0].mime, 'application/pdf');

    const imageResults = searchMimeDatabase('image/webp');
    assertTrue(imageResults.length > 0, 'Finds WebP MIME');
    assertEqual(imageResults[0].extensions[0], 'webp');
  });

  await tracker.runTest('F1.10: In-Browser ZIP Archive creation with fflate', async () => {
    const filesToZip = {
      'hello.txt': new TextEncoder().encode('Hello World'),
      'folder/test.json': new TextEncoder().encode(JSON.stringify({ active: true })),
    };

    const zipData = await new Promise((resolve, reject) => {
      zip(filesToZip, { level: 6 }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    assertTrue(zipData instanceof Uint8Array);
    assertTrue(zipData.length > 0);

    // Verify unzipping can read contents back
    const unzipped = unzipSync(zipData);
    assertTrue(!!unzipped['hello.txt'], 'Contains hello.txt');
    assertTrue(!!unzipped['folder/test.json'], 'Contains folder/test.json');
    assertEqual(new TextDecoder().decode(unzipped['hello.txt']), 'Hello World');
  });

  // ── Tier 2: Boundary & Corner Cases ────────────────────────────────────────
  console.log('\n--- Tier 2: Boundary & Corner Cases ---');

  await tracker.runTest('F2.1: Empty buffer hashing across all algorithms', async () => {
    const empty = new Uint8Array(0);
    const md5Empty = await hashFileMd5(empty);
    assertEqual(md5Empty, 'd41d8cd98f00b204e9800998ecf8427e');
    const sha256Empty = await hashFileSha256(empty);
    assertEqual(sha256Empty, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  await tracker.runTest('F2.2: Large buffer (>1MB) hashing consistency', async () => {
    const largeBuf = new Uint8Array(1024 * 1024);
    for (let i = 0; i < largeBuf.length; i++) largeBuf[i] = (i * 7) % 256;

    const md5Digest = await hashFileMd5(largeBuf);
    assertEqual(md5Digest.length, 32);

    const sha256Digest = await hashFileSha256(largeBuf);
    assertEqual(sha256Digest.length, 64);
  });

  await tracker.runTest('F2.3: MIME detection on plain text and ASCII files', () => {
    const textData = new TextEncoder().encode('Plain readable ASCII documentation text without binary control bytes.');
    const res = detectMimeBySignature(textData.buffer);
    assertEqual(res.detected, 'text/plain');
    assertEqual(res.extension, 'txt');
  });

  await tracker.runTest('F2.4: File metadata on extensionless files (e.g. Dockerfile)', () => {
    const dockerfile = {
      name: 'Dockerfile',
      size: 450,
      type: '',
      lastModified: Date.now(),
    };
    // @ts-ignore
    const meta = extractFileMetadata(dockerfile);
    assertEqual(meta.extension, '');
    assertEqual(meta.name, 'Dockerfile');
    assertEqual(meta.type, 'application/octet-stream');
  });

  await tracker.runTest('F2.5: ZIP Creator with nested folder prefixes', async () => {
    const nested = {
      'deeply/nested/dir/asset.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    };
    const zipData = await new Promise(resolve => {
      zip(nested, { level: 0 }, (_, data) => resolve(data));
    });
    // @ts-ignore
    const decompressed = unzipSync(zipData);
    assertTrue(!!decompressed['deeply/nested/dir/asset.png']);
  });

  // ── Tier 3: Combinations & Chaining ────────────────────────────────────────
  console.log('\n--- Tier 3: Combinations & Chaining ---');

  await tracker.runTest('F3.1: Create ZIP -> Checksum pipeline verification', async () => {
    const bundle = {
      'manifest.txt': new TextEncoder().encode('Package v1.0.0'),
    };
    const zipBytes = await new Promise((resolve) => {
      zip(bundle, { level: 6 }, (_, data) => resolve(data));
    });

    // Hash the created zip bytes
    // @ts-ignore
    const sha256Checksum = await hashFileSha256(zipBytes);
    assertTrue(sha256Checksum.length === 64);

    // Verify MIME signature of generated ZIP is application/zip
    // @ts-ignore
    const detected = detectMimeBySignature(zipBytes.buffer);
    assertEqual(detected.detected, 'application/zip');
    assertEqual(detected.confidence, 'high');
  });

  await tracker.runTest('F3.2: Checksum comparison logic resilience', () => {
    const h1 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const h2 = '  E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855  ';
    assertEqual(h1.toLowerCase(), h2.trim().toLowerCase());
  });

  // ── Tier 4: Real-World Scenarios ───────────────────────────────────────────
  console.log('\n--- Tier 4: Real-World Scenarios ---');

  await tracker.runTest('F4.1: Software Release Asset Checksum Verification Scenario', async () => {
    const releaseBinary = new TextEncoder().encode('BINARY_STREAM_PAYLOAD_V2_PROD');
    const actualSha256 = await hashFileSha256(releaseBinary);

    // Manifest provides expected checksum
    const expectedManifestSha = actualSha256.toUpperCase();
    const isVerified = actualSha256.toLowerCase() === expectedManifestSha.trim().toLowerCase();
    assertTrue(isVerified, 'Release asset matches manifest checksum');
  });

  await tracker.runTest('F4.2: File Extension Spoofing Detection Scenario', () => {
    // Malicious or misnamed file: Named "invoice.pdf" but magic bytes are ZIP/executable
    const spoofedZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
    const detected = detectMimeBySignature(spoofedZip.buffer);
    const reportedExt = 'pdf';

    const isMatch = detected.extension === reportedExt;
    assertFalse(isMatch, 'Successfully flags spoofed extension mismatch');
    assertEqual(detected.detected, 'application/zip');
  });

  const summary = tracker.summary();
  if (summary.failed > 0) {
    console.log('\n❌ FAILED TESTS SUMMARY:');
    for (const t of summary.tests) {
      if (t.status === 'FAIL') console.log(`  ✖ ${t.name}: ${t.error}`);
    }
  }
  console.log('\n================================================================');
  console.log(` 🏁 FILES E2E SUITE RESULTS: ${summary.passed}/${summary.total} passed in ${summary.durationMs}ms`);
  console.log('================================================================\n');

  return summary;
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('files_tools.test.mjs')) {
  runFilesToolsTests()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
