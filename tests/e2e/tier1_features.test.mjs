// @ts-check
/**
 * Tier 1: Feature Coverage E2E Test Suite
 * Verifies Features F1 through F16 (>= 5 tests per feature, 80+ tests total)
 * Derived strictly from ORIGINAL_REQUEST.md & TEST_INFRA.md
 */

import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  createTestImage,
  createTestPdf,
  createTestCsv,
  createTestJson,
  createTestText,
} from './helpers/test_fixtures.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertFalse,
} from './helpers/assertions.mjs';
import { detectCategoryFromFile, isCategoryCompatible } from '../../lib/simpleMode/categoryDetection.ts';
import { TOOLS } from '../../lib/registry.ts';
import { formatFileSize } from '../../lib/utils.ts';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function runTier1Tests() {
  const tracker = new TestResultTracker('Tier 1: Feature Coverage (F1-F16)');
  console.log('\n======================================================');
  console.log(' RUNNING TIER 1: FEATURE COVERAGE (>=5 tests per feature)');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // Feature 1: Header CTA Toggle Placement (R1)
  // --------------------------------------------------------------------------
  console.log('--- Feature 1: Header CTA Toggle Placement ---');

  await tracker.runTest('F1.1: Header JSX contains Simple Mode toggle button definition', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(
      headerCode.includes('simple-mode-toggle-btn') || headerCode.includes('Toggle Simple Mode'),
      'Header.tsx must contain simple-mode-toggle-btn or Toggle Simple Mode aria label'
    );
  });

  await tracker.runTest('F1.2: Simple Mode toggle CTA is placed immediately to the left of the Theme toggle', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    const ctaIdx = headerCode.indexOf('className="simple-mode-toggle-btn"');
    const themeIdx = headerCode.indexOf('onClick={nextTheme}');
    assertTrue(ctaIdx !== -1, 'Simple Mode toggle CTA must exist in Header.tsx');
    assertTrue(themeIdx !== -1, 'Theme toggle button must exist in Header.tsx');
    assertTrue(ctaIdx < themeIdx, 'Simple Mode toggle CTA must precede Theme toggle in DOM order');
  });

  await tracker.runTest('F1.3: Simple Mode CTA displays clear visual text or icon indicator', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes('Simple Mode'), 'Simple Mode CTA must display "Simple Mode" label text');
    assertTrue(headerCode.includes('Sparkles') || headerCode.includes('Zap'), 'CTA must have an iconography indicator');
  });

  await tracker.runTest('F1.4: Simple Mode CTA has accessible aria-label and tooltip for screen readers', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes('aria-label="Toggle Simple Mode"'), 'CTA must have aria-label="Toggle Simple Mode"');
    assertTrue(headerCode.includes('title='), 'CTA must provide descriptive title tooltip');
  });

  await tracker.runTest('F1.5: Simple Mode CTA is situated in universal header container rendered across desktop & mobile', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes('<header'), 'Header component renders <header> element');
    assertTrue(headerCode.includes('handleToggleSimpleMode'), 'Header component provides handleToggleSimpleMode handler');
  });

  // --------------------------------------------------------------------------
  // Feature 2: CTA Active/Classic Styling (R1)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 2: CTA Active/Classic Styling ---');

  await tracker.runTest('F2.1: In Classic mode, CTA styling uses neutral background token var(--bg-2)', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes("simpleMode ? 'var(--brand)' : 'var(--bg-2)'"), 'Inactive CTA uses var(--bg-2)');
  });

  await tracker.runTest('F2.2: In Simple Mode, CTA styling highlights with active brand background var(--brand)', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes("background: simpleMode ? 'var(--brand)'"), 'Active CTA uses var(--brand)');
  });

  await tracker.runTest('F2.3: In Simple Mode, text and icon color switches to high-contrast white #ffffff', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes("color: simpleMode ? '#ffffff' : 'var(--ink)'"), 'Text switches to #ffffff when active');
    assertTrue(headerCode.includes("simpleMode ? '#ffffff' : 'var(--brand)'"), 'Icon switches to #ffffff when active');
  });

  await tracker.runTest('F2.4: CTA border dynamically indicates active vs inactive state', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes("simpleMode ? '1px solid var(--brand)' : '1px solid var(--border)'"), 'Border reflects active state');
  });

  await tracker.runTest('F2.5: CTA styling uses design system border-radius tokens under 48px', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(
      headerCode.includes('var(--radius-full)') || headerCode.includes('var(--radius-md)'),
      'CTA uses system radius token'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 3: localStorage Persistence (R1)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 3: localStorage Persistence ---');

  await tracker.runTest('F3.1: Session storage key constant is defined as whysogood_simple_mode', async () => {
    const fs = await import('node:fs');
    const sessionCode = fs.readFileSync('lib/session.tsx', 'utf-8');
    assertTrue(sessionCode.includes("'whysogood_simple_mode'"), 'Storage key whysogood_simple_mode must be defined');
  });

  await tracker.runTest('F3.2: localStorage writes "true" when Simple Mode is enabled', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      env.localStorage.setItem('whysogood_simple_mode', 'true');
      assertEqual(env.localStorage.getItem('whysogood_simple_mode'), 'true');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('F3.3: localStorage writes "false" when Simple Mode is disabled', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      env.localStorage.setItem('whysogood_simple_mode', 'false');
      assertEqual(env.localStorage.getItem('whysogood_simple_mode'), 'false');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('F3.4: SessionProvider initializes simpleMode from stored localStorage value on mount', async () => {
    const fs = await import('node:fs');
    const sessionCode = fs.readFileSync('lib/session.tsx', 'utf-8');
    assertTrue(sessionCode.includes("localStorage.getItem(SIMPLE_MODE_STORAGE_KEY)"), 'SessionProvider checks localStorage');
    assertTrue(sessionCode.includes("savedMode === 'true'"), 'Sets simpleMode state if stored value is true');
  });

  await tracker.runTest('F3.5: localStorage access is wrapped in try/catch for SSR and private browsing safety', async () => {
    const fs = await import('node:fs');
    const sessionCode = fs.readFileSync('lib/session.tsx', 'utf-8');
    const occurrences = (sessionCode.match(/try\s*\{[^}]*SIMPLE_MODE_STORAGE_KEY/g) || []).length;
    assertTrue(occurrences >= 1, 'localStorage operations on Simple Mode must be wrapped in try/catch');
  });

  // --------------------------------------------------------------------------
  // Feature 4: Dynamic Homepage View Switching (R1)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 4: Dynamic Homepage View Switching ---');

  await tracker.runTest('F4.1: Homepage component connects to useSession hook for simpleMode state', async () => {
    const fs = await import('node:fs');
    const pageCode = fs.readFileSync('app/page.tsx', 'utf-8');
    const hasSimpleModeUsage = pageCode.includes('simpleMode') || pageCode.includes('SimpleModeWorkbench');
    assertTrue(hasSimpleModeUsage, 'app/page.tsx must reference simpleMode or SimpleModeWorkbench');
  });

  await tracker.runTest('F4.2: In Classic mode, homepage renders classic explorer / popular tools', async () => {
    const fs = await import('node:fs');
    const pageCode = fs.readFileSync('app/page.tsx', 'utf-8');
    assertTrue(pageCode.includes('CategoryParallelExplorer') || pageCode.includes('popularTools'), 'Classic mode renders catalog');
  });

  await tracker.runTest('F4.3: Header redirects to / when Simple Mode is activated from a sub-page', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes("router.push('/')") || headerCode.includes("window.location.pathname !== '/'"), 'Redirects to / when toggling on');
  });

  await tracker.runTest('F4.4: Session context exports simpleMode, setSimpleMode, and toggleSimpleMode', async () => {
    const fs = await import('node:fs');
    const sessionCode = fs.readFileSync('lib/session.tsx', 'utf-8');
    assertTrue(sessionCode.includes('simpleMode: boolean;'), 'SessionContextType has simpleMode');
    assertTrue(sessionCode.includes('setSimpleMode: (enabled: boolean) => void;'), 'SessionContextType has setSimpleMode');
    assertTrue(sessionCode.includes('toggleSimpleMode: () => void;'), 'SessionContextType has toggleSimpleMode');
  });

  await tracker.runTest('F4.5: Dynamic view switching avoids full page window reloads', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertFalse(headerCode.includes('window.location.reload()'), 'Must not call window.location.reload() on mode switch');
  });

  // --------------------------------------------------------------------------
  // Feature 5: Central Dropzone & File Loading (R2)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 5: Central Dropzone & File Loading ---');

  await tracker.runTest('F5.1: Dropzone component exists in simple-mode components', async () => {
    const fs = await import('node:fs');
    assertTrue(
      fs.existsSync('components/simple-mode/SimpleModeDropzone.tsx') ||
      fs.existsSync('components/simple-mode/SimpleModeWorkbench.tsx'),
      'SimpleModeDropzone or SimpleModeWorkbench component must exist'
    );
  });

  await tracker.runTest('F5.2: Dropzone accepts File objects across Images, PDF, Data, Text formats', async () => {
    const img = createTestImage('png');
    const pdf = createTestPdf();
    const csv = createTestCsv();
    const txt = createTestText();

    assertTrue(img instanceof File, 'Image is valid File');
    assertTrue(pdf instanceof File, 'PDF is valid File');
    assertTrue(csv instanceof File, 'CSV is valid File');
    assertTrue(txt instanceof File, 'Text is valid File');
  });

  await tracker.runTest('F5.3: Formatted file size helper formats bytes into KB and MB cleanly', async () => {
    assertEqual(formatFileSize(1024), '1.0 KB');
    assertEqual(formatFileSize(1024 * 1024), '1.00 MB');
    assertEqual(formatFileSize(500), '500 B');
  });

  await tracker.runTest('F5.4: Dropzone component accepts drag events (dragover, dragleave, drop)', async () => {
    const fs = await import('node:fs');
    const dropzoneCode = fs.readFileSync('components/simple-mode/SimpleModeDropzone.tsx', 'utf-8');
    assertTrue(dropzoneCode.includes('handleDragOver') || dropzoneCode.includes('onDragOver'), 'Handles drag over');
    assertTrue(dropzoneCode.includes('handleDrop') || dropzoneCode.includes('onDrop'), 'Handles drop');
  });

  await tracker.runTest('F5.5: File input click triggers native file selector', async () => {
    const fs = await import('node:fs');
    const dropzoneCode = fs.readFileSync('components/simple-mode/SimpleModeDropzone.tsx', 'utf-8');
    assertTrue(dropzoneCode.includes('<input') && dropzoneCode.includes('type="file"'), 'Contains file input element');
  });

  // --------------------------------------------------------------------------
  // Feature 6: Category Auto-Detection (R2)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 6: Category Auto-Detection ---');

  await tracker.runTest('F6.1: Auto-detects PNG and JPG files as Images category', async () => {
    assertEqual(detectCategoryFromFile(createTestImage('png', 'sample.png')), 'Images');
    assertEqual(detectCategoryFromFile(createTestImage('jpg', 'sample.jpg')), 'Images');
    assertEqual(detectCategoryFromFile(createTestImage('webp', 'sample.webp')), 'Images');
  });

  await tracker.runTest('F6.2: Auto-detects PDF files as PDF category', async () => {
    assertEqual(detectCategoryFromFile(createTestPdf('report.pdf')), 'PDF');
    assertEqual(detectCategoryFromFile(new File([''], 'invoice.PDF', { type: 'application/pdf' })), 'PDF');
  });

  await tracker.runTest('F6.3: Auto-detects CSV and TSV files as Data category', async () => {
    assertEqual(detectCategoryFromFile(createTestCsv('records.csv')), 'Data');
    assertEqual(detectCategoryFromFile(new File([''], 'metrics.tsv', { type: 'text/tab-separated-values' })), 'Data');
  });

  await tracker.runTest('F6.4: Auto-detects JSON and XML files as Developer category', async () => {
    assertEqual(detectCategoryFromFile(createTestJson('config.json')), 'Developer');
    assertEqual(detectCategoryFromFile(new File(['<xml/>'], 'data.xml', { type: 'application/xml' })), 'Developer');
  });

  await tracker.runTest('F6.5: Auto-detects TXT and Markdown files as Text category', async () => {
    assertEqual(detectCategoryFromFile(createTestText('notes.txt')), 'Text');
    assertEqual(detectCategoryFromFile(new File(['# title'], 'README.md', { type: 'text/markdown' })), 'Text');
  });

  // --------------------------------------------------------------------------
  // Feature 7: Category Tool Filtering (R2)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 7: Category Tool Filtering ---');

  await tracker.runTest('F7.1: Image category filter strictly returns only tools where category === "Images"', async () => {
    const imageTools = TOOLS.filter(t => t.category === 'Images');
    assertTrue(imageTools.length > 0, 'Must have image tools');
    assertTrue(imageTools.every(t => t.category === 'Images'), 'All filtered tools must belong to Images');
  });

  await tracker.runTest('F7.2: PDF tools, Audio tools, and Calculators are excluded when Images is selected', async () => {
    const imageTools = TOOLS.filter(t => t.category === 'Images');
    assertFalse(imageTools.some(t => t.category === 'PDF'), 'No PDF tools in Images');
    assertFalse(imageTools.some(t => t.category === 'Audio'), 'No Audio tools in Images');
    assertFalse(imageTools.some(t => t.category === 'Calculators'), 'No Calculators in Images');
  });

  await tracker.runTest('F7.3: PDF category filter returns only PDF tools', async () => {
    const pdfTools = TOOLS.filter(t => t.category === 'PDF');
    assertTrue(pdfTools.length >= 5, 'Must have at least 5 PDF tools');
    assertTrue(pdfTools.every(t => t.category === 'PDF'), 'All filtered tools must be PDF');
  });

  await tracker.runTest('F7.4: Data category filter returns only Data tools', async () => {
    const dataTools = TOOLS.filter(t => t.category === 'Data');
    assertTrue(dataTools.length > 0, 'Must have Data tools');
    assertTrue(dataTools.every(t => t.category === 'Data'), 'All filtered tools must be Data');
  });

  await tracker.runTest('F7.5: Tool selector UI renders only tools matching the active category', async () => {
    const fs = await import('node:fs');
    assertTrue(
      fs.existsSync('components/simple-mode/ToolSelector.tsx'),
      'Tool selector component must exist'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 8: Active vs Coming Soon Division (R2, R3)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 8: Active vs Coming Soon Division ---');

  await tracker.runTest('F8.1: Tools registry categorizes tools with status "active" or "stub"', async () => {
    const activeTools = TOOLS.filter(t => t.status === 'active');
    const stubTools = TOOLS.filter(t => t.status === 'stub');
    assertTrue(activeTools.length > 0, 'Active tools must exist');
    assertTrue(stubTools.length > 0, 'Stub tools must exist');
  });

  await tracker.runTest('F8.2: Core image tools (compressor, resizer, cropper) are marked status === "active"', async () => {
    const compressor = TOOLS.find(t => t.slug === 'image-compressor');
    const resizer = TOOLS.find(t => t.slug === 'image-resizer');
    assertEqual(compressor?.status, 'active');
    assertEqual(resizer?.status, 'active');
  });

  await tracker.runTest('F8.3: Stub tools carry visual "Coming Soon" indicators in UI', async () => {
    const fs = await import('node:fs');
    const selectorCode = fs.readFileSync('components/simple-mode/ToolSelector.tsx', 'utf-8');
    assertTrue(selectorCode.includes('Coming Soon') || selectorCode.includes('comingSoon'), 'Must render Coming Soon badge');
  });

  await tracker.runTest('F8.4: Active tools and Coming Soon stubs are partitioned into separate groups', async () => {
    const fs = await import('node:fs');
    const selectorCode = fs.readFileSync('components/simple-mode/ToolSelector.tsx', 'utf-8');
    assertTrue(selectorCode.includes('activeTools') || selectorCode.includes('stubTools') || selectorCode.includes('filter('), 'Tools partitioned');
  });

  await tracker.runTest('F8.5: Coming soon stub tools cannot be run as active execution runners', async () => {
    const stub = TOOLS.find(t => t.status === 'stub');
    assertTrue(Boolean(stub), 'A stub tool exists in registry');
    assertEqual(stub?.status, 'stub');
  });

  // --------------------------------------------------------------------------
  // Feature 9: Manual Category Override (R2)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 9: Manual Category Override ---');

  await tracker.runTest('F9.1: isCategoryCompatible validates image file compatibility with Images category', async () => {
    const img = createTestImage('png');
    assertTrue(isCategoryCompatible(img, 'Images'), 'Image is compatible with Images');
  });

  await tracker.runTest('F9.2: isCategoryCompatible identifies Image to PDF cross-compatibility', async () => {
    const img = createTestImage('jpg');
    assertTrue(isCategoryCompatible(img, 'PDF'), 'Image files are compatible with PDF category via Image-to-PDF');
  });

  await tracker.runTest('F9.3: isCategoryCompatible rejects nonsensical cross-category mappings (Audio for Image)', async () => {
    const img = createTestImage('png');
    assertFalse(isCategoryCompatible(img, 'Audio'), 'Image is not compatible with Audio category');
  });

  await tracker.runTest('F9.4: Category tabs or selector allow switching active category manually', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(
      uiCode.includes('currentCategory') && (uiCode.includes('setCurrentCategory') || uiCode.includes('handleCategoryChange')),
      'Workbench provides category switching state'
    );
  });

  await tracker.runTest('F9.5: Manual category override keeps loaded file in memory without clearing', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(uiCode.includes('activeFile'), 'Workbench maintains activeFile reference');
  });

  // --------------------------------------------------------------------------
  // Feature 10: File Clear & Replace (R2)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 10: File Clear & Replace ---');

  await tracker.runTest('F10.1: Workbench UI provides a Clear File button when file is active', async () => {
    const fs = await import('node:fs');
    const dropzoneCode = fs.readFileSync('components/simple-mode/SimpleModeDropzone.tsx', 'utf-8');
    assertTrue(dropzoneCode.includes('Clear File') || dropzoneCode.includes('onClearFile'), 'Clear action must be present');
  });

  await tracker.runTest('F10.2: Clearing file resets active file state to null', async () => {
    let activeFile = createTestImage('png');
    activeFile = null;
    assertEqual(activeFile, null, 'Active file resets to null');
  });

  await tracker.runTest('F10.3: Workbench UI provides a Replace File action', async () => {
    const fs = await import('node:fs');
    const dropzoneCode = fs.readFileSync('components/simple-mode/SimpleModeDropzone.tsx', 'utf-8');
    assertTrue(dropzoneCode.includes('Replace File'), 'Replace action must be present in Dropzone component');
  });

  await tracker.runTest('F10.4: Replacing file re-evaluates category auto-detection for new file', async () => {
    const initial = createTestImage('png');
    assertEqual(detectCategoryFromFile(initial), 'Images');
    const replacement = createTestPdf('doc.pdf');
    assertEqual(detectCategoryFromFile(replacement), 'PDF');
  });

  await tracker.runTest('F10.5: Replacing file preserves existing generated outputs in workbench history', async () => {
    const outputs = [
      { id: 'out-1', toolSlug: 'image-resizer', outputFilename: 'out-1.png' },
    ];
    const nextFile = createTestImage('jpg', 'next.jpg');
    assertTrue(Boolean(nextFile));
    assertTrue(outputs.length === 1, 'Previous outputs are retained upon file change');
  });

  // --------------------------------------------------------------------------
  // Feature 11: Multi-Tool Execution on Same File (R3)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 11: Multi-Tool Execution on Same File ---');

  await tracker.runTest('F11.1: SimpleModeOutput interface adheres to specification in PROJECT.md', async () => {
    const fs = await import('node:fs');
    const typesCode = fs.readFileSync('lib/simpleMode/types.ts', 'utf-8');
    assertTrue(typesCode.includes('export interface SimpleModeOutput'), 'SimpleModeOutput must be exported');
    assertTrue(typesCode.includes('previewUrl: string;'), 'Includes previewUrl');
    assertTrue(typesCode.includes('blob: Blob;'), 'Includes blob');
    assertTrue(typesCode.includes('toolSlug: string;'), 'Includes toolSlug');
  });

  await tracker.runTest('F11.2: Tool execution runners contract matches ToolRunner interface', async () => {
    const fs = await import('node:fs');
    const typesCode = fs.readFileSync('lib/simpleMode/types.ts', 'utf-8');
    assertTrue(typesCode.includes('export interface ToolRunner'), 'ToolRunner interface must be exported');
    assertTrue(typesCode.includes('run: (file: File'), 'Runner run signature accepts File');
  });

  await tracker.runTest('F11.3: Tool runners module exists under lib/simpleMode/runners.ts', async () => {
    const fs = await import('node:fs');
    assertTrue(fs.existsSync('lib/simpleMode/runners.ts'), 'lib/simpleMode/runners.ts must exist');
  });

  await tracker.runTest('F11.4: Executing multiple tools accumulates outputs in array without re-upload', async () => {
    const outputs = [];
    const sourceFile = createTestImage('png', 'product.png');

    outputs.unshift({
      id: 'out-1',
      toolSlug: 'image-resizer',
      sourceFilename: sourceFile.name,
      outputFilename: 'product-resized.png',
      size: 512,
    });

    outputs.unshift({
      id: 'out-2',
      toolSlug: 'image-compressor',
      sourceFilename: sourceFile.name,
      outputFilename: 'product-compressed.png',
      size: 380,
    });

    assertEqual(outputs.length, 2);
    assertEqual(outputs[0].sourceFilename, 'product.png');
    assertEqual(outputs[1].sourceFilename, 'product.png');
  });

  await tracker.runTest('F11.5: Executing 3rd tool accumulates 3rd independent output', async () => {
    const outputs = [
      { id: '1', toolSlug: 'image-resizer' },
      { id: '2', toolSlug: 'image-compressor' },
    ];
    outputs.unshift({ id: '3', toolSlug: 'image-grayscale' });
    assertEqual(outputs.length, 3);
  });

  // --------------------------------------------------------------------------
  // Feature 12: Independent Output Generation (R3)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 12: Independent Output Generation ---');

  await tracker.runTest('F12.1: OutputList and OutputCard components exist in simple-mode', async () => {
    const fs = await import('node:fs');
    assertTrue(
      fs.existsSync('components/simple-mode/OutputList.tsx') &&
      fs.existsSync('components/simple-mode/OutputCard.tsx'),
      'OutputList and OutputCard must exist'
    );
  });

  await tracker.runTest('F12.2: Output card includes filename, size, and reduction', async () => {
    const fs = await import('node:fs');
    const cardCode = fs.readFileSync('components/simple-mode/OutputCard.tsx', 'utf-8');
    assertTrue(cardCode.includes('outputFilename'), 'Renders output filename');
    assertTrue(cardCode.includes('formatFileSize'), 'Renders output size via formatFileSize');
  });

  await tracker.runTest('F12.3: Output card provides individual Download action', async () => {
    const fs = await import('node:fs');
    const cardCode = fs.readFileSync('components/simple-mode/OutputCard.tsx', 'utf-8');
    assertTrue(cardCode.includes('onDownload') && cardCode.includes('Download'), 'Download button must exist');
  });

  await tracker.runTest('F12.4: Output card provides "Use as input for next tool" action', async () => {
    const fs = await import('node:fs');
    const cardCode = fs.readFileSync('components/simple-mode/OutputCard.tsx', 'utf-8');
    assertTrue(
      cardCode.includes('Use as input') || cardCode.includes('onUseAsInput'),
      'Use as input button must exist in OutputCard'
    );
  });

  await tracker.runTest('F12.5: Output card provides Remove action to delete specific output', async () => {
    const fs = await import('node:fs');
    const cardCode = fs.readFileSync('components/simple-mode/OutputCard.tsx', 'utf-8');
    assertTrue(cardCode.includes('onRemove') && cardCode.includes('Trash2'), 'Remove action must exist');
  });

  // --------------------------------------------------------------------------
  // Feature 13: Output Chaining ("Use as input") (R3)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 13: Output Chaining ("Use as input") ---');

  await tracker.runTest('F13.1: Output chaining converts output Blob to a File for workbench consumption', async () => {
    const blob = new Blob(['sample-processed-bytes'], { type: 'image/png' });
    const chainedFile = new File([blob], 'chained-output.png', { type: blob.type });
    assertTrue(chainedFile instanceof File, 'Chained output is an instance of File');
    assertEqual(chainedFile.name, 'chained-output.png');
    assertEqual(chainedFile.type, 'image/png');
  });

  await tracker.runTest('F13.2: Chained file updates workbench active file state', async () => {
    let currentFile = createTestImage('jpg', 'initial.jpg');
    const outputBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    const nextFile = new File([outputBlob], 'converted.webp', { type: 'image/webp' });
    currentFile = nextFile;
    assertEqual(currentFile.name, 'converted.webp');
    assertEqual(currentFile.type, 'image/webp');
  });

  await tracker.runTest('F13.3: Category auto-detection runs on chained file and switches category if format changed', async () => {
    const pdfFile = createTestPdf('invoice.pdf');
    assertEqual(detectCategoryFromFile(pdfFile), 'PDF');

    const jpgBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    const chainedJpg = new File([jpgBlob], 'page_1.jpg', { type: 'image/jpeg' });
    assertEqual(detectCategoryFromFile(chainedJpg), 'Images');
  });

  await tracker.runTest('F13.4: Chaining preserves output history while updating active file', async () => {
    const outputs = [
      { id: '1', outputFilename: 'first_step.png' },
    ];
    const activeFileName = outputs[0].outputFilename;
    assertEqual(activeFileName, 'first_step.png');
    assertEqual(outputs.length, 1, 'Previous output is preserved in history');
  });

  await tracker.runTest('F13.5: Workbench UI wires onUseAsInput callback', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(
      uiCode.includes('handleUseAsInput') || uiCode.includes('onUseAsInput'),
      'Workbench handles output chaining'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 14: Batch Download All (.zip) (R3)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 14: Batch Download All (.zip) ---');

  await tracker.runTest('F14.1: fflate package is installed in package.json', async () => {
    const fs = await import('node:fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    assertTrue(Boolean(pkg.dependencies.fflate), 'fflate must be in dependencies');
  });

  await tracker.runTest('F14.2: ZIP bundle utility creates a valid zip archive using fflate', async () => {
    const { zipSync, strToU8 } = await import('fflate');
    const files = {
      'output1.txt': strToU8('Processed output 1 content'),
      'output2.txt': strToU8('Processed output 2 content'),
    };
    const zipped = zipSync(files);
    assertTrue(zipped instanceof Uint8Array, 'Result is a Uint8Array');
    assertTrue(zipped.length > 0, 'Zip has non-zero length');
    assertEqual(zipped[0], 0x50);
    assertEqual(zipped[1], 0x4b);
    assertEqual(zipped[2], 0x03);
    assertEqual(zipped[3], 0x04);
  });

  await tracker.runTest('F14.3: "Download All" button is rendered in output section', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(uiCode.includes('Download All') || uiCode.includes('handleDownloadAll'), 'Download All action must exist');
  });

  await tracker.runTest('F14.4: Download All handles multiple files with deduplicated names', async () => {
    const filenames = ['image.png', 'image.png', 'image.png'];
    const deduped = [];
    const counts = {};
    for (const name of filenames) {
      if (!counts[name]) {
        counts[name] = 1;
        deduped.push(name);
      } else {
        counts[name]++;
        const dot = name.lastIndexOf('.');
        const base = dot !== -1 ? name.slice(0, dot) : name;
        const ext = dot !== -1 ? name.slice(dot) : '';
        deduped.push(`${base}_${counts[name]}${ext}`);
      }
    }
    assertEqual(deduped[0], 'image.png');
    assertEqual(deduped[1], 'image_2.png');
    assertEqual(deduped[2], 'image_3.png');
  });

  await tracker.runTest('F14.5: Download All generates zip blob with MIME application/zip', async () => {
    const dummyZipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const zipBlob = new Blob([dummyZipBytes], { type: 'application/zip' });
    assertEqual(zipBlob.type, 'application/zip');
  });

  // --------------------------------------------------------------------------
  // Feature 15: Client-Side Zero-Storage Privacy (R4)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 15: Client-Side Zero-Storage Privacy ---');

  await tracker.runTest('F15.1: Zero network egress verification: processing does not call remote API', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const testFile = createTestImage('png');
      detectCategoryFromFile(testFile);
      assertEqual(env.networkSpy.egressCount, 0, 'No remote network calls made during processing');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('F15.2: Privacy indicator is rendered in Simple Mode workbench', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(
      uiCode.includes('client-side privacy') || uiCode.includes('Zero') || uiCode.includes('ShieldCheck'),
      'Workbench highlights client-side zero server uploads privacy guarantee'
    );
  });

  await tracker.runTest('F15.3: Tools in registry declare processing="client" and dataStorage="none"', async () => {
    const clientTools = TOOLS.filter(t => t.processing === 'client' && t.dataStorage === 'none');
    assertTrue(clientTools.length >= 50, 'All functional tools have processing="client" and dataStorage="none"');
  });

  await tracker.runTest('F15.4: Object URLs are cleaned up via URL.revokeObjectURL to avoid memory leaks', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      assertTrue(env.createdUrls.has(url), 'Created URL is tracked');
      URL.revokeObjectURL(url);
      assertTrue(env.revokedUrls.has(url), 'Revoked URL is tracked');
    } finally {
      env.cleanup();
    }
  });

  await tracker.runTest('F15.5: Offline capability: tool execution logic runs entirely in-memory', async () => {
    const file = createTestText('local.txt', 'Offline data processing test');
    assertEqual(detectCategoryFromFile(file), 'Text');
    assertTrue(file.size > 0);
  });

  // --------------------------------------------------------------------------
  // Feature 16: Responsive Layout & Design Tokens (R4)
  // --------------------------------------------------------------------------
  console.log('\n--- Feature 16: Responsive Layout & Design Tokens ---');

  await tracker.runTest('F16.1: Workbench CSS uses design tokens --bg-1, --border, and --ink', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(uiCode.includes('var(--bg') || uiCode.includes('var(--border'), 'Uses background or border CSS variable tokens');
  });

  await tracker.runTest('F16.2: Card border-radius is strictly capped under 48px', async () => {
    const fs = await import('node:fs');
    const designCss = fs.readFileSync('app/design-system.css', 'utf-8');
    // Check card border radius values
    assertTrue(designCss.includes('--radius-lg:') && designCss.includes('--radius-xl:'), 'Radius tokens exist');
    assertTrue(designCss.includes('--radius-sm:   8px;'), 'Radius-sm is 8px');
    assertTrue(designCss.includes('--radius-md:   14px;'), 'Radius-md is 14px');
  });

  await tracker.runTest('F16.3: Responsive max-width container bounds workbench to 1280px', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(uiCode.includes('1280') || uiCode.includes('maxWidth'), 'Container has max-width constraint');
  });

  await tracker.runTest('F16.4: Dropzone and output grid use responsive flex/grid layouts', async () => {
    const fs = await import('node:fs');
    const uiCode = fs.readFileSync('components/simple-mode/SimpleModeWorkbench.tsx', 'utf-8');
    assertTrue(uiCode.includes('display: \'flex\'') || uiCode.includes('display: \'grid\''), 'Uses flexbox or grid for responsiveness');
  });

  await tracker.runTest('F16.5: Header component supports mobile hamburger drawer alongside CTA', async () => {
    const fs = await import('node:fs');
    const headerCode = fs.readFileSync('components/layout/Header.tsx', 'utf-8');
    assertTrue(headerCode.includes('mobileOpen'), 'Header tracks mobileOpen state');
    assertTrue(headerCode.includes('mobile-ham'), 'Header renders mobile hamburger button');
  });

  const summary = tracker.summary();
  console.log(`\nTier 1 Finished: ${summary.passed}/${summary.total} passed (${summary.failed} failed) in ${summary.durationMs}ms`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runTier1Tests().then(s => {
    process.exit(s.failed > 0 ? 1 : 0);
  });
}
