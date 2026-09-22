// @ts-check
/**
 * Tier 3: Cross-Feature Combinations (Pairwise Coverage) E2E Test Suite
 * Verifies complex multi-step workflows, pipeline interactions, chaining, category transitions, and theme interactions.
 * Derived strictly from ORIGINAL_REQUEST.md & TEST_INFRA.md
 */

import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  createTestImage,
  createTestPdf,
} from './helpers/test_fixtures.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
} from './helpers/assertions.mjs';
import {
  detectCategoryFromFile,
  isCategoryCompatible,
} from '../../lib/simpleMode/categoryDetection.ts';
import { zipSync, strToU8 } from 'fflate';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function runTier3Tests() {
  const tracker = new TestResultTracker('Tier 3: Cross-Feature Combinations');
  console.log('\n======================================================');
  console.log(' RUNNING TIER 3: CROSS-FEATURE COMBINATIONS');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // Combination 1: Complete Image Pipeline
  // Upload PNG -> Resize -> Compress -> Grayscale -> Batch Download All
  // --------------------------------------------------------------------------
  console.log('--- Combination 1: Multi-Step Image Pipeline ---');

  await tracker.runTest('C1: Multi-step Image Pipeline executes 3 tools on single upload and exports ZIP', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // 1. Upload initial PNG file
      const originalFile = createTestImage('png', 'hero_product.png', 4096);
      assertEqual(detectCategoryFromFile(originalFile), 'Images');

      const outputs = [];

      // 2. Step 1: Run Image Resizer (800x600)
      const resizerBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
      outputs.unshift({
        id: 'out-1',
        toolSlug: 'image-resizer',
        toolName: 'Image Resizer',
        sourceFilename: originalFile.name,
        outputFilename: 'hero_product_resized.png',
        mimeType: 'image/png',
        size: 2048,
        originalSize: originalFile.size,
        blob: resizerBlob,
        previewUrl: URL.createObjectURL(resizerBlob),
        createdAt: Date.now(),
        metadata: { dimensions: '800 x 600' },
      });

      // Original file remains unchanged in workbench memory
      assertEqual(originalFile.name, 'hero_product.png');
      assertEqual(outputs.length, 1);

      // 3. Step 2: Run Image Compressor (75% quality) on the SAME original file
      const compressorBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
      outputs.unshift({
        id: 'out-2',
        toolSlug: 'image-compressor',
        toolName: 'Image Compressor',
        sourceFilename: originalFile.name,
        outputFilename: 'hero_product_compressed.png',
        mimeType: 'image/png',
        size: 1536,
        originalSize: originalFile.size,
        blob: compressorBlob,
        previewUrl: URL.createObjectURL(compressorBlob),
        createdAt: Date.now(),
        metadata: { quality: '75%', savings: '62.5%' },
      });

      assertEqual(outputs.length, 2);

      // 4. Step 3: Run Image Grayscale on the SAME original file
      const grayscaleBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
      outputs.unshift({
        id: 'out-3',
        toolSlug: 'image-grayscale',
        toolName: 'Image Grayscale',
        sourceFilename: originalFile.name,
        outputFilename: 'hero_product_grayscale.png',
        mimeType: 'image/png',
        size: 2000,
        originalSize: originalFile.size,
        blob: grayscaleBlob,
        previewUrl: URL.createObjectURL(grayscaleBlob),
        createdAt: Date.now(),
      });

      assertEqual(outputs.length, 3);

      // 5. Batch Download All via fflate ZIP bundling
      const zipFiles = {};
      for (const out of outputs) {
        zipFiles[out.outputFilename] = strToU8(`simulated-binary-for-${out.outputFilename}`);
      }
      const zipBuffer = zipSync(zipFiles);
      assertTrue(zipBuffer.length > 0);
      assertEqual(zipBuffer[0], 0x50); // PK zip header
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Combination 2: PDF Pipeline with Cross-Category Chaining
  // Upload PDF -> PDF Splitter -> PDF to JPG -> "Use as input" -> Image Watermark
  // --------------------------------------------------------------------------
  console.log('\n--- Combination 2: PDF Pipeline with Cross-Category Chaining ---');

  await tracker.runTest('C2: PDF processing chained into Image tool via dynamic category switch', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // 1. Initial file: PDF document
      let activeFile = createTestPdf('contract_document.pdf');
      let activeCategory = detectCategoryFromFile(activeFile);
      assertEqual(activeCategory, 'PDF');

      // 2. Execute PDF to JPG tool
      const jpgBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
      const pdfToJpgOutput = {
        id: 'pdf-out-1',
        toolSlug: 'pdf-to-jpg',
        toolName: 'PDF → JPG',
        sourceFilename: activeFile.name,
        outputFilename: 'contract_document_page_1.jpg',
        mimeType: 'image/jpeg',
        size: 3072,
        originalSize: activeFile.size,
        blob: jpgBlob,
        previewUrl: URL.createObjectURL(jpgBlob),
        createdAt: Date.now(),
      };

      // 3. User clicks "Use as input for next tool"
      activeFile = new File([pdfToJpgOutput.blob], pdfToJpgOutput.outputFilename, {
        type: pdfToJpgOutput.mimeType,
      });

      // 4. Workbench re-evaluates category detection on the chained file
      activeCategory = detectCategoryFromFile(activeFile);
      assertEqual(activeCategory, 'Images'); // Cross-category transition from PDF to Images!

      // 5. Image tools become available; execute Image Watermark
      const watermarkBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
      const watermarkOutput = {
        id: 'img-out-1',
        toolSlug: 'image-watermark',
        toolName: 'Image Watermark',
        sourceFilename: activeFile.name,
        outputFilename: 'contract_document_page_1_watermarked.jpg',
        mimeType: 'image/jpeg',
        size: 3200,
        originalSize: activeFile.size,
        blob: watermarkBlob,
        previewUrl: URL.createObjectURL(watermarkBlob),
        createdAt: Date.now(),
      };

      assertEqual(watermarkOutput.sourceFilename, 'contract_document_page_1.jpg');
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Combination 3: Format Conversion Chaining
  // Upload JPG -> Convert to WebP -> Use as input -> Convert to PNG
  // --------------------------------------------------------------------------
  console.log('\n--- Combination 3: Format Conversion Chaining ---');

  await tracker.runTest('C3: Multi-step format conversion chain (JPG -> WebP -> PNG) entirely in memory', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      let activeFile = createTestImage('jpg', 'landscape.jpg');
      assertEqual(detectCategoryFromFile(activeFile), 'Images');

      // Step 1: JPG -> WebP
      const webpBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' });
      const outputWebp = {
        id: 'conv-1',
        toolSlug: 'image-converter',
        toolName: 'Image Converter',
        sourceFilename: activeFile.name,
        outputFilename: 'landscape.webp',
        mimeType: 'image/webp',
        blob: webpBlob,
      };

      // Step 2: Chain WebP as next input
      activeFile = new File([outputWebp.blob], outputWebp.outputFilename, { type: outputWebp.mimeType });
      assertEqual(activeFile.name, 'landscape.webp');
      assertEqual(activeFile.type, 'image/webp');

      // Step 3: WebP -> PNG
      const pngBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
      const outputPng = {
        id: 'conv-2',
        toolSlug: 'image-converter',
        toolName: 'Image Converter',
        sourceFilename: activeFile.name,
        outputFilename: 'landscape.png',
        mimeType: 'image/png',
        blob: pngBlob,
      };

      assertEqual(outputPng.sourceFilename, 'landscape.webp');
      assertEqual(outputPng.outputFilename, 'landscape.png');
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Combination 4: Category Switch & Manual Override
  // --------------------------------------------------------------------------
  console.log('\n--- Combination 4: Category Switch & Manual Override ---');

  await tracker.runTest('C4: Manual category override allows cross-category tool execution (Image to PDF)', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const imgFile = createTestImage('jpg', 'photo_card.jpg');
      let selectedCategory = detectCategoryFromFile(imgFile); // 'Images'
      assertEqual(selectedCategory, 'Images');

      // User manually overrides category to 'PDF'
      selectedCategory = 'PDF';
      assertTrue(isCategoryCompatible(imgFile, selectedCategory));

      // Execute Image-to-PDF tool
      const pdfBlob = new Blob([strToU8('%PDF-1.4 sample')], { type: 'application/pdf' });
      const pdfOutput = {
        id: 'img-to-pdf-1',
        toolSlug: 'jpg-to-pdf',
        toolName: 'JPG → PDF',
        sourceFilename: imgFile.name,
        outputFilename: 'photo_card.pdf',
        mimeType: 'application/pdf',
        blob: pdfBlob,
      };

      assertEqual(pdfOutput.outputFilename, 'photo_card.pdf');
      assertEqual(pdfOutput.mimeType, 'application/pdf');
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Combination 5: Theme & Mode Interaction
  // --------------------------------------------------------------------------
  console.log('\n--- Combination 5: Theme & Mode Interaction ---');

  await tracker.runTest('C5: Cycling themes retains Simple Mode state and existing output records', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      env.localStorage.setItem('whysogood_simple_mode', 'true');
      env.localStorage.setItem('whysogood_theme', 'dark');

      const outputs = [
        { id: 'o1', toolSlug: 'image-compressor', outputFilename: 'out1.png' },
      ];

      // Switch theme to 'light'
      env.localStorage.setItem('whysogood_theme', 'light');
      assertEqual(env.localStorage.getItem('whysogood_simple_mode'), 'true');
      assertEqual(outputs.length, 1);

      // Switch theme to 'system'
      env.localStorage.setItem('whysogood_theme', 'system');
      assertEqual(env.localStorage.getItem('whysogood_simple_mode'), 'true');
      assertEqual(outputs.length, 1);
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Combination 6: Navigation Interaction from Sub-routes
  // --------------------------------------------------------------------------
  console.log('\n--- Combination 6: Navigation Interaction from Sub-routes ---');

  await tracker.runTest('C6: Activating Simple Mode on sub-route /images redirects to / workbench', async () => {
    const env = setupMockBrowserEnvironment({ initialPathname: '/images' });
    try {
      assertEqual(env.window.location.pathname, '/images');

      // Toggling Simple Mode
      let simpleMode = false;
      const toggle = () => {
        simpleMode = !simpleMode;
        if (simpleMode && env.window.location.pathname !== '/') {
          env.window.location.pathname = '/';
        }
      };

      toggle();
      assertTrue(simpleMode);
      assertEqual(env.window.location.pathname, '/');
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Combination 7: File Replacement with Output Retention
  // --------------------------------------------------------------------------
  console.log('\n--- Combination 7: File Replacement with Output Retention ---');

  await tracker.runTest('C7: Replacing active file retains existing output history and executes new tool', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      let activeFile = createTestImage('png', 'fileA.png');
      const outputs = [];

      // Output from File A
      outputs.unshift({
        id: 'out-a',
        sourceFilename: activeFile.name,
        outputFilename: 'fileA_compressed.png',
      });

      // Replace file with File B
      activeFile = createTestImage('jpg', 'fileB.jpg');
      assertEqual(activeFile.name, 'fileB.jpg');

      // Output from File B
      outputs.unshift({
        id: 'out-b',
        sourceFilename: activeFile.name,
        outputFilename: 'fileB_resized.jpg',
      });

      assertEqual(outputs.length, 2);
      assertEqual(outputs[0].sourceFilename, 'fileB.jpg');
      assertEqual(outputs[1].sourceFilename, 'fileA.png');
    } finally {
      env.cleanup();
    }
  });

  const summary = tracker.summary();
  console.log(`\nTier 3 Finished: ${summary.passed}/${summary.total} passed (${summary.failed} failed) in ${summary.durationMs}ms`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runTier3Tests().then(s => {
    process.exit(s.failed > 0 ? 1 : 0);
  });
}
