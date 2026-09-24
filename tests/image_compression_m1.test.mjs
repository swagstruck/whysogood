// @ts-check
import assert from 'node:assert';
import './e2e/helpers/ts_resolver.mjs';
import {
  compressImage,
  minifySvgText,
  stripJpegMetadata,
  computeSafeDimensions,
  calcReductionPct,
} from '../lib/imageCompressor.ts';
import UPNG from 'upng-js';
import omggif from 'omggif';

async function runTests() {
  console.log('--- Running Image Compression M1 Verification Tests ---');

  // Test 1: computeSafeDimensions capping
  console.log('Test 1: Adaptive downsampling dimension calculation');
  const d1 = computeSafeDimensions(8000, 6000, 4096);
  assert.strictEqual(d1.scaled, true);
  assert.ok(d1.width <= 4096);
  assert.ok(d1.height <= 4096);
  assert.ok(d1.width * d1.height <= 16_777_216);

  const d2 = computeSafeDimensions(1000, 800, 4096);
  assert.strictEqual(d2.scaled, false);
  assert.strictEqual(d2.width, 1000);
  assert.strictEqual(d2.height, 800);
  console.log('  ✔ Passed computeSafeDimensions tests');

  // Test 2: Safe JPEG metadata stripping (preserving APP0 and APP2)
  console.log('Test 2: Safe JPEG metadata stripping');
  // Construct synthetic JPEG with APP0 (JFIF), APP1 (EXIF to strip), APP2 (ICC to preserve), and SOS
  const app0 = [0xff, 0xe0, 0x00, 0x08, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
  const app1 = [0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66]; // Should be stripped
  const app2 = [0xff, 0xe2, 0x00, 0x07, 0x49, 0x43, 0x43, 0x5f, 0x50]; // Should be preserved
  const sos = [0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0x11, 0x22, 0xff, 0xd9]; // SOS + scan + EOI
  const fullJpeg = new Uint8Array([0xff, 0xd8, ...app0, ...app1, ...app2, ...sos]);

  const stripped = stripJpegMetadata(fullJpeg);
  assert.strictEqual(stripped[0], 0xff);
  assert.strictEqual(stripped[1], 0xd8); // SOI preserved
  // APP0 must be present
  const hasApp0 = stripped.some((b, i) => b === 0xff && stripped[i + 1] === 0xe0);
  assert.ok(hasApp0, 'APP0 must be preserved');
  // APP2 must be present (ICC color profile)
  const hasApp2 = stripped.some((b, i) => b === 0xff && stripped[i + 1] === 0xe2);
  assert.ok(hasApp2, 'APP2 (ICC profile) must be preserved');
  // APP1 must NOT be present (EXIF stripped)
  const hasApp1 = stripped.some((b, i) => b === 0xff && stripped[i + 1] === 0xe1);
  assert.strictEqual(hasApp1, false, 'APP1 (EXIF) must be stripped');
  // EOI must be present at the end
  assert.strictEqual(stripped[stripped.length - 2], 0xff);
  assert.strictEqual(stripped[stripped.length - 1], 0xd9);
  console.log('  ✔ Passed safe JPEG metadata stripping tests');

  // Test 3: SVG Minification with DOMParser / regex
  console.log('Test 3: XML-safe SVG minification');
  const dirtySvg = `
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
    <!-- Generator: Adobe Illustrator 25.0.0, SVG Export Plug-In -->
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="100" height="100">
      <metadata>Editor metadata here</metadata>
      <desc>Sample description</desc>
      <rect width="100" height="100" fill="#ff0000" inkscape:label="layer1" />
    </svg>
  `;
  const cleanSvg = await minifySvgText(dirtySvg);
  assert.ok(!cleanSvg.includes('<!-- Generator'), 'Comments must be stripped');
  assert.ok(!cleanSvg.includes('<!DOCTYPE'), 'DOCTYPE must be stripped');
  assert.ok(!cleanSvg.includes('<?xml'), 'XML declaration must be stripped');
  assert.ok(!cleanSvg.includes('<metadata>'), '<metadata> must be stripped');
  assert.ok(!cleanSvg.includes('<desc>'), '<desc> must be stripped');
  assert.ok(!cleanSvg.includes('xmlns:inkscape'), 'inkscape namespace must be stripped');
  assert.ok(!cleanSvg.includes('inkscape:label'), 'inkscape attributes must be stripped');
  assert.ok(cleanSvg.includes('<rect'), 'Valid SVG elements must be preserved');
  console.log('  ✔ Passed SVG minification tests');

  // Test 4: Tier 3 Safety: 0-byte file handling
  console.log('Test 4: Tier 3 safety on 0-byte file');
  const emptyFile = new File([], 'empty.png', { type: 'image/png' });
  const emptyRes = await compressImage(emptyFile);
  assert.strictEqual(emptyRes.status, 'original');
  assert.strictEqual(emptyRes.originalSize, 0);
  assert.strictEqual(emptyRes.compressedSize, 0);
  assert.strictEqual(emptyRes.tierUsed, 3);
  assert.ok(emptyRes.blob instanceof Blob);
  console.log('  ✔ Passed 0-byte file safety test');

  // Test 5: Tier 3 Safety: Corrupt file handling
  console.log('Test 5: Tier 3 safety on corrupt file');
  const corruptFile = new File(['GARBAGE_NOT_AN_IMAGE_DATA_12345'], 'corrupt.jpg', { type: 'image/jpeg' });
  const corruptRes = await compressImage(corruptFile);
  assert.strictEqual(corruptRes.status, 'original');
  assert.strictEqual(corruptRes.tierUsed, 3);
  assert.strictEqual(corruptRes.compressedSize, corruptFile.size);
  assert.ok(corruptRes.blob instanceof Blob);
  console.log('  ✔ Passed corrupt file safety test');

  // Test 6: Tier 1: UPNG 8-bit quantization on photographic data
  console.log('Test 6: UPNG 8-bit palette quantization');
  // Generate a simulated photograph (diverse RGB spectrum)
  const w = 100, h = 100;
  const photoRgba = new Uint8Array(w * h * 4);
  let seed = 42;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  for (let i = 0; i < photoRgba.length; i += 4) {
    photoRgba[i] = Math.floor(rand() * 256);
    photoRgba[i + 1] = Math.floor(rand() * 256);
    photoRgba[i + 2] = Math.floor(rand() * 256);
    photoRgba[i + 3] = 255;
  }
  const losslessPng = UPNG.encode([photoRgba.buffer], w, h, 0);
  const quantizedPng = UPNG.encode([photoRgba.buffer], w, h, 256);
  assert.ok(quantizedPng.byteLength > 0, 'Quantized PNG must be produced');
  assert.ok(quantizedPng.byteLength < losslessPng.byteLength, 'Quantized PNG must be smaller than lossless on photographic data');
  const reduction = calcReductionPct(losslessPng.byteLength, quantizedPng.byteLength);
  assert.ok(reduction >= 50, 'Reduction on photo data must be >= 50%');
  console.log(`  ✔ UPNG Photo Lossless: ${losslessPng.byteLength} B -> Quantized: ${quantizedPng.byteLength} B (Reduction: ${reduction}%)`);

  // Test 7: Multi-frame animated GIF detection
  console.log('Test 7: Multi-frame animated GIF detection');
  // Create a synthetic 2-frame animated GIF using omggif
  const gifBuf = new Uint8Array(10000);
  const gifWriter = new omggif.GifWriter(gifBuf, 10, 10, { loop: 0 });
  const palette = [0x000000, 0xff0000, 0x00ff00, 0x0000ff];
  const pixelsFrame1 = new Array(100).fill(1);
  const pixelsFrame2 = new Array(100).fill(2);
  gifWriter.addFrame(0, 0, 10, 10, pixelsFrame1, { palette, delay: 10 });
  gifWriter.addFrame(0, 0, 10, 10, pixelsFrame2, { palette, delay: 10 });
  const actualGifLen = gifWriter.end();
  const animatedGifFile = new File([gifBuf.subarray(0, actualGifLen)], 'animated.gif', { type: 'image/gif' });

  const gifRes = await compressImage(animatedGifFile);
  assert.strictEqual(gifRes.status, 'optimal');
  assert.strictEqual(gifRes.tierUsed, 3);
  assert.strictEqual(gifRes.statusMessage, 'Animated GIF preserved intact');
  assert.strictEqual(gifRes.compressedSize, animatedGifFile.size);
  console.log('  ✔ Passed animated GIF preservation test');

  // Test 8: Simple Mode runner runImageCompressor integration
  console.log('Test 8: runImageCompressor integration');
  const { executeTool } = await import('../lib/simpleMode/runners.ts');
  const svgTestFile = new File([dirtySvg], 'test_vector.svg', { type: 'image/svg+xml' });
  const svgRunnerRes = await executeTool('image-compressor', svgTestFile);
  assert.ok(svgRunnerRes.blob instanceof Blob);
  assert.ok(svgRunnerRes.filename.includes('_compressed.svg'));
  assert.ok(svgRunnerRes.metadata?.['Original Size'] !== undefined);
  console.log('  ✔ Passed runImageCompressor SVG execution');

  console.log('\n================================================================');
  console.log(' 🎉 ALL M1 IMAGE COMPRESSION TESTS PASSED (8/8)!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
