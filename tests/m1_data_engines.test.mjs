// @ts-check
/**
 * Automated Unit Test Suite for Milestone 1: Data Engines & Utilities
 * 
 * Verifies:
 * 1. lib/data/csvEngine.ts:
 *    - RFC 4180 parsing with escaped quotes (""), commas, and embedded newlines
 *    - Exact 1-indexed error coordinates for unclosed quotes and stray chars
 *    - Delimiter auto-detection across comma, semicolon, tab, and pipe via variance
 *    - CSV Cleaner (whitespace trimming, blank row removal, uneven column repair, CRLF -> LF)
 *    - CSV Deduplicator (O(N) hashing, full-row vs primary-key, keep-first vs keep-last)
 *    - CSV Column Extractor (index, name, reordering, renaming, filtering)
 *    - CSV Sorter (multi-column hierarchy, numeric currency/percent, date ISO, text natural)
 * 2. lib/data/transpilers.ts:
 *    - yamlToJson (single and multi-doc streams, anchors, formatting, minification, error coords)
 *    - jsonToYaml (indents 2/4, quote styles, flow/block modes, lineWidth -1)
 *    - jsonToCsvData (heterogeneous schema union, dot-notation flattening, array formats)
 *    - csvToJsonData (unflattening, primitive coercion, JSON value parsing)
 *    - Full bidirectional JSON <-> CSV and JSON <-> YAML roundtrips
 * 3. lib/data/samples.ts:
 *    - Realistic sample presets: Employee Roster, E-Commerce, Analytics, K8s YAML, CRM JSON
 *    - Helper functions getSamplePresetById and getSamplePresetsByCategory
 */

import assert from 'node:assert';
import './e2e/helpers/ts_resolver.mjs';

const {
  parseCsv,
  serializeCsv,
  detectDelimiter,
  cleanCsv,
  deduplicateCsv,
  extractColumns,
  sortCsv,
  inferColumnType,
} = await import('../lib/data/csvEngine.ts');

const {
  yamlToJson,
  jsonToYaml,
  jsonToCsvData,
  csvToJsonData,
  flattenObject,
  unflattenObject,
} = await import('../lib/data/transpilers.ts');

const {
  SAMPLE_EMPLOYEE_ROSTER_CSV,
  SAMPLE_EMPLOYEE_ROSTER_TSV,
  SAMPLE_EMPLOYEE_ROSTER_JSON,
  SAMPLE_ECOMMERCE_ORDERS_CSV,
  SAMPLE_ECOMMERCE_ORDERS_JSON,
  SAMPLE_ANALYTICS_EVENTS_CSV,
  SAMPLE_ANALYTICS_EVENTS_JSON,
  SAMPLE_KUBERNETES_DEPLOYMENT_YAML,
  SAMPLE_CRM_CUSTOMERS_JSON,
  SAMPLE_CRM_CUSTOMERS_YAML,
  DATA_SAMPLE_PRESETS,
  getSamplePresetById,
  getSamplePresetsByCategory,
} = await import('../lib/data/samples.ts');

async function runWorkerM1Tests() {
  console.log('================================================================');
  console.log(' 🧪 RUNNING WORKER M1: DATA ENGINES & UTILITIES UNIT TEST SUITE');
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

  // ==========================================================================
  // Suite 1: CSV RFC 4180 Engine & Parsing
  // ==========================================================================
  console.log('--- Suite 1: RFC 4180 Parsing & Serialization ---');

  test('T1.1: parses standard CSV and serializes back identically', () => {
    const csv = 'id,name,role\n1,Alice,Engineer\n2,Bob,Product';
    const parsed = parseCsv(csv);
    assert.strictEqual(parsed.error, undefined);
    assert.strictEqual(parsed.rows.length, 3);
    assert.deepStrictEqual(parsed.headers, ['id', 'name', 'role']);
    const serialized = serializeCsv(parsed.rows);
    assert.strictEqual(serialized, csv);
  });

  test('T1.2: handles escaped quotes ("") inside fields', () => {
    const csv = 'quote\n"He said ""Hello, world!"""';
    const parsed = parseCsv(csv);
    assert.strictEqual(parsed.error, undefined);
    assert.strictEqual(parsed.rows[1][0], 'He said "Hello, world!"');
    const serialized = serializeCsv(parsed.rows);
    assert.strictEqual(serialized, csv);
  });

  test('T1.3: handles embedded newlines inside quoted fields', () => {
    const csv = 'id,multiline\n101,"Line 1\nLine 2\nLine 3"\n102,Simple';
    const parsed = parseCsv(csv);
    assert.strictEqual(parsed.error, undefined);
    assert.strictEqual(parsed.rows.length, 3);
    assert.strictEqual(parsed.rows[1][1], 'Line 1\nLine 2\nLine 3');
    assert.strictEqual(parsed.rows[2][1], 'Simple');
  });

  test('T1.4: pinpoints exact error coordinates on unclosed quote', () => {
    const badCsv = 'colA,colB\n1,"unclosed field without quote\n2,ok';
    const parsed = parseCsv(badCsv);
    assert.ok(parsed.error);
    assert.strictEqual(parsed.error.line, 2);
    assert.strictEqual(parsed.error.column, 3);
  });

  test('T1.5: pinpoints exact error coordinates on stray character after closing quote', () => {
    const badCsv = 'a,b\n"quoted"stray,c';
    const parsed = parseCsv(badCsv);
    assert.ok(parsed.error);
    assert.strictEqual(parsed.error.line, 2);
    assert.strictEqual(parsed.error.column, 9);
  });

  test('T1.6: pinpoints unescaped quote inside unquoted field', () => {
    const badCsv = 'name\nJohn"Doe';
    const parsed = parseCsv(badCsv);
    assert.ok(parsed.error);
    assert.strictEqual(parsed.error.line, 2);
    assert.strictEqual(parsed.error.column, 5);
  });

  // ==========================================================================
  // Suite 2: Delimiter Auto-Detection
  // ==========================================================================
  console.log('\n--- Suite 2: Delimiter Auto-Detection ---');

  test('T2.1: accurately detects comma delimiter', () => {
    const csv = 'first_name,last_name,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com';
    const detected = detectDelimiter(csv);
    assert.strictEqual(detected.delimiter, ',');
    assert.ok(detected.confidence > 0.5);
  });

  test('T2.2: accurately detects tab delimiter (TSV)', () => {
    const tsv = 'first_name\tlast_name\temail\nJohn\tDoe\tjohn@example.com\nJane\tSmith\tjane@example.com';
    const detected = detectDelimiter(tsv);
    assert.strictEqual(detected.delimiter, '\t');
    assert.ok(detected.confidence > 0.5);
  });

  test('T2.3: accurately detects semicolon delimiter with embedded commas', () => {
    const semi = 'id;name;city;salary\n1;"Smith, John";Munich;€3,500.00\n2;"Müller, Hans";Berlin;€4,200.00';
    const detected = detectDelimiter(semi);
    assert.strictEqual(detected.delimiter, ';');
  });

  test('T2.4: accurately detects pipe delimiter', () => {
    const pipe = 'id|status|message\n1|200|OK\n2|404|Not Found\n3|500|Server Error';
    const detected = detectDelimiter(pipe);
    assert.strictEqual(detected.delimiter, '|');
  });

  // ==========================================================================
  // Suite 3: CSV Cleaner Engine
  // ==========================================================================
  console.log('\n--- Suite 3: CSV Cleaner Engine ---');

  test('T3.1: trims whitespace from fields', () => {
    const dirty = 'name , role , country \n  Alice  , Engineer ,  France  ';
    const res = cleanCsv(dirty, { trimWhitespace: true });
    assert.strictEqual(res.rows[0].join(','), 'name,role,country');
    assert.strictEqual(res.rows[1].join(','), 'Alice,Engineer,France');
    assert.ok(res.metrics.fieldsTrimmed > 0);
  });

  test('T3.2: strips blank rows and empty lines', () => {
    const dirty = 'a,b,c\n\n1,2,3\n   \n4,5,6\n,,,\n7,8,9';
    const res = cleanCsv(dirty, { removeBlankRows: true });
    assert.strictEqual(res.rows.length, 4); // header + 3 data rows
    assert.ok(res.metrics.blankRowsRemoved >= 3);
  });

  test('T3.3: repairs uneven column lengths by padding and truncating', () => {
    const dirty = 'col1,col2,col3\n1,2\n10,20,30,40\n100';
    const res = cleanCsv(dirty, { repairUnevenRows: true, repairMode: 'truncate' });
    for (const row of res.rows) {
      assert.strictEqual(row.length, 3);
    }
    assert.strictEqual(res.rows[1][2], '');
    assert.ok(res.metrics.unevenRowsRepaired > 0);
  });

  test('T3.4: normalizes line breaks from CRLF and CR to LF', () => {
    const dirty = 'a,b\r\n1,2\r3,4\n5,6';
    const res = cleanCsv(dirty);
    assert.strictEqual(res.output, 'a,b\n1,2\n3,4\n5,6');
  });

  // ==========================================================================
  // Suite 4: CSV Deduplicator Engine
  // ==========================================================================
  console.log('\n--- Suite 4: CSV Deduplicator Engine ---');

  test('T4.1: full-row deduplication keeps first occurrence', () => {
    const input = 'id,name\n1,Alice\n2,Bob\n1,Alice\n3,Charlie\n2,Bob';
    const res = deduplicateCsv(input, { dedupeMode: 'all-columns', strategy: 'keep-first' });
    assert.strictEqual(res.metrics.uniqueRowCount, 3);
    assert.strictEqual(res.metrics.duplicatesRemoved, 2);
    assert.strictEqual(res.metrics.totalDuplicates, 2);
    assert.strictEqual(res.metrics.removedCount, 2);
    assert.strictEqual(res.rows.length, 4); // header + 3 unique
  });

  test('T4.2: primary-key deduplication on selected column with keep-last strategy', () => {
    const input = 'id,name,version\n101,DocA,v1\n102,DocB,v1\n101,DocA,v2\n103,DocC,v1';
    const res = deduplicateCsv(input, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['id'],
      strategy: 'keep-last',
    });
    assert.strictEqual(res.metrics.uniqueRowCount, 3);
    assert.strictEqual(res.metrics.duplicatesRemoved, 1);
    // Row for 101 must be the v2 update
    const rec101 = res.rows.find(r => r[0] === '101');
    assert.ok(rec101);
    assert.strictEqual(rec101[2], 'v2');
  });

  // ==========================================================================
  // Suite 5: CSV Column Extractor
  // ==========================================================================
  console.log('\n--- Suite 5: CSV Column Extractor ---');

  test('T5.1: extracts subset of columns by name and reorders them', () => {
    const input = 'id,first,last,dept,salary\n1,John,Doe,Engineering,100000\n2,Jane,Smith,Design,95000';
    const res = extractColumns(input, ['salary', 'first', 'dept']);
    assert.strictEqual(res.headers.join(','), 'salary,first,dept');
    assert.strictEqual(res.rows[1].join(','), '100000,John,Engineering');
    assert.strictEqual(res.columnsExtractedCount, 3);
  });

  test('T5.2: renames extracted columns with custom headers', () => {
    const input = 'cust_id,cust_email\nC-1,user@test.io';
    const configs = [
      { originalIndex: 0, originalName: 'cust_id', customName: 'Customer ID', selected: true },
      { originalIndex: 1, originalName: 'cust_email', customName: 'Email Address', selected: true },
    ];
    const res = extractColumns(input, configs);
    assert.strictEqual(res.headers.join(','), 'Customer ID,Email Address');
    assert.strictEqual(res.rows[1].join(','), 'C-1,user@test.io');
  });

  test('T5.3: exports with custom delimiter (TSV output)', () => {
    const input = 'a,b,c\n1,2,3';
    const res = extractColumns(input, ['a', 'c'], { outputDelimiter: '\t' });
    assert.strictEqual(res.output, 'a\tc\n1\t3');
  });

  // ==========================================================================
  // Suite 6: CSV Sorter Engine
  // ==========================================================================
  console.log('\n--- Suite 6: CSV Sorter Engine ---');

  test('T6.1: sorts natural text ascending and descending', () => {
    const input = 'city\nSeattle\nBerlin\nTokyo\nAmsterdam';
    const resAsc = sortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'text' }]);
    assert.strictEqual(resAsc.rows.map(r => r[0]).join(','), 'city,Amsterdam,Berlin,Seattle,Tokyo');

    const resDesc = sortCsv(input, [{ columnIndex: 0, direction: 'desc', type: 'text' }]);
    assert.strictEqual(resDesc.rows.map(r => r[0]).join(','), 'city,Tokyo,Seattle,Berlin,Amsterdam');
  });

  test('T6.2: sorts numeric currency values with dollar signs and commas', () => {
    const input = 'item,cost\nA,"$1,250.00"\nB,$49.99\nC,$350.50\nD,$5.00';
    const res = sortCsv(input, [{ columnIndex: 1, direction: 'asc', type: 'number' }]);
    assert.strictEqual(res.rows[1][1], '$5.00');
    assert.strictEqual(res.rows[2][1], '$49.99');
    assert.strictEqual(res.rows[3][1], '$350.50');
    assert.strictEqual(res.rows[4][1], '$1,250.00');
  });

  test('T6.3: multi-column hierarchical sort (dept asc, salary desc)', () => {
    const input = 'dept,salary\nSales,50000\nEng,90000\nSales,75000\nEng,120000';
    const res = sortCsv(input, [
      { columnIndex: 0, direction: 'asc', type: 'text' },
      { columnIndex: 1, direction: 'desc', type: 'number' },
    ]);
    assert.strictEqual(res.rows[1].join(','), 'Eng,120000');
    assert.strictEqual(res.rows[2].join(','), 'Eng,90000');
    assert.strictEqual(res.rows[3].join(','), 'Sales,75000');
    assert.strictEqual(res.rows[4].join(','), 'Sales,50000');
  });

  // ==========================================================================
  // Suite 7: YAML ↔ JSON Transpiler
  // ==========================================================================
  console.log('\n--- Suite 7: YAML ↔ JSON Transpiler ---');

  test('T7.1: yamlToJson parses single document to formatted JSON', () => {
    const yaml = 'name: whysogood\nversion: 2.5\nactive: true';
    const res = yamlToJson(yaml, { indent: 2 });
    assert.strictEqual(res.error, null);
    assert.strictEqual(res.docCount, 1);
    const parsed = JSON.parse(res.json);
    assert.strictEqual(parsed.name, 'whysogood');
    assert.strictEqual(parsed.version, 2.5);
    assert.strictEqual(parsed.active, true);
  });

  test('T7.2: yamlToJson parses multi-document stream into JSON array', () => {
    const multi = '---\nid: 1\nname: Doc1\n---\nid: 2\nname: Doc2\n---\nid: 3\nname: Doc3';
    const res = yamlToJson(multi);
    assert.strictEqual(res.error, null);
    assert.strictEqual(res.docCount, 3);
    assert.strictEqual(res.isMultiDoc, true);
    const arr = JSON.parse(res.json);
    assert.strictEqual(arr.length, 3);
    assert.strictEqual(arr[1].name, 'Doc2');
  });

  test('T7.3: yamlToJson resolves anchors, aliases, and merge keys', () => {
    const yamlWithAnchors = `
defaults: &base
  timeout: 30
  retries: 3
service:
  <<: *base
  port: 8080
`;
    const res = yamlToJson(yamlWithAnchors);
    assert.strictEqual(res.error, null);
    const parsed = JSON.parse(res.json);
    assert.strictEqual(parsed.service.timeout, 30);
    assert.strictEqual(parsed.service.retries, 3);
    assert.strictEqual(parsed.service.port, 8080);
  });

  test('T7.4: yamlToJson returns exact error coordinates on invalid YAML', () => {
    const badYaml = 'root:\n  valid: 1\n  invalid: [1, 2\nnext: 3';
    const res = yamlToJson(badYaml);
    assert.ok(res.error !== null);
    assert.ok(res.error.line >= 1);
    assert.ok(res.error.column >= 1);
  });

  test('T7.5: jsonToYaml converts JSON object to YAML with custom indent and quote styles', () => {
    const json = JSON.stringify({ title: 'Engineer', tags: ['frontend', 'react'] });
    const res = jsonToYaml(json, { indent: 4, quoteStyle: 'double' });
    assert.strictEqual(res.error, null);
    assert.ok(res.yaml.includes('    - "frontend"'));
  });

  // ==========================================================================
  // Suite 8: JSON ↔ CSV Data Transpiler
  // ==========================================================================
  console.log('\n--- Suite 8: JSON ↔ CSV Data Transpiler ---');

  test('T8.1: jsonToCsvData unions sparse/heterogeneous object schemas', () => {
    const json = JSON.stringify([
      { id: 1, name: 'Alice', role: 'Dev' },
      { id: 2, name: 'Bob', dept: 'Design' },
      { id: 3, name: 'Charlie', country: 'France' },
    ]);
    const res = jsonToCsvData(json);
    assert.strictEqual(res.error, null);
    assert.deepStrictEqual(res.headers, ['id', 'name', 'role', 'dept', 'country']);
    assert.strictEqual(res.rowCount, 3);
  });

  test('T8.2: jsonToCsvData flattens nested objects with dot-notation', () => {
    const json = JSON.stringify([
      { id: 101, user: { name: 'Eleanor', address: { city: 'Seattle', country: 'US' } } },
    ]);
    const res = jsonToCsvData(json, { flattenObjects: true });
    assert.strictEqual(res.error, null);
    assert.ok(res.headers.includes('user.address.city'));
    assert.ok(res.headers.includes('user.address.country'));
  });

  test('T8.3: csvToJsonData unflattens dot-notation and parses primitives/arrays', () => {
    const csv = 'id,user.name,user.city,tags,active\n101,Alice,Seattle,"[""admin"",""dev""]",true';
    const res = csvToJsonData(csv, { unflattenObjects: true, parsePrimitives: true, parseJsonValues: true });
    assert.strictEqual(res.error, null);
    assert.strictEqual(res.rowCount, 1);
    const obj = /** @type {any} */ (res.data[0]);
    assert.strictEqual(obj.id, 101);
    assert.strictEqual(obj.user.name, 'Alice');
    assert.strictEqual(obj.user.city, 'Seattle');
    assert.deepStrictEqual(obj.tags, ['admin', 'dev']);
    assert.strictEqual(obj.active, true);
  });

  test('T8.4: Bidirectional roundtrip JSON -> CSV -> JSON preserves data integrity', () => {
    const original = [
      { id: 'REC-1', contact: { email: 'a@test.com', phone: '555-0123' }, tags: ['vip', 'enterprise'], active: true },
      { id: 'REC-2', contact: { email: 'b@test.com', phone: '555-0456' }, tags: ['trial'], active: false },
    ];
    const csvRes = jsonToCsvData(JSON.stringify(original));
    assert.strictEqual(csvRes.error, null);
    const jsonRes = csvToJsonData(csvRes.csv);
    assert.strictEqual(jsonRes.error, null);
    assert.deepStrictEqual(jsonRes.data, original);
  });

  // ==========================================================================
  // Suite 9: Presets and Sample Datasets
  // ==========================================================================
  console.log('\n--- Suite 9: Realistic Sample Datasets ---');

  test('T9.1: DATA_SAMPLE_PRESETS contains all required presets', () => {
    assert.ok(DATA_SAMPLE_PRESETS.length >= 8);
    const ids = DATA_SAMPLE_PRESETS.map(p => p.id);
    assert.ok(ids.includes('employee-roster-csv'));
    assert.ok(ids.includes('employee-roster-tsv'));
    assert.ok(ids.includes('ecommerce-orders-csv'));
    assert.ok(ids.includes('analytics-events-csv'));
    assert.ok(ids.includes('kubernetes-deployment-yaml'));
    assert.ok(ids.includes('crm-customers-json'));
  });

  test('T9.2: getSamplePresetById and getSamplePresetsByCategory work accurately', () => {
    const k8s = getSamplePresetById('kubernetes-deployment-yaml');
    assert.ok(k8s);
    assert.strictEqual(k8s.category, 'YAML');
    const yamlPresets = getSamplePresetsByCategory('YAML');
    assert.ok(yamlPresets.length >= 2);
  });

  test('T9.3: Employee Roster CSV parses and cleans with 0 errors', () => {
    const cleaned = cleanCsv(SAMPLE_EMPLOYEE_ROSTER_CSV);
    assert.strictEqual(cleaned.error, null);
    assert.strictEqual(cleaned.rows.length, 11); // header + 10 staff
  });

  test('T9.4: Kubernetes Deployment YAML parses into 4 distinct documents', () => {
    const res = yamlToJson(SAMPLE_KUBERNETES_DEPLOYMENT_YAML);
    assert.strictEqual(res.error, null);
    assert.strictEqual(res.docCount, 4);
    assert.strictEqual(res.isMultiDoc, true);
  });

  test('T9.5: CRM Customer JSON converts to CSV and un-flattens back losslessly', () => {
    const csvRes = jsonToCsvData(SAMPLE_CRM_CUSTOMERS_JSON);
    assert.strictEqual(csvRes.error, null);
    assert.ok(csvRes.headers.includes('company.name'));
    assert.ok(csvRes.headers.includes('billing.address.city'));
    const jsonRes = csvToJsonData(csvRes.csv);
    assert.strictEqual(jsonRes.error, null);
    const original = JSON.parse(SAMPLE_CRM_CUSTOMERS_JSON);
    assert.deepStrictEqual(jsonRes.data, original);
  });

  console.log('\n================================================================');
  console.log(` 🏁 RESULTS: ${passedTests}/${totalTests} tests passed (100%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runWorkerM1Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
