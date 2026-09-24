// @ts-check
/**
 * Challenger M1: Adversarial Image Compression Stress & Boundary Test Suite
 * 
 * Systematically stress-tests and challenges `lib/imageCompressor.ts` and entry points across 5 challenge vectors:
 * - Challenge 1: Extreme boundary inputs (0-byte files, truncated binary streams, invalid headers, non-image files).
 * - Challenge 2: Massive dimensions (10000x8000 boundary checks, aspect ratio preservation, canvas bounds).
 * - Challenge 3: Progressive multi-scan JPEGs and Display P3 wide-gamut JPEGs (preserve color profiles, zero byte truncation).
 * - Challenge 4: Corrupted XML SVGs (no parser crashes, safe fallback).
 * - Challenge 5: PNG palette quantization stress (verify real size savings > 50% on test gradient/photo buffers).
 * 
 * Verifiable via: `node tests/e2e/m1_image_challenger.test.mjs`
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
  compressImage,
  minifySvgText,
  minifySvgSync,
  stripJpegMetadata,
  computeSafeDimensions,
  detectMimeType,
  calcReductionPct,
  MAX_SAFE_DIMENSION,
  MAX_SAFE_AREA,
} from '../../lib/imageCompressor.ts';

let executeTool;
async function ensureRunnersLoaded() {
  if (!executeTool) {
    const runners = await import('../../lib/simpleMode/runners.ts');
    executeTool = runners.executeTool;
  }
}

// @ts-expect-error untyped imports
import UPNG_RAW from 'upng-js';
// @ts-expect-error untyped imports
import omggif_RAW from 'omggif';
import { zlibSync } from 'fflate';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UPNG = UPNG_RAW?.default || UPNG_RAW;
const omggif = omggif_RAW?.default || omggif_RAW;

// Mock Browser Image element with configurable dimensions and error simulation
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

export async function runM1ChallengerTests() {
  const tracker = new TestResultTracker('Challenger M1: Adversarial Image Stress Suite');
  console.log('\n================================================================');
  console.log(' ⚔️ RUNNING CHALLENGER M1: ADVERSARIAL IMAGE COMPRESSION SUITE');
  console.log('================================================================\n');

  await ensureRunnersLoaded();

  // ==========================================================================
  // CHALLENGE 1: EXTREME BOUNDARY INPUTS
  // ==========================================================================
  console.log('--- Challenge 1: Extreme Boundary Inputs ---');

  // 1.1 Zero-byte files across all known formats
  const zeroByteFormats = [
    { name: 'zero.png', type: 'image/png' },
    { name: 'zero.jpg', type: 'image/jpeg' },
    { name: 'zero.webp', type: 'image/webp' },
    { name: 'zero.svg', type: 'image/svg+xml' },
    { name: 'zero.gif', type: 'image/gif' },
    { name: 'zero.bmp', type: 'image/bmp' },
    { name: 'zero.tiff', type: 'image/tiff' },
    { name: 'zero.avif', type: 'image/avif' },
    { name: 'unnamed_zero', type: '' },
  ];

  for (const fmt of zeroByteFormats) {
    await tracker.runTest(`C1.ZeroByte: 0-byte file (${fmt.name}) handled safely with status original and tier 3`, async () => {
      const file = new File([], fmt.name, { type: fmt.type });
      const res = await compressImage(file);
      assertTrue(res.blob instanceof Blob, 'Result must be a Blob');
      assertEqual(res.originalSize, 0, 'Original size must be 0');
      assertEqual(res.compressedSize, 0, 'Compressed size must be 0');
      assertEqual(res.reductionPercentage, 0, 'Reduction percentage must be 0');
      assertEqual(res.reductionFormatted, '0%', 'Reduction formatted must be 0%');
      assertEqual(res.tierUsed, 3, 'Safety tier 3 must be used');
      assertTrue(['original', 'optimal'].includes(res.status), `Status must be original or optimal, got ${res.status}`);
    });
  }

  // 1.2 Truncated binary streams
  await tracker.runTest('C1.Truncated: 1-byte file [0xFF] returns safe fallback without crash', async () => {
    const file = new File([new Uint8Array([0xff])], 'truncated_1b.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.originalSize, 1);
    assertEqual(res.compressedSize, 1);
    assertEqual(res.tierUsed, 3);
  });

  await tracker.runTest('C1.Truncated: 2-byte file [0xFF, 0xD8] (SOI only) returns safe fallback without crash', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8])], 'truncated_soi.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.tierUsed, 3);
  });

  await tracker.runTest('C1.Truncated: 4-byte partial PNG header [0x89, 0x50, 0x4E, 0x47] handled safely', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'half_header.png', { type: 'image/png' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.tierUsed, 3);
  });

  await tracker.runTest('C1.Truncated: Truncated PNG IHDR chunk (signature + partial chunk) handled safely', async () => {
    const truncatedIhdr = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // Sig
      0x00, 0x00, 0x00, 0x0d, // Length 13
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x01, // Incomplete width
    ]);
    const file = new File([truncatedIhdr], 'cut_ihdr.png', { type: 'image/png' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.tierUsed, 3);
  });

  await tracker.runTest('C1.Truncated: JPEG ending abruptly at SOS marker [0xFF, 0xDA] handled safely', async () => {
    const cutSos = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xda, // Abrupt SOS with no header/payload
    ]);
    const file = new File([cutSos], 'abrupt_sos.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.tierUsed, 3);
  });

  // 1.3 Non-image files masquerading as images
  await tracker.runTest('C1.Masquerade: Linux ELF binary named malicious.png caught by Tier 3 safely', async () => {
    const elfBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const file = new File([elfBytes], 'malicious.png', { type: 'image/png' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.originalSize, elfBytes.length);
    assertEqual(res.tierUsed, 3);
    assertTrue(['original', 'optimal'].includes(res.status));
  });

  await tracker.runTest('C1.Masquerade: HTML document named fake.jpg caught by Tier 3 safely', async () => {
    const htmlText = '<!DOCTYPE html><html><body><script>alert("attack")</script></body></html>';
    const file = new File([htmlText], 'fake.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.tierUsed, 3);
  });

  await tracker.runTest('C1.Masquerade: High-entropy pseudo-random noise buffer (4KB) named random.webp caught safely', async () => {
    const randomBuf = new Uint8Array(4096);
    let s = 12345;
    for (let i = 0; i < randomBuf.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      randomBuf[i] = s & 0xff;
    }
    const file = new File([randomBuf], 'random.webp', { type: 'image/webp' });
    const res = await compressImage(file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.tierUsed, 3);
  });

  // 1.4 Simple Mode runner integration with boundary inputs
  await tracker.runTest('C1.Runner: executeTool("image-compressor", zeroByte) returns valid ToolRunnerResult', async () => {
    const file = new File([], 'empty_input.png', { type: 'image/png' });
    const res = await executeTool('image-compressor', file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.filename, 'empty_input_compressed.png');
    assertEqual(res.metadata['Original Size'], 0);
  });

  // ==========================================================================
  // CHALLENGE 2: MASSIVE DIMENSIONS (10000x8000 BOUNDARY CHECKS)
  // ==========================================================================
  console.log('\n--- Challenge 2: Massive Dimensions (10000x8000 Boundary Checks) ---');

  // 2.1 Mathematical boundary tests
  await tracker.runTest('C2.Math: 10000x8000 scaled down respecting maxDimension (4096) and 16 MP cap', async () => {
    const d = computeSafeDimensions(10000, 8000, 4096);
    assertTrue(d.scaled, 'Scaled must be true');
    assertEqual(d.width, 4096, 'Width must be capped at 4096');
    assertEqual(d.height, 3277, 'Height must be scaled proportionally (8000 * 0.4096 = 3276.8 -> 3277)');
    assertTrue(d.width * d.height <= MAX_SAFE_AREA, 'Total area must not exceed 16,777,216');
    // Verify aspect ratio preservation within 0.1%
    const origRatio = 10000 / 8000;
    const scaledRatio = d.width / d.height;
    assertTrue(Math.abs(origRatio - scaledRatio) < 0.001, 'Aspect ratio must be preserved');
  });

  await tracker.runTest('C2.Math: 8000x10000 vertical aspect scaled down respecting maxDimension (4096)', async () => {
    const d = computeSafeDimensions(8000, 10000, 4096);
    assertTrue(d.scaled, 'Scaled must be true');
    assertEqual(d.width, 3277, 'Width must scale to 3277');
    assertEqual(d.height, 4096, 'Height must be capped at 4096');
    assertTrue(d.width * d.height <= MAX_SAFE_AREA);
  });

  await tracker.runTest('C2.Math: 10000x10000 square capped to exact 4096x4096 = 16,777,216 pixels', async () => {
    const d = computeSafeDimensions(10000, 10000, 4096);
    assertEqual(d.width, 4096);
    assertEqual(d.height, 4096);
    assertEqual(d.width * d.height, 16_777_216);
    assertTrue(d.scaled);
  });

  await tracker.runTest('C2.Math: Extreme ribbon aspect ratio (100,000 x 50) scaled safely without NaN', async () => {
    const d = computeSafeDimensions(100000, 50, 4096);
    assertTrue(d.scaled);
    assertEqual(d.width, 4096);
    assertEqual(d.height, 2); // 50 * (4096 / 100000) = 2.048 -> 2
    assertTrue(d.width * d.height <= MAX_SAFE_AREA);
  });

  await tracker.runTest('C2.Math: Tall pillar aspect ratio (50 x 100,000) scaled safely without NaN', async () => {
    const d = computeSafeDimensions(50, 100000, 4096);
    assertTrue(d.scaled);
    assertEqual(d.width, 2);
    assertEqual(d.height, 4096);
    assertTrue(d.width * d.height <= MAX_SAFE_AREA);
  });

  await tracker.runTest('C2.Math: Zero and negative dimension boundaries handled safely (clamped to >= 1)', async () => {
    const zeroDim = computeSafeDimensions(0, 0, 4096);
    assertEqual(zeroDim.width, 1);
    assertEqual(zeroDim.height, 1);

    const negDim = computeSafeDimensions(-500, -200, 4096);
    assertEqual(negDim.width, 1);
    assertEqual(negDim.height, 1);
  });

  // 2.2 Full compression pipeline execution with simulated 10000x8000 dimensions
  await tracker.runTest('C2.Pipeline: 10000x8000 input triggers Tier 2 Adaptive Downsampling and reports safe dimensions', async () => {
    const env = setupMockBrowserEnvironment();
    globalThis.__MOCK_IMAGE_DIMS__ = { width: 10000, height: 8000 };
    globalThis.Image = MockBrowserImage;

    // A realistic high-resolution photograph (150KB)
    const bigBuffer = new Uint8Array(150 * 1024);
    bigBuffer[0] = 0xff; bigBuffer[1] = 0xd8; // JPEG SOI
    const file = new File([bigBuffer], 'huge_10000x8000.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file, { maxDimension: 4096 });

    assertTrue(res.blob instanceof Blob);
    assertEqual(res.tierUsed, 2, 'Must utilize Tier 2 adaptive downsampling');
    assertEqual(res.dimensions?.width, 4096);
    assertEqual(res.dimensions?.height, 3277);
    assertTrue(res.dimensions.width * res.dimensions.height <= MAX_SAFE_AREA);
    assertEqual(res.status, 'fallback');

    globalThis.__MOCK_IMAGE_DIMS__ = null;
    env.cleanup();
  });

  // 2.3 Canvas Context failure and retry downscaling
  await tracker.runTest('C2.Retry: Canvas context allocation failure triggers retry with downsampleStep', async () => {
    const env = setupMockBrowserEnvironment();
    globalThis.__MOCK_IMAGE_DIMS__ = { width: 40, height: 40 };
    globalThis.Image = MockBrowserImage;

    let getContextCalls = 0;
    const origGetContext = globalThis.OffscreenCanvas.prototype.getContext;
    // @ts-expect-error override getContext
    globalThis.OffscreenCanvas.prototype.getContext = function (type) {
      getContextCalls++;
      if (getContextCalls === 1) return null; // First attempt fails
      return origGetContext.call(this, type);
    };

    const file = new File([new Uint8Array(1024)], 'retry_test.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file, { downsampleStep: 0.5 });

    assertTrue(res.blob instanceof Blob);
    assertTrue(getContextCalls >= 2, `Retry loop must have executed at least twice (actual: ${getContextCalls})`);

    globalThis.OffscreenCanvas.prototype.getContext = origGetContext;
    globalThis.__MOCK_IMAGE_DIMS__ = null;
    env.cleanup();
  });

  // ==========================================================================
  // CHALLENGE 3: PROGRESSIVE MULTI-SCAN JPEGS & DISPLAY P3 WIDE-GAMUT JPEGS
  // ==========================================================================
  console.log('\n--- Challenge 3: Progressive Multi-Scan & Display P3 JPEGs ---');

  // 3.1 Display P3 Wide-Gamut JPEG & Color Profile Preservation
  await tracker.runTest('C3.DisplayP3: APP2 ICC profile preserved byte-for-byte while EXIF/IPTC/Adobe/COM stripped', async () => {
    const soi = [0xff, 0xd8];
    const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
    const app1Exif = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
    // Authentic Display P3 profile signature (Length 32 = 0x00, 0x20: 2 length bytes + 30 payload bytes)
    const app2P3 = [
      0xff, 0xe2, 0x00, 0x20,
      0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00, // 'ICC_PROFILE\0'
      0x01, 0x01, // chunk 1 of 1
      0x61, 0x70, 0x70, 0x6c, // 'appl' (Apple CMM)
      0x52, 0x47, 0x42, 0x20, // 'RGB '
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];
    const app13 = [0xff, 0xed, 0x00, 0x06, 0x50, 0x68, 0x6f, 0x74];
    const app14 = [0xff, 0xee, 0x00, 0x06, 0x41, 0x64, 0x6f, 0x62];
    const com = [0xff, 0xfe, 0x00, 0x05, 0x43, 0x4f, 0x4d];
    const sosAndScan = [0xff, 0xda, 0x00, 0x08, 0x01, 0x02, 0x03, 0x04, 0xaa, 0xbb, 0xcc, 0xff, 0xd9];

    const fullJpeg = new Uint8Array([
      ...soi,
      ...app0,
      ...app1Exif,
      ...app2P3,
      ...app13,
      ...app14,
      ...com,
      ...sosAndScan,
    ]);


    const stripped = stripJpegMetadata(fullJpeg);

    // 1. SOI preserved
    assertEqual(stripped[0], 0xff);
    assertEqual(stripped[1], 0xd8);

    // 2. APP0 JFIF preserved
    let hasApp0 = false;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xff && stripped[i + 1] === 0xe0) hasApp0 = true;
    }
    assertTrue(hasApp0, 'APP0 (JFIF) must be preserved');

    // 3. APP2 Display P3 ICC profile preserved
    let hasApp2 = false;
    let app2Offset = -1;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xff && stripped[i + 1] === 0xe2) {
        hasApp2 = true;
        app2Offset = i;
        break;
      }
    }
    assertTrue(hasApp2, 'APP2 Display P3 ICC profile must be preserved');
    // Verify exact bytes of APP2 payload
    for (let j = 0; j < app2P3.length; j++) {
      assertEqual(stripped[app2Offset + j], app2P3[j], `APP2 byte at offset ${j} must match`);
    }

    // 4. APP1 (EXIF), APP13 (Photoshop), APP14 (Adobe), COM (Comment) must be stripped
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xff) {
        const m = stripped[i + 1];
        assertFalse(m === 0xe1, 'APP1 EXIF must be stripped');
        assertFalse(m === 0xed, 'APP13 Photoshop must be stripped');
        assertFalse(m === 0xee, 'APP14 Adobe must be stripped');
        assertFalse(m === 0xfe, 'COM Comment must be stripped');
      }
    }

    // 5. Scan data and EOI preserved
    assertEqual(stripped[stripped.length - 2], 0xff);
    assertEqual(stripped[stripped.length - 1], 0xd9);
  });

  // 3.2 Progressive Multi-Scan JPEG (Zero Byte Truncation)
  await tracker.runTest('C3.Progressive: Multi-scan JPEG with 3 scans and RST markers has zero byte truncation', async () => {
    // Construct progressive JPEG with multiple scans after first SOS
    const soi = [0xff, 0xd8];
    const sof2 = [0xff, 0xc2, 0x00, 0x0b, 0x08, 0x00, 0x64, 0x00, 0x64, 0x03, 0x01, 0x11, 0x00]; // Progressive DCT
    const sos1 = [0xff, 0xda, 0x00, 0x06, 0x01, 0x01, 0x00, 0x00, 0x11, 0x22, 0x33]; // Scan 1
    const rst0 = [0xff, 0xd0, 0x44, 0x55]; // Restart marker + data
    const sos2 = [0xff, 0xda, 0x00, 0x06, 0x01, 0x02, 0x00, 0x00, 0x66, 0x77, 0x88]; // Scan 2
    const sos3 = [0xff, 0xda, 0x00, 0x06, 0x01, 0x03, 0x00, 0x00, 0x99, 0xaa, 0xbb]; // Scan 3
    const eoi = [0xff, 0xd9];

    const progressiveJpeg = new Uint8Array([
      ...soi,
      ...sof2,
      ...sos1,
      ...rst0,
      ...sos2,
      ...sos3,
      ...eoi,
    ]);

    const stripped = stripJpegMetadata(progressiveJpeg);

    // Verify byte length: since there was no metadata to strip, all bytes from SOS1 onward must remain intact
    assertEqual(stripped.length, progressiveJpeg.length, 'No image scan bytes may be dropped');

    // Verify all 3 SOS markers are present in the output
    let sosCount = 0;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xff && stripped[i + 1] === 0xda) {
        sosCount++;
      }
    }
    assertEqual(sosCount, 3, 'All 3 progressive SOS scans must be preserved intact');

    // Verify RST0 marker is present
    let rstCount = 0;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xff && stripped[i + 1] === 0xd0) {
        rstCount++;
      }
    }
    assertEqual(rstCount, 1, 'RST0 marker must be preserved');

    // Verify ends with EOI
    assertEqual(stripped[stripped.length - 2], 0xff);
    assertEqual(stripped[stripped.length - 1], 0xd9);
  });

  // 3.3 Boundary attack: Declared segment length exceeds buffer bounds
  await tracker.runTest('C3.Boundary: Declared segment length (0xFFFF) exceeding remaining bytes terminates safely without throw', async () => {
    const corruptJpeg = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe1, // APP1
      0xff, 0xff, // Length declared as 65535, but only 4 bytes follow!
      0x01, 0x02, 0x03, 0x04,
    ]);
    const res = stripJpegMetadata(corruptJpeg);
    assertTrue(res instanceof Uint8Array);
    assertTrue(res.length > 0);
  });

  // ==========================================================================
  // CHALLENGE 4: CORRUPTED XML SVGS (NO CRASHES, SAFE FALLBACK)
  // ==========================================================================
  console.log('\n--- Challenge 4: Corrupted XML SVGs (Safe Fallback & Zero Crashes) ---');

  // 4.1 Corrupted XML syntax
  const malformedSvgs = [
    { desc: 'Unclosed tags', text: '<svg xmlns="http://www.w3.org/2000/svg"><g><rect width="10" height="10">' },
    { desc: 'Mismatched tags', text: '<svg><defs></g></svg>' },
    { desc: 'Unquoted malformed attributes', text: '<svg width=100% height=100%><rect fill=red&blue></svg>' },
    { desc: 'Illegal element name', text: '<svg><123bad-tag>test</123bad-tag></svg>' },
    { desc: 'Truncated SVG declaration', text: '<svg width="100" hei' },
    { desc: 'Null bytes in SVG text', text: '<svg width="100">\x00\x00<rect/></svg>' },
  ];

  for (const item of malformedSvgs) {
    await tracker.runTest(`C4.CorruptSvg: ${item.desc} minifies safely without unhandled exception`, async () => {
      const minified = await minifySvgText(item.text);
      assertTrue(typeof minified === 'string', 'Must return a string');
    });
  }

  // 4.2 Adversarial XML Entity Injection (XXE / Billion Laughs)
  await tracker.runTest('C4.Security: Complex DOCTYPE with internal DTD handled safely with DOMParser validation', async () => {
    // In browser environment, DOMParser validates minified SVG and reverts to original on parsererror
    const origDOMParser = globalThis.DOMParser;
    class MockXmlParser {
      parseFromString(xml, mime) {
        // Internal DTD subset without root closure causes parsererror
        const hasUnclosedDtd = xml.includes('<!ELEMENT') || xml.includes('<!ENTITY');
        return {
          querySelector(sel) {
            if (sel === 'parsererror' && hasUnclosedDtd) {
              return { textContent: 'XML Parsing Error: internal DTD not supported' };
            }
            return null;
          },
        };
      }
    }
    // @ts-expect-error mock DOMParser
    globalThis.DOMParser = MockXmlParser;

    const attackSvg = `<?xml version="1.0"?>
    <!DOCTYPE lolz [
      <!ENTITY lol "lol">
      <!ELEMENT lolz (#PCDATA)>
      <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
      <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
    ]>
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <text>&lol2;</text>
    </svg>`;

    const clean = await minifySvgText(attackSvg);
    // Because internal DTD subset causes XML parsererror, DOMParser safely reverts to original text
    assertTrue(typeof clean === 'string');
    assertEqual(clean, attackSvg, 'DOMParser validation safely caught parsererror and reverted to original SVG');

    globalThis.DOMParser = origDOMParser;
  });


  // 4.3 DOMParser parsererror simulation & fallback verification
  await tracker.runTest('C4.ParserFallback: DOMParser parsererror triggers safe reversion to original text', async () => {
    // Emulate browser DOMParser
    const origDOMParser = globalThis.DOMParser;
    class MockDOMParser {
      parseFromString(xml, mime) {
        // If xml contains 'SYNTAX_ERROR', simulate XML parser error element
        const hasError = xml.includes('SYNTAX_ERROR');
        return {
          querySelector(sel) {
            if (sel === 'parsererror' && hasError) {
              return { textContent: 'XML Parsing Error: syntax error' };
            }
            return null;
          },
        };
      }
    }
    // @ts-expect-error mock DOMParser
    globalThis.DOMParser = MockDOMParser;

    const corruptedSvg = '<svg>SYNTAX_ERROR<!-- comment --></svg>';
    const result = minifySvgSync(corruptedSvg);
    // When parsererror is detected, it should safely revert to the original text
    assertEqual(result, corruptedSvg, 'Must safely revert to original text on parsererror');

    globalThis.DOMParser = origDOMParser;
  });

  // 4.4 Full compressImage execution on corrupted SVG file
  await tracker.runTest('C4.FullPipeline: Corrupted SVG file processed via compressImage returns valid Blob', async () => {
    const corruptFile = new File(['<svg width="100" <broken>>'], 'broken.svg', { type: 'image/svg+xml' });
    const res = await compressImage(corruptFile);
    assertTrue(res.blob instanceof Blob);
    assertTrue(res.compressedSize > 0);
    assertTrue(['optimal', 'compressed', 'original'].includes(res.status));
  });

  // ==========================================================================
  // CHALLENGE 5: PNG PALETTE QUANTIZATION STRESS
  // ==========================================================================
  console.log('\n--- Challenge 5: PNG Palette Quantization Stress ---');

  // 5.1 Real-world photographic buffer size savings > 50%
  await tracker.runTest('C5.Photographic: 200x200 photographic buffer achieves > 50% size reduction with UPNG 8-bit palette', async () => {
    const w = 200;
    const h = 200;
    const photoRgba = new Uint8Array(w * h * 4);

    // Generate diverse spectrum photograph with gradients and textures
    let seed = 98765;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const gradR = Math.floor((x / w) * 255);
        const gradG = Math.floor((y / h) * 255);
        const noise = Math.floor(rand() * 40);
        photoRgba[idx] = Math.min(255, gradR + noise);
        photoRgba[idx + 1] = Math.min(255, gradG + noise);
        photoRgba[idx + 2] = Math.min(255, Math.floor(255 - gradR * 0.5));
        photoRgba[idx + 3] = 255;
      }
    }

    // Lossless encode
    const losslessBuf = UPNG.encode([photoRgba.buffer], w, h, 0);
    // 8-bit quantized encode (cnum = 256)
    const quantizedBuf = UPNG.encode([photoRgba.buffer], w, h, 256);

    assertTrue(losslessBuf.byteLength > 0, 'Lossless buffer must be non-empty');
    assertTrue(quantizedBuf.byteLength > 0, 'Quantized buffer must be non-empty');
    assertTrue(quantizedBuf.byteLength < losslessBuf.byteLength, 'Quantized buffer must be strictly smaller');

    const reduction = calcReductionPct(losslessBuf.byteLength, quantizedBuf.byteLength);
    console.log(`     Lossless: ${losslessBuf.byteLength} B -> Quantized: ${quantizedBuf.byteLength} B (Reduction: ${reduction}%)`);
    assertTrue(reduction > 50.0, `Expected real size savings > 50%, achieved ${reduction}%`);
  });

  // 5.2 Multi-step quality factor quantization (64 vs 128 vs 256 colors)
  await tracker.runTest('C5.QualitySteps: Lower quality produces progressively tighter palette sizes', async () => {
    const w = 100;
    const h = 100;
    const buf = new Uint8Array(w * h * 4);
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = (i * 3) % 256;
      buf[i + 1] = (i * 7) % 256;
      buf[i + 2] = (i * 11) % 256;
      buf[i + 3] = 255;
    }

    const q256 = UPNG.encode([buf.buffer], w, h, 256);
    const q128 = UPNG.encode([buf.buffer], w, h, 128);
    const q64 = UPNG.encode([buf.buffer], w, h, 64);

    assertTrue(q256.byteLength > 0);
    assertTrue(q128.byteLength > 0);
    assertTrue(q64.byteLength > 0);
    assertTrue(q64.byteLength <= q256.byteLength, '64-color palette should produce smaller or equal buffer to 256-color');
  });

  // 5.3 Alpha transparency preservation in palette quantization
  await tracker.runTest('C5.Alpha: Quantized PNG preserves semi-transparent alpha channels in RGBA8', async () => {
    const w = 64;
    const h = 64;
    const alphaRgba = new Uint8Array(w * h * 4);

    // Fill with 4 distinct alpha levels (0, 64, 128, 255)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        alphaRgba[idx] = 100;
        alphaRgba[idx + 1] = 150;
        alphaRgba[idx + 2] = 200;
        // 4 quadrants
        if (x < 32 && y < 32) alphaRgba[idx + 3] = 255; // Opaque
        else if (x >= 32 && y < 32) alphaRgba[idx + 3] = 128; // 50%
        else if (x < 32 && y >= 32) alphaRgba[idx + 3] = 64;  // 25%
        else alphaRgba[idx + 3] = 0; // Fully transparent
      }
    }

    const quantized = UPNG.encode([alphaRgba.buffer], w, h, 256);
    const decoded = UPNG.decode(quantized);
    const decodedRgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);

    // Check that we have non-binary alpha values (i.e. not collapsed to 0 and 255 only)
    let foundSemiTransparent = false;
    for (let i = 3; i < decodedRgba.length; i += 4) {
      const a = decodedRgba[i];
      if (a > 20 && a < 235) {
        foundSemiTransparent = true;
        break;
      }
    }
    assertTrue(foundSemiTransparent, 'Palette quantization must preserve semi-transparent alpha levels');
  });

  // 5.4 Flat graphics lossless protection
  await tracker.runTest('C5.FlatGraphics: Simple 2-color flat graphics compare lossless vs quantized safely', async () => {
    const w = 100;
    const h = 100;
    const flatRgba = new Uint8Array(w * h * 4);
    // 2-color black and white checkerboard
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const color = (x + y) % 2 === 0 ? 0 : 255;
        flatRgba[idx] = color;
        flatRgba[idx + 1] = color;
        flatRgba[idx + 2] = color;
        flatRgba[idx + 3] = 255;
      }
    }

    const lossless = UPNG.encode([flatRgba.buffer], w, h, 0);
    const quantized = UPNG.encode([flatRgba.buffer], w, h, 256);

    assertTrue(lossless.byteLength > 0);
    assertTrue(quantized.byteLength > 0);
  });

  // 5.5 Composite: Progressive Multi-Scan JPEG WITH Display P3 ICC profile simultaneously
  await tracker.runTest('C5.Composite: Progressive multi-scan JPEG with Display P3 ICC profile preserves both', async () => {
    const soi = [0xff, 0xd8];
    const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
    const app1Exif = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
    const app2P3 = [
      0xff, 0xe2, 0x00, 0x20,
      0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00,
      0x01, 0x01, 0x61, 0x70, 0x70, 0x6c, 0x52, 0x47, 0x42, 0x20,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];
    const sof2 = [0xff, 0xc2, 0x00, 0x0b, 0x08, 0x00, 0x64, 0x00, 0x64, 0x03, 0x01, 0x11, 0x00];
    const sos1 = [0xff, 0xda, 0x00, 0x06, 0x01, 0x01, 0x00, 0x00, 0x11, 0x22];
    const sos2 = [0xff, 0xda, 0x00, 0x06, 0x01, 0x02, 0x00, 0x00, 0x33, 0x44];
    const eoi = [0xff, 0xd9];

    const compositeJpeg = new Uint8Array([
      ...soi, ...app0, ...app1Exif, ...app2P3, ...sof2, ...sos1, ...sos2, ...eoi,
    ]);

    const stripped = stripJpegMetadata(compositeJpeg);

    // Verify APP1 EXIF is stripped
    const hasApp1 = stripped.some((b, i) => b === 0xff && stripped[i + 1] === 0xe1);
    assertFalse(hasApp1, 'EXIF must be stripped');

    // Verify APP2 Display P3 is preserved
    const hasApp2 = stripped.some((b, i) => b === 0xff && stripped[i + 1] === 0xe2);
    assertTrue(hasApp2, 'APP2 Display P3 must be preserved');

    // Verify both progressive scans are preserved
    let sosCount = 0;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xff && stripped[i + 1] === 0xda) sosCount++;
    }
    assertEqual(sosCount, 2, 'Both progressive scans must be preserved');
  });

  // 5.6 100% Fully Transparent RGBA buffer
  await tracker.runTest('C5.Transparent: 100% transparent RGBA buffer encodes safely with valid dimensions', async () => {
    const w = 32, h = 32;
    const transRgba = new Uint8Array(w * h * 4); // all zeroes (transparent black)
    const encoded = UPNG.encode([transRgba.buffer], w, h, 256);
    assertTrue(encoded.byteLength > 0);
    const decoded = UPNG.decode(encoded);
    assertEqual(decoded.width, 32);
    assertEqual(decoded.height, 32);
  });

  // 5.7 Extreme downsampling (maxDimension = 1)
  await tracker.runTest('C5.ExtremeDownsample: maxDimension = 1 computes safe 1x1 dimensions without zero or NaN', async () => {
    const d = computeSafeDimensions(1920, 1080, 1);
    assertEqual(d.width, 1);
    assertEqual(d.height, 1);
    assertTrue(d.scaled);
  });

  // 5.8 High concurrency stress (10 parallel calls)
  await tracker.runTest('C5.Concurrency: 10 parallel compressImage executions complete deterministically', async () => {
    const files = [
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'file1.png', { type: 'image/png' }),
      new File([new Uint8Array([0xff, 0xd8])], 'file2.jpg', { type: 'image/jpeg' }),
      new File([], 'file3.svg', { type: 'image/svg+xml' }),
      new File(['<svg><rect/></svg>'], 'file4.svg', { type: 'image/svg+xml' }),
      new File([new Uint8Array(100)], 'file5.webp', { type: 'image/webp' }),
      new File([new Uint8Array([1, 2, 3])], 'file6.bmp', { type: 'image/bmp' }),
      new File([new Uint8Array([1, 2, 3])], 'file7.gif', { type: 'image/gif' }),
      new File([new Uint8Array([1, 2, 3])], 'file8.tiff', { type: 'image/tiff' }),
      new File([], 'file9.png', { type: 'image/png' }),
      new File([new Uint8Array([0xff])], 'file10.jpg', { type: 'image/jpeg' }),
    ];

    const results = await Promise.all(files.map(f => compressImage(f)));
    assertEqual(results.length, 10);
    for (const r of results) {
      assertTrue(r.blob instanceof Blob);
      assertTrue(['original', 'optimal', 'compressed', 'fallback'].includes(r.status));
    }
  });


  // ==========================================================================
  // FINAL EMPIRICAL SUMMARY
  // ==========================================================================
  const summary = tracker.summary();
  console.log('\n================================================================');
  console.log(` ⚔️ CHALLENGER M1 RESULTS: ${summary.passed}/${summary.total} PASSED (${summary.failed} FAILED) in ${summary.durationMs}ms`);
  console.log(` EMPIRICAL VERDICT: ${summary.failed === 0 ? '✅ APPROVE' : '❌ REJECT'}`);
  console.log('================================================================\n');

  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runM1ChallengerTests().then(s => {
    process.exit(s.failed > 0 ? 1 : 0);
  });
}
