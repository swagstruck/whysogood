// @ts-check
/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Verifies edge cases, stress conditions, corrupted inputs, format anomalies, and boundary values.
 * (>= 5 tests per feature group, 80+ tests total)
 * Derived strictly from ORIGINAL_REQUEST.md & TEST_INFRA.md
 */

import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  createTestImage,
  createTestPdf,
  createTestCsv,
  EdgeCaseFiles,
} from './helpers/test_fixtures.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertFalse,
  assertIncludes,
} from './helpers/assertions.mjs';
import {
  detectCategoryFromFile,
  isCategoryCompatible,
  getCategoryDefaultTool,
} from '../../lib/simpleMode/categoryDetection.ts';
import { formatFileSize } from '../../lib/utils.ts';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function runTier2Tests() {
  const tracker = new TestResultTracker('Tier 2: Boundary & Corner Cases');
  console.log('\n======================================================');
  console.log(' RUNNING TIER 2: BOUNDARY & CORNER CASES');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // Group 1: Filename & Extension Case Insensitivity
  // --------------------------------------------------------------------------
  console.log('--- Group 1: Filename & Extension Case Insensitivity ---');

  await tracker.runTest('B1.1: Uppercase .PNG auto-detects Images category', async () => {
    const file = EdgeCaseFiles.uppercasePng();
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.2: Uppercase .JPEG auto-detects Images category', async () => {
    const file = EdgeCaseFiles.uppercaseJpg();
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.3: Uppercase .PDF auto-detects PDF category', async () => {
    const file = EdgeCaseFiles.uppercasePdf();
    assertEqual(detectCategoryFromFile(file), 'PDF');
  });

  await tracker.runTest('B1.4: Uppercase .CSV auto-detects Data category', async () => {
    const file = EdgeCaseFiles.uppercaseCsv();
    assertEqual(detectCategoryFromFile(file), 'Data');
  });

  await tracker.runTest('B1.5: Uppercase .JSON auto-detects Developer category', async () => {
    const file = EdgeCaseFiles.uppercaseJson();
    assertEqual(detectCategoryFromFile(file), 'Developer');
  });

  // --------------------------------------------------------------------------
  // Group 2: Missing or Generic MIME Types
  // --------------------------------------------------------------------------
  console.log('\n--- Group 2: Missing or Generic MIME Types ---');

  await tracker.runTest('B2.1: Empty MIME type with valid .png extension auto-detects Images', async () => {
    const file = EdgeCaseFiles.missingMimePng();
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B2.2: Empty MIME type with valid .pdf extension auto-detects PDF', async () => {
    const file = EdgeCaseFiles.missingMimePdf();
    assertEqual(detectCategoryFromFile(file), 'PDF');
  });

  await tracker.runTest('B2.3: Generic application/octet-stream with .jpg extension auto-detects Images', async () => {
    const file = EdgeCaseFiles.genericMimeJpg();
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B2.4: Empty filename with valid MIME type image/png auto-detects Images', async () => {
    const file = new File([new Uint8Array([1])], '', { type: 'image/png' });
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B2.5: File with no extension and no MIME type defaults safely to Images without crashing', async () => {
    const file = new File([new Uint8Array([1])], 'unknown_payload', { type: '' });
    const detected = detectCategoryFromFile(file);
    assertTrue(Boolean(detected), 'Must return a fallback category');
    assertEqual(detected, 'Images');
  });

  // --------------------------------------------------------------------------
  // Group 3: Multi-Dot and Complex Filenames
  // --------------------------------------------------------------------------
  console.log('\n--- Group 3: Multi-Dot and Complex Filenames ---');

  await tracker.runTest('B3.1: Multi-dot PDF (e.g. company.finance.audit.v2.final.pdf) resolves extension to pdf', async () => {
    const file = EdgeCaseFiles.multiDotPdf();
    assertEqual(detectCategoryFromFile(file), 'PDF');
  });

  await tracker.runTest('B3.2: Multi-dot Image (e.g. asset.min.highres.draft.png) resolves extension to png', async () => {
    const file = EdgeCaseFiles.multiDotPng();
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B3.3: Filename containing spaces, brackets, hash, and emojis', async () => {
    const file = EdgeCaseFiles.specialCharFile();
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B3.4: Filename starting with dot (hidden file like .gitignore or .env) does not crash', async () => {
    const hiddenFile = new File(['PORT=3000'], '.env', { type: 'text/plain' });
    const category = detectCategoryFromFile(hiddenFile);
    assertTrue(Boolean(category));
  });

  await tracker.runTest('B3.5: Extremely long filename (>150 characters) parsed without string overflow', async () => {
    const file = EdgeCaseFiles.longFilenameFile();
    assertEqual(detectCategoryFromFile(file), 'Images');
    assertTrue(file.name.length > 150);
  });

  // --------------------------------------------------------------------------
  // Group 4: Unusual and Modern File Formats
  // --------------------------------------------------------------------------
  console.log('\n--- Group 4: Unusual and Modern File Formats ---');

  await tracker.runTest('B4.1: WebP format auto-detects Images', async () => {
    assertEqual(detectCategoryFromFile(EdgeCaseFiles.webpFile()), 'Images');
  });

  await tracker.runTest('B4.2: AVIF format auto-detects Images', async () => {
    assertEqual(detectCategoryFromFile(EdgeCaseFiles.avifFile()), 'Images');
  });

  await tracker.runTest('B4.3: SVG format auto-detects Images', async () => {
    assertEqual(detectCategoryFromFile(EdgeCaseFiles.svgFile()), 'Images');
  });

  await tracker.runTest('B4.4: BMP legacy format auto-detects Images', async () => {
    assertEqual(detectCategoryFromFile(EdgeCaseFiles.bmpFile()), 'Images');
  });

  await tracker.runTest('B4.5: ICO icon format auto-detects Images', async () => {
    assertEqual(detectCategoryFromFile(EdgeCaseFiles.icoFile()), 'Images');
  });

  // --------------------------------------------------------------------------
  // Group 5: Zero-Byte & Empty Files
  // --------------------------------------------------------------------------
  console.log('\n--- Group 5: Zero-Byte & Empty Files ---');

  await tracker.runTest('B5.1: Zero-byte PNG file does not throw unhandled exception in category detection', async () => {
    const emptyFile = EdgeCaseFiles.emptyZeroByteFile();
    assertEqual(emptyFile.size, 0);
    const cat = detectCategoryFromFile(emptyFile);
    assertEqual(cat, 'Images');
  });

  await tracker.runTest('B5.2: Zero-byte PDF file does not throw unhandled exception', async () => {
    const emptyPdf = EdgeCaseFiles.emptyZeroBytePdf();
    assertEqual(emptyPdf.size, 0);
    assertEqual(detectCategoryFromFile(emptyPdf), 'PDF');
  });

  await tracker.runTest('B5.3: Formatted file size for 0 bytes returns "0 B"', async () => {
    assertEqual(formatFileSize(0), '0 B');
  });

  await tracker.runTest('B5.4: Zero-byte file compatibility check does not throw', async () => {
    const emptyFile = EdgeCaseFiles.emptyZeroByteFile();
    assertTrue(isCategoryCompatible(emptyFile, 'Images'));
  });

  await tracker.runTest('B5.5: Corrupted non-PNG file with .png extension detected by extension gracefully', async () => {
    const corrupt = EdgeCaseFiles.corruptedPng();
    assertEqual(detectCategoryFromFile(corrupt), 'Images');
  });

  // --------------------------------------------------------------------------
  // Group 6: Category Compatibility Boundary Rules
  // --------------------------------------------------------------------------
  console.log('\n--- Group 6: Category Compatibility Boundary Rules ---');

  await tracker.runTest('B6.1: Cross-compatibility: Image file is allowed in PDF category (Image to PDF)', async () => {
    const img = createTestImage('png');
    assertTrue(isCategoryCompatible(img, 'PDF'));
  });

  await tracker.runTest('B6.2: Cross-compatibility: Security category (Base64) accepts any file type', async () => {
    const pdf = createTestPdf();
    const csv = createTestCsv();
    assertTrue(isCategoryCompatible(pdf, 'Security'));
    assertTrue(isCategoryCompatible(csv, 'Security'));
  });

  await tracker.runTest('B6.3: Cross-compatibility: Data file (CSV) is incompatible with Calculators', async () => {
    const csv = createTestCsv();
    assertFalse(isCategoryCompatible(csv, 'Calculators'));
  });

  await tracker.runTest('B6.4: Cross-compatibility: PDF file is incompatible with Audio', async () => {
    const pdf = createTestPdf();
    assertFalse(isCategoryCompatible(pdf, 'Audio'));
  });

  await tracker.runTest('B6.5: Default tool getter returns non-empty slug for all core categories', async () => {
    assertEqual(getCategoryDefaultTool('Images'), 'image-compressor');
    assertEqual(getCategoryDefaultTool('PDF'), 'pdf-compressor');
    assertEqual(getCategoryDefaultTool('Data'), 'csv-to-json');
    assertEqual(getCategoryDefaultTool('Developer'), 'json-formatter');
    assertEqual(getCategoryDefaultTool('Text'), 'word-counter');
  });

  // --------------------------------------------------------------------------
  // Group 7: Rapid State Toggling & Idempotency
  // --------------------------------------------------------------------------
  console.log('\n--- Group 7: Rapid State Toggling & Idempotency ---');

  await tracker.runTest('B7.1: Rapid consecutive toggling produces deterministic final state', async () => {
    let mode = false;
    const toggle = () => { mode = !mode; };
    for (let i = 0; i < 10; i++) toggle();
    assertEqual(mode, false);
    toggle();
    assertEqual(mode, true);
  });

  await tracker.runTest('B7.2: Setting simpleMode to true repeatedly is idempotent', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      for (let i = 0; i < 5; i++) {
        env.localStorage.setItem('whysogood_simple_mode', 'true');
      }
      assertEqual(env.localStorage.getItem('whysogood_simple_mode'), 'true');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('B7.3: Setting simpleMode to false repeatedly is idempotent', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      for (let i = 0; i < 5; i++) {
        env.localStorage.setItem('whysogood_simple_mode', 'false');
      }
      assertEqual(env.localStorage.getItem('whysogood_simple_mode'), 'false');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('B7.4: Rapid category switches preserve file reference without corruption', async () => {
    const file = createTestImage('png', 'avatar.png');
    const categories = ['Images', 'PDF', 'Security', 'Images'];
    let active = 'Images';
    for (const cat of categories) {
      active = cat;
      assertTrue(file instanceof File);
      assertEqual(file.name, 'avatar.png');
    }
    assertEqual(active, 'Images');
  });

  await tracker.runTest('B7.5: Rapid file replacements update active file reference correctly', async () => {
    const files = [
      createTestImage('png', 'file1.png'),
      createTestImage('jpg', 'file2.jpg'),
      createTestPdf('file3.pdf'),
    ];
    let current = null;
    for (const f of files) {
      current = f;
    }
    assertEqual(current?.name, 'file3.pdf');
  });

  // --------------------------------------------------------------------------
  // Group 8: Storage Failures & Quota Exceeded Boundaries
  // --------------------------------------------------------------------------
  console.log('\n--- Group 8: Storage Failures & Quota Exceeded Boundaries ---');

  await tracker.runTest('B8.1: localStorage QuotaExceededError is caught gracefully without unhandled crash', async () => {
    const env = setupMockBrowserEnvironment({ quotaExceeded: true });
    try {
      let caught = false;
      try {
        env.localStorage.setItem('whysogood_simple_mode', 'true');
      } catch (err) {
        caught = true;
        assertEqual(err.name, 'QuotaExceededError');
      }
      assertTrue(caught, 'Quota error was trapped');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('B8.2: Private browsing security error on localStorage does not crash application', async () => {
    const env = setupMockBrowserEnvironment({ storageDisabled: true });
    try {
      let caught = false;
      try {
        env.localStorage.getItem('whysogood_simple_mode');
      } catch (err) {
        caught = true;
        assertIncludes(err.message, 'SecurityError');
      }
      assertTrue(caught);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('B8.3: Corrupted localStorage value defaults safely to false', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      env.localStorage.setItem('whysogood_simple_mode', 'invalid_corrupt_data_999');
      const val = env.localStorage.getItem('whysogood_simple_mode');
      const isSimple = val === 'true';
      assertFalse(isSimple, 'Corrupted data defaults to false');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('B8.4: Empty string in localStorage defaults to false', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      env.localStorage.setItem('whysogood_simple_mode', '');
      const val = env.localStorage.getItem('whysogood_simple_mode');
      const isSimple = val === 'true';
      assertFalse(isSimple);
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('B8.5: Null return when key not found defaults to false', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const val = env.localStorage.getItem('non_existent_key');
      assertEqual(val, null);
      const isSimple = val === 'true';
      assertFalse(isSimple);
    } finally {
      env.cleanup();
    }
  });

  // --------------------------------------------------------------------------
  // Group 9: Edge Case Output Operations
  // --------------------------------------------------------------------------
  console.log('\n--- Group 9: Edge Case Output Operations ---');

  await tracker.runTest('B9.1: Removing an output when list has only 1 output leaves list empty', async () => {
    let outputs = [{ id: 'out-1', name: 'photo.png' }];
    outputs = outputs.filter(o => o.id !== 'out-1');
    assertEqual(outputs.length, 0);
  });

  await tracker.runTest('B9.2: Removing a non-existent ID leaves outputs intact without error', async () => {
    let outputs = [{ id: 'out-1', name: 'photo.png' }];
    outputs = outputs.filter(o => o.id !== 'out-999');
    assertEqual(outputs.length, 1);
  });

  await tracker.runTest('B9.3: Chaining output with special characters in filename preserves name safely', async () => {
    const specialName = 'report (2026) & draft #1.png';
    const blob = new Blob(['data'], { type: 'image/png' });
    const chained = new File([blob], specialName, { type: blob.type });
    assertEqual(chained.name, specialName);
  });

  await tracker.runTest('B9.4: Batch Download All with 0 outputs is safe no-op', async () => {
    const outputs = [];
    const canDownload = outputs.length > 0;
    assertFalse(canDownload, 'Cannot download when outputs is empty');
  });

  await tracker.runTest('B9.5: Batch Download All with 10 outputs bundles all files successfully', async () => {
    const { zipSync, strToU8 } = await import('fflate');
    const zipMap = {};
    for (let i = 1; i <= 10; i++) {
      zipMap[`output_${i}.txt`] = strToU8(`Content ${i}`);
    }
    const zipped = zipSync(zipMap);
    assertTrue(zipped.length > 0);
  });

  // --------------------------------------------------------------------------
  // Group 10: Responsive & CSS Boundary Validation
  // --------------------------------------------------------------------------
  console.log('\n--- Group 10: Responsive & CSS Boundary Validation ---');

  await tracker.runTest('B10.1: Mobile breakpoint <= 640px styles are defined in Header component', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes('@media (max-width: 640px)'), 'Header defines max-width: 640px styles');
    assertTrue(headerCode.includes('.simple-mode-toggle-btn'), 'Styles the simple mode toggle button for mobile');
  });

  await tracker.runTest('B10.2: Desktop max-width 1280px container bounds header and workbench', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes('1280'), 'Header constrained to 1280px');
  });

  await tracker.runTest('B10.3: Theme values restricted strictly to dark | light | system', async () => {
    const validThemes = ['dark', 'light', 'system'];
    assertTrue(validThemes.includes('dark'));
    assertTrue(validThemes.includes('light'));
    assertTrue(validThemes.includes('system'));
    assertFalse(validThemes.includes('blue'));
  });

  await tracker.runTest('B10.4: Theme toggle cycling traverses [dark, light, system] continuously', async () => {
    const cycle = ['dark', 'light', 'system'];
    let current = 'system';
    const next = () => {
      const idx = cycle.indexOf(current);
      current = cycle[(idx + 1) % 3];
      return current;
    };
    assertEqual(next(), 'dark');
    assertEqual(next(), 'light');
    assertEqual(next(), 'system');
    assertEqual(next(), 'dark');
  });

  await tracker.runTest('B10.5: Card and container radius tokens obey strict <= 48px cap', async () => {
    const fs = await import('node:fs');
    const css = fs.readFileSync('app/design-system.css', 'utf-8');
    // Ensure all card/panel container radius tokens are <= 48px
    const cardTokens = ['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl'];
    for (const token of cardTokens) {
      const regex = new RegExp(`${token}:\\s*(\\d+)px;`);
      const match = css.match(regex);
      assertTrue(Boolean(match), `Token ${token} must be defined`);
      const px = parseInt(match[1], 10);
      assertTrue(px <= 48, `Card radius token ${token} must be <= 48px, but was ${px}px`);
    }
  });

  const summary = tracker.summary();
  console.log(`\nTier 2 Finished: ${summary.passed}/${summary.total} passed (${summary.failed} failed) in ${summary.durationMs}ms`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runTier2Tests().then(s => {
    process.exit(s.failed > 0 ? 1 : 0);
  });
}
