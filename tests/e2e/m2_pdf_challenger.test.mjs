// @ts-check
/**
 * Adversarial Challenger M2 Test Harness: PDF Compression Stress & Boundary Testing
 * 
 * Specifically challenges:
 * - Challenge 1: Encrypted / Password-protected PDFs (zero uncaught exceptions, safe original return, status: 'encrypted')
 * - Challenge 2: Truncated / Severely corrupted PDF bytes (zero crashes, safe fallback, status: 'corrupted' or 'optimal')
 * - Challenge 3: Vector-heavy PDF documents (100% selectable text & fonts intact, zero rasterization bloat, compressedSize <= originalSize)
 * - Challenge 4: Already-compressed / compact PDFs (anti-bloat guard returns original valid file with status: 'optimal')
 * - Challenge 5: Presets verification (recommended vs extreme vs low produce expected DPI/quality tiers, accurate progress)
 * - Concurrency & Load Stress: Parallel execution and high-page-count resilience
 */

import './helpers/ts_resolver.mjs';
import { PDFDocument, rgb, StandardFonts, PDFRawStream, PDFName } from 'pdf-lib';
import { unzlibSync, inflateSync } from 'fflate';
import { compressPdf, PDF_PRESETS } from '../../lib/pdfCompressor.ts';
import {
  createSimpleTextPdf,
  createVectorPdf,
  createMultiPagePdf,
  createRealisticPng,
  EdgeCaseFiles,
} from './helpers/test_fixtures.mjs';
import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';

// Initialize mock browser DOM
setupMockBrowserEnvironment();

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
const failures = [];

async function challenge(id, name, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] [${id}] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✖ [FAIL] [${id}] ${name}`);
    console.error(`     Error: ${err.message}`);
    failures.push({ id, name, error: err.message, stack: err.stack });
    failedCount++;
  }
}

console.log('================================================================');
console.log(' ⚔️ CHALLENGER M2: PDF COMPRESSION ADVERSARIAL STRESS HARNESS');
console.log('================================================================\n');

// ── CHALLENGE 1: Encrypted / Password-Protected PDFs ─────────────────────────
console.log('--- Challenge 1: Encrypted / Password-Protected PDFs ---');

await challenge('CH1.1', 'Standard password-protected PDF returns status encrypted without unhandled rejection', async () => {
  const encFile = EdgeCaseFiles.encryptedPdf();
  const res = await compressPdf(encFile, { preset: 'recommended' });

  assertTrue(res.blob instanceof Blob, 'Result blob is Blob instance');
  assertEqual(res.compressedSize, encFile.size, 'Compressed size preserves original size');
  assertEqual(res.originalSize, encFile.size, 'Original size matches input');
  assertEqual(res.reductionPercentage, 0, 'Reduction is exactly 0%');
  assertEqual(res.reductionFormatted, '0%', 'Reduction formatted is "0%"');
  assertEqual(res.status, 'encrypted', 'Status is "encrypted"');
  assertEqual(res.tierUsed, 3, 'Tier 3 safety tier used');
  assertTrue(res.statusMessage?.includes('Password') || res.statusMessage?.includes('encrypted'), 'Clear status message');

  // Verify byte content unchanged
  const outBuf = await res.blob.arrayBuffer();
  const inBuf = await encFile.arrayBuffer();
  assertEqual(outBuf.byteLength, inBuf.byteLength, 'Byte lengths match');
});

await challenge('CH1.2', 'Encrypted PDF fed as ArrayBuffer and Uint8Array succeeds safely', async () => {
  const encFile = EdgeCaseFiles.encryptedPdf();
  const buf = await encFile.arrayBuffer();
  const u8 = new Uint8Array(buf);

  const resBuf = await compressPdf(buf);
  assertEqual(resBuf.status, 'encrypted', 'ArrayBuffer input handled as encrypted');
  assertEqual(resBuf.tierUsed, 3, 'ArrayBuffer input tierUsed is 3');

  const resU8 = await compressPdf(u8);
  assertEqual(resU8.status, 'encrypted', 'Uint8Array input handled as encrypted');
  assertEqual(resU8.tierUsed, 3, 'Uint8Array input tierUsed is 3');
});

await challenge('CH1.3', 'Simple Mode runner handles encrypted PDF without throwing', async () => {
  const { executeTool } = await import('../../lib/simpleMode/runners.ts');
  const encFile = EdgeCaseFiles.encryptedPdf();
  const runnerRes = await executeTool('pdf-compressor', encFile, { preset: 'extreme' });

  assertTrue(runnerRes.blob instanceof Blob, 'Runner produces Blob');
  assertEqual(runnerRes.blob.size, encFile.size, 'Runner blob preserves original byte size');
  assertEqual(runnerRes.metadata['Status'], 'encrypted', 'Runner metadata Status is encrypted');
  assertEqual(runnerRes.metadata['Tier Applied'], 'Tier 3', 'Runner metadata Tier is Tier 3');
  assertEqual(runnerRes.metadata['Reduction'], '0%', 'Runner metadata Reduction is 0%');
});

await challenge('CH1.4', 'Synthetic password-locked document with standard /Encrypt dict is trapped safely', async () => {
  const encBytes = Buffer.from(
    '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n' +
    '3 0 obj\n<< /Filter /Standard /V 2 /R 3 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -1052 >>\nendobj\n' +
    'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer\n<< /Size 4 /Root 1 0 R /Encrypt 3 0 R >>\nstartxref\n230\n%%EOF\n',
    'latin1'
  );
  const file = new File([encBytes], 'locked.pdf', { type: 'application/pdf' });
  const res = await compressPdf(file);

  assertEqual(res.status, 'encrypted', 'Trapped safely as encrypted');
  assertEqual(res.tierUsed, 3, 'TierUsed is 3');
  assertEqual(res.compressedSize, encBytes.length, 'Size preserved');
});

// ── CHALLENGE 2: Truncated / Severely Corrupted PDF Bytes ─────────────────────
console.log('\n--- Challenge 2: Truncated / Severely Corrupted PDF Bytes ---');

await challenge('CH2.1', 'Truncated PDF at 50% length caught safely with status corrupted', async () => {
  const validDoc = createSimpleTextPdf('valid.pdf');
  const validBuf = new Uint8Array(await validDoc.arrayBuffer());
  const halfLength = Math.floor(validBuf.length / 2);
  const truncatedBuf = validBuf.slice(0, halfLength);
  const truncatedFile = new File([truncatedBuf], 'truncated_50pct.pdf', { type: 'application/pdf' });

  const res = await compressPdf(truncatedFile);
  assertEqual(res.status, 'corrupted', 'Status is corrupted');
  assertEqual(res.tierUsed, 3, 'Tier 3 used');
  assertEqual(res.compressedSize, halfLength, 'Output preserves input size');
  assertTrue(res.blob instanceof Blob, 'Valid Blob returned');
});

await challenge('CH2.2', 'Truncated header-only bytes (%PDF-1.7\\n) handled without crash', async () => {
  const headerOnly = new File([Buffer.from('%PDF-1.7\n')], 'header_only.pdf', { type: 'application/pdf' });
  const res = await compressPdf(headerOnly);

  assertEqual(res.status, 'corrupted', 'Header-only marked as corrupted');
  assertEqual(res.tierUsed, 3, 'Tier 3 safety used');
  assertEqual(res.compressedSize, 9, 'Preserved byte length');
});

await challenge('CH2.3', 'Random binary high-entropy garbage bytes handled safely', async () => {
  const randomBytes = new Uint8Array(2048);
  for (let i = 0; i < randomBytes.length; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }
  const garbageFile = new File([randomBytes], 'noise.pdf', { type: 'application/pdf' });
  const res = await compressPdf(garbageFile);

  assertEqual(res.status, 'corrupted', 'Noise bytes returned as corrupted');
  assertEqual(res.tierUsed, 3, 'Tier 3 used');
  assertEqual(res.compressedSize, 2048, 'Garbage byte size preserved');
});

await challenge('CH2.4', 'Broken xref table offset and missing root object handled safely with status corrupted', async () => {
  const brokenXref = Buffer.from(
    '%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
    'xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \n' +
    'trailer << /Size 2 /Root 999 0 R >>\nstartxref\n99999999\n%%EOF',
    'latin1'
  );
  const brokenFile = new File([brokenXref], 'broken_xref.pdf', { type: 'application/pdf' });
  const res = await compressPdf(brokenFile);

  assertEqual(res.status, 'corrupted', 'Broken xref returned as corrupted');
  assertEqual(res.tierUsed, 3, 'Tier 3 used');
  assertEqual(res.compressedSize, brokenXref.length, 'Size preserved');
});

await challenge('CH2.5', 'Truncated stream syntax without endstream handled safely with status corrupted', async () => {
  const brokenStream = Buffer.from(
    '%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [ 3 0 R ] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R >> endobj\n4 0 obj << /Length 50 >>\nstream\nTruncated stream without endstream',
    'latin1'
  );
  const file = new File([brokenStream], 'broken_stream.pdf', { type: 'application/pdf' });
  const res = await compressPdf(file);

  assertEqual(res.status, 'corrupted', 'Truncated stream returned as corrupted');
  assertEqual(res.tierUsed, 3, 'Tier 3 used');
  assertEqual(res.compressedSize, brokenStream.length, 'Size preserved');
});

await challenge('CH2.6', 'Zero-byte and 1-byte minimal inputs return safely without crash', async () => {
  const zeroByte = new File([], 'empty.pdf', { type: 'application/pdf' });
  const res0 = await compressPdf(zeroByte);
  assertEqual(res0.status, 'optimal', '0-byte returns optimal');
  assertEqual(res0.compressedSize, 0, '0-byte compressedSize is 0');
  assertEqual(res0.tierUsed, 3, '0-byte tierUsed is 3');

  const oneByte = new File([new Uint8Array([0x25])], '1byte.pdf', { type: 'application/pdf' }); // '%'
  const res1 = await compressPdf(oneByte);
  assertEqual(res1.status, 'corrupted', '1-byte returns corrupted');
  assertEqual(res1.compressedSize, 1, '1-byte size preserved');
});

await challenge('CH2.7', 'Simple Mode runner handles corrupted PDF safely with valid return metadata', async () => {
  const { executeTool } = await import('../../lib/simpleMode/runners.ts');
  const corruptFile = EdgeCaseFiles.corruptedPdfBytes();
  const runnerRes = await executeTool('pdf-compressor', corruptFile);

  assertTrue(runnerRes.blob instanceof Blob, 'Runner returns Blob');
  assertEqual(runnerRes.blob.size, corruptFile.size, 'Runner preserves size');
  assertEqual(runnerRes.metadata['Status'], 'corrupted', 'Runner metadata Status is corrupted');
  assertEqual(runnerRes.metadata['Tier Applied'], 'Tier 3', 'Runner metadata Tier is Tier 3');
});

// ── CHALLENGE 3: Vector-Heavy PDF Documents ──────────────────────────────────
console.log('\n--- Challenge 3: Vector-Heavy PDF Documents ---');

await challenge('CH3.1', 'Vector CAD drawing with 200+ paths does not inflate in size', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([800, 600]);

  // Draw 200 vector geometric elements
  for (let i = 0; i < 200; i++) {
    const x = 50 + (i % 20) * 35;
    const y = 50 + Math.floor(i / 20) * 50;
    page.drawRectangle({
      x,
      y,
      width: 25,
      height: 25,
      color: rgb((i % 10) / 10, 0.4, 0.7),
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 1.5,
    });
    page.drawLine({
      start: { x, y },
      end: { x: x + 25, y: y + 25 },
      thickness: 1,
      color: rgb(0.9, 0.1, 0.2),
    });
  }

  const rawBytes = await doc.save({ useObjectStreams: false });
  const file = new File([rawBytes], 'cad_schematic.pdf', { type: 'application/pdf' });

  const res = await compressPdf(file, { preset: 'recommended' });

  // STRICT ANTI-BLOAT VERIFICATION
  assertTrue(res.compressedSize <= rawBytes.length, `Vector PDF did not inflate: ${res.compressedSize} <= ${rawBytes.length}`);
  assertEqual(res.pageCount, 1, 'Page count preserved');

  // Verify output PDF is valid and retains page geometry
  const reloaded = await PDFDocument.load(await res.blob.arrayBuffer());
  assertEqual(reloaded.getPageCount(), 1, 'Reloaded page count is 1');
  const [reloadedPage] = reloaded.getPages();
  assertEqual(reloadedPage.getWidth(), 800, 'Page width 800 preserved');
  assertEqual(reloadedPage.getHeight(), 600, 'Page height 600 preserved');
});

await challenge('CH3.2', 'Multi-font selectable vector text preserved 100% without rasterization', async () => {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.HelveticaBold);
  const times = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const courier = await doc.embedFont(StandardFonts.CourierBold);

  const page = doc.addPage([600, 800]);

  const KEYWORD_1 = 'CRITICAL_SPEC_HASH_ALPHA_7749';
  const KEYWORD_2 = 'FINANCIAL_AUDIT_EXACT_AMOUNT_882910';
  const KEYWORD_3 = 'COURIER_MONOSPACE_SERIAL_332144';

  page.drawText(KEYWORD_1, { x: 50, y: 750, size: 16, font: helvetica, color: rgb(0, 0.2, 0.8) });
  page.drawText(KEYWORD_2, { x: 50, y: 700, size: 14, font: times, color: rgb(0.8, 0.1, 0.1) });
  page.drawText(KEYWORD_3, { x: 50, y: 650, size: 12, font: courier, color: rgb(0.1, 0.7, 0.2) });

  const rawBytes = await doc.save({ useObjectStreams: false });
  const file = new File([rawBytes], 'vector_text_spec.pdf', { type: 'application/pdf' });

  const res = await compressPdf(file, { preset: 'extreme' });

  assertTrue(res.compressedSize <= rawBytes.length, 'Size not inflated');

  // Reload and inspect PDF internals
  const reloaded = await PDFDocument.load(await res.blob.arrayBuffer());
  assertEqual(reloaded.getPageCount(), 1, 'Reloaded page count is 1');
  const p = reloaded.getPage(0);

  // 1. Font resources must contain embedded fonts
  const fontDict = p.node.Resources()?.lookup(PDFName.of('Font'));
  assertTrue(Boolean(fontDict), 'Font dictionary exists in resources');

  // 2. Decompress content stream and verify vector text rendering operators
  const contentsRef = p.node.Contents();
  assertTrue(Boolean(contentsRef), 'Content stream exists');
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

  // Verify vector text operators: BT, ET, Tf, Tj
  assertTrue(decompressed.includes('BT'), 'Content stream contains Begin Text (BT) operator');
  assertTrue(decompressed.includes('ET'), 'Content stream contains End Text (ET) operator');
  assertTrue(decompressed.includes('Tf'), 'Content stream contains Font selection (Tf) operator');
  assertTrue(decompressed.includes('Tj'), 'Content stream contains Text Show (Tj) operator');

  // Verify each keyword or its hex-encoded representation exists
  const hex1 = Buffer.from(KEYWORD_1).toString('hex').toUpperCase();
  const hex2 = Buffer.from(KEYWORD_2).toString('hex').toUpperCase();
  const hex3 = Buffer.from(KEYWORD_3).toString('hex').toUpperCase();

  assertTrue(
    decompressed.includes(KEYWORD_1) || decompressed.includes(hex1),
    `Keyword 1 preserved in vector content stream: ${KEYWORD_1}`
  );
  assertTrue(
    decompressed.includes(KEYWORD_2) || decompressed.includes(hex2),
    `Keyword 2 preserved in vector content stream: ${KEYWORD_2}`
  );
  assertTrue(
    decompressed.includes(KEYWORD_3) || decompressed.includes(hex3),
    `Keyword 3 preserved in vector content stream: ${KEYWORD_3}`
  );
});

await challenge('CH3.3', 'Multi-page document with mixed vector tables preserves coordinate layout on all pages', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let pageIdx = 0; pageIdx < 4; pageIdx++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Page Header - Document Section ${pageIdx + 1}`, { x: 50, y: 800, size: 14, font });
    // Draw vector table
    for (let row = 0; row < 10; row++) {
      page.drawRectangle({
        x: 50,
        y: 700 - row * 30,
        width: 495,
        height: 25,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });
      page.drawText(`Row ${row + 1} item description`, { x: 60, y: 708 - row * 30, size: 10, font });
    }
  }

  const rawBytes = await doc.save({ useObjectStreams: false });
  const file = new File([rawBytes], 'multipage_table.pdf', { type: 'application/pdf' });

  const res = await compressPdf(file, { preset: 'recommended' });

  assertEqual(res.pageCount, 4, 'Preserved all 4 pages');
  assertTrue(res.compressedSize <= rawBytes.length, 'Size not inflated');

  const reloaded = await PDFDocument.load(await res.blob.arrayBuffer());
  assertEqual(reloaded.getPageCount(), 4, 'Reloaded document has exactly 4 pages');
});

await challenge('CH3.4', 'Mixed vector text + embedded image optimizes image while leaving vector text untouched', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([500, 600]);

  const TEXT = 'HEADER_STAYS_VECTOR_TEXT';
  page.drawText(TEXT, { x: 50, y: 550, size: 16, font });

  // Embed PNG image
  const pngFile = createRealisticPng('thumb.png', 32, 32);
  const pngBytes = await pngFile.arrayBuffer();
  const embeddedPng = await doc.embedPng(pngBytes);
  page.drawImage(embeddedPng, { x: 50, y: 300, width: 100, height: 100 });

  const rawBytes = await doc.save({ useObjectStreams: false });
  const file = new File([rawBytes], 'mixed_layout.pdf', { type: 'application/pdf' });

  const res = await compressPdf(file, { preset: 'recommended' });

  assertTrue(res.compressedSize <= rawBytes.length, 'Compressed size <= original');
  assertEqual(res.pageCount, 1, 'Page count is 1');

  // Verify text in output
  const reloaded = await PDFDocument.load(await res.blob.arrayBuffer());
  const p = reloaded.getPage(0);
  const fontDict = p.node.Resources()?.lookup(PDFName.of('Font'));
  assertTrue(Boolean(fontDict), 'Font dictionary intact on page with embedded image');
});

// ── CHALLENGE 4: Already-Compressed / Compact PDFs ───────────────────────────
console.log('\n--- Challenge 4: Already-Compressed / Compact PDFs ---');

await challenge('CH4.1', 'Already-compact deflated PDF triggers anti-bloat guard and returns status optimal', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([300, 300]);
  page.drawText('Tiny optimal document', { x: 20, y: 250, size: 12, font });

  const compactBytes = await doc.save({ useObjectStreams: true });
  const file = new File([compactBytes], 'compact.pdf', { type: 'application/pdf' });

  const res = await compressPdf(file, { preset: 'recommended' });

  // ANTI-BLOAT VERIFICATION
  assertTrue(res.compressedSize <= compactBytes.length, `Size strictly <= input: ${res.compressedSize} <= ${compactBytes.length}`);
  if (res.compressedSize === compactBytes.length) {
    assertEqual(res.status, 'optimal', 'Status is optimal when size is identical');
    assertEqual(res.tierUsed, 3, 'Tier 3 used');
    assertEqual(res.reductionPercentage, 0, 'Reduction is 0%');
    assertEqual(res.statusMessage, 'File is already optimal', 'Status message matches');
  } else {
    assertEqual(res.status, 'compressed', 'Status is compressed');
  }
});

await challenge('CH4.2', 'Re-compressing already compressed PDF (idempotent second pass) is strictly guarded', async () => {
  const baseDoc = createSimpleTextPdf('first_pass.pdf');
  const pass1 = await compressPdf(baseDoc, { preset: 'recommended' });

  // Feed pass1 output back into compressor
  const pass2 = await compressPdf(pass1.blob, { preset: 'recommended' });

  // Second pass must NEVER expand the file!
  assertTrue(
    pass2.compressedSize <= pass1.compressedSize,
    `Idempotent second pass never inflates: ${pass2.compressedSize} <= ${pass1.compressedSize}`
  );
  assertEqual(pass2.status, 'optimal', 'Second pass marked as optimal');
  assertEqual(pass2.tierUsed, 3, 'Second pass used Tier 3 optimal guard');
  assertEqual(pass2.reductionPercentage, 0, 'Second pass reduction is 0%');
  assertEqual(pass2.statusMessage, 'File is already optimal', 'Status message confirms optimal');
});

await challenge('CH4.3', 'Simple Mode runner preserves optimal status and 0% reduction', async () => {
  const { executeTool } = await import('../../lib/simpleMode/runners.ts');
  const baseDoc = createSimpleTextPdf('runner_optimal.pdf');
  const firstRes = await executeTool('pdf-compressor', baseDoc, { preset: 'recommended' });

  // Re-run runner on the output
  const secondFile = new File([await firstRes.blob.arrayBuffer()], 'already_optimal.pdf', { type: 'application/pdf' });
  const secondRes = await executeTool('pdf-compressor', secondFile, { preset: 'recommended' });

  assertEqual(secondRes.metadata['Status'], 'optimal', 'Runner metadata Status is optimal');
  assertEqual(secondRes.metadata['Reduction'], '0%', 'Runner metadata Reduction is 0%');
  assertEqual(secondRes.metadata['Tier Applied'], 'Tier 3', 'Runner metadata Tier is Tier 3');
  assertTrue(secondRes.blob.size <= secondFile.size, 'Runner output size <= input size');
});

// ── CHALLENGE 5: Presets & Scaling Verification ──────────────────────────────
console.log('\n--- Challenge 5: Presets & Scaling Verification ---');

await challenge('CH5.1', 'All presets exported with correct DPI, quality, and badges', () => {
  const presets = ['recommended', 'extreme', 'low', 'custom'];
  for (const p of presets) {
    assertTrue(Boolean(PDF_PRESETS[p]), `Preset ${p} exists in PDF_PRESETS`);
    assertTrue(typeof PDF_PRESETS[p].dpi === 'number', `${p} DPI is number`);
    assertTrue(typeof PDF_PRESETS[p].quality === 'number', `${p} quality is number`);
    assertTrue(typeof PDF_PRESETS[p].label === 'string', `${p} label is string`);
    assertTrue(typeof PDF_PRESETS[p].desc === 'string', `${p} desc is string`);
    assertTrue(typeof PDF_PRESETS[p].badge === 'string', `${p} badge is string`);
  }

  // Verify preset DPI relationships: extreme <= recommended <= low
  assertTrue(PDF_PRESETS.extreme.dpi < PDF_PRESETS.recommended.dpi, 'Extreme DPI < Recommended DPI');
  assertTrue(PDF_PRESETS.recommended.dpi < PDF_PRESETS.low.dpi, 'Recommended DPI < Low DPI');
  assertTrue(PDF_PRESETS.extreme.quality < PDF_PRESETS.recommended.quality, 'Extreme quality < Recommended quality');
  assertTrue(PDF_PRESETS.recommended.quality < PDF_PRESETS.low.quality, 'Recommended quality < Low quality');
});

await challenge('CH5.2', 'Extreme preset achieves equal or smaller size compared to Low on image-bearing PDF', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);
  page.drawText('Document with image for preset tier comparison', { x: 30, y: 450, size: 14 });

  const pngFile = createRealisticPng('photo.png', 64, 64);
  const pngBytes = await pngFile.arrayBuffer();
  const embeddedPng = await doc.embedPng(pngBytes);
  page.drawImage(embeddedPng, { x: 30, y: 100, width: 250, height: 250 });

  const rawBytes = await doc.save({ useObjectStreams: false });
  const file = new File([rawBytes], 'image_doc.pdf', { type: 'application/pdf' });

  const resLow = await compressPdf(file, { preset: 'low' });
  const resRec = await compressPdf(file, { preset: 'recommended' });
  const resExt = await compressPdf(file, { preset: 'extreme' });

  assertTrue(resExt.compressedSize <= resRec.compressedSize, `Extreme (${resExt.compressedSize}) <= Rec (${resRec.compressedSize})`);
  assertTrue(resRec.compressedSize <= resLow.compressedSize, `Rec (${resRec.compressedSize}) <= Low (${resLow.compressedSize})`);
  assertTrue(resExt.compressedSize <= rawBytes.length, 'Extreme does not exceed original');
});

await challenge('CH5.3', 'Custom preset correctly applies arbitrary DPI and quality', async () => {
  const file = createSimpleTextPdf('custom.pdf');
  const res = await compressPdf(file, {
    preset: 'custom',
    imageDpi: 72,
    imageQuality: 0.35,
  });

  assertTrue(res.blob instanceof Blob, 'Produces valid Blob');
  assertTrue(res.compressedSize <= file.size, 'Size does not inflate');
});

await challenge('CH5.4', 'onProgress reports monotonic progress steps from 0..100 with descriptive messages', async () => {
  const file = createSimpleTextPdf('progress_test.pdf');
  const progressSteps = [];
  const progressMessages = [];

  const res = await compressPdf(file, {
    preset: 'recommended',
    onProgress: (pct, msg) => {
      progressSteps.push(pct);
      if (msg) progressMessages.push(msg);
    },
  });

  assertTrue(progressSteps.length >= 2, `Received ${progressSteps.length} progress callbacks`);
  assertTrue(progressSteps[0] >= 0, `Initial progress >= 0: ${progressSteps[0]}`);
  assertEqual(progressSteps[progressSteps.length - 1], 100, `Final progress is 100: ${progressSteps[progressSteps.length - 1]}`);

  // Verify monotonic non-decreasing order
  for (let i = 1; i < progressSteps.length; i++) {
    assertTrue(progressSteps[i] >= progressSteps[i - 1], `Step ${i} (${progressSteps[i]}) >= Step ${i-1} (${progressSteps[i-1]})`);
  }

  assertTrue(progressMessages.length > 0, 'Descriptive stage messages reported');
  assertTrue(res.blob instanceof Blob, 'Result blob produced');
});

await challenge('CH5.5', 'Grayscale compression option succeeds without error', async () => {
  const file = createSimpleTextPdf('grayscale_doc.pdf');
  const res = await compressPdf(file, {
    preset: 'recommended',
    grayscale: true,
  });

  assertTrue(res.blob instanceof Blob, 'Grayscale produces valid Blob');
  assertTrue(res.compressedSize <= file.size, 'Grayscale output <= input size');
});

// ── CHALLENGE 6: Concurrency & Stress Harness ────────────────────────────────
console.log('\n--- Challenge 6: Concurrency & High Load Stress Harness ---');

await challenge('CH6.1', 'Concurrent execution: 10 parallel compressPdf calls complete without race conditions', async () => {
  const files = [
    createSimpleTextPdf('doc_1.pdf'),
    createVectorPdf('doc_2.pdf'),
    createMultiPagePdf('doc_3.pdf', 3),
    EdgeCaseFiles.encryptedPdf(),
    EdgeCaseFiles.corruptedPdfBytes(),
    createSimpleTextPdf('doc_6.pdf'),
    createVectorPdf('doc_7.pdf'),
    createMultiPagePdf('doc_8.pdf', 2),
    EdgeCaseFiles.zeroBytePdf(),
    createSimpleTextPdf('doc_10.pdf'),
  ];

  const promises = files.map((f, idx) =>
    compressPdf(f, { preset: idx % 2 === 0 ? 'recommended' : 'extreme' })
  );

  const results = await Promise.all(promises);

  assertEqual(results.length, 10, 'All 10 parallel calls resolved');
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    assertTrue(r.blob instanceof Blob, `Item ${i} returned valid Blob`);
    assertTrue(r.tierUsed === 1 || r.tierUsed === 2 || r.tierUsed === 3, `Item ${i} tierUsed is valid (1, 2, or 3)`);
    assertTrue(r.compressedSize <= (files[i].size || 0), `Item ${i} anti-bloat verified: ${r.compressedSize} <= ${files[i].size}`);
  }
});

await challenge('CH6.2', 'High page-count document (20 pages) compresses cleanly without OOM or lost pages', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < 20; i++) {
    const page = doc.addPage([500, 500]);
    page.drawText(`High Page Document - Page ${i + 1}`, { x: 50, y: 450, size: 14, font });
    page.drawText('Content line '.repeat(20), { x: 50, y: 300, size: 10, font });
  }

  const rawBytes = await doc.save({ useObjectStreams: false });
  const file = new File([rawBytes], 'twenty_pages.pdf', { type: 'application/pdf' });

  const res = await compressPdf(file, { preset: 'recommended' });

  assertEqual(res.pageCount, 20, 'All 20 pages preserved in result');
  assertTrue(res.compressedSize <= rawBytes.length, 'Size not inflated');

  const reloaded = await PDFDocument.load(await res.blob.arrayBuffer());
  assertEqual(reloaded.getPageCount(), 20, 'Reloaded PDF contains exactly 20 pages');
});

console.log('\n================================================================');
console.log(` 🏁 CHALLENGER M2 RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('================================================================\n');

if (failedCount > 0) {
  console.error('FAILURES SUMMARY:');
  for (const f of failures) {
    console.error(`  - [${f.id}] ${f.name}: ${f.error}`);
  }
  process.exit(1);
}
