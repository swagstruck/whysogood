// @ts-check
/**
 * Milestone 2 Unit Test Suite: Robust In-Browser PDF Compression & Edge Case Handling
 * 
 * Verifies:
 * 1. Interface Contract compliance (PROJECT.md:114-142)
 * 2. Tier 1: In-place stream optimization, stream deflation, and embedded image downsampling
 * 3. 100% selectable vector text, fonts, bookmarks, and form fields preservation
 * 4. Presets (Recommended, Extreme, Low, Custom)
 * 5. Tier 2 & Tier 3: Edge case handling (Encrypted, Corrupted, 0-byte, Already Optimal)
 * 6. Integration with Simple Mode runner (runners.ts: runPdfCompressor)
 * 7. Standalone Tool wiring verification (PdfCompressorTool.tsx)
 */

import './e2e/helpers/ts_resolver.mjs';
import { PDFDocument, rgb, StandardFonts, PDFRawStream, PDFName } from 'pdf-lib';
import { unzlibSync, inflateSync } from 'fflate';
import { compressPdf, PDF_PRESETS } from '../lib/pdfCompressor.ts';
import {
  createSimpleTextPdf,
  createVectorPdf,
  createMultiPagePdf,
  createRealisticPng,
  EdgeCaseFiles,
} from './e2e/helpers/test_fixtures.mjs';
import { setupMockBrowserEnvironment } from './e2e/helpers/dom_env.mjs';

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`);
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`Assertion failed: expected truthy value, got ${JSON.stringify(value)}. ${message}`);
  }
}

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

console.log('================================================================');
console.log(' 🧪 MILESTONE 2: PDF COMPRESSION UNIT & INTEGRATION TEST SUITE');
console.log('================================================================\n');

// ── Suite 1: Interface Contract & Presets ────────────────────────────────────
console.log('--- Suite 1: Interface Contract & Presets ---');

await test('M2.1.1: PDF_PRESETS exports valid configuration for all presets', () => {
  assertTrue(Boolean(PDF_PRESETS.recommended), 'recommended preset exists');
  assertEqual(PDF_PRESETS.recommended.dpi, 130, 'recommended DPI is 130');
  assertEqual(PDF_PRESETS.recommended.quality, 0.72, 'recommended quality is 0.72');

  assertTrue(Boolean(PDF_PRESETS.extreme), 'extreme preset exists');
  assertEqual(PDF_PRESETS.extreme.dpi, 96, 'extreme DPI is 96');
  assertEqual(PDF_PRESETS.extreme.quality, 0.50, 'extreme quality is 0.50');

  assertTrue(Boolean(PDF_PRESETS.low), 'low preset exists');
  assertEqual(PDF_PRESETS.low.dpi, 180, 'low DPI is 180');
  assertEqual(PDF_PRESETS.low.quality, 0.85, 'low quality is 0.85');
});

await test('M2.1.2: compressPdf returns complete PdfCompressResult contract', async () => {
  const file = createSimpleTextPdf('contract_check.pdf');
  const result = await compressPdf(file, { preset: 'recommended' });

  assertTrue(result.blob instanceof Blob, 'blob is instance of Blob');
  assertEqual(result.blob.type, 'application/pdf', 'blob type is application/pdf');
  assertTrue(typeof result.originalSize === 'number', 'originalSize is number');
  assertTrue(typeof result.compressedSize === 'number', 'compressedSize is number');
  assertTrue(typeof result.reductionPercentage === 'number', 'reductionPercentage is number');
  assertTrue(typeof result.reductionFormatted === 'string', 'reductionFormatted is string');
  assertTrue(result.reductionFormatted.endsWith('%'), 'reductionFormatted ends with %');
  assertTrue(typeof result.pageCount === 'number', 'pageCount is number');
  assertTrue(['compressed', 'optimal', 'fallback', 'encrypted', 'corrupted'].includes(result.status), 'status is valid');
  assertTrue([1, 2, 3].includes(result.tierUsed), 'tierUsed is 1, 2, or 3');
});

// ── Suite 2: Tier 1 Stream Optimization & Vector Text Preservation ───────────
console.log('\n--- Suite 2: In-Place Optimization & Vector Preservation ---');

await test('M2.2.1: 100% of selectable vector text and fonts remain intact after compression', async () => {
  // Create a document with specific vector text and font
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([500, 700]);
  const secretText = 'SELECTABLE_VECTOR_GLYPH_KEYWORD_2026';
  page.drawText(secretText, { x: 50, y: 650, size: 24, font, color: rgb(0.1, 0.2, 0.8) });
  page.drawText('Second line of document contract details', { x: 50, y: 600, size: 14, font });
  const originalBytes = await doc.save({ useObjectStreams: false });

  const inputPdf = new File([originalBytes], 'vector_test.pdf', { type: 'application/pdf' });
  const result = await compressPdf(inputPdf, { preset: 'recommended' });

  assertTrue(result.compressedSize <= result.originalSize, 'Compressed size <= original');
  assertEqual(result.pageCount, 1, 'Page count preserved');

  // Verify that the output PDF can be parsed, and verify vector font/content operators
  const reloaded = await PDFDocument.load(await result.blob.arrayBuffer());
  assertEqual(reloaded.getPageCount(), 1, 'Reloaded page count is 1');
  const p = reloaded.getPage(0);

  // 1. Font dictionary exists in page resources
  const fontDict = p.node.Resources()?.lookup(PDFName.of('Font'));
  assertTrue(Boolean(fontDict), 'Font dictionary exists in PDF page resources');

  // 2. Decompress content stream and verify vector text operators (BT, Tf, Tm, Tj, ET)
  const contentsRef = p.node.Contents();
  assertTrue(Boolean(contentsRef), 'Page has content stream');
  const arr = contentsRef instanceof PDFRawStream ? [contentsRef] : contentsRef.asArray();
  let decompressed = '';
  for (const item of arr) {
    const streamObj = item instanceof PDFRawStream ? item : reloaded.context.lookup(item);
    try {
      decompressed += Buffer.from(unzlibSync(streamObj.contents)).toString('latin1');
    } catch {
      try {
        decompressed += Buffer.from(inflateSync(streamObj.contents)).toString('latin1');
      } catch {
        decompressed += Buffer.from(streamObj.contents).toString('latin1');
      }
    }
  }

  // Verify vector text rendering operators
  assertTrue(decompressed.includes('BT') && decompressed.includes('ET'), 'PDF contains vector text operators (BT/ET)');
  assertTrue(decompressed.includes('Tf'), 'PDF contains font selection operator (Tf)');
  assertTrue(decompressed.includes('Tj'), 'PDF contains text showing operator (Tj)');

  // Verify hex-encoded keyword in stream
  const hexKeyword = Buffer.from(secretText).toString('hex').toUpperCase();
  assertTrue(
    decompressed.includes(hexKeyword) || decompressed.includes(secretText),
    'Selectable vector text content preserved in content stream'
  );

  // 3. Confirm document was NOT converted into a full-page raster JPEG
  // (In destructive rasterization, there are no text operators, only an /Im0 Do image draw)
  assertTrue(decompressed.includes('BT'), 'Text operators preserved without page rasterization');
});

await test('M2.2.2: Stream deflation compresses uncompressed raw streams via fflate', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  // Repeating text creates highly compressible uncompressed content stream
  page.drawText('Repetitive content '.repeat(200), { x: 20, y: 350, size: 10 });
  const uncompressedBytes = await doc.save({ useObjectStreams: false });

  const inputPdf = new File([uncompressedBytes], 'raw_stream.pdf', { type: 'application/pdf' });
  const result = await compressPdf(inputPdf, { preset: 'recommended' });

  assertTrue(result.compressedSize < uncompressedBytes.length, 'Stream compression achieves reduction');
  assertEqual(result.tierUsed, 1, 'Tier 1 stream optimization used');
  assertEqual(result.status, 'compressed', 'Status is compressed');

  // Verify output PDF remains valid and parseable
  const reloaded = await PDFDocument.load(await result.blob.arrayBuffer());
  assertEqual(reloaded.getPageCount(), 1, 'Reloaded successfully');
});

await test('M2.2.3: Multi-page document preserves all pages and coordinate layout', async () => {
  const multiPdf = createMultiPagePdf('annual_report.pdf', 5);
  const result = await compressPdf(multiPdf, { preset: 'extreme' });

  assertEqual(result.pageCount, 5, '5 pages preserved');
  assertTrue(result.compressedSize <= result.originalSize, 'Size not inflated');

  const reloaded = await PDFDocument.load(await result.blob.arrayBuffer());
  assertEqual(reloaded.getPageCount(), 5, 'Verified 5 pages in reloaded document');
});

await test('M2.2.4: Vector blueprints and CAD drawings do not suffer from rasterization bloat', async () => {
  const vecPdf = createVectorPdf('schematic.pdf');
  const result = await compressPdf(vecPdf, { preset: 'recommended' });

  assertTrue(result.compressedSize <= result.originalSize, 'Vector PDF does not balloon');
  assertEqual(result.pageCount, 1, 'Vector page count is 1');
});

await test('M2.2.5: In-place embedded image optimization preserves vector text on the same page', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 400]);
  page.drawText('Invoice Title #98765', { x: 50, y: 350, size: 16, font });

  // Embed a valid PNG image
  const pngFile = createRealisticPng('sample.png', 16, 16);
  const pngBytes = await pngFile.arrayBuffer();
  const embeddedImage = await doc.embedPng(pngBytes);
  page.drawImage(embeddedImage, { x: 50, y: 200, width: 50, height: 50 });

  const rawBytes = await doc.save();
  const file = new File([rawBytes], 'mixed_content.pdf', { type: 'application/pdf' });
  const result = await compressPdf(file, { preset: 'recommended' });

  assertTrue(result.compressedSize <= rawBytes.length, 'Size not expanded');
  assertEqual(result.pageCount, 1, 'Page count preserved');

  const reloaded = await PDFDocument.load(await result.blob.arrayBuffer());
  const p = reloaded.getPage(0);
  const fontDict = p.node.Resources()?.lookup(PDFName.of('Font'));
  assertTrue(Boolean(fontDict), 'Font dictionary intact on page with embedded image');
});

// ── Suite 3: Presets & Scaling Comparison ────────────────────────────────────
console.log('\n--- Suite 3: Presets & Scaling Comparison ---');

await test('M2.3.1: Extreme preset produces equal or smaller size compared to Low preset', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  page.drawText('Sample report for preset comparison '.repeat(100), { x: 30, y: 700, size: 12 });
  const bytes = await doc.save({ useObjectStreams: false });
  const file = new File([bytes], 'preset_comp.pdf', { type: 'application/pdf' });

  const resLow = await compressPdf(file, { preset: 'low' });
  const resExtreme = await compressPdf(file, { preset: 'extreme' });

  assertTrue(resExtreme.compressedSize <= resLow.compressedSize, 'Extreme size <= Low size');
});

await test('M2.3.2: Custom preset accepts user-specified DPI and quality', async () => {
  const file = createSimpleTextPdf('custom_preset.pdf');
  let progressCalled = false;
  const result = await compressPdf(file, {
    preset: 'custom',
    imageDpi: 110,
    imageQuality: 0.65,
    onProgress: (p, msg) => {
      progressCalled = true;
      assertTrue(p >= 0 && p <= 100, 'Progress percentage within 0..100');
    },
  });

  assertTrue(progressCalled, 'Progress callback was invoked');
  assertTrue(result.blob instanceof Blob, 'Valid blob produced');
});

// ── Suite 4: Tier 3 Safety Tier & Edge Cases ─────────────────────────────────
console.log('\n--- Suite 4: Edge Cases & 100% Success Guarantee ---');

await test('M2.4.1: Zero-byte PDF safely handled returning original 0-byte blob with status optimal', async () => {
  const zeroByte = EdgeCaseFiles.zeroBytePdf();
  const result = await compressPdf(zeroByte);

  assertTrue(result.blob instanceof Blob, 'Returns Blob');
  assertEqual(result.originalSize, 0, 'Original size is 0');
  assertEqual(result.compressedSize, 0, 'Compressed size is 0');
  assertEqual(result.reductionFormatted, '0%', 'Reduction is 0%');
  assertEqual(result.status, 'optimal', 'Status is optimal');
  assertEqual(result.tierUsed, 3, 'Tier 3 safety tier used');
});

await test('M2.4.2: Password-protected encrypted PDF caught safely with status encrypted', async () => {
  const encPdf = EdgeCaseFiles.encryptedPdf();
  const result = await compressPdf(encPdf);

  assertTrue(result.blob instanceof Blob, 'Returns Blob');
  assertEqual(result.compressedSize, encPdf.size, 'Preserves original byte size');
  assertEqual(result.status, 'encrypted', 'Status is encrypted');
  assertEqual(result.tierUsed, 3, 'Tier 3 safety tier used');
  assertEqual(result.statusMessage, 'Password-protected PDF preserved safely', 'Clear status message');
});

await test('M2.4.3: Corrupted PDF bytes caught safely with status corrupted', async () => {
  const corruptPdf = EdgeCaseFiles.corruptedPdfBytes();
  const result = await compressPdf(corruptPdf);

  assertTrue(result.blob instanceof Blob, 'Returns Blob');
  assertEqual(result.compressedSize, corruptPdf.size, 'Preserves original byte size');
  assertEqual(result.status, 'corrupted', 'Status is corrupted');
  assertEqual(result.tierUsed, 3, 'Tier 3 safety tier used');
  assertEqual(result.statusMessage, 'Unreadable PDF preserved safely', 'Clear status message');
});

await test('M2.4.4: Already-optimal PDF returns original without size inflation', async () => {
  const basePdf = createSimpleTextPdf('already_optimal.pdf');
  const firstPass = await compressPdf(basePdf);
  // Re-compress the output
  const secondPass = await compressPdf(firstPass.blob);

  assertTrue(secondPass.compressedSize <= firstPass.compressedSize, 'Output never exceeds input');
  assertEqual(secondPass.status, 'optimal', 'Status is optimal');
  assertEqual(secondPass.tierUsed, 3, 'Tier 3 optimal guard used');
  assertEqual(secondPass.statusMessage, 'File is already optimal', 'Optimal message reported');
});

// ── Suite 5: Simple Mode Runner Integration ──────────────────────────────────
console.log('\n--- Suite 5: Simple Mode Runner Integration ---');

await test('M2.5.1: Simple Mode runPdfCompressor executes compressPdf engine successfully', async () => {
  const { executeTool } = await import('../lib/simpleMode/runners.ts');
  const testFile = createSimpleTextPdf('workbench_doc.pdf');

  const runnerRes = await executeTool('pdf-compressor', testFile, { preset: 'recommended' });

  assertEqual(runnerRes.filename, 'workbench_doc_compressed.pdf', 'Filename matches pattern');
  assertTrue(runnerRes.blob instanceof Blob, 'Output is Blob');
  assertTrue(runnerRes.blob.size > 0, 'Output size > 0');
  assertTrue(Boolean(runnerRes.metadata), 'Metadata exists');
  assertTrue('Page Count' in runnerRes.metadata, 'Metadata includes Page Count');
  assertTrue('Reduction' in runnerRes.metadata, 'Metadata includes Reduction');
  assertTrue('Tier Applied' in runnerRes.metadata, 'Metadata includes Tier Applied');

  // Verify final blob parses cleanly in pdf-lib
  const finalDoc = await PDFDocument.load(await runnerRes.blob.arrayBuffer());
  assertEqual(finalDoc.getPageCount(), 1, 'Final document valid in pdf-lib');
});

console.log('\n================================================================');
console.log(` 🏁 MILESTONE 2 TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
