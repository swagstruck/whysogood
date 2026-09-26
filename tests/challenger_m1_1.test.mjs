// @ts-check
/**
 * Adversarial Challenger Test Suite — Milestone 1 (Formatters & Minifiers)
 * Author: teamwork_preview_challenger_m1_1
 *
 * Tests edge cases, stress scenarios, boundary limits, and correctness oracles
 * against lib/developer/formatters.ts and lib/developer/minifiers.ts.
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
  console.log(' ⚔️ ADVERSARIAL CHALLENGER SUITE: MILESTONE 1 (FORMATTERS & MINIFIERS)');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  /** @type {Array<{ name: string; error: Error | any }>} */
  const failures = [];

  /**
   * @param {string} name
   * @param {() => void | Promise<void>} fn
   */
  async function test(name, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      failures.push({ name, error: err });
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // ==========================================================================
  // SUITE 1: BOUNDARY LIMITS, EMPTY & SCALE STRESS
  // ==========================================================================
  console.log('\n--- Suite 1: Boundary Limits, Empty & Scale Stress ---');

  await test('S1.1: Zero-byte inputs produce safe empty results without errors', () => {
    assert.deepStrictEqual(formatHtml(''), { formatted: '' });
    assert.deepStrictEqual(formatCss(''), { formatted: '' });
    assert.deepStrictEqual(formatJs(''), { formatted: '' });
    assert.deepStrictEqual(formatSql(''), { formatted: '' });

    const mHtml = minifyHtml('');
    assert.strictEqual(mHtml.minified, '');
    assert.strictEqual(mHtml.originalSize, 0);
    assert.strictEqual(mHtml.minifiedSize, 0);

    const mCss = minifyCss('');
    assert.strictEqual(mCss.minified, '');
    assert.strictEqual(mCss.originalSize, 0);

    const mJson = minifyJson('');
    assert.strictEqual(mJson.minified, '');
    assert.strictEqual(mJson.originalSize, 0);
  });

  await test('S1.2: Whitespace-only inputs do not crash or produce malformed output', () => {
    const ws = '   \n\t  \r\n   ';
    assert.strictEqual(formatHtml(ws).formatted, '');
    assert.strictEqual(formatCss(ws).formatted, '');
    assert.strictEqual(formatJs(ws).formatted, '');
    assert.strictEqual(formatSql(ws).formatted, '');

    assert.strictEqual(minifyHtml(ws).minified, '');
    assert.strictEqual(minifyCss(ws).minified, '');
    assert.strictEqual(minifyJson(ws).minified, '');
  });

  await test('S1.3: 1-byte inputs handle boundaries cleanly', () => {
    assert.strictEqual(formatHtml('x').formatted, 'x\n');
    assert.strictEqual(minifyHtml('x').minified, 'x');
    assert.strictEqual(minifyCss('x').minified, 'x');
    // 1-byte invalid JSON should report syntax error with line 1 col 1, not crash
    const res = minifyJson('{');
    assert(res.error, 'Expected syntax error for single "{"');
    assert.strictEqual(res.error?.line, 1);
  });

  await test('S1.4: Megabyte-sized JSON minification completes in < 500ms with accurate byte metrics', () => {
    const arr = [];
    for (let i = 0; i < 20000; i++) {
      arr.push({ id: i, name: `user_item_${i}`, active: i % 2 === 0, score: i * 1.5 });
    }
    const jsonStr = JSON.stringify(arr, null, 2);
    assert(jsonStr.length >= 1_000_000, `Expected > 1MB, got ${jsonStr.length}`);

    const t0 = performance.now();
    const res = minifyJson(jsonStr);
    const elapsed = performance.now() - t0;

    assert(elapsed < 500, `Megabyte JSON minification took ${elapsed.toFixed(1)}ms (limit 500ms)`);
    assert.strictEqual(res.originalSize, new TextEncoder().encode(jsonStr).length);
    assert.strictEqual(res.minifiedSize, new TextEncoder().encode(res.minified).length);
    assert(res.minifiedSize < res.originalSize, 'Expected size reduction');
    // Ensure minified output parses back identically
    assert.deepStrictEqual(JSON.parse(res.minified), arr);
  });

  await test('S1.5: Megabyte-sized CSS minification completes in < 500ms without memory exhaustion', () => {
    const cssRules = [];
    for (let i = 0; i < 25000; i++) {
      cssRules.push(`.selector-${i} { color: #ffffff; margin: 0px 10px; width: calc(100% - 20px); }`);
    }
    const cssStr = cssRules.join('\n');
    assert(cssStr.length >= 1_000_000, `Expected > 1MB, got ${cssStr.length}`);

    const t0 = performance.now();
    const res = minifyCss(cssStr);
    const elapsed = performance.now() - t0;

    assert(elapsed < 500, `Megabyte CSS minification took ${elapsed.toFixed(1)}ms (limit 500ms)`);
    assert(res.minifiedSize < res.originalSize, 'Expected CSS size reduction');
  });

  await test('S1.6: Megabyte-sized HTML minification completes in < 500ms without stack overflow', () => {
    const htmlRows = ['<div class="grid">'];
    for (let i = 0; i < 20000; i++) {
      htmlRows.push(`  <div class="row row-${i}"><p>Item <span>#${i}</span></p></div>`);
    }
    htmlRows.push('</div>');
    const htmlStr = htmlRows.join('\n');
    assert(htmlStr.length >= 1_000_000, `Expected > 1MB, got ${htmlStr.length}`);

    const t0 = performance.now();
    const res = minifyHtml(htmlStr);
    const elapsed = performance.now() - t0;

    assert(elapsed < 500, `Megabyte HTML minification took ${elapsed.toFixed(1)}ms (limit 500ms)`);
    assert(res.minifiedSize < res.originalSize, 'Expected HTML size reduction');
  });

  // ==========================================================================
  // SUITE 2: MINIFIER COMPRESSION METRICS & IDEMPOTENCY ORACLES
  // ==========================================================================
  console.log('\n--- Suite 2: Minifier Metrics & Idempotency Oracles ---');

  await test('S2.1: calcReductionPct computes exact percentage reduction and handles zero/negative', () => {
    assert.strictEqual(calcReductionPct(100, 50), 50.0);
    assert.strictEqual(calcReductionPct(100, 0), 100.0);
    assert.strictEqual(calcReductionPct(100, 100), 0.0);
    assert.strictEqual(calcReductionPct(0, 0), 0);
    assert.strictEqual(calcReductionPct(0, 50), 0);
    // Negative savings when compressed is larger
    assert.strictEqual(calcReductionPct(100, 125), -25.0);
  });

  await test('S2.2: UTF-8 multibyte character sizing is measured in bytes not code units', () => {
    // 4-byte UTF-8 emojis (length is 2 UTF-16 code units per emoji)
    const jsonInput = '{\n  "status": "🚀🎉🔥"\n}';
    const utf8ByteLength = new TextEncoder().encode(jsonInput).length;
    // jsonInput.length is 23, but UTF-8 byte length is 29 (each emoji is 4 bytes vs 2 utf16 units)
    assert(utf8ByteLength > jsonInput.length, 'UTF-8 byte count should exceed UTF-16 length');

    const res = minifyJson(jsonInput);
    assert.strictEqual(res.originalSize, utf8ByteLength, 'originalSize must match UTF-8 byte count');
    assert.strictEqual(res.minifiedSize, new TextEncoder().encode(res.minified).length, 'minifiedSize must match UTF-8 bytes');
  });

  await test('S2.3: Idempotent minification: minifying twice produces identical output', () => {
    const html = '<div>  <p>Hello   <strong>World</strong></p>  <!-- comment --> </div>';
    const mHtml1 = minifyHtml(html).minified;
    const mHtml2 = minifyHtml(mHtml1).minified;
    assert.strictEqual(mHtml2, mHtml1, 'HTML minification must be idempotent');

    const css = '.card { margin: 0px 10px; color: #ffffff; width: calc(100% - 20px); }';
    const mCss1 = minifyCss(css).minified;
    const mCss2 = minifyCss(mCss1).minified;
    assert.strictEqual(mCss2, mCss1, 'CSS minification must be idempotent');

    const json = '{\n  "b": 2,\n  "a": 1\n}';
    const mJson1 = minifyJson(json, { sortKeys: true }).minified;
    const mJson2 = minifyJson(mJson1, { sortKeys: true }).minified;
    assert.strictEqual(mJson2, mJson1, 'JSON minification must be idempotent');
  });

  await test('S2.4: Idempotent formatting: formatting twice produces identical output', () => {
    const html = '<div><p>Hello</p></div>';
    const fHtml1 = formatHtml(html).formatted;
    const fHtml2 = formatHtml(fHtml1).formatted;
    assert.strictEqual(fHtml2, fHtml1, 'HTML formatting must be idempotent');

    const css = '.card{color:red;width:calc(100% - 20px);}';
    const fCss1 = formatCss(css).formatted;
    const fCss2 = formatCss(fCss1).formatted;
    assert.strictEqual(fCss2, fCss1, 'CSS formatting must be idempotent');

    const js = 'const sum = (a, b) => { return a + b; };';
    const fJs1 = formatJs(js).formatted;
    const fJs2 = formatJs(fJs1).formatted;
    assert.strictEqual(fJs2, fJs1, 'JS formatting must be idempotent');

    const sql = 'SELECT a, b FROM table1 WHERE a = 1;';
    const fSql1 = formatSql(sql).formatted;
    const fSql2 = formatSql(fSql1).formatted;
    assert.strictEqual(fSql2, fSql1, 'SQL formatting must be idempotent');
  });

  // ==========================================================================
  // SUITE 3: HTML ADVERSARIAL EDGE CASES
  // ==========================================================================
  console.log('\n--- Suite 3: HTML Adversarial Edge Cases ---');

  await test('S3.1: HTML with void elements (img, br, hr, input, meta, link) does NOT flag unclosed errors', () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div>
    <p>Line 1<br>Line 2<hr><img src="avatar.png" alt="user"><input type="text" name="q"></p>
  </div>
</body>
</html>`;
    const res = formatHtml(html);
    assert.strictEqual(res.error, undefined, `Unexpected error on valid void tags: ${res.error?.message}`);
    assert(res.formatted.includes('<img src="avatar.png" alt="user">'));
    assert(res.formatted.includes('<input type="text" name="q">'));
  });

  await test('S3.2: HTML with unclosed block tags pinpoints exact coordinate', () => {
    const html = '<div>\n  <section>\n    <p>Unclosed paragraph\n    <div>New block</div>\n  </section>\n</div>';
    const res = formatHtml(html);
    assert(res.error, 'Expected unclosed tag error');
    assert(res.error.message.includes('Unclosed tag <p>'), `Expected "Unclosed tag <p>", got: ${res.error.message}`);
    assert.strictEqual(res.error.line, 3, `Expected line 3, got ${res.error.line}`);
  });

  await test('S3.3: HTML attribute containing ">" inside quotes must NOT split the tag', () => {
    const html = '<button title="Click > to proceed" data-condition="x > 5">Next</button>';
    const res = formatHtml(html);
    // If the parser splits at the first ">", the attribute value is truncated
    assert(
      res.formatted.includes('title="Click > to proceed"') || res.formatted.includes("title='Click > to proceed'"),
      `Attribute containing ">" was corrupted: ${res.formatted}`
    );
  });

  await test('S3.4: minifyHtml must NOT corrupt scripts containing "//" inside strings', () => {
    const html = '<script>\nconst url = "https://example.com/api//v1";\nconst msg = "Don\'t delete // this string";\n</script>';
    const res = minifyHtml(html);
    // Minifier must not strip "// this string" or cut string in half
    assert(
      res.minified.includes("Don't delete // this string"),
      `Script string containing "//" was corrupted into: ${res.minified}`
    );
    assert(
      res.minified.includes('https://example.com/api//v1'),
      `Script URL containing "//" was corrupted into: ${res.minified}`
    );
  });

  await test('S3.5: minifyHtml must NOT leak internal placeholder tokens when pre/script contains "$&" or special replacement patterns', () => {
    const html = '<pre>Price formula: total = $& + $\' discount;</pre>';
    const res = minifyHtml(html);
    // If String.replace(id, content) is used without replacer fn, $& is replaced by the ID itself
    assert(
      !res.minified.includes('__WHYSO_RAW_BLOCK_'),
      `Internal placeholder leaked into user content: ${res.minified}`
    );
    assert(
      res.minified.includes('total = $& + $\' discount;'),
      `Special replacement string was corrupted: ${res.minified}`
    );
  });

  // ==========================================================================
  // SUITE 4: CSS ADVERSARIAL EDGE CASES
  // ==========================================================================
  console.log('\n--- Suite 4: CSS Adversarial Edge Cases ---');

  await test('S4.1: CSS Formatter MUST NOT insert invalid whitespace after colons in pseudo-classes and pseudo-elements', () => {
    const css = 'a:hover { color: red; }\nbutton::before { content: ""; }\n:is(h1, h2):not(.lead) { margin: 0; }';
    const res = formatCss(css);
    // "a: hover" or ": : before" or ": is(...)" are invalid CSS selectors in all browsers!
    assert(!res.formatted.includes('a: hover'), `CSS Formatter injected invalid space into pseudo-class "a: hover": ${res.formatted}`);
    assert(!res.formatted.includes(': : before'), `CSS Formatter injected invalid spaces into pseudo-element ": : before": ${res.formatted}`);
    assert(!res.formatted.includes(': is('), `CSS Formatter injected invalid space into ": is(": ${res.formatted}`);
    assert(!res.formatted.includes(': not('), `CSS Formatter injected invalid space into ": not(": ${res.formatted}`);
  });

  await test('S4.2: CSS Formatter preserves comments inside rules and property declarations cleanly', () => {
    const css = `.card {
  /* Header styling */
  background: #ffffff;
  /* Action button color */
  color: #000000;
}`;
    const res = formatCss(css);
    assert(res.formatted.includes('/* Header styling */'), 'Missing header comment');
    assert(res.formatted.includes('/* Action button color */'), 'Missing action comment');
  });

  await test('S4.3: minifyCss preserves mandatory spaces around "+" and "-" in calc()', () => {
    const css = '.box { width: calc(100% - 20px); height: calc(100vh + 2rem); margin: calc(100% - var(--pad)); }';
    const res = minifyCss(css);
    assert(res.minified.includes('100% - 20px'), `Missing space around - in calc: ${res.minified}`);
    assert(res.minified.includes('100vh + 2rem'), `Missing space around + in calc: ${res.minified}`);
    assert(res.minified.includes('100% - var(--pad)'), `Missing space around - with var in calc: ${res.minified}`);
  });

  await test('S4.4: minifyCss must NOT corrupt nested math expressions: calc() inside calc() or clamp()', () => {
    const css = '.card { width: calc(100% - calc(50% + 10px)); font-size: clamp(1rem, calc(2.5vw + 10px), 2rem); }';
    const res = minifyCss(css);
    // Overlapping regex match ranges must not slice placeholder strings or corrupt math
    assert(!res.minified.includes('__WHYSO_CSS_CALC_'), `Placeholder leaked in nested calc: ${res.minified}`);
    assert(!res.minified.includes('__'), `Dangling placeholder segment in nested calc: ${res.minified}`);
    assert(res.minified.includes('calc('), `calc() was lost: ${res.minified}`);
    assert(res.minified.includes('clamp('), `clamp() was lost: ${res.minified}`);
  });

  await test('S4.5: minifyCss must NOT leak internal placeholder tokens when CSS strings contain "$&" or special replacement patterns', () => {
    const css = '.badge::before { content: "$& discount"; font-family: \'$\\\' quote\'; }';
    const res = minifyCss(css);
    assert(!res.minified.includes('__WHYSO_CSS_STR_'), `Internal CSS string placeholder leaked: ${res.minified}`);
    assert(res.minified.includes('"$& discount"'), `String literal was corrupted: ${res.minified}`);
  });

  // ==========================================================================
  // SUITE 5: JAVASCRIPT / TYPESCRIPT ADVERSARIAL EDGE CASES
  // ==========================================================================
  console.log('\n--- Suite 5: JavaScript Adversarial Edge Cases ---');

  await test('S5.1: formatJs handles nested arrow functions with expression and block bodies', () => {
    const js = 'const curry = (a) => (b) => (c) => a + b + c;';
    const res = formatJs(js);
    assert.strictEqual(res.formatted.trim(), 'const curry = (a) => (b) => (c) => a + b + c;');
  });

  await test('S5.2: formatJs does NOT orphan semicolons on their own lines after closing braces', () => {
    const js = 'const fn = () => {\n  return 42;\n};';
    const res = formatJs(js);
    const lines = res.formatted.split('\n').map(l => l.trim());
    // An orphaned semicolon line like "\n;\n" is bad formatting ergonomics
    assert(!lines.includes(';'), `formatJs placed an orphaned semicolon on its own line: \n${res.formatted}`);
  });

  await test('S5.3: formatJs parses complex regex literals with slashes, flags, and character classes', () => {
    const js = 'const r1 = /https?:\\/\\/[^\\s/$.?#].[^\\s]*/gi;\nconst r2 = /[/]/;\nconst r3 = [/a/g, /b/i];';
    const res = formatJs(js);
    assert.strictEqual(res.error, undefined, `Unexpected error on regex literals: ${res.error?.message}`);
    assert(res.formatted.includes('/https?:\\/\\/[^\\s/$.?#].[^\\s]*/gi'));
    assert(res.formatted.includes('/[/]/'));
  });

  await test('S5.4: formatJs preserves multiline template literals and handles nested template literals', () => {
    const js = 'const msg = `Line 1\nLine 2: ${`inner ${val}`}\nLine 3`;';
    const res = formatJs(js);
    assert.strictEqual(res.error, undefined, `Unexpected error on template literal: ${res.error?.message}`);
    // Nested template literal must not have "${" separated into "$ {"
    assert(!res.formatted.includes('$ {'), `Template expression corrupted into "$ {": ${res.formatted}`);
  });

  await test('S5.5: formatJs detects unbalanced brackets with accurate line and column', () => {
    const js = 'function test() {\n  const x = [1, 2, 3;\n  return x;\n}';
    const res = formatJs(js);
    assert(res.error, 'Expected syntax error for unclosed bracket');
    assert(res.error.message.includes('Unmatched') || res.error.message.includes('Unclosed'), `Unexpected message: ${res.error.message}`);
  });

  // ==========================================================================
  // SUITE 6: SQL ADVERSARIAL EDGE CASES
  // ==========================================================================
  console.log('\n--- Suite 6: SQL Adversarial Edge Cases ---');

  await test('S6.1: CRITICAL: formatSql MUST preserve table qualifier dots ("table.column")', () => {
    const sql = 'SELECT u.id, u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE u.active = 1;';
    const res = formatSql(sql);
    // If the tokenizer drops '.', "u.id" becomes "u id" which is completely invalid SQL!
    assert(res.formatted.includes('u.id'), `formatSql stripped dot from "u.id", got: \n${res.formatted}`);
    assert(res.formatted.includes('u.name'), `formatSql stripped dot from "u.name", got: \n${res.formatted}`);
    assert(res.formatted.includes('o.total'), `formatSql stripped dot from "o.total", got: \n${res.formatted}`);
    assert(res.formatted.includes('o.user_id'), `formatSql stripped dot from "o.user_id", got: \n${res.formatted}`);
    assert(res.formatted.includes('u.active'), `formatSql stripped dot from "u.active", got: \n${res.formatted}`);
  });

  await test('S6.2: formatSql preserves decimal numbers ("0.75", ".5")', () => {
    const sql = 'SELECT id, price * 0.75 AS discounted, fee + .5 AS total FROM products;';
    const res = formatSql(sql);
    assert(res.formatted.includes('0.75'), `Decimal "0.75" was corrupted: ${res.formatted}`);
    assert(res.formatted.includes('.5') || res.formatted.includes('0.5'), `Decimal ".5" was corrupted: ${res.formatted}`);
  });

  await test('S6.3: formatSql aligns subqueries in SELECT and WHERE clauses cleanly', () => {
    const sql = 'SELECT u.id, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_cnt FROM users u;';
    const res = formatSql(sql);
    assert(res.formatted.includes('COUNT(*)'), `COUNT(*) was mangled: ${res.formatted}`);
    assert(res.formatted.includes('AS order_cnt') || res.formatted.includes('as order_cnt'));
  });

  await test('S6.4: formatSql handles multiple JOIN types (LEFT, RIGHT, INNER, FULL OUTER, CROSS)', () => {
    const sql = `SELECT * FROM a
INNER JOIN b ON a.id = b.a_id
LEFT JOIN c ON b.id = c.b_id
RIGHT OUTER JOIN d ON c.id = d.c_id
FULL OUTER JOIN e ON d.id = e.d_id
CROSS JOIN f;`;
    const res = formatSql(sql);
    assert(res.formatted.includes('INNER JOIN b ON'));
    assert(res.formatted.includes('LEFT JOIN c ON'));
    assert(res.formatted.includes('RIGHT OUTER JOIN d ON'));
    assert(res.formatted.includes('FULL OUTER JOIN e ON'));
    assert(res.formatted.includes('CROSS JOIN f'));
  });

  await test('S6.5: formatSql respects keyword casing options ("upper", "lower", "preserve")', () => {
    const sql = 'select id, name from users where active = true;';
    const upper = formatSql(sql, { sqlKeywordCase: 'upper' });
    assert(upper.formatted.startsWith('SELECT'));
    assert(upper.formatted.includes('FROM users'));
    assert(upper.formatted.includes('WHERE'));

    const lower = formatSql('SELECT ID, NAME FROM USERS WHERE ACTIVE = TRUE;', { sqlKeywordCase: 'lower' });
    assert(lower.formatted.startsWith('select'));
    assert(lower.formatted.includes('from'));
    assert(lower.formatted.includes('where'));
  });

  await test('S6.6: formatSql preserves escaped quotes in string literals', () => {
    const sql = "SELECT 'It''s a sunny day' AS greeting, 'O''Connor' AS name FROM dual;";
    const res = formatSql(sql);
    assert(res.formatted.includes("'It''s a sunny day'"), `Escaped quote corrupted: ${res.formatted}`);
    assert(res.formatted.includes("'O''Connor'"), `Escaped quote corrupted: ${res.formatted}`);
  });

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  console.log('\n================================================================');
  console.log(` 🏁 ADVERSARIAL RUN COMPLETE: ${passedTests}/${totalTests} passed (${failures.length} failures)`);
  console.log('================================================================');

  if (failures.length > 0) {
    console.log('\n🚨 DETECTED ADVERSARIAL FAILURES:');
    for (const f of failures) {
      console.log(`\n  ✖ ${f.name}`);
      console.log(`    ${f.error.message}`);
    }
  }

  return { passedTests, totalTests, failures };
}

runChallengerTests().then(({ failures }) => {
  if (failures.length > 0) {
    process.exitCode = 1;
  }
});
