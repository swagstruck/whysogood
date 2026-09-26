// @ts-check
/**
 * Adversarial Challenger Test Suite: Milestone 1 (Formatters & Minifiers)
 * Agent: teamwork_preview_challenger_m1_2
 *
 * Tests edge cases & stress:
 * 1. Large inputs (10k lines of JSON, 5k lines of CSS, HTML, SQL)
 * 2. Pathological syntax errors (dangling quotes, unterminated brackets, binary characters)
 * 3. Indentation options (tabs, 2 spaces, 4 spaces) across all formatters
 * 4. Concurrency and re-entrancy (parallel calls, embedded styles/scripts)
 * 5. Verify line/column numbers accurately point to syntax errors in HTML/CSS/JSON
 * 6. Adversarial integrity probes (nested calc in CSS minifier, dot preservation in JS and SQL)
 */

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

const { calcReductionPct } = await import('../lib/utils.ts');

async function runChallengerTests() {
  console.log('================================================================');
  console.log(' ⚔️  RUNNING ADVERSARIAL CHALLENGER SUITE: MILESTONE 1 (m1_2)');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const failures = [];

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      failures.push({ name, error: err.message });
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  async function testAsync(name, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      failures.push({ name, error: err.message });
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // ==========================================================================
  // SUITE 1: Large Inputs Stress & Performance Benchmarks
  // ==========================================================================
  console.log('--- Suite 1: Large Inputs Stress & Performance ---');

  test('S1.1: Large JSON (10,000 lines) minification performance & correctness', () => {
    // Generate ~10,000 lines of structured JSON
    const data = {};
    for (let i = 0; i < 2000; i++) {
      data[`record_${i}`] = {
        id: i,
        name: `User ${i}`,
        roles: ['admin', 'editor', 'viewer'],
        metadata: { score: i * 1.5, active: i % 2 === 0 },
      };
    }
    const jsonStr = JSON.stringify(data, null, 2);
    const lineCount = jsonStr.split('\n').length;
    assert.ok(lineCount >= 10000, `Expected >= 10k lines, got ${lineCount}`);

    const t0 = performance.now();
    const result = minifyJson(jsonStr);
    const elapsed = performance.now() - t0;

    assert.strictEqual(result.error, undefined, 'Large JSON should parse without error');
    assert.ok(elapsed < 1000, `Large JSON minification took ${elapsed.toFixed(1)}ms (expected < 1000ms)`);
    assert.ok(result.minifiedSize < result.originalSize, 'Minified size must be smaller than original');
    assert.strictEqual(result.bytesSaved, result.originalSize - result.minifiedSize);
    assert.strictEqual(result.reductionPercentage, calcReductionPct(result.originalSize, result.minifiedSize));

    // Verify round-trip semantic equivalence
    const parsedMinified = JSON.parse(result.minified);
    assert.strictEqual(Object.keys(parsedMinified).length, 2000);
    assert.strictEqual(parsedMinified.record_100.name, 'User 100');
  });

  test('S1.2: Large CSS (5,000 lines) formatting performance & structure', () => {
    const rules = [];
    for (let i = 0; i < 1000; i++) {
      rules.push(`.component-card-${i} {`);
      rules.push(`  display: flex;`);
      rules.push(`  margin: 10px;`);
      rules.push(`  padding: calc(100% - 20px);`);
      rules.push(`  color: #333333;`);
      rules.push(`}`);
    }
    const cssInput = rules.join('\n');
    assert.ok(cssInput.split('\n').length >= 5000, 'Expected >= 5000 lines');

    const t0 = performance.now();
    const result = formatCss(cssInput);
    const elapsed = performance.now() - t0;

    assert.strictEqual(result.error, undefined, 'Large CSS format should have no error');
    assert.ok(elapsed < 1000, `Large CSS formatting took ${elapsed.toFixed(1)}ms (expected < 1000ms)`);
    assert.ok(result.formatted.includes('.component-card-0 {'), 'Must format first rule');
    assert.ok(result.formatted.includes('.component-card-999 {'), 'Must format last rule');
    assert.ok(result.formatted.includes('  display: flex;'), 'Must indent declarations');
  });

  test('S1.3: Large CSS (5,000 lines) minification performance & calc preservation', () => {
    const rules = [];
    for (let i = 0; i < 1000; i++) {
      rules.push(`.component-card-${i} {`);
      rules.push(`  display: flex;`);
      rules.push(`  padding: calc(100% - 20px);`);
      rules.push(`  color: #ffffff;`);
      rules.push(`}`);
    }
    const cssInput = rules.join('\n');

    const t0 = performance.now();
    const result = minifyCss(cssInput);
    const elapsed = performance.now() - t0;

    assert.strictEqual(result.error, undefined, 'Large CSS minify should have no error');
    assert.ok(elapsed < 1000, `Large CSS minification took ${elapsed.toFixed(1)}ms (expected < 1000ms)`);
    assert.ok(result.minified.includes('calc(100% - 20px)'), 'calc() operators must maintain spacing');
    assert.ok(result.minified.includes('color:#fff'), 'color optimization applied');
    assert.ok(result.bytesSaved > 0, 'Must save bytes');
  });

  test('S1.4: Large HTML (3,000 lines) formatting & minification', () => {
    const lines = ['<main>'];
    for (let i = 0; i < 1000; i++) {
      lines.push(`  <div class="row row-${i}">`);
      lines.push(`    <span class="label">Item ${i}</span>`);
      lines.push(`  </div>`);
    }
    lines.push('</main>');
    const htmlInput = lines.join('\n');

    const fmtResult = formatHtml(htmlInput);
    assert.strictEqual(fmtResult.error, undefined);
    assert.ok(fmtResult.formatted.includes('    <span class="label">Item 500</span>'));

    const minResult = minifyHtml(htmlInput);
    assert.strictEqual(minResult.error, undefined);
    assert.ok(minResult.minified.includes('<main><div class="row row-0"><span class="label">Item 0</span></div>'));
  });

  // ==========================================================================
  // SUITE 2: Pathological Syntax Errors & Robustness
  // ==========================================================================
  console.log('\n--- Suite 2: Pathological Syntax Errors & Robustness ---');

  test('S2.1: Dangling quotes in CSS reporting accurate error', () => {
    const cssDangling = 'header {\n  font-family: "Open Sans, sans-serif;\n  color: red;\n}';
    const res = formatCss(cssDangling);
    assert.ok(res.error, 'formatCss must detect unterminated string');
    assert.strictEqual(res.error.message, 'Unterminated CSS string literal');
    assert.strictEqual(res.error.line, 2);
    assert.strictEqual(res.error.column, 16);
  });

  test('S2.2: Dangling quotes in JS reporting accurate error', () => {
    const jsDangling = 'function greet() {\n  const message = "Hello World;\n  return message;\n}';
    const res = formatJs(jsDangling);
    assert.ok(res.error, 'formatJs must detect unterminated string');
    assert.strictEqual(res.error.message, 'Unterminated string literal');
    assert.strictEqual(res.error.line, 2);
    assert.strictEqual(res.error.column, 19);
  });

  test('S2.3: Dangling quotes in SQL reporting accurate error', () => {
    const sqlDangling = 'SELECT * FROM users\nWHERE username = \'admin\nAND active = 1;';
    const res = formatSql(sqlDangling);
    assert.ok(res.error, 'formatSql must detect unterminated string literal');
    assert.strictEqual(res.error.message, 'Unclosed SQL string literal');
    assert.strictEqual(res.error.line, 2);
    assert.strictEqual(res.error.column, 18);
  });

  test('S2.4: Dangling quotes in JSON reporting accurate error', () => {
    const jsonDangling = '{\n  "user": "Alice,\n  "age": 30\n}';
    const res = minifyJson(jsonDangling);
    assert.ok(res.error, 'minifyJson must return error on dangling quote');
    assert.strictEqual(res.error.line, 2);
    assert.strictEqual(res.minified, '');
  });

  test('S2.5: Unterminated brackets across HTML/CSS/JS/SQL/JSON', () => {
    // HTML unclosed
    const htmlRes = formatHtml('<html><body><div><p>Unclosed');
    assert.ok(htmlRes.error, 'HTML must detect unclosed tags');
    assert.ok(htmlRes.error.message.includes('Unclosed tag'));

    // CSS unclosed
    const cssRes = formatCss('body {\n  .container {\n    color: blue;\n}');
    assert.ok(cssRes.error, 'CSS must detect unclosed brace');
    assert.ok(cssRes.error.message.includes('Unclosed CSS block'));

    // JS unclosed
    const jsRes = formatJs('function run() {\n  const list = [1, 2, 3;\n}');
    assert.ok(jsRes.error, 'JS must detect unclosed bracket');
    assert.ok(jsRes.error.message.includes('Unmatched closing bracket'));

    // SQL unclosed
    const sqlRes = formatSql('SELECT * FROM (\n  SELECT id FROM users\nWHERE id > 10');
    assert.ok(sqlRes.error, 'SQL must detect unclosed parenthesis');
    assert.strictEqual(sqlRes.error.line, 1);
    assert.strictEqual(sqlRes.error.column, 15);

    // JSON unclosed
    const jsonRes = minifyJson('{"data": [1, 2, 3');
    assert.ok(jsonRes.error, 'JSON must detect unclosed array/object');
  });

  test('S2.6: Unterminated comments in HTML/CSS/JS/SQL', () => {
    const htmlCom = '<div>Test</div>\n<!-- Unclosed comment starts here';
    const htmlRes = formatHtml(htmlCom);
    assert.ok(htmlRes.error, 'HTML must detect unclosed comment');
    assert.strictEqual(htmlRes.error.line, 2);

    const cssCom = 'body {\n  color: red;\n}\n/* Unclosed CSS comment';
    const cssRes = formatCss(cssCom);
    assert.ok(cssRes.error, 'CSS must detect unclosed comment');
    assert.strictEqual(cssRes.error.line, 4);

    const jsCom = 'function foo() {}\n/* Unclosed JS block comment';
    const jsRes = formatJs(jsCom);
    assert.ok(jsRes.error, 'JS must detect unclosed comment');
    assert.strictEqual(jsRes.error.line, 2);

    const sqlCom = 'SELECT * FROM users;\n/* Unclosed SQL comment';
    const sqlRes = formatSql(sqlCom);
    assert.ok(sqlRes.error, 'SQL must detect unclosed comment');
    assert.strictEqual(sqlRes.error.line, 2);
  });

  test('S2.7: Binary characters & control codes resilience without crash', () => {
    const binaryGarbage = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f\x10\x1f\x7f\ufffd\ufeff';
    const mixedInput = `<div>\x00Hello \uD83D\uDE80\x01\x1F World!</div>`;

    // None of these should throw uncaught exceptions
    const hFmt = formatHtml(mixedInput);
    assert.strictEqual(typeof hFmt.formatted, 'string');

    const cFmt = formatCss(`.rule { content: "${binaryGarbage}"; }`);
    assert.strictEqual(typeof cFmt.formatted, 'string');

    const jFmt = formatJs(`const b = "${binaryGarbage}";`);
    assert.strictEqual(typeof jFmt.formatted, 'string');

    const sFmt = formatSql(`SELECT '${binaryGarbage}' AS bin_col;`);
    assert.strictEqual(typeof sFmt.formatted, 'string');

    const hMin = minifyHtml(mixedInput);
    assert.strictEqual(typeof hMin.minified, 'string');

    const cMin = minifyCss(`.rule { content: "${binaryGarbage}"; }`);
    assert.strictEqual(typeof cMin.minified, 'string');

    const jMin = minifyJson(binaryGarbage);
    assert.ok(jMin.error, 'Binary garbage is invalid JSON but must not crash');
  });

  // ==========================================================================
  // SUITE 3: Indentation Options Across All Formatters
  // ==========================================================================
  console.log('\n--- Suite 3: Indentation Options Across All Formatters ---');

  test('S3.1: HTML indentation options (tabs, 2 spaces, 4 spaces)', () => {
    const input = '<div><section><p>Hello</p></section></div>';

    const resTabs = formatHtml(input, { indentType: 'tabs' });
    assert.ok(resTabs.formatted.includes('\t<section>'), 'HTML tabs level 1');
    assert.ok(resTabs.formatted.includes('\t\t<p>'), 'HTML tabs level 2');

    const res2 = formatHtml(input, { indentType: 'spaces', indentSize: 2 });
    assert.ok(res2.formatted.includes('  <section>'), 'HTML 2 spaces level 1');
    assert.ok(res2.formatted.includes('    <p>'), 'HTML 2 spaces level 2');

    const res4 = formatHtml(input, { indentType: 'spaces', indentSize: 4 });
    assert.ok(res4.formatted.includes('    <section>'), 'HTML 4 spaces level 1');
    assert.ok(res4.formatted.includes('        <p>'), 'HTML 4 spaces level 2');
  });

  test('S3.2: CSS indentation options (tabs, 2 spaces, 4 spaces)', () => {
    const input = '@media (min-width: 768px) {\n.card {\npadding: 16px;\n}\n}';

    const resTabs = formatCss(input, { indentType: 'tabs' });
    assert.ok(resTabs.formatted.includes('\t.card {'), 'CSS tabs level 1');
    assert.ok(resTabs.formatted.includes('\t\tpadding: 16px;'), 'CSS tabs level 2');

    const res2 = formatCss(input, { indentType: 'spaces', indentSize: 2 });
    assert.ok(res2.formatted.includes('  .card {'), 'CSS 2 spaces level 1');
    assert.ok(res2.formatted.includes('    padding: 16px;'), 'CSS 2 spaces level 2');

    const res4 = formatCss(input, { indentType: 'spaces', indentSize: 4 });
    assert.ok(res4.formatted.includes('    .card {'), 'CSS 4 spaces level 1');
    assert.ok(res4.formatted.includes('        padding: 16px;'), 'CSS 4 spaces level 2');
  });

  test('S3.3: JS indentation options (tabs, 2 spaces, 4 spaces)', () => {
    const input = 'function outer() {\nfunction inner() {\nreturn 42;\n}\n}';

    const resTabs = formatJs(input, { indentType: 'tabs' });
    assert.ok(resTabs.formatted.includes('\tfunction inner() {'), 'JS tabs level 1');
    assert.ok(resTabs.formatted.includes('\t\treturn 42;'), 'JS tabs level 2');

    const res2 = formatJs(input, { indentType: 'spaces', indentSize: 2 });
    assert.ok(res2.formatted.includes('  function inner() {'), 'JS 2 spaces level 1');
    assert.ok(res2.formatted.includes('    return 42;'), 'JS 2 spaces level 2');

    const res4 = formatJs(input, { indentType: 'spaces', indentSize: 4 });
    assert.ok(res4.formatted.includes('    function inner() {'), 'JS 4 spaces level 1');
    assert.ok(res4.formatted.includes('        return 42;'), 'JS 4 spaces level 2');
  });

  test('S3.4: SQL indentation options (tabs, 2 spaces, 4 spaces)', () => {
    const input = 'SELECT * FROM (\nSELECT id, name FROM users\n) sub';

    const resTabs = formatSql(input, { indentType: 'tabs' });
    assert.ok(resTabs.formatted.includes('\tSELECT id,'), 'SQL tabs subquery');

    const res2 = formatSql(input, { indentType: 'spaces', indentSize: 2 });
    assert.ok(res2.formatted.includes('  SELECT id,'), 'SQL 2 spaces subquery');

    const res4 = formatSql(input, { indentType: 'spaces', indentSize: 4 });
    assert.ok(res4.formatted.includes('    SELECT id,'), 'SQL 4 spaces subquery');
  });

  // ==========================================================================
  // SUITE 4: Concurrency & Re-Entrancy
  // ==========================================================================
  console.log('\n--- Suite 4: Concurrency & Re-Entrancy ---');

  await testAsync('S4.1: Concurrency: 100 parallel calls across formatters and minifiers', async () => {
    const concurrencyTasks = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      concurrencyTasks.push((async () => {
        // Yield to event loop to simulate realistic async dispatch
        await new Promise((resolve) => setImmediate(resolve));

        const html = `<article id="item-${i}"><p>Item content ${i}</p></article>`;
        const fHtml = formatHtml(html);
        assert.ok(fHtml.formatted.includes(`id="item-${i}"`));
        const mHtml = minifyHtml(html);
        assert.ok(mHtml.minified.includes(`id="item-${i}"`));

        const css = `.item-class-${i} { width: calc(100% - ${i}px); color: #112233; }`;
        const fCss = formatCss(css);
        assert.ok(fCss.formatted.includes(`.item-class-${i}`));
        const mCss = minifyCss(css);
        assert.ok(mCss.minified.includes(`.item-class-${i}`));
        assert.ok(mCss.minified.includes(`calc(100% - ${i}px)`));

        const js = `const item_${i} = { id: ${i}, label: "label_${i}" };`;
        const fJs = formatJs(js);
        assert.ok(fJs.formatted.includes(`item_${i}`));

        const sql = `SELECT * FROM items_${i} WHERE item_id = ${i};`;
        const fSql = formatSql(sql);
        assert.ok(fSql.formatted.includes(`items_${i}`));

        const json = JSON.stringify({ index: i, text: `sample_${i}` });
        const mJson = minifyJson(json);
        assert.strictEqual(mJson.minified, `{"index":${i},"text":"sample_${i}"}`);
      })());
    }

    await Promise.all(concurrencyTasks);
  });

  test('S4.2: Re-entrancy: HTML formatting with embedded CSS & JS blocks', () => {
    const complexHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .banner {
      width: calc(100vw - 40px);
      background-color: #ffffff;
    }
  </style>
  <script>
    function initialize() {
      const config = { active: true };
      return config;
    }
  </script>
</head>
<body>
  <div class="banner"><h1>Hello</h1></div>
</body>
</html>`;

    const res = formatHtml(complexHtml);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.formatted.includes('width: calc(100vw - 40px);'));
    assert.ok(res.formatted.includes('function initialize() {'));

    const minRes = minifyHtml(complexHtml);
    assert.strictEqual(minRes.error, undefined);
    assert.ok(minRes.minified.includes('.banner{width:calc(100vw - 40px);background-color:#fff}'));
  });

  // ==========================================================================
  // SUITE 5: Precision Verification of Line/Column Error Coordinates
  // ==========================================================================
  console.log('\n--- Suite 5: Precision Verification of Line/Column Error Coordinates ---');

  test('S5.1: HTML line/column coordinate precision', () => {
    // Error at line 3 column 5
    const html = '<div>\n  <p>Hello</p>\n    </span>\n</div>';
    const res = formatHtml(html);
    assert.ok(res.error, 'Must detect unexpected closing tag');
    assert.strictEqual(res.error.line, 3, 'HTML error line must be 3');
    assert.strictEqual(res.error.column, 5, 'HTML error column must be 5');

    // Unclosed tag at line 2 column 3
    const htmlUnclosed = '<div>\n  <span>\n</div>';
    const res2 = formatHtml(htmlUnclosed);
    assert.ok(res2.error, 'Must detect unclosed span tag');
    assert.strictEqual(res2.error.line, 2);
    assert.strictEqual(res2.error.column, 3);
  });

  test('S5.2: CSS line/column coordinate precision', () => {
    // Unterminated string starting at line 2 column 16
    const cssStr = 'h1 {\n  font-family: "Open Sans;\n}';
    const res1 = formatCss(cssStr);
    assert.ok(res1.error);
    assert.strictEqual(res1.error.line, 2);
    assert.strictEqual(res1.error.column, 16);

    // Unterminated block comment at line 3 column 3
    const cssCom = 'h1 {\n  color: red;\n  /* comment starts';
    const res2 = formatCss(cssCom);
    assert.ok(res2.error);
    assert.strictEqual(res2.error.line, 3);
    assert.strictEqual(res2.error.column, 3);

    // Unexpected closing brace at line 4 column 1
    const cssBrace = 'h1 {\n  color: red;\n}\n}';
    const res3 = formatCss(cssBrace);
    assert.ok(res3.error);
    assert.strictEqual(res3.error.line, 4);
    assert.strictEqual(res3.error.column, 1);
  });

  test('S5.3: JSON line/column coordinate precision', () => {
    // Trailing comma error at line 4 column 1
    const json1 = '{\n  "a": 1,\n  "b": 2,\n}';
    const res1 = minifyJson(json1);
    assert.ok(res1.error);
    assert.strictEqual(res1.error.line, 4);
    assert.strictEqual(res1.error.column, 1);

    // Missing colon at line 2 column 7
    const json2 = '{\n  "a" 1\n}';
    const res2 = minifyJson(json2);
    assert.ok(res2.error);
    assert.strictEqual(res2.error.line, 2);
    assert.strictEqual(res2.error.column, 7);

    // Bad control character in unclosed string at line 3 column 17
    const json3 = '{\n  "name": "Alice",\n  "city": "Paris\n}';
    const res3 = minifyJson(json3);
    assert.ok(res3.error);
    assert.strictEqual(res3.error.line, 3);
    assert.strictEqual(res3.error.column, 17);
  });

  // ==========================================================================
  // SUITE 6: Adversarial Integrity Probes (Challenger Empirical Findings)
  // ==========================================================================
  console.log('\n--- Suite 6: Adversarial Integrity Probes (Challenger Invariant Checks) ---');

  test('S6.1: [ADVERSARIAL BUG PROBE] minifyCss must not corrupt nested calc/min/max/clamp with placeholder IDs', () => {
    // Real-world modern responsive CSS with nested calc expressions
    const nestedCss = 'div { width: min(100vw - 20px, calc(50% + 10px)); }';
    const result = minifyCss(nestedCss);

    // The output MUST NOT contain raw internal placeholders like '__WHYSO_CSS_CALC_' or leaked digits/timestamps
    const hasCorruptedPlaceholder = result.minified.includes('__WHYSO_CSS_CALC_') || /__\d+__|\d{12,}_\d+__/.test(result.minified);
    assert.ok(!hasCorruptedPlaceholder, `CRITICAL BUG FOUND: minifyCss corrupted nested calc with leaked placeholder: "${result.minified}"`);
    assert.strictEqual(result.minified, 'div{width:min(100vw - 20px,calc(50% + 10px))}');
  });

  test('S6.2: [ADVERSARIAL BUG PROBE] formatJs must preserve member access dot operator in expressions', () => {
    // JavaScript object member access and method calls
    const jsInput = 'console.log("hello");\nconst prop = obj.field.value;';
    const result = formatJs(jsInput);

    // The output MUST contain 'console.log' and 'obj.field.value' - NOT 'console log' or 'obj field value'
    assert.ok(result.formatted.includes('console.log'), `CRITICAL BUG FOUND: formatJs stripped property access dot from console.log: "${result.formatted.trim()}"`);
    assert.ok(result.formatted.includes('obj.field.value'), `CRITICAL BUG FOUND: formatJs stripped property access dots from obj.field.value: "${result.formatted.trim()}"`);
  });

  test('S6.3: [ADVERSARIAL BUG PROBE] formatSql must preserve table.column dot operator in SQL queries', () => {
    // Standard SQL with table aliases and qualified columns
    const sqlInput = 'SELECT u.id, u.username, o.total FROM users u JOIN orders o ON u.id = o.user_id;';
    const result = formatSql(sqlInput);

    // The output MUST contain 'u.id', 'u.username', 'o.total', 'o.user_id' - NOT 'u id', 'u username', etc.
    assert.ok(result.formatted.includes('u.id'), `HIGH BUG FOUND: formatSql stripped table.column dot separator: "${result.formatted.trim()}"`);
    assert.ok(result.formatted.includes('o.user_id'), `HIGH BUG FOUND: formatSql stripped join dot separator: "${result.formatted.trim()}"`);
  });

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n================================================================');
  console.log(` 🏁 ADVERSARIAL CHALLENGER RESULTS: ${passedTests}/${totalTests} passed`);
  console.log('================================================================\n');

  if (failures.length > 0) {
    console.log('🚨 EMPIRICAL FAILURES DETECTED:');
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [FAIL] ${f.name}`);
      console.log(`     Details: ${f.error}\n`);
    });
    // Set exit code so automated runner signals failure
    process.exitCode = 1;
  } else {
    console.log('🎉 ALL ADVERSARIAL CHALLENGES PASSED!');
  }

  return { passedTests, totalTests, failures };
}

runChallengerTests().catch((err) => {
  console.error('Fatal error in challenger test runner:', err);
  process.exit(1);
});
