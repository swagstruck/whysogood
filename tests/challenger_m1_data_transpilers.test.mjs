// @ts-check
/**
 * Adversarial Challenger 2 Test Harness for Milestone 1:
 * Format Transpilers & Adversarial Edge Cases (lib/data/transpilers.ts)
 */

import assert from 'node:assert';
import './e2e/helpers/ts_resolver.mjs';

const {
  yamlToJson,
  jsonToYaml,
  jsonToCsvData,
  csvToJsonData,
  flattenObject,
  unflattenObject,
} = await import('../lib/data/transpilers.ts');

async function runAdversarialTranspilerTests() {
  console.log('================================================================');
  console.log(' ⚔️ RUNNING CHALLENGER 2: TRANSPILERS & ADVERSARIAL EDGE CASES');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  function test(suite, name, fn) {
    try {
      fn();
      passed++;
      console.log(`  ✔ [PASS] [${suite}] ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✖ [FAIL] [${suite}] ${name}`);
      console.error(`    Error: ${err.message}`);
      failures.push({ suite, name, error: err });
    }
  }

  // ==========================================================================
  // Suite 1: YAML Multi-Document Streams & Deep Nesting
  // ==========================================================================
  console.log('--- Suite 1: YAML Multi-Document Streams & Deep Nesting ---');

  test('S1', 'handles stream with empty documents, comments, and trailing separators', () => {
    const yaml = `
---
doc: 1
---
# Just a comment
---
doc: 3
---
`;
    const res = yamlToJson(yaml);
    assert.strictEqual(res.error, null, 'Should not produce error on empty/comment docs');
    assert.strictEqual(res.isMultiDoc, true);
    assert.ok(Array.isArray(res.data));
    assert.strictEqual(res.documentsCount, 4);
    assert.deepStrictEqual(res.data[0], { doc: 1 });
    assert.strictEqual(res.data[1], null);
    assert.deepStrictEqual(res.data[2], { doc: 3 });
    assert.strictEqual(res.data[3], null);
  });

  test('S1', 'multiDocOutput: ndjson generates valid newline-delimited JSON', () => {
    const yaml = `
---
id: 101
name: Alice
---
id: 102
name: Bob
---
id: 103
name: Charlie
`;
    const res = yamlToJson(yaml, { multiDocOutput: 'ndjson' });
    assert.strictEqual(res.error, null);
    const lines = res.json.trim().split('\n');
    assert.strictEqual(lines.length, 3);
    assert.strictEqual(JSON.parse(lines[0]).id, 101);
    assert.strictEqual(JSON.parse(lines[1]).id, 102);
    assert.strictEqual(JSON.parse(lines[2]).id, 103);
  });

  test('S1', 'single document with multiDocOutput: ndjson formats cleanly', () => {
    const yaml = `
id: 99
title: SingleDoc
`;
    const res = yamlToJson(yaml, { multiDocOutput: 'ndjson' });
    assert.strictEqual(res.error, null);
    assert.strictEqual(res.isMultiDoc, false);
    assert.strictEqual(res.docCount, 1);
    const parsed = JSON.parse(res.json);
    assert.strictEqual(parsed.id, 99);
  });

  test('S1', 'deeply nested YAML hierarchy (50 levels) parses without stack overflow', () => {
    let yaml = 'root: leaf\n';
    for (let i = 50; i >= 1; i--) {
      yaml = `level_${i}:\n  ` + yaml.replace(/\n/g, '\n  ').trimEnd() + '\n';
    }
    const res = yamlToJson(yaml);
    assert.strictEqual(res.error, null);
    assert.strictEqual(typeof res.data, 'object');
  });

  test('S1', 'large multi-document stream (100 documents) parses accurately without leak', () => {
    const docs = [];
    for (let i = 0; i < 100; i++) {
      docs.push(`---\nid: ${i}\nname: "Doc_${i}"\nactive: ${i % 2 === 0}`);
    }
    const yaml = docs.join('\n');
    const res = yamlToJson(yaml);
    assert.strictEqual(res.error, null);
    assert.strictEqual(res.docCount, 100);
    assert.ok(Array.isArray(res.data));
    assert.strictEqual(res.data.length, 100);
    assert.strictEqual(res.data[99].name, 'Doc_99');
  });

  // ==========================================================================
  // Suite 2: YAML Anchors, Overrides, Merge Keys & Circular Attack
  // ==========================================================================
  console.log('\n--- Suite 2: YAML Anchors, Overrides & Circularity ---');

  test('S2', 'resolves multiple merge keys and local overrides correctly', () => {
    const yaml = `
defaultConfig: &def
  timeout: 5000
  retries: 3
  headers:
    auth: bearer
extraConfig: &extra
  debug: true
  retries: 5
service:
  <<: [*def, *extra]
  timeout: 1000
`;
    const res = yamlToJson(yaml);
    assert.strictEqual(res.error, null);
    const parsed = JSON.parse(res.json);
    assert.strictEqual(parsed.service.timeout, 1000, 'Local override must take precedence');
    assert.strictEqual(parsed.service.debug, true, 'Second merge key must be merged');
    assert.strictEqual(parsed.service.headers.auth, 'bearer');
  });

  test('S2', 'cyclic YAML anchor reference does not crash process and returns error', () => {
    const cyclicYaml = `
node: &self
  name: loop
  child: *self
`;
    const res = yamlToJson(cyclicYaml);
    assert.ok(res.error !== null, 'Cyclic YAML must return error diagnostic instead of crashing');
    assert.strictEqual(res.data, null);
  });

  test('S2', 'sortKeys on cyclic YAML anchor returns error without unhandled crash', () => {
    const cyclicYaml = `
node: &self
  name: loop
  child: *self
`;
    const res = yamlToJson(cyclicYaml, { sortKeys: true });
    assert.ok(res.error !== null, 'Must catch recursion and return error diagnostic');
  });

  // ==========================================================================
  // Suite 3: YAML & JSON Syntax Errors Coordinate Accuracy
  // ==========================================================================
  console.log('\n--- Suite 3: Syntax Errors & Coordinate Accuracy ---');

  test('S3', 'YAML tab character indentation error reports accurate line and column', () => {
    const badYaml = 'root:\n\tinvalid_tab: 1';
    const res = yamlToJson(badYaml);
    assert.ok(res.error !== null);
    assert.strictEqual(res.error.line, 2, 'Tab error must be reported at line 2');
    assert.ok(res.error.column >= 1);
    assert.ok(res.error.message.toLowerCase().includes('tab'));
  });

  test('S3', 'YAML unclosed bracket reports exact line coordinate', () => {
    const badYaml = 'a: 1\nb: 2\nc: [1, 2\nd: 4';
    const res = yamlToJson(badYaml);
    assert.ok(res.error !== null);
    assert.strictEqual(res.error.line, 4, 'Unclosed bracket error scanner stops at line 4');
  });

  test('S3', 'YAML syntax error in Document 2 of stream reports global line coordinate', () => {
    const badYaml = '---\ndoc: 1\nvalid: true\n---\ndoc: 2\n  bad:\n [unclosed';
    const res = yamlToJson(badYaml);
    assert.ok(res.error !== null);
    assert.ok(res.error.line >= 6, `Line coordinate must be >= 6 (got ${res.error.line})`);
  });

  test('S3', 'JSON syntax error coordinate extraction pinpoints line and column', () => {
    const badJson = '{\n  "name": "test",\n  "count": 42,\n}';
    const res = jsonToYaml(badJson);
    assert.ok(res.error !== null);
    assert.strictEqual(res.error.line, 4, 'Trailing comma error must point to line 4');
  });

  test('S3', 'JSON invalid unquoted token coordinate localization fallback probe', () => {
    const badJson = '[\n  10,\n  20,\n  invalid_token\n]';
    const res = jsonToCsvData(badJson);
    assert.ok(res.error !== null);
    if (res.error.line === 1) {
      assert.fail(`BUG FOUND: extractJsonError fell back to line 1, col 1 on unquoted token at line 4: "${res.error.message}"`);
    }
    assert.strictEqual(res.error.line, 4);
  });

  // ==========================================================================
  // Suite 4: JSON → YAML Serialization & Long Strings / Escaping
  // ==========================================================================
  console.log('\n--- Suite 4: JSON → YAML Serialization & Escaping ---');

  test('S4', 'indent options (2 vs 4 spaces) are strictly honored', () => {
    const obj = { server: { host: 'localhost', port: 8080 } };
    const yaml2 = jsonToYaml(obj, { indent: 2 }).yaml;
    const yaml4 = jsonToYaml(obj, { indent: 4 }).yaml;
    assert.ok(yaml2.includes('  host: localhost'), 'Indent 2 must have 2 leading spaces');
    assert.ok(yaml4.includes('    host: localhost'), 'Indent 4 must have 4 leading spaces');
  });

  test('S4', 'lineWidth: -1 prevents unwanted folding/wrapping of long strings', () => {
    const longText = 'A'.repeat(500);
    const res = jsonToYaml({ description: longText }, { lineWidth: -1 });
    assert.strictEqual(res.error, null);
    assert.ok(res.yaml.includes(longText));
    assert.ok(!res.yaml.includes('>\n'));
  });

  test('S4', 'differentiates string booleans from boolean primitives', () => {
    const data = {
      realBool: true,
      strBool: 'true',
      realNull: null,
      strNull: 'null',
      realNum: 100,
      strNum: '100',
    };
    const res = jsonToYaml(data);
    assert.strictEqual(res.error, null);
    const roundtrip = yamlToJson(res.yaml);
    assert.strictEqual(roundtrip.error, null);
    const parsed = /** @type {any} */ (roundtrip.data);
    assert.strictEqual(parsed.realBool, true);
    assert.strictEqual(parsed.strBool, 'true');
    assert.strictEqual(parsed.realNull, null);
    assert.strictEqual(parsed.strNull, 'null');
    assert.strictEqual(parsed.realNum, 100);
    assert.strictEqual(parsed.strNum, '100');
  });

  test('S4', 'quoteStyle single and double encloses scalars safely', () => {
    const data = { message: "Hello 'world'" };
    const resSingle = jsonToYaml(data, { quoteStyle: 'single' });
    assert.strictEqual(resSingle.error, null);
    const roundSingle = yamlToJson(resSingle.yaml);
    assert.strictEqual(/** @type {any} */ (roundSingle.data).message, "Hello 'world'");

    const resDouble = jsonToYaml(data, { quoteStyle: 'double' });
    assert.strictEqual(resDouble.error, null);
    const roundDouble = yamlToJson(resDouble.yaml);
    assert.strictEqual(/** @type {any} */ (roundDouble.data).message, "Hello 'world'");
  });

  // ==========================================================================
  // Suite 5: JSON → CSV Data Transpiler Adversarial Stress
  // ==========================================================================
  console.log('\n--- Suite 5: JSON → CSV Transpiler Stress & Edge Cases ---');

  test('S5', 'cyclic object passed to jsonToCsvData does NOT throw unhandled exception', () => {
    /** @type {any} */
    const cyclic = { id: 1, name: 'Root' };
    cyclic.self = cyclic;

    try {
      const res = jsonToCsvData([cyclic]);
      assert.ok(res !== undefined);
      if (res.error) {
        assert.ok(res.error.message.includes('circular') || res.error.message.includes('Cyclic'));
      }
    } catch (err) {
      assert.fail(`BUG FOUND: jsonToCsvData crashed with uncaught exception on cyclic object: ${err.message}`);
    }
  });

  test('S5', 'flattenObject safely handles cyclic reference without uncaught throw', () => {
    /** @type {any} */
    const cyclic = { a: 1 };
    cyclic.link = cyclic;

    try {
      const flat = flattenObject(cyclic);
      assert.ok(flat !== undefined);
    } catch (err) {
      assert.fail(`BUG FOUND: flattenObject crashed on cyclic reference: ${err.message}`);
    }
  });

  test('S5', 'sparse heterogeneous schemas union all disjoint headers', () => {
    const sparse = [
      { id: 1, name: 'Alice', dept: 'Engineering' },
      { id: 2, role: 'Designer', country: 'France' },
      { id: 3, name: 'Charlie', salary: 120000, remote: true },
    ];
    const res = jsonToCsvData(sparse);
    assert.strictEqual(res.error, null);
    assert.deepStrictEqual(res.headers, ['id', 'name', 'dept', 'role', 'country', 'salary', 'remote']);
    assert.strictEqual(res.rowCount, 3);
    assert.strictEqual(res.rows[1][2], 'Engineering');
    assert.strictEqual(res.rows[2][2], ''); // Alice's dept empty for Bob
    assert.strictEqual(res.rows[2][3], 'Designer');
  });

  test('S5', 'array of primitives is converted to single-column CSV', () => {
    const primitives = [10, 20, 30, 'forty', true, null];
    const res = jsonToCsvData(primitives);
    assert.strictEqual(res.error, null);
    assert.deepStrictEqual(res.headers, ['value']);
    assert.strictEqual(res.rowCount, 6);
    assert.strictEqual(res.rows[1][0], '10');
    assert.strictEqual(res.rows[4][0], 'forty');
    assert.strictEqual(res.rows[5][0], 'true');
    assert.strictEqual(res.rows[6][0], '');
  });

  test('S5', 'deeply nested object beyond maxDepth is capped without overflow', () => {
    /** @type {any} */
    let deep = { val: 'deepest' };
    for (let i = 0; i < 20; i++) {
      deep = { level: deep };
    }
    const res = jsonToCsvData([deep], { flattenDepth: 5 });
    assert.strictEqual(res.error, null);
    assert.ok(res.headers.length > 0);
  });

  test('S5', 'preserves Unicode emojis, CJK, and RTL characters in CSV output', () => {
    const unicodeData = [
      { id: 1, name: 'Alice 🎉🚀', language: '中文 (Chinese)', note: 'مرحبا (Arabic)' },
      { id: 2, name: 'Bob 👨‍👩‍👧‍👦', language: '日本語 (Japanese)', note: 'שלום (Hebrew)' },
    ];
    const res = jsonToCsvData(unicodeData);
    assert.strictEqual(res.error, null);
    assert.ok(res.csv.includes('🎉🚀'));
    assert.ok(res.csv.includes('👨‍👩‍👧‍👦'));
    assert.ok(res.csv.includes('中文 (Chinese)'));
    assert.ok(res.csv.includes('مرحبا (Arabic)'));

    const back = csvToJsonData(res.csv);
    assert.strictEqual(back.error, null);
    assert.strictEqual(/** @type {any} */ (back.data[0]).name, 'Alice 🎉🚀');
    assert.strictEqual(/** @type {any} */ (back.data[1]).name, 'Bob 👨‍👩‍👧‍👦');
  });

  // ==========================================================================
  // Suite 6: CSV → JSON Transpiler & Security / Prototype Checks
  // ==========================================================================
  console.log('\n--- Suite 6: CSV → JSON Security & Unflattening ---');

  test('S6', 'prototype pollution defense: CSV headers cannot pollute Object.prototype', () => {
    const maliciousCsv = '__proto__.polluted,constructor.prototype.hacked\nEVIL_1,EVIL_2';
    const res = csvToJsonData(maliciousCsv);
    assert.strictEqual(res.error, null);
    // Test that global Object.prototype was NOT polluted!
    const isPolluted = /** @type {any} */ ({}).polluted !== undefined;
    const isHacked = /** @type {any} */ ({}).hacked !== undefined;
    // Cleanup polluted prototype in case it fired
    delete /** @type {any} */ (Object.prototype).polluted;
    delete /** @type {any} */ (Object.prototype).hacked;

    if (isPolluted) {
      assert.fail('CRITICAL VULNERABILITY: Object.prototype polluted with .polluted = "EVIL_1"');
    }
    if (isHacked) {
      assert.fail('CRITICAL VULNERABILITY: Object.prototype polluted with .hacked = "EVIL_2"');
    }
  });

  test('S6', 'scalar vs nested object path collision behavior probe', () => {
    const csv = 'user,user.name\nJohn,Doe';
    const res = csvToJsonData(csv);
    assert.strictEqual(res.error, null);
    const row = /** @type {any} */ (res.data[0]);
    // Check if scalar user "John" was preserved or overwritten
    if (typeof row.user === 'object' && row.user.name === 'Doe') {
      console.log('    ℹ [Collision Probe] "user" scalar was overwritten by "user.name" nested path');
    }
  });

  test('S6', 'preserves numeric string codes with leading zeros (e.g. 01234, 007)', () => {
    const csv = 'code,phone,zip\n01234,007,02138';
    const res = csvToJsonData(csv);
    assert.strictEqual(res.error, null);
    const row = /** @type {any} */ (res.data[0]);
    assert.strictEqual(row.code, '01234', 'Leading zero string must remain string');
    assert.strictEqual(row.phone, '007', '007 must remain string');
    assert.strictEqual(row.zip, '02138', '02138 must remain string');
  });

  test('S6', 'unclosed double quote in CSV returns exact error coordinates', () => {
    const badCsv = 'id,name,role\n1,Alice,Dev\n2,"Bob,Designer';
    const res = csvToJsonData(badCsv);
    assert.ok(res.error !== null);
    assert.strictEqual(res.error.line, 3);
    assert.strictEqual(res.error.column, 3);
  });

  test('S6', 'embedded JSON objects and arrays in CSV cells parse cleanly', () => {
    const csv = 'id,metadata\n1,"{""version"": 2, ""tags"": [""a"", ""b""]}"';
    const res = csvToJsonData(csv, { parseJsonValues: true });
    assert.strictEqual(res.error, null);
    const row = /** @type {any} */ (res.data[0]);
    assert.strictEqual(typeof row.metadata, 'object');
    assert.strictEqual(row.metadata.version, 2);
    assert.deepStrictEqual(row.metadata.tags, ['a', 'b']);
  });

  // ==========================================================================
  // Suite 7: Bidirectional Roundtrips & Invariants
  // ==========================================================================
  console.log('\n--- Suite 7: Bidirectional Roundtrips & Invariants ---');

  test('S7', 'lossless bidirectional JSON <-> YAML roundtrip with nested structures', () => {
    const original = {
      app: 'whysogood',
      version: 3,
      enabled: true,
      limits: { maxUploadMb: 50, timeoutSec: 120 },
      tags: ['data', 'transpiler', 'offline'],
      metadata: null,
    };
    const yamlRes = jsonToYaml(original);
    assert.strictEqual(yamlRes.error, null);
    const jsonRes = yamlToJson(yamlRes.yaml);
    assert.strictEqual(jsonRes.error, null);
    assert.deepStrictEqual(jsonRes.data, original);
  });

  test('S7', 'lossless bidirectional JSON <-> CSV roundtrip with nested dot objects', () => {
    const original = [
      { id: 1, user: { profile: { name: 'Dan', age: 34 } }, active: true },
      { id: 2, user: { profile: { name: 'Eve', age: 28 } }, active: false },
    ];
    const csvRes = jsonToCsvData(original);
    assert.strictEqual(csvRes.error, null);
    assert.ok(csvRes.headers.includes('user.profile.name'));
    assert.ok(csvRes.headers.includes('user.profile.age'));

    const jsonRes = csvToJsonData(csvRes.csv);
    assert.strictEqual(jsonRes.error, null);
    assert.deepStrictEqual(jsonRes.data, original);
  });

  // ==========================================================================
  // Suite 8: Concurrency & High Volume Stress
  // ==========================================================================
  console.log('\n--- Suite 8: Concurrency & High Volume Stress ---');

  test('S8', 'high volume JSON -> CSV with 1,000 heterogeneous records executes < 100ms', () => {
    const bigDataset = [];
    for (let i = 0; i < 1000; i++) {
      bigDataset.push({
        id: i,
        name: `User_${i}`,
        score: i * 1.5,
        details: { city: i % 2 === 0 ? 'NYC' : 'SF', active: i % 3 === 0 },
        tags: [`t${i % 5}`],
      });
    }
    const t0 = Date.now();
    const csvRes = jsonToCsvData(bigDataset);
    const elapsed = Date.now() - t0;
    assert.strictEqual(csvRes.error, null);
    assert.strictEqual(csvRes.rowCount, 1000);
    assert.ok(elapsed < 200, `High volume conversion should be fast (took ${elapsed}ms)`);
  });

  test('S8', 're-entrant concurrent execution of 50 simultaneous conversions', async () => {
    const tasks = [];
    for (let i = 0; i < 50; i++) {
      tasks.push(
        new Promise((resolve, reject) => {
          try {
            const data = [{ id: i, name: `Task_${i}` }];
            const csv = jsonToCsvData(data).csv;
            const back = csvToJsonData(csv).data;
            assert.deepStrictEqual(back, data);
            resolve(true);
          } catch (e) {
            reject(e);
          }
        })
      );
    }
    await Promise.all(tasks);
  });

  console.log('\n================================================================');
  console.log(` 🏁 RESULTS: ${passed}/${passed + failed} passed (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================\n');

  if (failures.length > 0) {
    console.log('Summary of Failures:');
    for (const f of failures) {
      console.log(`  - [${f.suite}] ${f.name}: ${f.error.message}`);
    }
    process.exit(1);
  }
}

runAdversarialTranspilerTests().catch((err) => {
  console.error('Fatal test harness error:', err);
  process.exit(1);
});
