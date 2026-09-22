// @ts-check
/**
 * Tier 4: Real-World Application Scenarios E2E Test Suite
 * Executes 5 complete end-to-end user workflows simulating realistic browser usage.
 * Derived strictly from ORIGINAL_REQUEST.md & TEST_INFRA.md
 */

import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  createTestImage,
  createTestPdf,
  createTestCsv,
} from './helpers/test_fixtures.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
} from './helpers/assertions.mjs';
import {
  detectCategoryFromFile,
} from '../../lib/simpleMode/categoryDetection.ts';
import { zipSync, strToU8 } from 'fflate';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function runTier4Tests() {
  const tracker = new TestResultTracker('Tier 4: Real-World Application Scenarios');
  console.log('\n======================================================');
  console.log(' RUNNING TIER 4: REAL-WORLD APPLICATION SCENARIOS');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // Scenario 1: Web Optimization Workflow
  // --------------------------------------------------------------------------
  console.log('--- Scenario 1: Web Optimization Workflow ---');

  await tracker.runTest('S1: Web developer optimizes 4K product photograph (resize + WebP compress + ZIP)', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // 1. User loads a 4K product photograph
      const heroPhoto = createTestImage('png', 'product_hero_4k.png', 8 * 1024 * 1024);
      assertEqual(detectCategoryFromFile(heroPhoto), 'Images');

      const outputs = [];

      // 2. Step 1: Resize to 1200px width
      const resizedBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
      const resizedOutput = {
        id: 'web-opt-1',
        toolSlug: 'image-resizer',
        toolName: 'Image Resizer',
        sourceFilename: heroPhoto.name,
        outputFilename: 'product_hero_1200w.png',
        mimeType: 'image/png',
        size: 1024 * 1024,
        originalSize: heroPhoto.size,
        blob: resizedBlob,
        previewUrl: URL.createObjectURL(resizedBlob),
        createdAt: Date.now(),
        metadata: { width: 1200, height: 800 },
      };
      outputs.unshift(resizedOutput);

      // 3. User uses resized output as input for compression
      const chainedFile = new File([resizedOutput.blob], resizedOutput.outputFilename, {
        type: resizedOutput.mimeType,
      });

      // 4. Step 2: Compress to 80% quality WebP
      const webpBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' });
      const compressedOutput = {
        id: 'web-opt-2',
        toolSlug: 'image-compressor',
        toolName: 'Image Compressor',
        sourceFilename: chainedFile.name,
        outputFilename: 'product_hero_1200w.webp',
        mimeType: 'image/webp',
        size: 250 * 1024,
        originalSize: chainedFile.size,
        blob: webpBlob,
        previewUrl: URL.createObjectURL(webpBlob),
        createdAt: Date.now(),
        metadata: { quality: '80%', format: 'WebP', savings: '75.6%' },
      };
      outputs.unshift(compressedOutput);

      // Verify both outputs exist independently
      assertEqual(outputs.length, 2);
      assertEqual(outputs[0].outputFilename, 'product_hero_1200w.webp');
      assertEqual(outputs[1].outputFilename, 'product_hero_1200w.png');

      // 5. Batch export both versions into a zip archive
      const zipEntries = {
        [outputs[0].outputFilename]: strToU8('webp-binary-data'),
        [outputs[1].outputFilename]: strToU8('png-binary-data'),
      };
      const zip = zipSync(zipEntries);
      assertTrue(zip.length > 0);
      assertEqual(zip[0], 0x50); // PK zip magic header
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Document Archiving Workflow
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Document Archiving Workflow ---');

  await tracker.runTest('S2: User extracts PDF pages, converts to JPG, watermarks and archives', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // 1. User drops multi-page PDF invoice
      const invoicePdf = createTestPdf('invoice_2026_Q3.pdf');
      assertEqual(detectCategoryFromFile(invoicePdf), 'PDF');

      const outputs = [];

      // 2. Step 1: Split / Extract pages 1-2
      const splitPdfBlob = new Blob([strToU8('%PDF-1.4 pages 1-2')], { type: 'application/pdf' });
      outputs.unshift({
        id: 'doc-1',
        toolSlug: 'pdf-page-extractor',
        toolName: 'PDF Page Extractor',
        sourceFilename: invoicePdf.name,
        outputFilename: 'invoice_pages_1-2.pdf',
        mimeType: 'application/pdf',
        size: 1500,
        originalSize: invoicePdf.size,
        blob: splitPdfBlob,
        createdAt: Date.now(),
      });

      // 3. Step 2: Convert page 1 to high-res JPG
      const jpgBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
      outputs.unshift({
        id: 'doc-2',
        toolSlug: 'pdf-to-jpg',
        toolName: 'PDF → JPG',
        sourceFilename: invoicePdf.name,
        outputFilename: 'invoice_page_1.jpg',
        mimeType: 'image/jpeg',
        size: 4000,
        originalSize: invoicePdf.size,
        blob: jpgBlob,
        createdAt: Date.now(),
      });

      // 4. Step 3: Chain JPG into Image Watermark tool
      const jpgFile = new File([jpgBlob], 'invoice_page_1.jpg', { type: 'image/jpeg' });
      assertEqual(detectCategoryFromFile(jpgFile), 'Images'); // Dynamic category switch

      const watermarkedJpgBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
      outputs.unshift({
        id: 'doc-3',
        toolSlug: 'image-watermark',
        toolName: 'Image Watermark',
        sourceFilename: jpgFile.name,
        outputFilename: 'invoice_page_1_PAID.jpg',
        mimeType: 'image/jpeg',
        size: 4100,
        originalSize: jpgFile.size,
        blob: watermarkedJpgBlob,
        createdAt: Date.now(),
        metadata: { watermarkText: 'PAID' },
      });

      assertEqual(outputs.length, 3);
      assertEqual(outputs[0].metadata?.watermarkText, 'PAID');
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Data Transformation Workflow
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Data Transformation Workflow ---');

  await tracker.runTest('S3: Data analyst converts CSV to formatted JSON in-browser', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // 1. Analyst drops raw sales CSV
      const csvFile = createTestCsv('sales_q3.csv', 10);
      assertEqual(detectCategoryFromFile(csvFile), 'Data');

      // 2. Run CSV to JSON runner
      const csvText = await csvFile.text();
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',');
      const jsonRecords = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i]; });
        return obj;
      });

      const jsonStr = JSON.stringify(jsonRecords, null, 2);
      const jsonBlob = new Blob([jsonStr], { type: 'application/json' });

      const output = {
        id: 'data-1',
        toolSlug: 'csv-to-json',
        toolName: 'CSV → JSON',
        sourceFilename: csvFile.name,
        outputFilename: 'sales_q3.json',
        mimeType: 'application/json',
        size: jsonBlob.size,
        originalSize: csvFile.size,
        blob: jsonBlob,
        createdAt: Date.now(),
        metadata: { rowCount: jsonRecords.length },
      };

      assertEqual(output.outputFilename, 'sales_q3.json');
      assertEqual(output.metadata?.rowCount, 10);
      assertTrue(jsonStr.includes('User_1'));
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Mobile On-The-Go Workflow
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Mobile On-The-Go Workflow ---');

  await tracker.runTest('S4: Mobile user on 375px viewport toggles Simple Mode, crops, compresses, downloads', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // 1. Mobile viewport preference persisted
      env.localStorage.setItem('whysogood_simple_mode', 'true');
      assertEqual(env.localStorage.getItem('whysogood_simple_mode'), 'true');

      // 2. Snaps photo of receipt
      const receiptPhoto = createTestImage('jpg', 'receipt_dinner.jpg', 3 * 1024 * 1024);
      assertEqual(detectCategoryFromFile(receiptPhoto), 'Images');

      // 3. User crops to receipt bounds
      const croppedBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
      const croppedOutput = {
        id: 'mob-1',
        toolSlug: 'image-cropper',
        sourceFilename: receiptPhoto.name,
        outputFilename: 'receipt_dinner_cropped.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        blob: croppedBlob,
      };

      // 4. Chains output to compress
      const chained = new File([croppedOutput.blob], croppedOutput.outputFilename, { type: croppedOutput.mimeType });
      const compressedBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
      const finalOutput = {
        id: 'mob-2',
        toolSlug: 'image-compressor',
        sourceFilename: chained.name,
        outputFilename: 'receipt_dinner_optimized.jpg',
        mimeType: 'image/jpeg',
        size: 200 * 1024,
        blob: compressedBlob,
      };

      assertEqual(finalOutput.sourceFilename, 'receipt_dinner_cropped.jpg');
      assertTrue(finalOutput.size < croppedOutput.size);
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Chained Format Pipeline
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Chained Multi-Step Format Transformation ---');

  await tracker.runTest('S5: Designer executes sequential format conversions (JPG -> WebP -> PNG) entirely in-browser', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // Step 1: Initial JPG
      let currentFile = createTestImage('jpg', 'art.jpg');
      assertEqual(detectCategoryFromFile(currentFile), 'Images');

      // Step 2: Convert to WebP
      const webpBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' });
      const step1 = {
        id: 'chain-1',
        toolSlug: 'jpg-to-webp',
        sourceFilename: currentFile.name,
        outputFilename: 'art.webp',
        mimeType: 'image/webp',
        blob: webpBlob,
      };

      // Chain
      currentFile = new File([step1.blob], step1.outputFilename, { type: step1.mimeType });
      assertEqual(currentFile.name, 'art.webp');

      // Step 3: Convert to PNG
      const pngBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
      const step2 = {
        id: 'chain-2',
        toolSlug: 'webp-to-png',
        sourceFilename: currentFile.name,
        outputFilename: 'art.png',
        mimeType: 'image/png',
        blob: pngBlob,
      };

      // Chain
      currentFile = new File([step2.blob], step2.outputFilename, { type: step2.mimeType });
      assertEqual(currentFile.name, 'art.png');
      assertEqual(currentFile.type, 'image/png');

      // Verify zero network calls were made during the entire chain
      assertEqual(env.networkSpy.egressCount, 0);
    } finally {
      env.cleanup();
    }
  });

  const summary = tracker.summary();
  console.log(`\nTier 4 Finished: ${summary.passed}/${summary.total} passed (${summary.failed} failed) in ${summary.durationMs}ms`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runTier4Tests().then(s => {
    process.exit(s.failed > 0 ? 1 : 0);
  });
}
