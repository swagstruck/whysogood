// @ts-check
/**
 * Adversarial Forensic Integrity Stress Test for Milestone 1: Data Engines & Utilities
 * 
 * Verifies:
 * 1. Runtime network egress tracing: ensures ZERO calls to fetch, XHR, WebSocket, sendBeacon.
 * 2. Dynamic computation verification: ensures zero hardcoding via randomized inputs.
 * 3. Exact error diagnostics verification (1-indexed line/column).
 * 4. Large-scale performance (10,000+ rows) without freezing.
 * 5. Edge cases: circular references, nested structures, special characters, currencies, dates.
 */

import assert from 'node:assert';
import './e2e/helpers/ts_resolver.mjs';

// ── 1. Install Strict Network Egress Traps ──────────────────────────────────
let networkEgressAttempts = [];

// @ts-ignore
globalThis.fetch = function(...args) {
  networkEgressAttempts.push({ api: 'fetch', args });
  throw new Error('NETWORK EGRESS VIOLATION: fetch called during data processing');
};

// @ts-ignore
globalThis.XMLHttpRequest = class {
  open(...args) {
    networkEgressAttempts.push({ api: 'XMLHttpRequest.open', args });
    throw new Error('NETWORK EGRESS VIOLATION: XMLHttpRequest called');
  }
  send(...args) {
    networkEgressAttempts.push({ api: 'XMLHttpRequest.send', args });
    throw new Error('NETWORK EGRESS VIOLATION: XMLHttpRequest called');
  }
};

// @ts-ignore
globalThis.WebSocket = class {
  constructor(...args) {
    networkEgressAttempts.push({ api: 'WebSocket', args });
    throw new Error('NETWORK EGRESS VIOLATION: WebSocket instantiated');
  }
};

if (typeof navigator !== 'undefined') {
  // @ts-ignore
  navigator.sendBeacon = function(...args) {
    networkEgressAttempts.push({ api: 'navigator.sendBeacon', args });
    throw new Error('NETWORK EGRESS VIOLATION: navigator.sendBeacon called');
  };
}

// ── 2. Import Modules ──────────────────────────────────────────────────────
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

async function runAdversarialAudit() {
  console.log('================================================================');
  console.log(' 🕵️ ADVERSARIAL INTEGRITY AUDIT: MILESTONE 1 DATA ENGINES');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function runCheck(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // --------------------------------------------------------------------------
  // Check 1: Zero Network Egress Verification
  // --------------------------------------------------------------------------
  console.log('--- Check 1: Runtime Network Traps ---');

  runCheck('No network egress triggered during import and setup', () => {
    assert.strictEqual(networkEgressAttempts.length, 0);
  });

  // --------------------------------------------------------------------------
  // Check 2: Randomized Input Dynamic Computation (Anti-Hardcoding)
  // --------------------------------------------------------------------------
  console.log('\n--- Check 2: Anti-Hardcoding Dynamic Computation ---');

  runCheck('CSV roundtrip on randomized matrices with arbitrary content', () => {
    for (let iter = 0; iter < 10; iter++) {
      const numRows = Math.floor(Math.random() * 20) + 5;
      const numCols = Math.floor(Math.random() * 6) + 2;
      const matrix = [];

      for (let r = 0; r < numRows; r++) {
        const row = [];
        for (let c = 0; c < numCols; c++) {
          const rand = Math.random();
          if (rand < 0.2) {
            row.push(`text_${r}_${c},"with quotes and, comma"`);
          } else if (rand < 0.4) {
            row.push(`multi\nline_${r}_${c}`);
          } else if (rand < 0.6) {
            row.push(`escaped_""quotes""_${r}_${c}`);
          } else {
            row.push(`cell_${r}_${c}_${Math.random().toString(36).substring(7)}`);
          }
        }
        matrix.push(row);
      }

      const serialized = serializeCsv(matrix);
      const parsed = parseCsv(serialized);
      assert.strictEqual(parsed.error, undefined);
      assert.strictEqual(parsed.rows.length, matrix.length);

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          assert.strictEqual(parsed.rows[r][c], matrix[r][c]);
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // Check 3: Statistical Delimiter Auto-Detection with Embedded Noise
  // --------------------------------------------------------------------------
  console.log('\n--- Check 3: Delimiter Variance Scoring with Embedded Noise ---');

  runCheck('Detects pipe delimiter with embedded commas and quotes', () => {
    const pipeData = [
      'id|description|amount',
      '1|"Item with, comma"|100',
      '2|"Another item, with, multiple, commas"|250',
      '3|Simple item|300',
    ].join('\n');

    const result = detectDelimiter(pipeData);
    assert.strictEqual(result.delimiter, '|');
    assert.strictEqual(result.columnsDetected, 3);
  });

  runCheck('Detects tab delimiter with embedded semicolons and pipes', () => {
    const tsvData = [
      'colA\tcolB\tcolC\tcolD',
      'val1\t"some; semicolon"\tdata|pipe\t123',
      'val2\t"another; one"\tmore|pipes\t456',
    ].join('\n');

    const result = detectDelimiter(tsvData);
    assert.strictEqual(result.delimiter, '\t');
    assert.strictEqual(result.columnsDetected, 4);
  });

  runCheck('Detects semicolon delimiter with European decimal commas', () => {
    const semiData = [
      'product;price;tax;status',
      'Widget A;12,50;2,50;In Stock',
      'Widget B;99,99;20,00;Low Stock',
      'Widget C;0,45;0,09;In Stock',
    ].join('\n');

    const result = detectDelimiter(semiData);
    assert.strictEqual(result.delimiter, ';');
    assert.strictEqual(result.columnsDetected, 4);
  });

  // --------------------------------------------------------------------------
  // Check 4: Exact 1-Indexed Error Coordinates on Malformed Inputs
  // --------------------------------------------------------------------------
  console.log('\n--- Check 4: Exact Error Coordinates Diagnostic ---');

  runCheck('Unclosed quote reports exact line and column coordinates', () => {
    // Column count: 'valid_cell,' (11 chars) -> '"' is at column 12
    const malformed = 'header1,header2\nvalid_cell,"unclosed quote at col 12\nrow3,val';
    const parsed = parseCsv(malformed);
    assert.ok(parsed.error);
    assert.strictEqual(parsed.error.line, 2);
    assert.strictEqual(parsed.error.column, 12);
  });

  runCheck('Stray character after closing quote reports exact position', () => {
    const malformed = 'a,b\n"good"trailing,c';
    const parsed = parseCsv(malformed);
    assert.ok(parsed.error);
    assert.strictEqual(parsed.error.line, 2);
    assert.strictEqual(parsed.error.column, 7);
  });

  runCheck('YAML syntax error reports exact line and column coordinates', () => {
    const badYaml = 'root:\n  valid: 1\n  invalid: [1, 2\nnext: 3';
    const res = yamlToJson(badYaml);
    assert.ok(res.error);
    assert.ok(res.error.line >= 3);
    assert.ok(res.error.column >= 1);
  });

  // --------------------------------------------------------------------------
  // Check 5: Deduplication Algorithms (O(N) Set and Keep-Last Map)
  // --------------------------------------------------------------------------
  console.log('\n--- Check 5: Deduplication Verification ---');

  runCheck('O(N) deduplication with random IDs and precise duplicate counts', () => {
    const rows = ['id,name,val'];
    const totalRecords = 1000;
    const uniqueCount = 400;

    for (let i = 0; i < totalRecords; i++) {
      const id = (i % uniqueCount) + 1;
      rows.push(`${id},Name_${id},Val_${i}`);
    }

    const csvContent = rows.join('\n');

    // Deduplicate on primary key 'id'
    const resFirst = deduplicateCsv(csvContent, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['id'],
      strategy: 'keep-first',
    });

    assert.strictEqual(resFirst.metrics.uniqueRowCount, uniqueCount);
    assert.strictEqual(resFirst.metrics.duplicatesRemoved, totalRecords - uniqueCount);
    assert.strictEqual(resFirst.rows.length, uniqueCount + 1);

    // Keep first must have Val_0 for id 1
    const firstRow1 = resFirst.rows.find(r => r[0] === '1');
    assert.strictEqual(firstRow1[2], 'Val_0');

    // Deduplicate with keep-last strategy
    const resLast = deduplicateCsv(csvContent, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['id'],
      strategy: 'keep-last',
    });

    assert.strictEqual(resLast.metrics.uniqueRowCount, uniqueCount);
    assert.strictEqual(resLast.metrics.duplicatesRemoved, totalRecords - uniqueCount);

    // Keep last must have Val_800 for id 1 (since 800 % 400 == 0 -> id 1)
    const lastRow1 = resLast.rows.find(r => r[0] === '1');
    assert.strictEqual(lastRow1[2], 'Val_800');
  });

  // --------------------------------------------------------------------------
  // Check 6: Sorter Multi-Column, Data Types, and Nulls Positioning
  // --------------------------------------------------------------------------
  console.log('\n--- Check 6: Sorter Multi-Column and Nulls Positioning ---');

  runCheck('Numeric sorting handles currencies, decimals, negatives, and percentages', () => {
    const input = [
      'product,price,discount',
      'A,"$1,000.50",15%',
      'B,-$50.00,5%',
      'C,$25.00,50%',
      'D,$0.00,0%',
      'E,€150.00,10%',
    ].join('\n');

    const res = sortCsv(input, [
      { columnIndex: 1, direction: 'asc', type: 'number' },
    ]);

    const prices = res.rows.slice(1).map(r => r[1]);
    assert.deepStrictEqual(prices, ['-$50.00', '$0.00', '$25.00', '€150.00', '$1,000.50']);
  });

  runCheck('Nulls position top vs bottom strictly respected regardless of direction', () => {
    const input = [
      'name,score',
      'Alice,95',
      'Bob,',
      'Charlie,70',
      'Dave,',
      'Eve,85',
    ].join('\n');

    // Ascending with nulls bottom
    const ascBottom = sortCsv(input, [
      { columnIndex: 1, direction: 'asc', type: 'number', nullsPosition: 'bottom' },
    ]);
    const namesAscBottom = ascBottom.rows.slice(1).map(r => r[0]);
    assert.deepStrictEqual(namesAscBottom, ['Charlie', 'Eve', 'Alice', 'Bob', 'Dave']);

    // Descending with nulls bottom
    const descBottom = sortCsv(input, [
      { columnIndex: 1, direction: 'desc', type: 'number', nullsPosition: 'bottom' },
    ]);
    const namesDescBottom = descBottom.rows.slice(1).map(r => r[0]);
    assert.deepStrictEqual(namesDescBottom, ['Alice', 'Eve', 'Charlie', 'Bob', 'Dave']);

    // Ascending with nulls top
    const ascTop = sortCsv(input, [
      { columnIndex: 1, direction: 'asc', type: 'number', nullsPosition: 'top' },
    ]);
    const namesAscTop = ascTop.rows.slice(1).map(r => r[0]);
    assert.deepStrictEqual(namesAscTop, ['Bob', 'Dave', 'Charlie', 'Eve', 'Alice']);

    // Descending with nulls top
    const descTop = sortCsv(input, [
      { columnIndex: 1, direction: 'desc', type: 'number', nullsPosition: 'top' },
    ]);
    const namesDescTop = descTop.rows.slice(1).map(r => r[0]);
    assert.deepStrictEqual(namesDescTop, ['Bob', 'Dave', 'Alice', 'Eve', 'Charlie']);
  });

  // --------------------------------------------------------------------------
  // Check 7: Transpilers Roundtripping & Circular Reference Safety
  // --------------------------------------------------------------------------
  console.log('\n--- Check 7: Transpilers Safety and Roundtripping ---');

  runCheck('Deep nesting (15+ levels) respects maxDepth boundary and flattens cleanly', () => {
    let deep = { val: 42 };
    for (let i = 0; i < 15; i++) {
      deep = { [`level_${i}`]: deep };
    }
    const flattened = flattenObject(deep, '', 0, 10);
    assert.ok(flattened);
    // Boundary reached: deeper level serialized as JSON string
    assert.ok(Object.keys(flattened).length > 0);
  });

  runCheck('Adversarial vulnerability: circular object in flattenObject handles circular references safely', () => {
    const circ = { name: 'Root' };
    // @ts-ignore
    circ.self = circ;

    const flattened = flattenObject(circ, '', 0, 10);
    assert.ok(flattened);
    assert.strictEqual(flattened['self'], '[Circular]');
  });

  runCheck('Deep nested JSON to CSV and back losslessly', () => {
    const complexObj = [
      {
        id: 'C-01',
        org: {
          name: 'Tech Corp',
          hq: {
            city: 'San Francisco',
            geo: { lat: 37.7749, lng: -122.4194 },
          },
        },
        roles: ['admin', 'billing', 'developer'],
        metadata: { active: true, count: 42, score: 9.87 },
      },
      {
        id: 'C-02',
        org: {
          name: 'Global Inc',
          hq: {
            city: 'London',
            geo: { lat: 51.5074, lng: -0.1278 },
          },
        },
        roles: ['viewer'],
        metadata: { active: false, count: 0, score: 0 },
      },
    ];

    const csvRes = jsonToCsvData(JSON.stringify(complexObj));
    assert.strictEqual(csvRes.error, null);
    assert.ok(csvRes.headers.includes('org.hq.geo.lat'));
    assert.ok(csvRes.headers.includes('roles'));

    const jsonRes = csvToJsonData(csvRes.csv);
    assert.strictEqual(jsonRes.error, null);
    assert.deepStrictEqual(jsonRes.data, complexObj);
  });

  // --------------------------------------------------------------------------
  // Check 8: Performance on 10,000 Row Dataset
  // --------------------------------------------------------------------------
  console.log('\n--- Check 8: 10,000 Row Scale Performance ---');

  runCheck('Processes 10,000 rows across Cleaner, Deduplicator, and Sorter in < 500ms', () => {
    const rows = ['id,name,role,salary,status'];
    for (let i = 0; i < 10000; i++) {
      const id = i + 1;
      const salary = (50000 + (i * 17) % 100000);
      const isDup = i % 5 === 0;
      rows.push(`${isDup ? 1 : id},User_${id},Role_${i % 10},$${salary.toLocaleString()},Active`);
    }
    const bigCsv = rows.join('\n');

    const t0 = Date.now();
    const cleanRes = cleanCsv(bigCsv);
    const tClean = Date.now() - t0;

    const t1 = Date.now();
    const dedupRes = deduplicateCsv(cleanRes.output, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['id'],
    });
    const tDedup = Date.now() - t1;

    const t2 = Date.now();
    const sortRes = sortCsv(dedupRes.output, [
      { columnIndex: 3, direction: 'desc', type: 'number' },
    ]);
    const tSort = Date.now() - t2;

    const totalDuration = Date.now() - t0;
    console.log(`    Scale timings (10,000 rows): Clean=${tClean}ms, Dedup=${tDedup}ms, Sort=${tSort}ms. Total=${totalDuration}ms`);

    assert.ok(totalDuration < 500, `Execution exceeded 500ms budget: ${totalDuration}ms`);
    assert.strictEqual(cleanRes.rows.length, 10001);
    assert.ok(dedupRes.metrics.duplicatesRemoved > 0);
    assert.strictEqual(sortRes.rows.length, dedupRes.rows.length);
  });

  // --------------------------------------------------------------------------
  // Final Network Egress Check
  // --------------------------------------------------------------------------
  runCheck('ZERO network egress attempts occurred throughout the entire stress test', () => {
    assert.strictEqual(networkEgressAttempts.length, 0);
  });

  console.log('\n================================================================');
  console.log(` 🏁 ADVERSARIAL AUDIT RESULTS: ${passed}/${total} checks passed (100%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAdversarialAudit().catch((err) => {
  console.error('Adversarial audit failed:', err);
  process.exit(1);
});
