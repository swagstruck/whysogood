// @ts-check
/**
 * Milestone 4 Tier 5: Whole-System Adversarial Hardening Test Suite
 * 
 * Specifically challenges and verifies across all 3 compression engines
 * (lib/imageCompressor.ts, lib/pdfCompressor.ts, lib/archiveUtils.ts) and user entry points:
 * 
 * 1. Multi-hop chaining pipeline: Image Compressor -> Format Converter -> Batch ZIP Packaging -> Unpack -> PDF Compressor -> Final ZIP
 * 2. Rapid concurrent execution: 20 concurrent image compressions, 10 PDF compressions, 5 ZIP packages in parallel (zero race conditions)
 * 3. Universal 0-byte & corruption stress: 0-byte, 1-byte, invalid MIME headers, truncated streams to all 3 engines (100% valid downloadable outputs)
 * 4. Memory allocation bound verification: 8000x8000 images downsampled to <= 16 MP, multi-page PDFs processed sequentially without crashes
 * 
 * Executable via: `node tests/e2e/final_tier5_adversarial.test.mjs`
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
  createRealisticPng,
  createJpegWithExifIcc,
  createRealisticWebp,
  createRealisticSvg,
  createRealisticAvif,
  createRealisticGif,
  createRealisticBmp,
  createSimpleTextPdf,
  createVectorPdf,
  createMultiPagePdf,
  createEncryptedPdf,
  createCorruptedPdf,
  createCorruptedImage,
  createAlreadyCompressedJpeg,
  createAlreadyCompressedPng,
  EdgeCaseFiles,
} from './helpers/test_fixtures.mjs';

import { unzipSync, deflateSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';

// ── Environment Setup ─────────────────────────────────────────────────────────

setupMockBrowserEnvironment();

// Dynamic imports after ts_resolver is registered
const {
  compressImage,
  computeSafeDimensions,
  minifySvgText,
  MAX_SAFE_DIMENSION,
  MAX_SAFE_AREA,
} = await import('../../lib/imageCompressor.ts');

const {
  compressPdf,
  PDF_PRESETS,
} = await import('../../lib/pdfCompressor.ts');

const {
  createStreamingZip,
  isAlreadyCompressedFormat,
} = await import('../../lib/archiveUtils.ts');

const {
  executeTool,
  createOutputsZip,
} = await import('../../lib/simpleMode/runners.ts');

// Configurable Mock Browser Image for Canvas / Node environment
class MockBrowserImage {
  constructor() {
    this.crossOrigin = '';
    this.width = 400;
    this.height = 300;
    this.naturalWidth = 400;
    this.naturalHeight = 300;
    this._src = '';
    this.onload = null;
    this.onerror = null;
  }
  set src(val) {
    this._src = val;
    if (globalThis.__MOCK_IMAGE_ERROR__) {
      setTimeout(() => {
        if (this.onerror) this.onerror(new Error('Simulated image decode error'));
      }, 4);
      return;
    }
    if (globalThis.__MOCK_IMAGE_DIMS__) {
      this.width = globalThis.__MOCK_IMAGE_DIMS__.width;
      this.height = globalThis.__MOCK_IMAGE_DIMS__.height;
      this.naturalWidth = this.width;
      this.naturalHeight = this.height;
    }
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 4);
  }
  get src() {
    return this._src;
  }
}

globalThis.Image = MockBrowserImage;

// ── Suite Definition ──────────────────────────────────────────────────────────

export async function runFinalTier5AdversarialTests() {
  const tracker = new TestResultTracker('Milestone 4 Tier 5: Whole-System Adversarial Hardening');

  console.log('================================================================');
  console.log(' ⚔️ RUNNING MILESTONE 4 TIER 5 WHOLE-SYSTEM ADVERSARIAL SUITE');
  console.log('================================================================\n');

  // ============================================================================
  // OBJECTIVE 1: MULTI-HOP CHAINING PIPELINE
  // ============================================================================
  console.log('--- Objective 1: Multi-Hop Chaining Pipeline ---');

  await tracker.runTest('OBJ1.1: Direct Multi-Hop Chaining (Compress Image -> Convert -> Batch ZIP -> Unpack -> Compress PDF -> Final ZIP)', async () => {
    // 1. Source Image: 128x128 RGBA PNG
    const originalPng = createRealisticPng('product_hero.png', 128, 128);
    assertTrue(originalPng.size > 0, 'Original PNG size must be > 0');

    // 2. Hop 1: Image Compression
    const compImageRes = await compressImage(originalPng, { quality: 0.8, format: 'image/png' });
    assertTrue(compImageRes.blob instanceof Blob, 'Compressed image must be Blob');
    assertTrue(compImageRes.blob.size > 0, 'Compressed image size must be > 0');
    assertTrue(compImageRes.tierUsed === 1 || compImageRes.tierUsed === 2, 'Must utilize Tier 1 or Tier 2');

    // 3. Hop 2: Format Converter (PNG -> JPEG)
    const compressedPngFile = new File([compImageRes.blob], 'product_hero_compressed.png', { type: 'image/png' });
    const convertedRes = await executeTool('image-converter', compressedPngFile, {
      targetFormat: 'image/jpeg',
      quality: 85,
    });
    assertTrue(convertedRes.blob instanceof Blob, 'Converted image must be Blob');
    assertTrue(convertedRes.filename.endsWith('.jpg') || convertedRes.filename.endsWith('.jpeg'), 'Filename must have jpg/jpeg extension');
    assertEqual(convertedRes.metadata?.['Converted Format'], 'JPG', 'Metadata must record JPG conversion');

    // 4. Hop 3: Batch ZIP Packaging
    const batchEntries = [
      { name: '01_original.png', data: originalPng },
      { name: '02_compressed.png', data: compImageRes.blob },
      { name: '03_converted.jpg', data: convertedRes.blob },
      { name: '04_manifest.svg', data: createRealisticSvg('manifest.svg') },
    ];
    const batchZipBlob = await createStreamingZip(batchEntries);
    assertTrue(batchZipBlob instanceof Blob, 'Batch ZIP must be Blob');
    assertTrue(batchZipBlob.size > 0, 'Batch ZIP size must be > 0');

    // Verify ZIP magic bytes PK (0x50, 0x4B, 0x03, 0x04)
    const batchZipBuf = new Uint8Array(await batchZipBlob.arrayBuffer());
    assertEqual(batchZipBuf[0], 0x50, 'ZIP byte 0 must be 0x50');
    assertEqual(batchZipBuf[1], 0x4b, 'ZIP byte 1 must be 0x4B');
    assertEqual(batchZipBuf[2], 0x03, 'ZIP byte 2 must be 0x03');
    assertEqual(batchZipBuf[3], 0x04, 'ZIP byte 3 must be 0x04');

    // 5. Hop 4: Unpack ZIP in memory
    const unpackedFiles = unzipSync(batchZipBuf);
    const unpackedNames = Object.keys(unpackedFiles);
    assertEqual(unpackedNames.length, 4, 'Unpacked ZIP must contain exactly 4 files');
    assertTrue('01_original.png' in unpackedFiles, 'Must unpack 01_original.png');
    assertTrue('02_compressed.png' in unpackedFiles, 'Must unpack 02_compressed.png');
    assertTrue('03_converted.jpg' in unpackedFiles, 'Must unpack 03_converted.jpg');
    assertTrue('04_manifest.svg' in unpackedFiles, 'Must unpack 04_manifest.svg');

    // 6. Hop 5: PDF Compressor (5-page PDF fixture)
    const multiPagePdf = createMultiPagePdf('contract_report.pdf', 5);
    const compPdfRes = await compressPdf(multiPagePdf, { preset: 'recommended' });
    assertTrue(compPdfRes.blob instanceof Blob, 'Compressed PDF must be Blob');
    assertEqual(compPdfRes.pageCount, 5, 'Page count must be preserved as 5');
    assertTrue(compPdfRes.compressedSize <= multiPagePdf.size, 'PDF compressed size must be <= original size');

    // 7. Hop 6: Final ZIP Packaging with unpacked assets + compressed PDF
    const finalEntries = [
      { name: 'images/product_compressed.png', data: unpackedFiles['02_compressed.png'] },
      { name: 'images/product_converted.jpg', data: unpackedFiles['03_converted.jpg'] },
      { name: 'documents/contract_compressed.pdf', data: compPdfRes.blob },
      { name: 'manifest.svg', data: unpackedFiles['04_manifest.svg'] },
    ];
    const finalZipBlob = await createStreamingZip(finalEntries);
    assertTrue(finalZipBlob instanceof Blob, 'Final ZIP must be Blob');

    const finalZipBuf = new Uint8Array(await finalZipBlob.arrayBuffer());
    const finalUnpacked = unzipSync(finalZipBuf);
    const finalNames = Object.keys(finalUnpacked);
    assertEqual(finalNames.length, 4, 'Final archive must unpack 4 entries');
    assertTrue(finalUnpacked['images/product_compressed.png'].length > 0, 'Unpacked compressed PNG must have bytes');
    assertTrue(finalUnpacked['images/product_converted.jpg'].length > 0, 'Unpacked converted JPEG must have bytes');
    assertTrue(finalUnpacked['documents/contract_compressed.pdf'].length > 0, 'Unpacked compressed PDF must have bytes');
    assertTrue(finalUnpacked['manifest.svg'].length > 0, 'Unpacked manifest SVG must have bytes');
  });

  await tracker.runTest('OBJ1.2: Simple Mode Workbench Chained Multi-Tool Pipeline (executeTool -> createOutputsZip)', async () => {
    // 1. Initial file upload
    const sourceImage = createRealisticPng('workbench_upload.png', 64, 64);

    // 2. Step 1: Image Resizer
    const resizeRes = await executeTool('image-resizer', sourceImage, { width: 48, height: 48 });
    assertTrue(resizeRes.blob instanceof Blob);

    // 3. Step 2: Image Compressor
    const resizedFile = new File([resizeRes.blob], resizeRes.filename, { type: 'image/png' });
    const compressRes = await executeTool('image-compressor', resizedFile, { quality: 75 });
    assertTrue(compressRes.blob instanceof Blob);

    // 4. Step 3: Image Converter (to WebP)
    const compressedFile = new File([compressRes.blob], compressRes.filename, { type: 'image/png' });
    const convertRes = await executeTool('image-converter', compressedFile, { targetFormat: 'image/webp' });
    assertTrue(convertRes.blob instanceof Blob);
    assertTrue(convertRes.filename.endsWith('.webp'));

    // 5. Step 4: Batch ZIP creation via createOutputsZip
    const outputs = [
      {
        id: 'out-1',
        toolSlug: 'image-resizer',
        toolName: 'Image Resizer',
        sourceFilename: 'workbench_upload.png',
        outputFilename: resizeRes.filename,
        mimeType: 'image/png',
        size: resizeRes.blob.size,
        originalSize: sourceImage.size,
        blob: resizeRes.blob,
        previewUrl: '',
        createdAt: Date.now(),
      },
      {
        id: 'out-2',
        toolSlug: 'image-compressor',
        toolName: 'Image Compressor',
        sourceFilename: resizeRes.filename,
        outputFilename: compressRes.filename,
        mimeType: 'image/png',
        size: compressRes.blob.size,
        originalSize: resizeRes.blob.size,
        blob: compressRes.blob,
        previewUrl: '',
        createdAt: Date.now(),
      },
      {
        id: 'out-3',
        toolSlug: 'image-converter',
        toolName: 'Image Converter',
        sourceFilename: compressRes.filename,
        outputFilename: convertRes.filename,
        mimeType: 'image/webp',
        size: convertRes.blob.size,
        originalSize: compressRes.blob.size,
        blob: convertRes.blob,
        previewUrl: '',
        createdAt: Date.now(),
      },
    ];

    const workbenchZip = await createOutputsZip(outputs);
    assertTrue(workbenchZip instanceof Blob);

    const unpacked = unzipSync(new Uint8Array(await workbenchZip.arrayBuffer()));
    assertEqual(Object.keys(unpacked).length, 3, 'All 3 pipeline outputs bundled into ZIP');
    assertTrue(resizeRes.filename in unpacked, 'Resized image present in ZIP');
    assertTrue(compressRes.filename in unpacked, 'Compressed image present in ZIP');
    assertTrue(convertRes.filename in unpacked, 'Converted WebP present in ZIP');

    // 6. Step 5: PDF Compressor Tool in Simple Mode
    const testPdf = createSimpleTextPdf('memo.pdf');
    const pdfRunnerRes = await executeTool('pdf-compressor', testPdf, { preset: 'extreme' });
    assertTrue(pdfRunnerRes.blob instanceof Blob);
    assertEqual(pdfRunnerRes.filename, 'memo_compressed.pdf');
  });

  await tracker.runTest('OBJ1.3: Resilient Pipeline with Edge Case Injected Mid-Flight', async () => {
    // Inject a zero-byte file and corrupted stream into the chaining workflow
    const originalPng = createRealisticPng('clean.png', 32, 32);
    const zeroByteFile = new File([], 'empty.png', { type: 'image/png' });
    const corruptedStreamFile = EdgeCaseFiles.corruptedHeaderImage();

    const [cleanComp, zeroComp, corruptComp] = await Promise.all([
      compressImage(originalPng),
      compressImage(zeroByteFile),
      compressImage(corruptedStreamFile),
    ]);

    // All must produce valid Blobs without throwing
    assertTrue(cleanComp.blob instanceof Blob);
    assertTrue(zeroComp.blob instanceof Blob);
    assertTrue(corruptComp.blob instanceof Blob);

    // Bundle them all into ZIP
    const zipBlob = await createStreamingZip([
      { name: 'clean.png', data: cleanComp.blob },
      { name: 'empty.png', data: zeroComp.blob },
      { name: 'corrupted.png', data: corruptComp.blob },
    ]);
    assertTrue(zipBlob instanceof Blob);

    // Unpack and verify structure
    const unpacked = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    assertEqual(Object.keys(unpacked).length, 3);
    assertEqual(unpacked['empty.png'].length, 0, 'Zero byte file preserved in archive');
    assertTrue(unpacked['clean.png'].length > 0, 'Clean file preserved');
  });

  // ============================================================================
  // OBJECTIVE 2: RAPID CONCURRENT EXECUTION STRESS
  // ============================================================================
  console.log('\n--- Objective 2: Rapid Concurrent Execution Stress ---');

  await tracker.runTest('OBJ2.1: 20 Image + 10 PDF + 5 ZIP (35 Parallel Operations) Zero Race Conditions', async () => {
    const t0 = Date.now();

    // 1. Prepare 20 image compression tasks across all supported formats
    const imageTasks = [
      compressImage(createRealisticPng('p1.png', 48, 48), { quality: 0.8 }),
      compressImage(createRealisticPng('p2.png', 64, 32), { quality: 0.7 }),
      compressImage(createRealisticPng('p3.png', 32, 64), { quality: 0.6 }),
      compressImage(createRealisticPng('p4.png', 80, 80), { quality: 0.9 }),
      compressImage(createJpegWithExifIcc('j1.jpg'), { quality: 0.85 }),
      compressImage(createJpegWithExifIcc('j2.jpg'), { quality: 0.75 }),
      compressImage(createJpegWithExifIcc('j3.jpg'), { quality: 0.65 }),
      compressImage(createJpegWithExifIcc('j4.jpg'), { quality: 0.50 }),
      compressImage(createRealisticWebp('w1.webp'), { quality: 0.8 }),
      compressImage(createRealisticWebp('w2.webp'), { quality: 0.6 }),
      compressImage(createRealisticWebp('w3.webp'), { quality: 0.4 }),
      compressImage(createRealisticSvg('s1.svg')),
      compressImage(createRealisticSvg('s2.svg')),
      compressImage(createRealisticSvg('s3.svg')),
      compressImage(createRealisticAvif('a1.avif')),
      compressImage(createRealisticAvif('a2.avif')),
      compressImage(createRealisticGif('g1.gif')),
      compressImage(createRealisticGif('g2.gif')),
      compressImage(createRealisticBmp('b1.bmp')),
      compressImage(createRealisticBmp('b2.bmp')),
    ];

    // 2. Prepare 10 PDF compression tasks across all presets and edge cases
    const pdfTasks = [
      compressPdf(createSimpleTextPdf('doc1.pdf'), { preset: 'recommended' }),
      compressPdf(createSimpleTextPdf('doc2.pdf'), { preset: 'extreme' }),
      compressPdf(createVectorPdf('vec1.pdf'), { preset: 'recommended' }),
      compressPdf(createVectorPdf('vec2.pdf'), { preset: 'low' }),
      compressPdf(createMultiPagePdf('multi1.pdf', 3), { preset: 'recommended' }),
      compressPdf(createMultiPagePdf('multi2.pdf', 5), { preset: 'extreme' }),
      compressPdf(createEncryptedPdf('enc1.pdf'), { preset: 'recommended' }),
      compressPdf(createEncryptedPdf('enc2.pdf'), { preset: 'low' }),
      compressPdf(EdgeCaseFiles.corruptedPdf(), { preset: 'recommended' }),
      compressPdf(EdgeCaseFiles.corruptedPdfBytes(), { preset: 'extreme' }),
    ];

    // 3. Prepare 5 Streaming ZIP packaging tasks
    const zipTasks = [
      // ZIP 1: 5 small images
      createStreamingZip([
        { name: 'img1.png', data: new Uint8Array([1, 2, 3]) },
        { name: 'img2.png', data: new Uint8Array([4, 5, 6]) },
        { name: 'img3.png', data: new Uint8Array([7, 8, 9]) },
        { name: 'img4.png', data: new Uint8Array([10, 11, 12]) },
        { name: 'img5.png', data: new Uint8Array([13, 14, 15]) },
      ]),
      // ZIP 2: 15 mixed format assets
      createStreamingZip(
        Array.from({ length: 15 }, (_, i) => ({
          name: `asset_${i}.${i % 2 === 0 ? 'jpg' : 'svg'}`,
          data: new Uint8Array(64).fill(i),
        }))
      ),
      // ZIP 3: 3 PDFs
      createStreamingZip([
        { name: 'report1.pdf', data: createSimpleTextPdf('r1.pdf') },
        { name: 'report2.pdf', data: createVectorPdf('r2.pdf') },
        { name: 'report3.pdf', data: createMultiPagePdf('r3.pdf', 2) },
      ]),
      // ZIP 4: Edge cases (0-byte, 1-byte, unicode, emoji names)
      createStreamingZip([
        { name: 'empty.bin', data: new Uint8Array(0) },
        { name: 'byte.bin', data: new Uint8Array([42]) },
        { name: 'vacation 🏖️.jpg', data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) },
        { name: 'data [v2] (final).json', data: new TextEncoder().encode('{"ok":true}') },
      ]),
      // ZIP 5: Deduplicated filenames (same name repeated 10 times)
      createStreamingZip(
        Array.from({ length: 10 }, (_, i) => ({
          name: 'photo.jpg',
          data: new Uint8Array([i, i + 1, i + 2]),
        }))
      ),
    ];

    // Fire all 35 tasks simultaneously in parallel
    const [imageResults, pdfResults, zipResults] = await Promise.all([
      Promise.all(imageTasks),
      Promise.all(pdfTasks),
      Promise.all(zipTasks),
    ]);

    const duration = Date.now() - t0;
    console.log(`     Parallel execution of 35 operations finished in ${duration}ms`);

    // Verify Image Results (20/20)
    assertEqual(imageResults.length, 20, 'All 20 image tasks must return results');
    for (let i = 0; i < imageResults.length; i++) {
      const res = imageResults[i];
      assertTrue(res.blob instanceof Blob, `Image task ${i} must produce valid Blob`);
      assertTrue(res.blob.size > 0, `Image task ${i} must produce non-zero Blob size`);
      assertTrue(typeof res.format === 'string' && res.format.length > 0, `Image task ${i} must have format`);
      assertTrue(res.tierUsed >= 1 && res.tierUsed <= 3, `Image task ${i} must specify valid tierUsed`);
      assertTrue(
        res.status === 'compressed' || res.status === 'optimal' || res.status === 'fallback' || res.status === 'original',
        `Image task ${i} must have valid status`
      );
    }

    // Verify PDF Results (10/10)
    assertEqual(pdfResults.length, 10, 'All 10 PDF tasks must return results');
    for (let i = 0; i < pdfResults.length; i++) {
      const res = pdfResults[i];
      assertTrue(res.blob instanceof Blob, `PDF task ${i} must produce valid Blob`);
      assertTrue(res.compressedSize <= res.originalSize, `PDF task ${i} anti-inflation guarantee`);
      assertTrue(res.tierUsed >= 1 && res.tierUsed <= 3, `PDF task ${i} must have valid tierUsed`);
      assertTrue(
        res.status === 'compressed' || res.status === 'optimal' || res.status === 'encrypted' || res.status === 'corrupted',
        `PDF task ${i} status "${res.status}" is valid`
      );
    }

    // Verify ZIP Results (5/5)
    assertEqual(zipResults.length, 5, 'All 5 ZIP tasks must produce archive Blobs');
    for (let i = 0; i < zipResults.length; i++) {
      const zipBlob = zipResults[i];
      assertTrue(zipBlob instanceof Blob, `ZIP task ${i} must produce Blob`);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      assertTrue(Object.keys(unzipped).length > 0, `ZIP task ${i} must unpack entries cleanly`);
    }

    // Verify ZIP 5 deduplication specifically
    const unzippedZip5 = unzipSync(new Uint8Array(await zipResults[4].arrayBuffer()));
    const zip5Names = Object.keys(unzippedZip5);
    assertEqual(zip5Names.length, 10, 'ZIP 5 must have 10 deduplicated files');
    assertEqual(zip5Names[0], 'photo.jpg');
    assertEqual(zip5Names[1], 'photo (1).jpg');
    assertEqual(zip5Names[9], 'photo (9).jpg');
  });

  await tracker.runTest('OBJ2.2: Extreme Concurrency Burst (50 Concurrent Mixed Tasks)', async () => {
    // 25 Images + 15 PDFs + 10 ZIPs = 50 concurrent operations
    const tasks = [];

    // 25 images
    for (let i = 0; i < 25; i++) {
      const img = i % 2 === 0 ? createRealisticPng(`burst_${i}.png`, 32, 32) : createJpegWithExifIcc(`burst_${i}.jpg`);
      tasks.push(compressImage(img, { quality: 0.7 }));
    }

    // 15 PDFs
    for (let i = 0; i < 15; i++) {
      const pdf = i % 3 === 0 ? createSimpleTextPdf(`p_${i}.pdf`) : i % 3 === 1 ? createVectorPdf(`p_${i}.pdf`) : createMultiPagePdf(`p_${i}.pdf`, 2);
      tasks.push(compressPdf(pdf));
    }

    // 10 ZIPs
    for (let i = 0; i < 10; i++) {
      tasks.push(
        createStreamingZip([
          { name: `f_${i}.txt`, data: new TextEncoder().encode(`content_${i}`) },
          { name: `f_${i}.png`, data: new Uint8Array([1, 2, 3, 4]) },
        ])
      );
    }

    assertEqual(tasks.length, 50, 'Must have prepared 50 concurrent tasks');

    const results = await Promise.all(tasks);
    assertEqual(results.length, 50, 'All 50 tasks resolved successfully without deadlock');
  });

  // ============================================================================
  // OBJECTIVE 3: UNIVERSAL 0-BYTE & CORRUPTION STRESS
  // ============================================================================
  console.log('\n--- Objective 3: Universal 0-byte & Corruption Stress ---');

  await tracker.runTest('OBJ3.1: Image Engine 0-Byte, 1-Byte, Invalid MIME & Truncated Streams', async () => {
    // 1. 0-byte files with varied MIME types (PNG, JPEG, WebP, SVG, AVIF, GIF, BMP, no MIME)
    const zeroPng = new File([], 'empty.png', { type: 'image/png' });
    const zeroJpg = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const zeroWebp = new File([], 'empty.webp', { type: 'image/webp' });
    const zeroSvg = new File([], 'empty.svg', { type: 'image/svg+xml' });
    const zeroAvif = new File([], 'empty.avif', { type: 'image/avif' });
    const zeroGif = new File([], 'empty.gif', { type: 'image/gif' });
    const zeroBmp = new File([], 'empty.bmp', { type: 'image/bmp' });
    const zeroNoMime = new File([], 'empty.raw', { type: '' });

    const zeroResults = await Promise.all([
      compressImage(zeroPng),
      compressImage(zeroJpg),
      compressImage(zeroWebp),
      compressImage(zeroSvg),
      compressImage(zeroAvif),
      compressImage(zeroGif),
      compressImage(zeroBmp),
      compressImage(zeroNoMime),
    ]);

    for (const r of zeroResults) {
      assertTrue(r.blob instanceof Blob, '0-byte image must return valid Blob');
      assertEqual(r.originalSize, 0, 'Original size must be 0');
      assertEqual(r.compressedSize, 0, 'Compressed size must be 0');
      assertEqual(r.reductionPercentage, 0, 'Reduction percentage must be 0');
      assertEqual(r.tierUsed, 3, 'Tier 3 safety must be used');
      assertTrue(r.status === 'original' || r.status === 'optimal', 'Status must be original or optimal');
    }

    // 2. 1-byte files (0x42, 0x00, 0xFF)
    const oneByteFile1 = new File([new Uint8Array([0x42])], 'one_byte1.jpg', { type: 'image/jpeg' });
    const oneByteFile2 = new File([new Uint8Array([0x00])], 'one_byte2.png', { type: 'image/png' });
    const oneByteFile3 = new File([new Uint8Array([0xff])], 'one_byte3.webp', { type: 'image/webp' });
    const [rOne1, rOne2, rOne3] = await Promise.all([
      compressImage(oneByteFile1),
      compressImage(oneByteFile2),
      compressImage(oneByteFile3),
    ]);
    for (const r of [rOne1, rOne2, rOne3]) {
      assertTrue(r.blob instanceof Blob, '1-byte image must return Blob');
      assertEqual(r.originalSize, 1, 'Original size is 1');
      assertEqual(r.tierUsed, 3, 'Tier 3 safety used');
    }

    // 3. Invalid MIME headers / non-image text / JSON / HTML masquerading as image
    const textAsImage = new File(['THIS IS NOT AN IMAGE AT ALL'], 'fake.png', { type: 'image/png' });
    const jsonAsImage = new File(['{"error": "not an image"}'], 'fake.jpg', { type: 'image/jpeg' });
    const htmlAsImage = new File(['<!DOCTYPE html><html><body>Not image</body></html>'], 'fake.webp', { type: 'image/webp' });
    const [rFake, rJsonFake, rHtmlFake] = await Promise.all([
      compressImage(textAsImage),
      compressImage(jsonAsImage),
      compressImage(htmlAsImage),
    ]);
    for (const r of [rFake, rJsonFake, rHtmlFake]) {
      assertTrue(r.blob instanceof Blob, 'Fake image must return valid Blob');
      assertTrue(r.tierUsed >= 1 && r.tierUsed <= 3, 'Valid tier used');
      assertTrue(['compressed', 'optimal', 'fallback', 'original'].includes(r.status), 'Valid status');
    }

    // 3b. Catastrophic image decode failure triggers Tier 3 Safety Tier
    globalThis.__MOCK_IMAGE_ERROR__ = true;
    try {
      const corruptFile = new File([new Uint8Array([0x01, 0x02, 0x03])], 'fatal_decode.jpg', { type: 'image/jpeg' });
      const rDecodeErr = await compressImage(corruptFile);
      assertTrue(rDecodeErr.blob instanceof Blob, 'Fatal decode error returns valid Blob');
      assertEqual(rDecodeErr.tierUsed, 3, 'Must safely fall back to Tier 3 on decode error');
      assertEqual(rDecodeErr.status, 'original', 'Must preserve original on decode error');
    } finally {
      globalThis.__MOCK_IMAGE_ERROR__ = false;
    }

    // 4. Truncated image streams
    const truncatedPng = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'trunc.png', { type: 'image/png' });
    const truncatedJpg = new File([new Uint8Array([0xff, 0xd8])], 'trunc.jpg', { type: 'image/jpeg' });
    const truncatedWebp = new File([new Uint8Array([0x52, 0x49, 0x46, 0x46])], 'trunc.webp', { type: 'image/webp' });

    const [rTruncPng, rTruncJpg, rTruncWebp] = await Promise.all([
      compressImage(truncatedPng),
      compressImage(truncatedJpg),
      compressImage(truncatedWebp),
    ]);

    for (const r of [rTruncPng, rTruncJpg, rTruncWebp]) {
      assertTrue(r.blob instanceof Blob, 'Truncated stream returns Blob');
      assertEqual(r.tierUsed, 3, 'Truncated stream handled in Tier 3');
      assertEqual(r.reductionPercentage, 0, 'Reduction is 0%');
    }

    // 5. Malformed SVG
    const brokenSvg = '<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0<polygon';
    const minifiedBrokenSvg = await minifySvgText(brokenSvg);
    assertTrue(typeof minifiedBrokenSvg === 'string', 'Broken SVG minifier returns string without throwing');
    const svgFile = new File([brokenSvg], 'broken.svg', { type: 'image/svg+xml' });
    const rSvg = await compressImage(svgFile);
    assertTrue(rSvg.blob instanceof Blob, 'Broken SVG image returns Blob');
  });

  await tracker.runTest('OBJ3.2: PDF Engine 0-Byte, 1-Byte, Invalid Header, Truncated & Encrypted Streams', async () => {
    // 1. 0-byte PDF (File, Blob, ArrayBuffer, Uint8Array)
    const zeroFile = new File([], 'zero.pdf', { type: 'application/pdf' });
    const zeroBlob = new Blob([], { type: 'application/pdf' });
    const zeroBuf = new ArrayBuffer(0);
    const zeroU8 = new Uint8Array(0);

    const [rFile, rBlob, rBuf, rU8] = await Promise.all([
      compressPdf(zeroFile),
      compressPdf(zeroBlob),
      compressPdf(zeroBuf),
      compressPdf(zeroU8),
    ]);

    for (const r of [rFile, rBlob, rBuf, rU8]) {
      assertTrue(r.blob instanceof Blob, '0-byte PDF returns Blob');
      assertEqual(r.originalSize, 0, 'Original size is 0');
      assertEqual(r.compressedSize, 0, 'Compressed size is 0');
      assertEqual(r.pageCount, 0, 'Page count is 0');
      assertEqual(r.status, 'optimal', 'Status is optimal');
      assertEqual(r.tierUsed, 3, 'Tier 3 safety used');
    }

    // 2. 1-byte files (0x25 '%', 0x00)
    const oneBytePdf1 = new File([new Uint8Array([0x25])], 'one_byte1.pdf', { type: 'application/pdf' });
    const oneBytePdf2 = new File([new Uint8Array([0x00])], 'one_byte2.pdf', { type: 'application/pdf' });
    const [rOne1, rOne2] = await Promise.all([
      compressPdf(oneBytePdf1),
      compressPdf(oneBytePdf2),
    ]);
    for (const r of [rOne1, rOne2]) {
      assertTrue(r.blob instanceof Blob);
      assertEqual(r.status, 'corrupted');
      assertEqual(r.tierUsed, 3);
      assertEqual(r.compressedSize, 1);
    }

    // 3. Invalid header / non-PDF text
    const textAsPdf = new File(['NOT_A_PDF_FILE_STREAM_DATA_ABC123'], 'fake.pdf', { type: 'application/pdf' });
    const rFake = await compressPdf(textAsPdf);
    assertTrue(rFake.blob instanceof Blob);
    assertEqual(rFake.status, 'corrupted');
    assertEqual(rFake.tierUsed, 3);

    // 4. Truncated PDF stream & broken xref table
    const truncatedPdf = new File(['%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\n'], 'trunc.pdf', { type: 'application/pdf' });
    const brokenXrefPdf = EdgeCaseFiles.corruptedPdf();
    const brokenBytesPdf = EdgeCaseFiles.corruptedPdfBytes();

    const [rTrunc, rBrokenXref, rBrokenBytes] = await Promise.all([
      compressPdf(truncatedPdf),
      compressPdf(brokenXrefPdf),
      compressPdf(brokenBytesPdf),
    ]);

    for (const r of [rTrunc, rBrokenXref, rBrokenBytes]) {
      assertTrue(r.blob instanceof Blob);
      assertEqual(r.status, 'corrupted');
      assertEqual(r.tierUsed, 3);
      assertTrue(r.compressedSize > 0);
    }

    // 5. Encrypted / password-protected PDF
    const encPdf = createEncryptedPdf('protected.pdf');
    const rEnc = await compressPdf(encPdf);
    assertTrue(rEnc.blob instanceof Blob);
    assertEqual(rEnc.status, 'encrypted');
    assertEqual(rEnc.tierUsed, 3);
    assertEqual(rEnc.compressedSize, encPdf.size);
    assertTrue(rEnc.statusMessage?.includes('Password') || rEnc.statusMessage?.includes('encrypted'));
  });

  await tracker.runTest('OBJ3.3: Archive Engine 0-Byte, 1-Byte, Corrupted Entries & Path Traversal Sanitization', async () => {
    // 1. Empty archive
    const emptyZip = await createStreamingZip([]);
    assertTrue(emptyZip instanceof Blob);
    const emptyUnpacked = unzipSync(new Uint8Array(await emptyZip.arrayBuffer()));
    assertEqual(Object.keys(emptyUnpacked).length, 0, 'Empty archive has 0 files');

    // 2. Archive containing 0-byte and 1-byte entries
    const edgeZip = await createStreamingZip([
      { name: 'zero.txt', data: new Uint8Array(0) },
      { name: 'zero.bin', data: new Blob([]) },
      { name: 'one.bin', data: new Uint8Array([0xfe]) },
    ]);
    assertTrue(edgeZip instanceof Blob);
    const edgeUnpacked = unzipSync(new Uint8Array(await edgeZip.arrayBuffer()));
    assertEqual(Object.keys(edgeUnpacked).length, 3);
    assertEqual(edgeUnpacked['zero.txt'].length, 0);
    assertEqual(edgeUnpacked['zero.bin'].length, 0);
    assertEqual(edgeUnpacked['one.bin'].length, 1);
    assertEqual(edgeUnpacked['one.bin'][0], 0xfe);

    // 3. Path traversal / zip-slip attack attempts
    const traversalZip = await createStreamingZip([
      { name: '../../etc/passwd', data: new TextEncoder().encode('root:x:0:0') },
      { name: '/var/log/secret.txt', data: new TextEncoder().encode('secret') },
      { name: '..\\windows\\system32\\cmd.exe', data: new Uint8Array([1, 2, 3]) },
    ]);
    const traversalUnpacked = unzipSync(new Uint8Array(await traversalZip.arrayBuffer()));
    const unzippedNames = Object.keys(traversalUnpacked);

    for (const name of unzippedNames) {
      assertFalse(name.startsWith('../'), `Filename "${name}" must not start with ../`);
      assertFalse(name.startsWith('/'), `Filename "${name}" must not start with /`);
      assertFalse(name.includes('..\\'), `Filename "${name}" must not contain ..\\`);
    }
  });

  // ============================================================================
  // OBJECTIVE 4: MEMORY ALLOCATION BOUND VERIFICATION
  // ============================================================================
  console.log('\n--- Objective 4: Memory Allocation Bound Verification ---');

  await tracker.runTest('OBJ4.1: 8000x8000 Images Downsampled to <= 16 Megapixels (Safe Dimension Bound)', async () => {
    // 1. Mathematical 8000x8000 verification
    const d8000 = computeSafeDimensions(8000, 8000, 4096);
    assertTrue(d8000.scaled, '8000x8000 must trigger downsampling');
    assertEqual(d8000.width, 4096, 'Width must be capped to 4096');
    assertEqual(d8000.height, 4096, 'Height must be capped to 4096');
    assertEqual(d8000.width * d8000.height, 16_777_216, 'Area must be exactly 16 MP');
    assertTrue(d8000.width * d8000.height <= MAX_SAFE_AREA, 'Area must not exceed MAX_SAFE_AREA');

    // 2. Asymmetric dimension tests
    // 10000x8000
    const d10000x8000 = computeSafeDimensions(10000, 8000, 4096);
    assertTrue(d10000x8000.scaled);
    assertEqual(d10000x8000.width, 4096);
    assertEqual(d10000x8000.height, 3277);
    assertTrue(d10000x8000.width * d10000x8000.height <= MAX_SAFE_AREA);
    assertTrue(Math.abs(10000 / 8000 - d10000x8000.width / d10000x8000.height) < 0.01, 'Aspect ratio 1.25 preserved');

    // 8000x10000
    const d8000x10000 = computeSafeDimensions(8000, 10000, 4096);
    assertTrue(d8000x10000.scaled);
    assertEqual(d8000x10000.width, 3277);
    assertEqual(d8000x10000.height, 4096);
    assertTrue(d8000x10000.width * d8000x10000.height <= MAX_SAFE_AREA);

    // 16000x2000
    const d16000x2000 = computeSafeDimensions(16000, 2000, 4096);
    assertTrue(d16000x2000.scaled);
    assertEqual(d16000x2000.width, 4096);
    assertEqual(d16000x2000.height, 512);
    assertTrue(d16000x2000.width * d16000x2000.height <= MAX_SAFE_AREA);

    // 8000x4000 (2:1 aspect ratio)
    const d8000x4000 = computeSafeDimensions(8000, 4000, 4096);
    assertTrue(d8000x4000.scaled);
    assertEqual(d8000x4000.width, 4096);
    assertEqual(d8000x4000.height, 2048);
    assertTrue(d8000x4000.width * d8000x4000.height <= MAX_SAFE_AREA);

    // 4000x8000 (1:2 aspect ratio)
    const d4000x8000 = computeSafeDimensions(4000, 8000, 4096);
    assertTrue(d4000x8000.scaled);
    assertEqual(d4000x8000.width, 2048);
    assertEqual(d4000x8000.height, 4096);
    assertTrue(d4000x8000.width * d4000x8000.height <= MAX_SAFE_AREA);

    // 12000x12000
    const d12000x12000 = computeSafeDimensions(12000, 12000, 4096);
    assertTrue(d12000x12000.scaled);
    assertEqual(d12000x12000.width, 4096);
    assertEqual(d12000x12000.height, 4096);
    assertEqual(d12000x12000.width * d12000x12000.height, 16_777_216);
  });

  await tracker.runTest('OBJ4.2: End-to-End Image Compressor with 8000x8000 Mock Dimension', async () => {
    // Inject 8000x8000 dimensions into MockBrowserImage
    globalThis.__MOCK_IMAGE_DIMS__ = { width: 8000, height: 8000 };

    try {
      // 100KB JPEG header
      const buffer = new Uint8Array(100 * 1024);
      buffer[0] = 0xff; buffer[1] = 0xd8; // JPEG SOI
      const file = new File([buffer], 'huge_8000x8000.jpg', { type: 'image/jpeg' });

      const res = await compressImage(file, { maxDimension: 4096 });
      assertTrue(res.blob instanceof Blob, 'Must produce valid Blob');
      assertEqual(res.tierUsed, 2, 'Must utilize Tier 2 adaptive downsampling');
      assertEqual(res.status, 'fallback', 'Status must be fallback downsample');
      assertEqual(res.dimensions?.width, 4096, 'Result width must be 4096');
      assertEqual(res.dimensions?.height, 4096, 'Result height must be 4096');
      assertTrue(res.dimensions.width * res.dimensions.height <= MAX_SAFE_AREA, 'Area <= 16 MP');
    } finally {
      globalThis.__MOCK_IMAGE_DIMS__ = null;
    }
  });

  await tracker.runTest('OBJ4.3: Multi-Page PDFs Process Sequentially with Monotonic Progress & Zero Crashes', async () => {
    // 5-page PDF with progress reporting monitoring
    const multi5 = createMultiPagePdf('report_5pages.pdf', 5);
    const progressLog = [];

    const res5 = await compressPdf(multi5, {
      preset: 'recommended',
      onProgress: (percent, msg) => {
        progressLog.push({ percent, msg });
      },
    });

    assertTrue(res5.blob instanceof Blob);
    assertEqual(res5.pageCount, 5, 'Page count must be 5');
    assertTrue(progressLog.length >= 3, 'Must report progress at multiple steps');

    // Verify progress is monotonically non-decreasing
    for (let i = 1; i < progressLog.length; i++) {
      assertTrue(
        progressLog[i].percent >= progressLog[i - 1].percent,
        `Progress must be monotonic: step ${i} (${progressLog[i].percent}%) >= step ${i - 1} (${progressLog[i - 1].percent}%)`
      );
    }
    assertEqual(progressLog[progressLog.length - 1].percent, 100, 'Final progress must reach 100%');
  });

  await tracker.runTest('OBJ4.4: High Page-Count PDF Stress (20 Pages) Processed Safely without Crash', async () => {
    // Dynamically create a genuine 20-page document with pdf-lib
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < 20; i++) {
      const page = pdfDoc.addPage([595, 842]);
      page.drawText(`Encyclopedia Page ${i + 1} of 20 content...`, { x: 50, y: 750 });
    }
    const pdfBytes = await pdfDoc.save();
    const multi20 = new File([pdfBytes], 'encyclopedia_20pages.pdf', { type: 'application/pdf' });
    const res20 = await compressPdf(multi20, { preset: 'extreme' });

    assertTrue(res20.blob instanceof Blob, 'Must output Blob');
    assertEqual(res20.pageCount, 20, 'All 20 pages preserved');
    assertTrue(res20.compressedSize <= multi20.size, 'Output size <= input size');
    assertTrue(res20.tierUsed === 1 || res20.tierUsed === 3, 'Tier 1 or Tier 3 used safely');
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const summary = tracker.summary();

  console.log('\n================================================================');
  console.log(` 🏁 TIER 5 WHOLE-SYSTEM ADVERSARIAL SUITE RESULTS`);
  console.log('================================================================');
  console.log(` Total Challenges:   ${summary.total}`);
  console.log(` Passed:             ${summary.passed}`);
  console.log(` Failed:             ${summary.failed}`);
  console.log(` Pass Rate:          ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  console.log(` Total Duration:     ${summary.durationMs}ms`);
  console.log('================================================================\n');

  return summary;
}

// Direct execution entry point
if (process.argv[1]?.endsWith('final_tier5_adversarial.test.mjs')) {
  runFinalTier5AdversarialTests()
    .then(summary => {
      if (summary.failed > 0) {
        console.error(`❌ TIER 5 ADVERSARIAL SUITE FAILED with ${summary.failed} failure(s).`);
        process.exit(1);
      } else {
        console.log('✅ ALL TIER 5 ADVERSARIAL STRESS CHALLENGES PASSED! EMPIRICAL VERDICT: APPROVE');
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('Fatal crash in Tier 5 Adversarial Suite:', err);
      process.exit(1);
    });
}
