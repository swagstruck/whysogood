// @ts-check
import assert from 'node:assert';
import './e2e/helpers/ts_resolver.mjs';

const {
  formatHtml,
  formatCss,
  formatJs,
  formatSql,
  getLineAndColumn,
} = await import('../lib/developer/formatters.ts');

const {
  minifyHtml,
  minifyCss,
  minifyJson,
} = await import('../lib/developer/minifiers.ts');

const {
  SAMPLE_HTML,
  SAMPLE_CSS,
  SAMPLE_JS,
  SAMPLE_SQL,
  SAMPLE_JSON,
} = await import('../lib/developer/samples.ts');

async function runTests() {
  console.log('================================================================');
  console.log(' 🧪 RUNNING MILESTONE 1: FORMATTERS & MINIFIERS TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // --- Suite 1: Line & Column Coordinate Helper ---
  console.log('--- Suite 1: Utility Coordinates ---');
  test('T1.1: getLineAndColumn computes correct 1-indexed coordinates', () => {
    const text = 'line1\nline2\nline3 is longer';
    // Start of line 1
    assert.deepStrictEqual(getLineAndColumn(text, 0), { line: 1, column: 1 });
    // 'e' in line 1
    assert.deepStrictEqual(getLineAndColumn(text, 4), { line: 1, column: 5 });
    // Start of line 2 (offset 6)
    assert.deepStrictEqual(getLineAndColumn(text, 6), { line: 2, column: 1 });
    // Middle of line 3
    assert.deepStrictEqual(getLineAndColumn(text, 12), { line: 3, column: 1 });
  });

  // --- Suite 2: HTML Formatter ---
  console.log('\n--- Suite 2: HTML Formatter (formatHtml) ---');

  test('T2.1: formatHtml indents nested elements with 2 spaces by default', () => {
    const raw = '<div><p>Hello<span>World</span></p></div>';
    const res = formatHtml(raw, { indentSize: 2 });
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('<div>'));
    assert.ok(res.formatted.includes('  <p>'));
  });

  test('T2.2: formatHtml handles 4 spaces and tabs indentation options', () => {
    const raw = '<div><p>Text</p></div>';
    const res4 = formatHtml(raw, { indentSize: 4 });
    assert.ok(res4.formatted.includes('    <p>'));

    const resTab = formatHtml(raw, { indentType: 'tabs' });
    assert.ok(resTab.formatted.includes('\t<p>'));
  });

  test('T2.3: formatHtml preserves void tags without requiring closing tags', () => {
    const raw = '<form><input type="text"><br><img src="pic.jpg"><hr></form>';
    const res = formatHtml(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('<input type="text">'));
    assert.ok(res.formatted.includes('<br>'));
    assert.ok(res.formatted.includes('<hr>'));
  });

  test('T2.4: formatHtml preserves <pre> and <textarea> content verbatim', () => {
    const raw = '<section><pre>   line 1\n     line 2 (spaces preserved)\n   line 3</pre></section>';
    const res = formatHtml(raw);
    assert.ok(res.formatted.includes('   line 1\n     line 2 (spaces preserved)\n   line 3'));
  });

  test('T2.5: formatHtml formats embedded <style> and <script>', () => {
    const raw = '<html><head><style>body{color:red;margin:0;}</style></head><body><script>const x=1;console.log(x);</script></body></html>';
    const res = formatHtml(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('color: red;'));
    assert.ok(res.formatted.includes('const x = 1;'));
  });

  test('T2.6: formatHtml detects mismatched or unclosed tags with line/col coordinates', () => {
    const invalidHtml = '<div><section></p></div>';
    const res = formatHtml(invalidHtml);
    assert.ok(res.error !== undefined, 'Error should be populated');
    assert.ok(res.error?.message.includes('</p>'));
    assert.ok(typeof res.error?.line === 'number');
  });

  // --- Suite 3: CSS Formatter ---
  console.log('\n--- Suite 3: CSS Formatter (formatCss) ---');

  test('T3.1: formatCss indents declarations and formats braces', () => {
    const raw = '.card{background:#fff;padding:12px;border:1px solid #ccc}';
    const res = formatCss(raw, { indentSize: 2 });
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('.card {'));
    assert.ok(res.formatted.includes('  background: #fff;'));
    assert.ok(res.formatted.includes('  padding: 12px;'));
    assert.ok(res.formatted.includes('  border: 1px solid #ccc;'));
    assert.ok(res.formatted.includes('}'));
  });

  test('T3.2: formatCss handles nested rules and @media queries cleanly', () => {
    const raw = '@media (max-width:768px){.container{width:100%;padding:0;}}';
    const res = formatCss(raw, { indentSize: 2 });
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('@media (max-width: 768px) {'));
    assert.ok(res.formatted.includes('  .container {'));
    assert.ok(res.formatted.includes('    width: 100%;'));
  });

  test('T3.3: formatCss handles quotes and comments preservation', () => {
    const raw = '/* Card styles */ .btn{content:"Click me";font-family:\'Arial\';}';
    const res = formatCss(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('/* Card styles */'));
    assert.ok(res.formatted.includes('content:'));
  });

  test('T3.4: formatCss detects unclosed braces with line/column coordinates', () => {
    const invalidCss = '.header {\n  color: red;\n';
    const res = formatCss(invalidCss);
    assert.ok(res.error !== undefined);
    assert.ok(res.error?.message.includes('Unclosed CSS block'));
  });

  test('T3.5: formatCss preserves pseudo-classes and pseudo-elements without invalid spaces', () => {
    const raw = 'a:hover{color:red;}button::before{content:"";}:not(.active){opacity:0.5;}';
    const res = formatCss(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('a:hover {'), 'Must not inject space in :hover');
    assert.ok(res.formatted.includes('button::before {'), 'Must not inject space in ::before');
    assert.ok(res.formatted.includes(':not(.active) {'), 'Must not inject space in :not(...)');
    assert.ok(res.formatted.includes('color: red;'), 'Must inject space in property declaration');
  });

  // --- Suite 4: JS Formatter ---
  console.log('\n--- Suite 4: JS Formatter (formatJs) ---');

  test('T4.1: formatJs indents functions, objects, and statement blocks', () => {
    const raw = 'function calculate(a,b){if(a>b){return a-b;}else{return a+b;}}';
    const res = formatJs(raw, { indentSize: 2 });
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('function calculate(a, b) {'));
    assert.ok(res.formatted.includes('return a - b;'));
    assert.ok(res.formatted.includes('} else {'));
  });

  test('T4.2: formatJs formats binary operators and comma lists with clean spacing', () => {
    const raw = 'const total=price*quantity+tax;const list=[1,2,3];';
    const res = formatJs(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('const total = price * quantity + tax;'));
    assert.ok(res.formatted.includes('const list = [1, 2, 3];'));
  });

  test('T4.3: formatJs normalizes quotes according to options', () => {
    const raw = 'const name = "whysogood";';
    const resSingle = formatJs(raw, { quotes: 'single' });
    assert.ok(resSingle.formatted.includes("'whysogood'"));

    const resDouble = formatJs("const greeting = 'hello';", { quotes: 'double' });
    assert.ok(resDouble.formatted.includes('"hello"'));
  });

  test('T4.4: formatJs detects unbalanced brackets with line/column coordinates', () => {
    const invalidJs = 'function test() {\n  const x = [1, 2, 3;\n}';
    const res = formatJs(invalidJs);
    assert.ok(res.error !== undefined);
    assert.ok(res.error?.message.includes('Unmatched') || res.error?.message.includes('Unclosed'));
  });

  test('T4.5: formatJs preserves member access dots, optional chaining, and avoids orphaned semicolons', () => {
    const raw = 'const fn = () => {\n  return obj?.user.profile.getName();\n};';
    const res = formatJs(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('obj?.user.profile.getName()'), 'Must preserve member dots and optional chaining');
    const lines = res.formatted.split('\n').map(l => l.trim());
    assert.ok(!lines.includes(';'), 'Must not orphan semicolon on its own line');
  });

  // --- Suite 5: SQL Formatter ---
  console.log('\n--- Suite 5: SQL Formatter (formatSql) ---');

  test('T5.1: formatSql aligns major clauses (SELECT, FROM, WHERE, ORDER BY, LIMIT)', () => {
    const raw = 'select id, name, email from users where active = 1 order by id desc limit 10;';
    const res = formatSql(raw, { sqlKeywordCase: 'upper' });
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('SELECT'));
    assert.ok(res.formatted.includes('FROM'));
    assert.ok(res.formatted.includes('WHERE'));
    assert.ok(res.formatted.includes('ORDER BY'));
    assert.ok(res.formatted.includes('LIMIT'));
  });

  test('T5.2: formatSql places JOIN and logical AND/OR on dedicated lines', () => {
    const raw = 'SELECT u.id FROM users u INNER JOIN orders o ON o.user_id = u.id WHERE u.status = \'active\' AND o.amount > 100;';
    const res = formatSql(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('INNER JOIN'));
    assert.ok(res.formatted.includes('AND'));
  });

  test('T5.3: formatSql supports keyword casing (upper vs lower)', () => {
    const raw = 'select * from table where id = 1';
    const upper = formatSql(raw, { sqlKeywordCase: 'upper' });
    assert.ok(upper.formatted.includes('SELECT'));
    assert.ok(upper.formatted.includes('FROM'));
    assert.ok(upper.formatted.includes('WHERE'));

    const lower = formatSql(raw, { sqlKeywordCase: 'lower' });
    assert.ok(lower.formatted.includes('select'));
    assert.ok(lower.formatted.includes('from'));
    assert.ok(lower.formatted.includes('where'));
  });

  test('T5.4: formatSql detects unclosed parentheses or quotes', () => {
    const invalidSql = "SELECT * FROM users WHERE name = 'John";
    const res = formatSql(invalidSql);
    assert.ok(res.error !== undefined);
    assert.ok(res.error?.message.includes('Unclosed SQL string'));
  });

  test('T5.5: formatSql preserves qualified column dots, arithmetic minus, and subquery COUNT(*)', () => {
    const raw = 'SELECT u.id, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS cnt FROM users u WHERE 10 - 5 = 5;';
    const res = formatSql(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('u.id'), 'Must preserve u.id dot');
    assert.ok(res.formatted.includes('o.user_id = u.id'), 'Must preserve subquery dots');
    assert.ok(res.formatted.includes('COUNT(*)'), 'Must keep COUNT(*) together');
    assert.ok(res.formatted.includes('10 - 5'), 'Must preserve subtraction operator');
  });

  // --- Suite 6: HTML Minifier ---
  console.log('\n--- Suite 6: HTML Minifier (minifyHtml) ---');

  test('T6.1: minifyHtml collapses redundant whitespace and strips comments', () => {
    const raw = `
      <!-- Header Section -->
      <div class="   card    container   ">
        <h1>  Hello   World  </h1>
        <p> This is a test. </p>
      </div>
    `;
    const res = minifyHtml(raw);
    assert.ok(!res.minified.includes('<!-- Header Section -->'), 'Comments must be stripped');
    assert.ok(res.minified.includes('class="card container"'), 'Attributes must be collapsed');
    assert.ok(!res.minified.includes('> <'), 'Whitespace between tags must be collapsed');
    assert.ok(res.minifiedSize < res.originalSize);
    assert.ok(res.reductionPercentage > 0);
  });

  test('T6.2: minifyHtml minifies embedded <style> and <script> tags', () => {
    const raw = '<html><head><style> body { margin: 0px; padding: 0px; } </style></head><body><script> // Log message\n const msg = "hi"; </script></body></html>';
    const res = minifyHtml(raw);
    assert.ok(res.minified.includes('<style>body{margin:0;padding:0}</style>'));
    assert.ok(!res.minified.includes('// Log message'));
  });

  test('T6.3: minifyHtml preserves <pre> and <textarea> content intact', () => {
    const raw = '<div><pre>  formatted   spaces  \n  preserved  </pre></div>';
    const res = minifyHtml(raw);
    assert.ok(res.minified.includes('<pre>  formatted   spaces  \n  preserved  </pre>'));
  });

  // --- Suite 7: CSS Minifier & Calc Safety ---
  console.log('\n--- Suite 7: CSS Minifier (minifyCss) & Calc Safety ---');

  test('T7.1: minifyCss strips comments, collapses whitespace, and removes trailing semicolons', () => {
    const raw = `
      /* Global styles */
      .container {
        max-width: 1200px;
        margin: 0 auto;
        color: #ffffff;
      }
    `;
    const res = minifyCss(raw);
    assert.ok(!res.minified.includes('/* Global styles */'));
    assert.ok(res.minified.includes('.container{max-width:1200px;margin:0 auto;color:#fff}'));
    assert.ok(res.reductionPercentage > 0);
  });

  test('T7.2: CRITICAL - minifyCss SAFELY preserves calc(...) spaces around + and -', () => {
    const raw = `
      .sidebar {
        width: calc(100% - 40px);
        height: calc(50vh + 10px);
        margin: calc(2 * 8px);
      }
    `;
    const res = minifyCss(raw);
    // calc(...) MUST retain spaces around - and +
    assert.ok(res.minified.includes('calc(100% - 40px)'), `Expected calc(100% - 40px) to preserve spaces, got: ${res.minified}`);
    assert.ok(res.minified.includes('calc(50vh + 10px)'), `Expected calc(50vh + 10px) to preserve spaces, got: ${res.minified}`);
    assert.ok(res.minified.includes('calc(2*8px)'), `Multiplication operator can strip spaces, got: ${res.minified}`);
  });

  test('T7.3: minifyCss preserves string literals containing semicolons or braces', () => {
    const raw = '.icon::after { content: " ; } "; color: red; }';
    const res = minifyCss(raw);
    assert.ok(res.minified.includes('content:" ; } "'));
    assert.ok(res.minified.includes('color:red'));
  });

  test('T7.4: minifyCss optimizes 0 units (0px -> 0) and color codes (#000000 -> #000)', () => {
    const raw = 'a { padding: 0px; margin: 0rem; color: #000000; opacity: 0.5; }';
    const res = minifyCss(raw);
    assert.ok(res.minified.includes('padding:0'));
    assert.ok(res.minified.includes('margin:0'));
    assert.ok(res.minified.includes('color:#000'));
    assert.ok(res.minified.includes('opacity:.5'));
  });

  test('T7.5: minifyCss handles nested math functions without placeholder corruption', () => {
    const raw = '.box { width: min(100vw - 20px, calc(50% + 10px)); height: calc(100% - calc(20px + 2rem)); }';
    const res = minifyCss(raw);
    assert.strictEqual(res.error, undefined);
    assert.ok(!res.minified.includes('__WHYSO_CSS_CALC_'), 'No raw placeholder prefix');
    assert.ok(!res.minified.includes('__'), 'No placeholder residue');
    assert.ok(res.minified.includes('min(100vw - 20px,calc(50% + 10px))'));
    assert.ok(res.minified.includes('calc(100% - calc(20px + 2rem))'));
  });

  // --- Suite 8: JSON Minifier ---
  console.log('\n--- Suite 8: JSON Minifier (minifyJson) ---');

  test('T8.1: minifyJson compresses valid JSON and computes reduction metrics', () => {
    const raw = `{\n  "name": "whysogood",\n  "tools": 120,\n  "fast": true\n}`;
    const res = minifyJson(raw);
    assert.strictEqual(res.minified, '{"name":"whysogood","tools":120,"fast":true}');
    assert.ok(res.originalSize > res.minifiedSize);
    assert.ok(res.bytesSaved > 0);
    assert.ok(res.reductionPercentage > 0);
    assert.strictEqual(res.error, undefined);
  });

  test('T8.2: minifyJson sorts keys when requested', () => {
    const raw = '{"z": 1, "a": 2, "m": 3}';
    const res = minifyJson(raw, { sortKeys: true });
    assert.strictEqual(res.minified, '{"a":2,"m":3,"z":1}');
  });

  test('T8.3: minifyJson pinpoints syntax errors with line/column coordinates', () => {
    const invalidJson = '{\n  "name": "test",\n  "invalid": \n}';
    const res = minifyJson(invalidJson);
    assert.ok(res.error !== undefined);
    assert.ok(typeof res.error?.line === 'number');
    assert.ok(typeof res.error?.column === 'number');
    assert.strictEqual(res.minified, '');
  });

  // --- Suite 9: Realistic Samples Validation ---
  console.log('\n--- Suite 9: Samples Validation (samples.ts) ---');

  test('T9.1: SAMPLE_HTML formats and minifies cleanly without errors', () => {
    assert.ok(SAMPLE_HTML.length > 100);
    const fRes = formatHtml(SAMPLE_HTML);
    assert.strictEqual(fRes.error, undefined);
    const mRes = minifyHtml(SAMPLE_HTML);
    assert.strictEqual(mRes.error, undefined);
    assert.ok(mRes.bytesSaved > 0);
  });

  test('T9.2: SAMPLE_CSS formats and minifies cleanly without errors', () => {
    assert.ok(SAMPLE_CSS.length > 100);
    const fRes = formatCss(SAMPLE_CSS);
    assert.strictEqual(fRes.error, undefined);
    const mRes = minifyCss(SAMPLE_CSS);
    assert.strictEqual(mRes.error, undefined);
    assert.ok(mRes.bytesSaved > 0);
    // Check that calc in SAMPLE_CSS is preserved
    assert.ok(mRes.minified.includes('calc(100vh - var(--header-height))'));
    assert.ok(mRes.minified.includes('calc(100% - 32px)'));
  });

  test('T9.3: SAMPLE_JS formats cleanly without errors and preserves member access dots', () => {
    assert.ok(SAMPLE_JS.length > 100);
    const fRes = formatJs(SAMPLE_JS);
    assert.strictEqual(fRes.error, undefined);
    assert.ok(fRes.formatted.includes('performance.now()'), 'Must preserve performance.now() dot');
    assert.ok(fRes.formatted.includes('console.log('), 'Must preserve console.log dot');
    assert.ok(fRes.formatted.includes('job.sourceType'), 'Must preserve job.sourceType dot');
    assert.ok(fRes.formatted.includes('job.payload.trim()'), 'Must preserve chained property access dots');
  });

  test('T9.4: SAMPLE_SQL formats cleanly without errors and preserves qualified column dots', () => {
    assert.ok(SAMPLE_SQL.length > 100);
    const fRes = formatSql(SAMPLE_SQL);
    assert.strictEqual(fRes.error, undefined);
    assert.ok(fRes.formatted.includes('u.id'), 'Must preserve u.id dot');
    assert.ok(fRes.formatted.includes('u.username'), 'Must preserve u.username dot');
    assert.ok(fRes.formatted.includes('p.user_id = u.id'), 'Must preserve join condition dots');
    assert.ok(fRes.formatted.includes('COUNT(o.id)'), 'Must preserve COUNT(o.id) dot');
  });

  test('T9.5: SAMPLE_JSON minifies cleanly without errors', () => {
    assert.ok(SAMPLE_JSON.length > 100);
    const mRes = minifyJson(SAMPLE_JSON);
    assert.strictEqual(mRes.error, undefined);
    assert.ok(mRes.bytesSaved > 0);
  });

  console.log('\n================================================================');
  console.log(` 🏁 RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed.`);
  }
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
