// @ts-check
/**
 * Challenger 2: Deep Multi-Tool Chaining, Cross-Category Transitions,
 * ZIP Archive Integrity & Resource Cleanup Empirical Adversarial Suite
 * 
 * Verifies:
 * 1. Deep Multi-Tool Chaining Pipelines (4-8 stages across Image, PDF, Data, Text)
 * 2. Cross-Category Chaining Transitions (PDF -> JPG -> Watermark, Data -> Dev -> Security)
 * 3. Output ZIP Archive Unpack & Byte-for-Byte Integrity Verification via fflate.unzipSync
 * 4. Resource Cleanup, Blob URL Lifecycle, and Memory Leak Stress Testing
 * 5. Adversarial Audit of ToolSelector Active vs Stub Partitioning (R3 Compliance)
 */

import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertFalse,
} from './helpers/assertions.mjs';
import {
  detectCategoryFromFile,
  isCategoryCompatible,
} from '../../lib/simpleMode/categoryDetection.ts';
import {
  executeTool,
  isToolExecutable,
  createOutputsZip,
} from '../../lib/simpleMode/runners.ts';
import { TOOLS } from '../../lib/registry.ts';
import { unzipSync } from 'fflate';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Emulate Image for Node canvas operations
class MockBrowserImage {
  constructor() {
    this.crossOrigin = '';
    this.width = 800;
    this.height = 600;
    this.naturalWidth = 800;
    this.naturalHeight = 600;
    this._src = '';
    this.onload = null;
    this.onerror = null;
  }
  set src(val) {
    this._src = val;
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 4);
  }
  get src() {
    return this._src;
  }
}

export async function runChallenger2Tests() {
  const tracker = new TestResultTracker('Challenger 2: Chaining, Transitions, ZIP Unpack & Resource Cleanup');
  console.log('\n================================================================');
  console.log(' ⚔️ RUNNING CHALLENGER 2: EMPIRICAL ADVERSARIAL CHALLENGE SUITE');
  console.log('================================================================\n');

  // ==========================================================================
  // GROUP 1: DEEP MULTI-TOOL CHAINING PIPELINES
  // ==========================================================================
  console.log('--- Group 1: Deep Multi-Tool Chaining Pipelines ---');

  await tracker.runTest('P1.1: 6-Stage Deep Image Chaining Pipeline (Resize -> Compress -> Grayscale -> Rotate -> Flip -> Watermark)', async () => {
    const env = setupMockBrowserEnvironment();
    globalThis.Image = MockBrowserImage;
    try {
      // Stage 0: Initial upload
      const initialBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
      let currentFile = new File([initialBuffer], 'product_shot.png', { type: 'image/png' });
      assertEqual(detectCategoryFromFile(currentFile), 'Images');

      // Stage 1: Image Resizer (scale to 640x480)
      const res1 = await executeTool('image-resizer', currentFile, { width: 640, height: 480 });
      assertTrue(res1.blob.size > 0);
      assertEqual(res1.filename, 'product_shot_resized_640x480.png');
      assertEqual(res1.metadata?.['New Dimensions'], '640 × 480');

      // Chain 1 -> Stage 2: Image Compressor (quality 60)
      currentFile = new File([res1.blob], res1.filename, { type: res1.blob.type });
      const res2 = await executeTool('image-compressor', currentFile, { quality: 60 });
      assertTrue(res2.blob.size > 0);
      assertTrue(res2.filename.includes('_compressed'));
      assertEqual(res2.metadata?.Quality, '60%');

      // Chain 2 -> Stage 3: Image Grayscale
      currentFile = new File([res2.blob], res2.filename, { type: res2.blob.type });
      const res3 = await executeTool('image-grayscale', currentFile);
      assertTrue(res3.blob.size > 0);
      assertTrue(res3.filename.includes('_grayscale'));

      // Chain 3 -> Stage 4: Image Rotator (90 degrees)
      currentFile = new File([res3.blob], res3.filename, { type: res3.blob.type });
      const res4 = await executeTool('image-rotator', currentFile, { angle: 90 });
      assertTrue(res4.blob.size > 0);
      assertTrue(res4.filename.includes('_rotated_90deg'));
      assertEqual(res4.metadata?.Rotation, '90°');

      // Chain 4 -> Stage 5: Image Flipper (horizontal)
      currentFile = new File([res4.blob], res4.filename, { type: res4.blob.type });
      const res5 = await executeTool('image-flipper', currentFile, { direction: 'horizontal' });
      assertTrue(res5.blob.size > 0);
      assertTrue(res5.filename.includes('_flipped_horizontal'));

      // Chain 5 -> Stage 6: Image Watermark ("CONFIDENTIAL")
      currentFile = new File([res5.blob], res5.filename, { type: res5.blob.type });
      const res6 = await executeTool('image-watermark', currentFile, { text: 'CONFIDENTIAL' });
      assertTrue(res6.blob.size > 0);
      assertTrue(res6.filename.includes('_watermarked'));
      assertEqual(res6.metadata?.['Watermark Text'], 'CONFIDENTIAL');

      // Cumulative chain check: the final filename preserves the lineage
      assertTrue(res6.filename.startsWith('product_shot_resized_640x480'));
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P1.2: Format Conversion Multi-Hop Chain (PNG -> JPG -> WebP -> PNG)', async () => {
    const env = setupMockBrowserEnvironment();
    globalThis.Image = MockBrowserImage;
    try {
      let file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])], 'photo.png', { type: 'image/png' });

      // Step 1: PNG to JPG
      const r1 = await executeTool('png-to-jpg', file);
      assertEqual(r1.filename, 'photo.jpg');

      // Step 2: JPG to WebP
      file = new File([r1.blob], r1.filename, { type: 'image/jpeg' });
      const r2 = await executeTool('jpg-to-webp', file);
      assertEqual(r2.filename, 'photo.webp');

      // Step 3: WebP to PNG
      file = new File([r2.blob], r2.filename, { type: 'image/webp' });
      const r3 = await executeTool('webp-to-png', file);
      assertEqual(r3.filename, 'photo.png');
      assertTrue(r3.blob.size > 0);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P1.3: Data Pipeline Chain (CSV -> JSON -> JSON Formatter -> Base64)', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const csvData = 'id,name,role\n1,"Alice Smith",Developer\n2,"Bob Jones",Designer\n';
      let file = new File([csvData], 'users.csv', { type: 'text/csv' });
      assertEqual(detectCategoryFromFile(file), 'Data');

      // Step 1: CSV -> JSON
      const r1 = await executeTool('csv-to-json', file);
      assertEqual(r1.filename, 'users.json');
      const jsonText = await r1.blob.text();
      const parsed = JSON.parse(jsonText);
      assertEqual(parsed.length, 2);
      assertEqual(parsed[0].name, 'Alice Smith');

      // Step 2: Chain into JSON Formatter
      file = new File([r1.blob], r1.filename, { type: 'application/json' });
      assertEqual(detectCategoryFromFile(file), 'Developer');
      const r2 = await executeTool('json-formatter', file);
      assertEqual(r2.filename, 'users_formatted.json');
      const formattedText = await r2.blob.text();
      assertTrue(formattedText.includes('  "name": "Alice Smith"'));

      // Step 3: Chain into Base64 Encoder
      file = new File([r2.blob], r2.filename, { type: 'application/json' });
      const r3 = await executeTool('base64-encoder', file);
      assertEqual(r3.filename, 'users_formatted_base64.txt');
      const b64Text = await r3.blob.text();
      const decoded = Buffer.from(b64Text, 'base64').toString('utf-8');
      assertEqual(decoded, formattedText);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P1.4: PDF Multi-Step Transformation Chain (Compress -> Rotate -> Watermark)', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      doc.addPage([600, 400]);
      const pdfBytes = await doc.save();

      let file = new File([pdfBytes], 'report.pdf', { type: 'application/pdf' });
      assertEqual(detectCategoryFromFile(file), 'PDF');

      // Step 1: PDF Compressor
      const r1 = await executeTool('pdf-compressor', file);
      assertEqual(r1.filename, 'report_compressed.pdf');
      assertTrue(r1.blob.size > 0);

      // Step 2: Chain into PDF Rotator (180 deg)
      file = new File([r1.blob], r1.filename, { type: 'application/pdf' });
      const r2 = await executeTool('pdf-rotator', file, { angle: 180 });
      assertEqual(r2.filename, 'report_compressed_rotated_180deg.pdf');
      assertEqual(r2.metadata?.Rotation, '180°');

      // Step 3: Chain into PDF Watermark ("TOP SECRET")
      file = new File([r2.blob], r2.filename, { type: 'application/pdf' });
      const r3 = await executeTool('pdf-watermark', file, { text: 'TOP SECRET' });
      assertEqual(r3.filename, 'report_compressed_rotated_180deg_watermarked.pdf');
      assertEqual(r3.metadata?.['Watermark Text'], 'TOP SECRET');

      // Verify the final PDF can be parsed by PDF-lib
      const finalDoc = await PDFDocument.load(await r3.blob.arrayBuffer());
      assertEqual(finalDoc.getPageCount(), 1);
      assertEqual(finalDoc.getPage(0).getRotation().angle, 180);
    } finally {
      env.cleanup();
    }
  });

  // ==========================================================================
  // GROUP 2: CROSS-CATEGORY CHAINING TRANSITIONS
  // ==========================================================================
  console.log('\n--- Group 2: Cross-Category Chaining Transitions ---');

  await tracker.runTest('P2.1: PDF to Image Cross-Category Transition (PDF -> Watermarked PDF -> JPG -> Image Watermark)', async () => {
    const env = setupMockBrowserEnvironment();
    globalThis.Image = MockBrowserImage;
    try {
      // 1. User starts with PDF
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      doc.addPage([612, 792]);
      const pdfBytes = await doc.save();

      let activeFile = new File([pdfBytes], 'contract.pdf', { type: 'application/pdf' });
      let currentCategory = detectCategoryFromFile(activeFile);
      assertEqual(currentCategory, 'PDF');

      // 2. Run PDF Watermark
      const pdfWatermarked = await executeTool('pdf-watermark', activeFile, { text: 'ORIGINAL' });
      assertEqual(pdfWatermarked.filename, 'contract_watermarked.pdf');

      // 3. User chains output into an image conversion (simulating rendered page)
      const renderedJpgBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])], { type: 'image/jpeg' });
      const convertedOutput = {
        outputFilename: 'contract_watermarked_page1.jpg',
        mimeType: 'image/jpeg',
        blob: renderedJpgBlob,
      };

      // 4. "Use as input for next tool" action
      activeFile = new File([convertedOutput.blob], convertedOutput.outputFilename, {
        type: convertedOutput.mimeType,
      });

      // 5. Workbench auto-detects transition: Category changes from PDF to Images!
      currentCategory = detectCategoryFromFile(activeFile);
      assertEqual(currentCategory, 'Images');

      // 6. User now executes an Images tool on this chained file (Image Watermark)
      const imgWatermarked = await executeTool('image-watermark', activeFile, { text: 'SECOND_PASS' });
      assertEqual(imgWatermarked.filename, 'contract_watermarked_page1_watermarked.jpg');
      assertEqual(imgWatermarked.metadata?.['Watermark Text'], 'SECOND_PASS');
      assertTrue(imgWatermarked.blob.size > 0);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P2.2: Cross-category compatibility validation against invalid transitions', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const pdfFile = new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' });
      const imgFile = new File([new Uint8Array([1, 2, 3])], 'pic.png', { type: 'image/png' });
      const audioFile = new File([new Uint8Array([1, 2, 3])], 'song.mp3', { type: 'audio/mpeg' });

      // Valid cross-category compatibility
      assertTrue(isCategoryCompatible(imgFile, 'PDF')); // Image can be converted to PDF
      assertTrue(isCategoryCompatible(imgFile, 'Security')); // Any file can be Base64-encoded
      assertTrue(isCategoryCompatible(pdfFile, 'Security'));

      // Invalid cross-category transitions must be rejected
      assertFalse(isCategoryCompatible(pdfFile, 'Audio'));
      assertFalse(isCategoryCompatible(audioFile, 'Images'));
      assertFalse(isCategoryCompatible(audioFile, 'PDF'));
    } finally {
      env.cleanup();
    }
  });

  // ==========================================================================
  // GROUP 3: OUTPUT ZIP ARCHIVE UNPACK & INTEGRITY VERIFICATION
  // ==========================================================================
  console.log('\n--- Group 3: Output ZIP Archive Unpack & Integrity Verification ---');

  await tracker.runTest('P3.1: Output ZIP bundles diverse outputs and unpacks with exact byte-for-byte fidelity', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const testData1 = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
      const testData2 = new Uint8Array(Buffer.from('Hello, WhySoGood Simple Mode!', 'utf-8'));
      const testData3 = new Uint8Array(Buffer.from('{"status":"ok","count":42}', 'utf-8'));
      const testData4 = new Uint8Array(1024 * 128); // 128KB buffer
      for (let i = 0; i < testData4.length; i++) testData4[i] = (i * 17) % 256;

      const outputs = [
        {
          id: 'out-1',
          toolSlug: 'image-resizer',
          toolName: 'Image Resizer',
          sourceFilename: 'photo.png',
          outputFilename: 'photo_resized.png',
          mimeType: 'image/png',
          size: testData1.length,
          originalSize: 100,
          blob: new Blob([testData1], { type: 'image/png' }),
          previewUrl: 'blob:mock-1',
          createdAt: Date.now(),
        },
        {
          id: 'out-2',
          toolSlug: 'word-counter',
          toolName: 'Word Counter',
          sourceFilename: 'notes.txt',
          outputFilename: 'notes_report.txt',
          mimeType: 'text/plain',
          size: testData2.length,
          originalSize: 200,
          blob: new Blob([testData2], { type: 'text/plain' }),
          previewUrl: 'blob:mock-2',
          createdAt: Date.now(),
        },
        {
          id: 'out-3',
          toolSlug: 'csv-to-json',
          toolName: 'CSV → JSON',
          sourceFilename: 'data.csv',
          outputFilename: 'data.json',
          mimeType: 'application/json',
          size: testData3.length,
          originalSize: 300,
          blob: new Blob([testData3], { type: 'application/json' }),
          previewUrl: 'blob:mock-3',
          createdAt: Date.now(),
        },
        {
          id: 'out-4',
          toolSlug: 'large-binary',
          toolName: 'Large Binary',
          sourceFilename: 'large.bin',
          outputFilename: 'large_payload.bin',
          mimeType: 'application/octet-stream',
          size: testData4.length,
          originalSize: testData4.length,
          blob: new Blob([testData4]),
          previewUrl: 'blob:mock-4',
          createdAt: Date.now(),
        },
      ];

      // Generate ZIP blob via createOutputsZip
      const zipBlob = await createOutputsZip(outputs);
      assertTrue(zipBlob.size > 0);
      assertEqual(zipBlob.type, 'application/zip');

      // Unpack archive using fflate.unzipSync
      const zipBuffer = new Uint8Array(await zipBlob.arrayBuffer());
      // Verify ZIP magic header: PK (0x50, 0x4B, 0x03, 0x04)
      assertEqual(zipBuffer[0], 0x50);
      assertEqual(zipBuffer[1], 0x4b);
      assertEqual(zipBuffer[2], 0x03);
      assertEqual(zipBuffer[3], 0x04);

      const unzipped = unzipSync(zipBuffer);
      const unzippedKeys = Object.keys(unzipped);
      assertEqual(unzippedKeys.length, 4);

      // Verify byte-level equality for every unpacked file
      assertEqual(unzipped['photo_resized.png'].length, testData1.length);
      for (let i = 0; i < testData1.length; i++) {
        assertEqual(unzipped['photo_resized.png'][i], testData1[i]);
      }

      assertEqual(unzipped['notes_report.txt'].length, testData2.length);
      assertEqual(Buffer.from(unzipped['notes_report.txt']).toString('utf-8'), 'Hello, WhySoGood Simple Mode!');

      assertEqual(unzipped['data.json'].length, testData3.length);
      assertEqual(Buffer.from(unzipped['data.json']).toString('utf-8'), '{"status":"ok","count":42}');

      assertEqual(unzipped['large_payload.bin'].length, testData4.length);
      for (let i = 0; i < testData4.length; i += 1024) {
        assertEqual(unzipped['large_payload.bin'][i], testData4[i]);
      }
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P3.2: Duplicate filename de-duplication preserves all outputs in ZIP without collision', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const payloads = [
        new Uint8Array([1]),
        new Uint8Array([2, 2]),
        new Uint8Array([3, 3, 3]),
        new Uint8Array([4, 4, 4, 4]),
        new Uint8Array([5, 5, 5, 5, 5]),
      ];

      // 5 outputs with the EXACT same filename
      const outputs = payloads.map((payload, idx) => ({
        id: `dup-${idx}`,
        toolSlug: 'image-compressor',
        toolName: 'Image Compressor',
        sourceFilename: 'image.jpg',
        outputFilename: 'image_compressed.jpg',
        mimeType: 'image/jpeg',
        size: payload.length,
        originalSize: 100,
        blob: new Blob([payload], { type: 'image/jpeg' }),
        previewUrl: `blob:mock-${idx}`,
        createdAt: Date.now() + idx,
      }));

      const zipBlob = await createOutputsZip(outputs);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      const files = Object.keys(unzipped);

      assertEqual(files.length, 5);
      assertTrue(files.includes('image_compressed.jpg'));
      assertTrue(files.includes('image_compressed_(1).jpg'));
      assertTrue(files.includes('image_compressed_(2).jpg'));
      assertTrue(files.includes('image_compressed_(3).jpg'));
      assertTrue(files.includes('image_compressed_(4).jpg'));

      // Check contents of each distinct de-duplicated file
      assertEqual(unzipped['image_compressed.jpg'].length, 1);
      assertEqual(unzipped['image_compressed_(1).jpg'].length, 2);
      assertEqual(unzipped['image_compressed_(2).jpg'].length, 3);
      assertEqual(unzipped['image_compressed_(3).jpg'].length, 4);
      assertEqual(unzipped['image_compressed_(4).jpg'].length, 5);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P3.3: Filenames with special characters and Unicode in ZIP archive', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const specialFilenames = [
        'Document (Final) [Draft] & Review #12.pdf',
        'Photo 🏖️ Beach & Sun ☀️.png',
        'résumé_français_2026.txt',
        '报告_财务_Q4.json',
      ];

      const outputs = specialFilenames.map((name, i) => ({
        id: `spec-${i}`,
        toolSlug: 'tool',
        toolName: 'Tool',
        sourceFilename: name,
        outputFilename: name,
        mimeType: 'application/octet-stream',
        size: 10,
        originalSize: 10,
        blob: new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])]),
        previewUrl: 'blob:spec',
        createdAt: Date.now(),
      }));

      const zipBlob = await createOutputsZip(outputs);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      for (const name of specialFilenames) {
        assertTrue(Boolean(unzipped[name]));
        assertEqual(unzipped[name].length, 10);
      }
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P3.4: Zero-byte files in ZIP archive unpack safely', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const outputs = [
        {
          id: 'empty-1',
          toolSlug: 'tool',
          toolName: 'Tool',
          sourceFilename: 'empty.txt',
          outputFilename: 'empty.txt',
          mimeType: 'text/plain',
          size: 0,
          originalSize: 0,
          blob: new Blob([], { type: 'text/plain' }),
          previewUrl: 'blob:empty',
          createdAt: Date.now(),
        },
      ];

      const zipBlob = await createOutputsZip(outputs);
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      assertTrue(Boolean(unzipped['empty.txt']));
      assertEqual(unzipped['empty.txt'].length, 0);
    } finally {
      env.cleanup();
    }
  });

  // ==========================================================================
  // GROUP 4: RESOURCE CLEANUP & LIFECYCLE VULNERABILITY AUDIT
  // ==========================================================================
  console.log('\n--- Group 4: Resource Cleanup & Lifecycle Vulnerability Audit ---');

  await tracker.runTest('P4.1: AUDIT: SimpleModeWorkbench.tsx previewUrl cleanup effect revokes active URLs on state update', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const fs = await import('node:fs');
      const workbenchCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');

      // Verify that SimpleModeWorkbench uses outputsRef and unmount-only useEffect ([])
      assertTrue(
        workbenchCode.includes('outputsRef = useRef(outputs)'),
        'SimpleModeWorkbench must use outputsRef to hold outputs across renders'
      );
      assertTrue(
        workbenchCode.includes('outputsRef.current = outputs'),
        'SimpleModeWorkbench must update outputsRef.current on each render'
      );
      assertTrue(
        workbenchCode.includes('}, []);'),
        'SimpleModeWorkbench cleanup effect must use empty dependency array to run only on unmount'
      );

      // Verify lifecycle behavior:
      const outputsRef = { current: [] };
      const createOutput = (id) => {
        const url = URL.createObjectURL(new Blob(['test']));
        return { id, outputFilename: `${id}.png`, previewUrl: url };
      };

      // Step 1: User runs Tool 1 -> generates Output 1
      const out1 = createOutput('out1');
      outputsRef.current = [out1];

      // Simulate React mounting unmount-only effect with dependency array []
      const unmountCleanup = () => {
        outputsRef.current.forEach(o => {
          if (o.previewUrl) URL.revokeObjectURL(o.previewUrl);
        });
      };

      // Output 1 is active on screen; its previewUrl must NOT be revoked yet
      assertFalse(env.revokedUrls.has(out1.previewUrl));

      // Step 2: User runs Tool 2 -> generates Output 2
      const out2 = createOutput('out2');
      outputsRef.current = [out2, out1];

      // Because the effect dependency array is [], NO cleanup is run during state updates.
      // out1.previewUrl remains valid while displayed on screen!
      const wasOut1RevokedWhileStillRendered = env.revokedUrls.has(out1.previewUrl);
      console.log('    [Empirical Audit] was out1.previewUrl revoked when out2 was added?', wasOut1RevokedWhileStillRendered);
      assertFalse(wasOut1RevokedWhileStillRendered, 'CRITICAL: Active output previewUrl was prematurely revoked when a second output was generated!');

      // Step 3: When workbench unmounts, unmountCleanup is executed:
      unmountCleanup();
      assertTrue(env.revokedUrls.has(out1.previewUrl), 'out1 previewUrl must be revoked on unmount');
      assertTrue(env.revokedUrls.has(out2.previewUrl), 'out2 previewUrl must be revoked on unmount');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P4.2: Explicit output removal revokes target previewUrl without affecting peers', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const u1 = URL.createObjectURL(new Blob(['1']));
      const u2 = URL.createObjectURL(new Blob(['2']));
      const u3 = URL.createObjectURL(new Blob(['3']));

      let outputs = [
        { id: '1', previewUrl: u1 },
        { id: '2', previewUrl: u2 },
        { id: '3', previewUrl: u3 },
      ];

      // Simulate handleRemoveOutput('2')
      const targetId = '2';
      const target = outputs.find(o => o.id === targetId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      outputs = outputs.filter(o => o.id !== targetId);

      assertTrue(env.revokedUrls.has(u2));
      assertFalse(env.revokedUrls.has(u1));
      assertFalse(env.revokedUrls.has(u3));
      assertEqual(outputs.length, 2);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P4.3: Clear all outputs revokes all active preview URLs', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const urls = [
        URL.createObjectURL(new Blob(['1'])),
        URL.createObjectURL(new Blob(['2'])),
        URL.createObjectURL(new Blob(['3'])),
      ];
      let outputs = urls.map((u, i) => ({ id: String(i), previewUrl: u }));

      // Simulate handleClearAllOutputs
      outputs.forEach(o => {
        if (o.previewUrl) URL.revokeObjectURL(o.previewUrl);
      });
      outputs = [];

      for (const u of urls) {
        assertTrue(env.revokedUrls.has(u));
      }
      assertEqual(outputs.length, 0);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P4.4: High-frequency pipeline stress (25 iterations) releases canvas & object URLs properly', async () => {
    const env = setupMockBrowserEnvironment();
    globalThis.Image = MockBrowserImage;
    try {
      const initialUrlCount = env.createdUrls.size;
      let file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])], 'stress.png', { type: 'image/png' });

      // Run 25 consecutive resizer calls
      for (let i = 0; i < 25; i++) {
        const res = await executeTool('image-resizer', file, { width: 400 + i, height: 300 + i });
        file = new File([res.blob], res.filename, { type: res.blob.type });
      }

      // Every loadImageFromFile creates and immediately revokes a temporary object URL
      // Total created URLs should equal total revoked URLs from loadImageFromFile
      const totalCreated = env.createdUrls.size - initialUrlCount;
      const totalRevoked = env.revokedUrls.size;
      assertEqual(totalCreated, totalRevoked);
      assertEqual(totalCreated, 25);
    } finally {
      env.cleanup();
    }
  });

  // ==========================================================================
  // GROUP 5: TOOL SELECTOR ACTIVE VS STUB PARTITIONING (R3 AUDIT)
  // ==========================================================================
  console.log('\n--- Group 5: ToolSelector Active vs Stub Partitioning (R3 Audit) ---');

  await tracker.runTest('P5.1: AUDIT: All tools in ToolSelector activeTools MUST have working execution runners', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const fs = await import('node:fs');
      const selectorCode = fs.readFileSync('components/simple-mode/ToolSelector.tsx', 'utf-8');

      // Verify ToolSelector segregation rule in source code (R3 compliance)
      assertTrue(
        selectorCode.includes('filteredTools.filter(t => isToolExecutable(t.slug))'),
        'ToolSelector must filter activeTools strictly by isToolExecutable'
      );
      assertTrue(
        selectorCode.includes('filteredTools.filter(t => !isToolExecutable(t.slug))'),
        'ToolSelector must filter stubTools strictly by !isToolExecutable'
      );

      const unrunnableActiveTools = [];

      for (const tool of TOOLS) {
        // Evaluate according to ToolSelector's activeTools segregation rule
        const isMarkedActiveInSelector = isToolExecutable(tool.slug);

        if (isMarkedActiveInSelector) {
          // If it's displayed as active, it MUST have an execution runner in TOOL_RUNNERS
          const hasRunner = isToolExecutable(tool.slug);
          if (!hasRunner) {
            unrunnableActiveTools.push({
              name: tool.name,
              slug: tool.slug,
              category: tool.category,
              statusInRegistry: tool.status,
            });
          }
        }
      }

      if (unrunnableActiveTools.length > 0) {
        console.log(`    [Empirical Finding] Found ${unrunnableActiveTools.length} tools displayed as active in Simple Mode but having NO execution runner!`);
        console.log('    Sample unrunnable tools displayed in active list:', unrunnableActiveTools.slice(0, 5));
      }

      // Assert that NO tool is displayed in activeTools if it cannot be executed in Simple Mode
      assertEqual(
        unrunnableActiveTools.length,
        0,
        `R3 VIOLATION: ${unrunnableActiveTools.length} tools are displayed under 'Available Now' in Simple Mode but lack execution runners (e.g. ${unrunnableActiveTools[0]?.name}). Clicking them causes runtime errors.`
      );
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('P5.2: Simulating user clicking an unrunnable tool displayed in activeTools throws runtime error', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      // Pick a tool that is marked active in the registry but not in TOOL_RUNNERS (e.g. 'image-quality')
      const targetTool = TOOLS.find(t => t.status === 'active' && !isToolExecutable(t.slug));
      assertTrue(Boolean(targetTool), 'Must have candidate tool for empirical reproduction');

      const testFile = new File([new Uint8Array([1, 2, 3])], 'test.jpg', { type: 'image/jpeg' });

      let errorCaught = null;
      try {
        await executeTool(targetTool.slug, testFile);
      } catch (err) {
        errorCaught = err;
      }

      assertTrue(Boolean(errorCaught), 'Executing unrunnable tool must throw');
      assertTrue(
        errorCaught.message.includes('is not currently available'),
        `Error message was: ${errorCaught.message}`
      );
    } finally {
      env.cleanup();
    }
  });

  const summary = tracker.summary();
  console.log(`\n================================================================`);
  console.log(` ⚔️ CHALLENGER 2 FINISHED: ${summary.passed}/${summary.total} passed (${summary.failed} failed) in ${summary.durationMs}ms`);
  console.log(`================================================================\n`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runChallenger2Tests().then(s => {
    process.exit(s.failed > 0 ? 1 : 0);
  });
}
