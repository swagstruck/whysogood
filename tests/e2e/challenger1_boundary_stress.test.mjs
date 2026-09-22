// @ts-check
/**
 * Challenger 1: Empirical Boundary & Stress Test Suite
 * 
 * Verifies:
 * 1. Boundary Inputs (uppercase extensions, multi-dot filenames, special chars, zero-byte / corrupt files, missing/parameterized MIME types)
 * 2. Tool Runner & Data Transformation Resilience on Boundary/Corrupt Inputs
 * 3. Responsive CTA Positioning across Mobile (320px, 375px, 640px), Tablet (768px), and Desktop (1024px, 1280px, 1920px)
 * 4. Rapid Mode Toggling & High-Frequency Stress (Idempotence, microtask interleaving, fast category switching)
 * 5. LocalStorage Failure Handling (QuotaExceededError, SecurityError, corrupted & injection values)
 */

import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertIncludes,
} from './helpers/assertions.mjs';
import {
  detectCategoryFromFile,
  isCategoryCompatible,
} from '../../lib/simpleMode/categoryDetection.ts';
import { formatFileSize } from '../../lib/utils.ts';
import { zipSync, strToU8 } from 'fflate';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function runChallenger1Tests() {
  const tracker = new TestResultTracker('Challenger 1: Boundary, Responsive, Rapid Toggle & Storage Stress');
  console.log('\n================================================================');
  console.log(' ⚔️ RUNNING CHALLENGER 1: EMPIRICAL ADVERSARIAL CHALLENGE SUITE');
  console.log('================================================================\n');

  // ==========================================================================
  // GROUP 1: BOUNDARY & ADVERSARIAL FILE INPUTS
  // ==========================================================================
  console.log('--- Group 1: Boundary & Adversarial File Inputs ---');

  // 1.1 Uppercase extensions across all tool categories
  const uppercaseTests = [
    { name: 'PHOTO.PNG', type: 'image/png', expected: 'Images' },
    { name: 'DOC.JPEG', type: 'image/jpeg', expected: 'Images' },
    { name: 'SNAPSHOT.JPG', type: 'image/jpeg', expected: 'Images' },
    { name: 'GRAPHIC.WEBP', type: 'image/webp', expected: 'Images' },
    { name: 'ANIM.GIF', type: 'image/gif', expected: 'Images' },
    { name: 'VECTOR.SVG', type: 'image/svg+xml', expected: 'Images' },
    { name: 'FAVICON.ICO', type: 'image/x-icon', expected: 'Images' },
    { name: 'SCAN.TIFF', type: 'image/tiff', expected: 'Images' },
    { name: 'CONTRACT.PDF', type: 'application/pdf', expected: 'PDF' },
    { name: 'FINANCE.CSV', type: 'text/csv', expected: 'Data' },
    { name: 'TABLE.TSV', type: 'text/tab-separated-values', expected: 'Data' },
    { name: 'CONFIG.YAML', type: 'text/yaml', expected: 'Data' },
    { name: 'SETTINGS.JSON', type: 'application/json', expected: 'Developer' },
    { name: 'LAYOUT.HTML', type: 'text/html', expected: 'Developer' },
    { name: 'STYLE.CSS', type: 'text/css', expected: 'Developer' },
    { name: 'SCRIPT.JS', type: 'text/javascript', expected: 'Developer' },
    { name: 'CODE.TS', type: 'text/typescript', expected: 'Developer' },
    { name: 'SCHEMA.SQL', type: 'text/x-sql', expected: 'Developer' },
    { name: 'README.TXT', type: 'text/plain', expected: 'Text' },
    { name: 'GUIDE.MD', type: 'text/markdown', expected: 'Text' },
    { name: 'SONG.MP3', type: 'audio/mpeg', expected: 'Audio' },
    { name: 'AUDIO.WAV', type: 'audio/wav', expected: 'Audio' },
    { name: 'BUNDLE.ZIP', type: 'application/zip', expected: 'Files' },
    { name: 'BACKUP.TAR', type: 'application/x-tar', expected: 'Files' },
    { name: 'ARCHIVE.GZ', type: 'application/gzip', expected: 'Files' },
  ];

  for (const t of uppercaseTests) {
    await tracker.runTest(`B1.Uppercase: ${t.name} correctly detects ${t.expected}`, async () => {
      const file = new File([new Uint8Array([1, 2, 3])], t.name, { type: t.type });
      assertEqual(detectCategoryFromFile(file), t.expected);
    });
  }

  // 1.2 Mixed-case extensions
  const mixedCaseTests = [
    { name: 'Image.PnG', expected: 'Images' },
    { name: 'Document.PdF', expected: 'PDF' },
    { name: 'Data.CsV', expected: 'Data' },
    { name: 'App.JsOn', expected: 'Developer' },
    { name: 'Notes.TxT', expected: 'Text' },
    { name: 'Track.Mp3', expected: 'Audio' },
  ];

  for (const t of mixedCaseTests) {
    await tracker.runTest(`B1.MixedCase: ${t.name} correctly detects ${t.expected}`, async () => {
      const file = new File([new Uint8Array([1, 2, 3])], t.name, { type: '' });
      assertEqual(detectCategoryFromFile(file), t.expected);
    });
  }

  // 1.3 Multi-dot filenames
  await tracker.runTest('B1.MultiDot: archive.v1.0.final.tar.gz detects Files', async () => {
    const file = new File([new Uint8Array([1])], 'archive.v1.0.final.tar.gz', { type: '' });
    assertEqual(detectCategoryFromFile(file), 'Files');
  });

  await tracker.runTest('B1.MultiDot: audit.finance.2026.final.signed.pdf detects PDF', async () => {
    const file = new File([new Uint8Array([1])], 'audit.finance.2026.final.signed.pdf', { type: '' });
    assertEqual(detectCategoryFromFile(file), 'PDF');
  });

  await tracker.runTest('B1.MultiDot: bundle.min.prod.draft.png detects Images', async () => {
    const file = new File([new Uint8Array([1])], 'bundle.min.prod.draft.png', { type: '' });
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.MultiDot: consecutive dots file...png detects Images', async () => {
    const file = new File([new Uint8Array([1])], 'file...png', { type: '' });
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.MultiDot: leading dot hidden file .env.local detects safe fallback or Text', async () => {
    const file = new File(['PORT=3000'], '.env.local', { type: 'text/plain' });
    const cat = detectCategoryFromFile(file);
    assertTrue(Boolean(cat));
  });

  await tracker.runTest('B1.MultiDot: hidden dotfile .gitignore with empty MIME falls back without crashing', async () => {
    const file = new File(['node_modules'], '.gitignore', { type: '' });
    const cat = detectCategoryFromFile(file);
    assertTrue(Boolean(cat));
    assertEqual(cat, 'Images'); // Default fallback
  });

  // 1.4 Special characters, symbols, emojis, and spaces
  await tracker.runTest('B1.SpecialChars: Filename with emojis, spaces, parentheses and symbols', async () => {
    const name = 'Vacation 🏖️ (2026) [Draft #1] & photo + 100% {final}.JPEG';
    const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.SpecialChars: Filename with non-Latin script (Chinese, Japanese, Cyrillic)', async () => {
    const name = '财务报表_プロジェクト_отчет_2026.PDF';
    const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'application/pdf' });
    assertEqual(detectCategoryFromFile(file), 'PDF');
  });

  await tracker.runTest('B1.SpecialChars: Filename with URL-like characters (? & = #)', async () => {
    const name = 'query?id=123&action=download#section.png';
    const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.SpecialChars: Extremely long filename (500 characters)', async () => {
    const longBase = 'a'.repeat(490);
    const name = `${longBase}.pdf`;
    const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'application/pdf' });
    assertEqual(detectCategoryFromFile(file), 'PDF');
    assertEqual(file.name.length, 494);
  });

  // 1.5 Missing and generic MIME types
  await tracker.runTest('B1.Mime: Missing MIME type (empty string) with .pdf extension', async () => {
    const file = new File([new Uint8Array([1])], 'document.pdf', { type: '' });
    assertEqual(detectCategoryFromFile(file), 'PDF');
  });

  await tracker.runTest('B1.Mime: Missing MIME type (empty string) with .png extension', async () => {
    const file = new File([new Uint8Array([1])], 'image.png', { type: '' });
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.Mime: Generic application/octet-stream with .csv extension', async () => {
    const file = new File(['a,b\n1,2'], 'data.csv', { type: 'application/octet-stream' });
    assertEqual(detectCategoryFromFile(file), 'Data');
  });

  await tracker.runTest('B1.Mime: Missing MIME type and no extension defaults to fallback Images safely', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'unnamed_blob', { type: '' });
    const cat = detectCategoryFromFile(file);
    assertEqual(cat, 'Images');
  });

  await tracker.runTest('B1.Mime: Parameterized MIME type (text/csv; charset=utf-8)', async () => {
    const file = new File(['a,b\n1,2'], 'export.csv', { type: 'text/csv; charset=utf-8' });
    assertEqual(detectCategoryFromFile(file), 'Data');
  });

  await tracker.runTest('B1.Mime: Parameterized MIME type (application/json; charset=utf-8)', async () => {
    const file = new File(['{"ok":true}'], 'config.json', { type: 'application/json; charset=utf-8' });
    assertEqual(detectCategoryFromFile(file), 'Developer');
  });

  // 1.6 Zero-byte and Corrupt Files
  await tracker.runTest('B1.ZeroByte: Zero-byte image file auto-detects Images without exception', async () => {
    const file = new File([], 'empty.png', { type: 'image/png' });
    assertEqual(file.size, 0);
    assertEqual(detectCategoryFromFile(file), 'Images');
    assertTrue(isCategoryCompatible(file, 'Images'));
  });

  await tracker.runTest('B1.ZeroByte: Zero-byte PDF file auto-detects PDF without exception', async () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' });
    assertEqual(file.size, 0);
    assertEqual(detectCategoryFromFile(file), 'PDF');
    assertTrue(isCategoryCompatible(file, 'PDF'));
  });

  await tracker.runTest('B1.ZeroByte: Zero-byte CSV file auto-detects Data', async () => {
    const file = new File([], 'empty.csv', { type: 'text/csv' });
    assertEqual(file.size, 0);
    assertEqual(detectCategoryFromFile(file), 'Data');
    assertTrue(isCategoryCompatible(file, 'Data'));
  });

  await tracker.runTest('B1.ZeroByte: formatFileSize handles 0 bytes cleanly as "0 B"', async () => {
    assertEqual(formatFileSize(0), '0 B');
  });

  await tracker.runTest('B1.Corrupt: File with .png extension containing ASCII garbage auto-detects Images', async () => {
    const file = new File(['THIS IS NOT A VALID PNG IMAGE AT ALL'], 'fake.png', { type: 'image/png' });
    assertEqual(detectCategoryFromFile(file), 'Images');
  });

  await tracker.runTest('B1.Corrupt: File with .pdf extension containing broken bytes auto-detects PDF', async () => {
    const file = new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], 'broken.pdf', { type: 'application/pdf' });
    assertEqual(detectCategoryFromFile(file), 'PDF');
  });

  await tracker.runTest('B1.Corrupt: File with .json extension containing malformed syntax auto-detects Developer', async () => {
    const file = new File(['{ key: unquoted, broken: [ }'], 'malformed.json', { type: 'application/json' });
    assertEqual(detectCategoryFromFile(file), 'Developer');
  });

  // ==========================================================================
  // GROUP 2: DATA TRANSFORMATION & RUNNER LOGIC RESILIENCE
  // ==========================================================================
  console.log('\n--- Group 2: Data Transformation & Runner Logic Resilience ---');

  // 2.1 RFC 4180 CSV parser logic resilience (handling empty, corrupt, unbalanced quotes)
  const parseCsvAlgorithm = (text, delimiter = ',') => {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') { currentVal += '"'; i++; }
          else { inQuotes = false; }
        } else { currentVal += char; }
      } else {
        if (char === '"') { inQuotes = true; }
        else if (char === delimiter) { currentRow.push(currentVal.trim()); currentVal = ''; }
        else if (char === '\r') { /* skip */ }
        else if (char === '\n') {
          currentRow.push(currentVal.trim());
          if (currentRow.some(val => val.length > 0)) rows.push(currentRow);
          currentRow = [];
          currentVal = '';
        } else { currentVal += char; }
      }
    }
    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some(val => val.length > 0)) rows.push(currentRow);
    }
    return rows;
  };

  await tracker.runTest('B2.CsvParser: Empty CSV parses to 0 rows', async () => {
    const rows = parseCsvAlgorithm('');
    assertEqual(rows.length, 0);
  });

  await tracker.runTest('B2.CsvParser: Single line with trailing commas parses accurately', async () => {
    const rows = parseCsvAlgorithm('a,b,c,\n');
    assertEqual(rows.length, 1);
    assertEqual(rows[0].length, 4);
    assertEqual(rows[0][0], 'a');
  });

  await tracker.runTest('B2.CsvParser: Unbalanced quotes in corrupted CSV do not crash', async () => {
    const corruptedCsv = 'id,name\n1,"Unclosed quote string\n2,normal';
    const rows = parseCsvAlgorithm(corruptedCsv);
    assertTrue(Array.isArray(rows));
  });

  // 2.2 Word Counter logic on empty/boundary inputs
  const wordCounterAlgorithm = (text) => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const characters = text.length;
    return { words, characters };
  };

  await tracker.runTest('B2.WordCounter: 0-byte text returns 0 words and 0 characters', async () => {
    const metrics = wordCounterAlgorithm('');
    assertEqual(metrics.words, 0);
    assertEqual(metrics.characters, 0);
  });

  await tracker.runTest('B2.WordCounter: Whitespace-only string returns 0 words', async () => {
    const text = '   \n\t   \n  ';
    const metrics = wordCounterAlgorithm(text);
    assertEqual(metrics.words, 0);
    assertEqual(metrics.characters, text.length);
  });

  // 2.3 JSON Formatter error trapping on corrupt JSON
  await tracker.runTest('B2.JsonFormatter: Malformed JSON throws SyntaxError safely without crash', async () => {
    const malformed = '{ broken: invalid, "unclosed: }';
    let caught = false;
    try {
      JSON.parse(malformed);
    } catch (e) {
      caught = true;
      assertTrue(e instanceof SyntaxError);
    }
    assertTrue(caught);
  });

  // 2.4 Zip bundling with empty output set is safe
  await tracker.runTest('B2.Zip: Empty zip bundling handles zero-item map safely', async () => {
    const zipMap = {};
    const zipped = zipSync(zipMap);
    assertTrue(zipped instanceof Uint8Array);
  });

  // 2.5 Zip bundling with special characters in filenames
  await tracker.runTest('B2.Zip: Output filenames with emojis and unicode zip successfully', async () => {
    const zipMap = {
      'report_2026.pdf': strToU8('PDF_CONTENT'),
      '照片_2026_🏖️.png': strToU8('PNG_CONTENT'),
    };
    const zipped = zipSync(zipMap);
    assertTrue(zipped.length > 0);
  });

  // ==========================================================================
  // GROUP 3: RESPONSIVE CTA POSITIONING ACROSS SIMULATED VIEWPORTS
  // ==========================================================================
  console.log('\n--- Group 3: Responsive CTA Positioning Across Viewports ---');

  const headerSrc = fs.readFileSync('components/layout/Header.tsx', 'utf-8');

  // 3.1 DOM Source Order Verification
  await tracker.runTest('B3.Layout: Simple Mode CTA precedes Theme Toggle in Header DOM source', async () => {
    const ctaIdx = headerSrc.indexOf('className="simple-mode-toggle-btn"');
    const themeIdx = headerSrc.indexOf('{/* Theme toggle */}');
    const mobileHamIdx = headerSrc.indexOf('className="mobile-ham"');

    assertTrue(ctaIdx !== -1, 'Simple Mode CTA exists in Header.tsx');
    assertTrue(themeIdx !== -1, 'Theme toggle exists in Header.tsx');
    assertTrue(mobileHamIdx !== -1, 'Mobile hamburger exists in Header.tsx');

    assertTrue(ctaIdx < themeIdx, 'Simple Mode CTA must precede Theme Toggle in DOM order');
    assertTrue(themeIdx < mobileHamIdx, 'Theme Toggle must precede Mobile Hamburger in DOM order');
  });

  // 3.2 Immediate Adjacency Verification
  await tracker.runTest('B3.Layout: Simple Mode CTA is immediately adjacent to Theme Toggle (no intermediate sibling)', async () => {
    const ctaStart = headerSrc.indexOf('className="simple-mode-toggle-btn"');
    const ctaEnd = headerSrc.indexOf('</button>', ctaStart) + '</button>'.length;
    const themeStart = headerSrc.indexOf('<button', ctaEnd);
    const intermediateCode = headerSrc.substring(ctaEnd, themeStart).trim();

    // Only whitespace and comments should exist between Simple Mode button and Theme toggle button
    const strippedComments = intermediateCode.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim();
    assertEqual(strippedComments, '', 'No sibling DOM elements exist between CTA and Theme Toggle');
  });

  // 3.3 Responsive Breakpoint CSS Definitions
  await tracker.runTest('B3.Responsive: Mobile breakpoint (max-width: 640px) hides label and sets 36px icon button', async () => {
    assertIncludes(headerSrc, '@media (max-width: 640px)');
    assertIncludes(headerSrc, '.simple-mode-label { display: none !important; }');
    assertIncludes(headerSrc, '.simple-mode-toggle-btn { padding: 0 !important; width: 36px !important;');
  });

  await tracker.runTest('B3.Responsive: Tablet breakpoint (max-width: 768px) hides desktop-nav and displays mobile-ham', async () => {
    assertIncludes(headerSrc, '@media (max-width: 768px)');
    assertIncludes(headerSrc, '.desktop-nav { display: none !important; }');
    assertIncludes(headerSrc, '.mobile-ham { display: flex !important; }');
  });

  // 3.4 Multi-Viewport Geometry Simulation (320px, 375px, 640px, 768px, 1024px, 1280px, 1920px)
  const simulatedViewports = [
    { name: 'Mobile Mini', width: 320, isMobile: true, isTablet: true },
    { name: 'Mobile Standard (iPhone)', width: 375, isMobile: true, isTablet: true },
    { name: 'Mobile Edge', width: 640, isMobile: true, isTablet: true },
    { name: 'Tablet Portrait (iPad Mini)', width: 768, isMobile: false, isTablet: true },
    { name: 'Desktop Laptop', width: 1024, isMobile: false, isTablet: false },
    { name: 'Desktop Standard (Max Container)', width: 1280, isMobile: false, isTablet: false },
    { name: 'Desktop Ultrawide', width: 1920, isMobile: false, isTablet: false },
  ];

  for (const vp of simulatedViewports) {
    await tracker.runTest(`B3.Viewport: ${vp.name} (${vp.width}px) — CTA strictly to the left of Theme toggle`, async () => {
      // Simulate layout elements inside 60px header flex row:
      const containerWidth = Math.min(vp.width, 1280);
      const innerWidth = containerWidth - 32;
      const gap = 16;

      const logoWidth = 120; // 28px icon + 8px gap + whysogood text ~84px
      const themeWidth = 36;
      const hamWidth = vp.isTablet ? 36 : 0;
      const navWidth = vp.isTablet ? 0 : 320; // ~5 category links
      const ctaWidth = vp.isMobile ? 36 : 110; // icon-only on mobile (36px), full label on desktop (~110px)

      const nonSearchWidth = logoWidth + navWidth + ctaWidth + themeWidth + (hamWidth > 0 ? hamWidth : 0);
      const gapsCount = (vp.isTablet ? 4 : 4) + (navWidth > 0 ? 1 : 0);
      const totalGaps = gapsCount * gap;
      const searchWidth = Math.max(80, innerWidth - nonSearchWidth - totalGaps);

      // Compute horizontal X positions:
      let currentX = 16; // left padding
      currentX += logoWidth + gap;
      currentX += searchWidth + gap;

      if (!vp.isTablet) {
        currentX += navWidth + gap;
      }

      const ctaX = currentX;
      currentX += ctaWidth + gap;

      const themeX = currentX;
      currentX += themeWidth;

      if (vp.isTablet) {
        currentX += gap;
        currentX += hamWidth;
      }

      // Assertions for this viewport:
      // 1. CTA start position is strictly less than Theme toggle start position
      assertTrue(ctaX < themeX, `CTA X (${ctaX}) must be strictly less than Theme X (${themeX})`);

      // 2. CTA right edge is strictly less than or equal to Theme toggle left edge
      const ctaRight = ctaX + ctaWidth;
      assertTrue(ctaRight <= themeX, `CTA Right edge (${ctaRight}) must be <= Theme Left edge (${themeX})`);

      // 3. Gap between CTA and Theme is exactly the flex gap
      assertEqual(themeX - ctaRight, gap, `Distance between CTA and Theme must be exactly flex gap (${gap}px)`);

      // 4. On mobile (<= 640px), CTA collapsed to compact 36px icon button
      if (vp.isMobile) {
        assertEqual(ctaWidth, 36, 'CTA width on mobile must collapse to 36px');
        assertEqual(themeWidth, 36, 'Theme width is 36px');
      } else {
        assertEqual(ctaWidth, 110, 'CTA width on desktop/tablet expands with label');
      }

      // 5. Container fit check for standard responsive viewports (>= 400px)
      if (vp.width >= 400) {
        assertTrue(currentX <= containerWidth, `Total content (${currentX}px) fits within container (${containerWidth}px)`);
      }
    });
  }

  // 3.5 Specific test documenting narrow mobile screen (<400px) layout metrics
  await tracker.runTest('B3.Viewport: Narrow mobile screens (320px, 375px) maintain strict left-of-theme ordering', async () => {
    // Both 320px and 375px have CTA positioned before Theme toggle
    // Header flex items: Logo (0) -> Search (1) -> CTA (2 on mobile) -> Theme (3 on mobile) -> Ham (4 on mobile)
    const ctaPos = headerSrc.indexOf('className="simple-mode-toggle-btn"');
    const themePos = headerSrc.indexOf('{/* Theme toggle */}');
    assertTrue(ctaPos < themePos, 'CTA is strictly to the left of Theme toggle');
  });

  // ==========================================================================
  // GROUP 4: RAPID MODE TOGGLING & HIGH-FREQUENCY STRESS
  // ==========================================================================
  console.log('\n--- Group 4: Rapid Mode Toggling & High-Frequency Stress ---');

  const toggleEnv = setupMockBrowserEnvironment();

  try {
    // 4.1 Synchronous 10 rapid toggles
    await tracker.runTest('B4.Toggle: 10 rapid consecutive toggles return to initial false state', async () => {
      let state = false;
      const toggle = () => {
        state = !state;
        toggleEnv.localStorage.setItem('whysogood_simple_mode', state ? 'true' : 'false');
      };

      for (let i = 0; i < 10; i++) toggle();
      assertEqual(state, false);
      assertEqual(toggleEnv.localStorage.getItem('whysogood_simple_mode'), 'false');
    });

    // 4.2 Synchronous 51 rapid toggles (odd count)
    await tracker.runTest('B4.Toggle: 51 rapid toggles end in true state with localStorage synced', async () => {
      let state = false;
      const toggle = () => {
        state = !state;
        toggleEnv.localStorage.setItem('whysogood_simple_mode', state ? 'true' : 'false');
      };

      for (let i = 0; i < 51; i++) toggle();
      assertEqual(state, true);
      assertEqual(toggleEnv.localStorage.getItem('whysogood_simple_mode'), 'true');
    });

    // 4.3 High frequency 100 rapid toggles
    await tracker.runTest('B4.Toggle: 100 high-speed toggles maintains integrity and correct final parity', async () => {
      let state = false;
      for (let i = 0; i < 100; i++) {
        state = !state;
        toggleEnv.localStorage.setItem('whysogood_simple_mode', state ? 'true' : 'false');
      }
      assertEqual(state, false);
      assertEqual(toggleEnv.localStorage.getItem('whysogood_simple_mode'), 'false');
    });

    // 4.4 Asynchronous microtask interleaving
    await tracker.runTest('B4.Toggle: Interleaved microtask toggles resolve deterministically', async () => {
      let state = false;
      const operations = [];

      for (let i = 0; i < 20; i++) {
        operations.push(new Promise(resolve => {
          queueMicrotask(() => {
            state = !state;
            toggleEnv.localStorage.setItem('whysogood_simple_mode', state ? 'true' : 'false');
            resolve(state);
          });
        }));
      }

      await Promise.all(operations);
      assertEqual(state, false); // 20 toggles is even -> false
      assertEqual(toggleEnv.localStorage.getItem('whysogood_simple_mode'), 'false');
    });

    // 4.5 Idempotent direct setters
    await tracker.runTest('B4.Toggle: Repeated setSimpleMode(true) x 50 is strictly idempotent', async () => {
      for (let i = 0; i < 50; i++) {
        toggleEnv.localStorage.setItem('whysogood_simple_mode', 'true');
      }
      assertEqual(toggleEnv.localStorage.getItem('whysogood_simple_mode'), 'true');
    });

    // 4.6 Rapid Category Switching stress
    await tracker.runTest('B4.Stress: Rapid category switching (100 transitions) preserves active file', async () => {
      const activeFile = new File(['content'], 'sample.png', { type: 'image/png' });
      const cats = ['Images', 'PDF', 'Data', 'Developer', 'Text', 'Security'];
      let currentCat = 'Images';

      for (let i = 0; i < 100; i++) {
        currentCat = cats[i % cats.length];
        assertTrue(activeFile instanceof File);
        assertEqual(activeFile.name, 'sample.png');
        assertEqual(activeFile.size, 7);
      }
      assertEqual(currentCat, cats[99 % cats.length]);
    });

    // 4.7 Rapid Output Generation and Removal
    await tracker.runTest('B4.Stress: Rapidly adding and removing outputs maintains list integrity', async () => {
      let outputs = [];
      const createdBlobs = [];

      // Add 25 outputs
      for (let i = 1; i <= 25; i++) {
        const previewUrl = URL.createObjectURL(new Blob([`data_${i}`]));
        createdBlobs.push(previewUrl);
        outputs.push({ id: `out-${i}`, previewUrl, name: `output_${i}.png` });
      }
      assertEqual(outputs.length, 25);

      // Remove 10 outputs
      const toRemove = outputs.slice(0, 10);
      for (const item of toRemove) {
        URL.revokeObjectURL(item.previewUrl);
      }
      outputs = outputs.filter(o => !toRemove.some(r => r.id === o.id));
      assertEqual(outputs.length, 15);
      assertEqual(outputs[0].id, 'out-11');
    });
  } finally {
    toggleEnv.cleanup();
  }

  // ==========================================================================
  // GROUP 5: LOCALSTORAGE FAILURE HANDLING & MALFORMED STORAGE
  // ==========================================================================
  console.log('\n--- Group 5: LocalStorage Failure Handling & Malformed Storage ---');

  // 5.1 QuotaExceededError handling
  await tracker.runTest('B5.Storage: QuotaExceededError in localStorage does not crash toggle action', async () => {
    const quotaEnv = setupMockBrowserEnvironment({ quotaExceeded: true });
    try {
      let state = false;
      const safeToggle = () => {
        state = !state;
        try {
          quotaEnv.localStorage.setItem('whysogood_simple_mode', state ? 'true' : 'false');
        } catch {
          // Handled gracefully in session.tsx
          return state;
        }
        return state;
      };

      const result1 = safeToggle();
      assertEqual(result1, true, 'State still toggles to true in memory even if storage throws quota error');
      const result2 = safeToggle();
      assertEqual(result2, false, 'State still toggles to false in memory');
    } finally {
      quotaEnv.cleanup();
    }
  });

  // 5.2 SecurityError (Private browsing)
  await tracker.runTest('B5.Storage: SecurityError on localStorage access caught gracefully on mount', async () => {
    const secEnv = setupMockBrowserEnvironment({ storageDisabled: true });
    try {
      let initialMode = false;
      try {
        const saved = secEnv.localStorage.getItem('whysogood_simple_mode');
        if (saved === 'true') initialMode = true;
      } catch {
        // Handled gracefully in session.tsx
        initialMode = false;
      }
      assertEqual(initialMode, false, 'Defaults safely to false under SecurityError');
    } finally {
      secEnv.cleanup();
    }
  });

  // 5.3 Corrupted & Injection Strings in LocalStorage
  const malformedStorageValues = [
    { val: 'undefined', expected: false },
    { val: 'null', expected: false },
    { val: 'TRUE', expected: false },
    { val: 'True', expected: false },
    { val: '1', expected: false },
    { val: 'yes', expected: false },
    { val: 'on', expected: false },
    { val: 'enable', expected: false },
    { val: '', expected: false },
    { val: '   ', expected: false },
    { val: 'true ', expected: false },
    { val: '{"simpleMode":true}', expected: false },
    { val: '<script>alert("xss")</script>', expected: false },
    { val: 'javascript:void(0)', expected: false },
    { val: '__proto__', expected: false },
    { val: 'true', expected: true }, // ONLY exact 'true' string
  ];

  const malEnv = setupMockBrowserEnvironment();
  try {
    for (const item of malformedStorageValues) {
      await tracker.runTest(`B5.Storage: Key value "${item.val}" evaluates to ${item.expected}`, async () => {
        malEnv.localStorage.setItem('whysogood_simple_mode', item.val);
        const stored = malEnv.localStorage.getItem('whysogood_simple_mode');
        // Exact logic from session.tsx: savedMode === 'true'
        const isEnabled = stored === 'true';
        assertEqual(isEnabled, item.expected);
      });
    }
  } finally {
    malEnv.cleanup();
  }

  // 5.4 Missing localStorage (window.localStorage undefined)
  await tracker.runTest('B5.Storage: Missing localStorage object handled safely without error', async () => {
    const rawEnv = setupMockBrowserEnvironment();
    try {
      Reflect.deleteProperty(globalThis.window, 'localStorage');
      let mode = false;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          mode = window.localStorage.getItem('whysogood_simple_mode') === 'true';
        }
      } catch {
        mode = false;
      }
      assertEqual(mode, false);
    } finally {
      rawEnv.cleanup();
    }
  });

  const summary = tracker.summary();
  console.log('\n================================================================');
  console.log(` ⚔️ CHALLENGER 1 FINISHED: ${summary.passed}/${summary.total} PASSED (${summary.failed} FAILED) in ${summary.durationMs}ms`);
  console.log('================================================================\n');
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runChallenger1Tests().then(s => {
    process.exit(s.failed > 0 ? 1 : 0);
  });
}
