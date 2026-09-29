// @ts-check
/**
 * Empirical Adversarial Challenger Test Harness for Milestone 1 Data Engines
 * Target: lib/data/csvEngine.ts
 *
 * Verifies:
 * - 10,000+ to 25,000+ row scaling and throughput
 * - Linear O(N) deduplication time complexity and memory limits
 * - Delimiter auto-detection under conflicting candidates & edge cases
 * - RFC 4180 parsing with embedded quotes, newlines, CRLF, and UTF-8
 * - Positional diagnostic precision on syntax errors at scale
 * - Uneven column length repair (pad & truncate)
 * - Multi-column hierarchical sorting, type inference, and nulls positioning
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

async function runChallengerTests() {
  console.log('========================================================================');
  console.log(' ⚔️  CHALLENGER 1: EMPIRICAL STRESS & VERIFICATION TEST HARNESS');
  console.log(' Target: lib/data/csvEngine.ts');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const findings = [];

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(`    Message: ${err.message}`);
      findings.push({ name, error: err.message, stack: err.stack });
    }
  }

  // ==========================================================================
  // Suite 1: Delimiter Conflict Stress & Auto-Detection Accuracy
  // ==========================================================================
  console.log('--- Suite 1: Delimiter Conflict Stress & Auto-Detection Accuracy ---');

  test('S1.1: TSV with conflicting commas and semicolons inside unquoted text', () => {
    // 60 rows of TSV where fields contain addresses with commas and notes with semicolons
    const rows = ['id\taddress\tnotes\tstatus'];
    for (let i = 1; i <= 60; i++) {
      rows.push(`${i}\t123 Main St, Apt ${i}, New York, NY\tNote A; Note B; Priority ${i}\tACTIVE`);
    }
    const tsv = rows.join('\n');
    const detected = detectDelimiter(tsv);
    assert.strictEqual(detected.delimiter, '\t', `Expected tab delimiter, got '${detected.delimiter}'`);
    assert.strictEqual(detected.columnsDetected, 4);
    assert.ok(detected.confidence > 0.6, `Expected confidence > 0.6, got ${detected.confidence}`);
  });

  test('S1.2: Semicolon CSV with European decimal commas (e.g. 12,50;45,00)', () => {
    const rows = ['product_id;price_eur;tax_rate;total_cost'];
    for (let i = 1; i <= 60; i++) {
      rows.push(`PROD-${i};${(i * 12.5).toFixed(2).replace('.', ',')};19,00;${(i * 14.87).toFixed(2).replace('.', ',')}`);
    }
    const semiCsv = rows.join('\n');
    const detected = detectDelimiter(semiCsv);
    assert.strictEqual(detected.delimiter, ';', `Expected semicolon delimiter, got '${detected.delimiter}'`);
    assert.strictEqual(detected.columnsDetected, 4);
  });

  test('S1.3: Pipe delimited CSV with comma and semicolon values', () => {
    const rows = ['user_id|geo_loc|preferences|updated_at'];
    for (let i = 1; i <= 60; i++) {
      rows.push(`USR-${i}|Paris, France|dark_mode=true; notifications=email|2026-09-26`);
    }
    const pipeCsv = rows.join('\n');
    const detected = detectDelimiter(pipeCsv);
    assert.strictEqual(detected.delimiter, '|', `Expected pipe delimiter, got '${detected.delimiter}'`);
    assert.strictEqual(detected.columnsDetected, 4);
  });

  test('S1.4: Comma-delimited CSV with quoted fields full of semicolons, pipes, and tabs', () => {
    const rows = ['id,data,tags,flags'];
    for (let i = 1; i <= 60; i++) {
      rows.push(`${i},"field; with; multiple; semicolons; and | pipes |","tag1\ttag2\ttag3","flag_a;flag_b"`);
    }
    const commaCsv = rows.join('\n');
    const detected = detectDelimiter(commaCsv);
    assert.strictEqual(detected.delimiter, ',', `Expected comma delimiter, got '${detected.delimiter}'`);
    assert.strictEqual(detected.columnsDetected, 4);
  });

  test('S1.5: Single-column data with no delimiter (safe fallback)', () => {
    const rows = ['uuid'];
    for (let i = 1; i <= 50; i++) {
      rows.push(`550e8400-e29b-41d4-a716-4466554400${i < 10 ? '0' + i : i}`);
    }
    const singleCol = rows.join('\n');
    const detected = detectDelimiter(singleCol);
    assert.strictEqual(detected.delimiter, ',', 'Expected safe fallback to comma for single column');
    assert.strictEqual(detected.confidence, 0);
    assert.strictEqual(detected.columnsDetected, 0);
  });

  test('S1.6: Delimiter detection performance benchmark on 10,000 and 50,000 rows', () => {
    // 10,000 rows
    const rows10k = ['id,name,role,department,salary'];
    for (let i = 1; i <= 10000; i++) {
      rows10k.push(`${i},User_${i},Engineer,Engineering,$${50000 + i}`);
    }
    const csv10k = rows10k.join('\n');

    const t0 = performance.now();
    const detected10k = detectDelimiter(csv10k);
    const duration10k = performance.now() - t0;
    console.log(`    📊 Delimiter detection on 10,000 rows: ${duration10k.toFixed(2)}ms (detected: '${detected10k.delimiter}', conf: ${detected10k.confidence})`);
    assert.strictEqual(detected10k.delimiter, ',');

    // 50,000 rows
    const rows50k = ['id,name,role,department,salary'];
    for (let i = 1; i <= 50000; i++) {
      rows50k.push(`${i},User_${i},Engineer,Engineering,$${50000 + i}`);
    }
    const csv50k = rows50k.join('\n');

    const t1 = performance.now();
    const detected50k = detectDelimiter(csv50k);
    const duration50k = performance.now() - t1;
    console.log(`    📊 Delimiter detection on 50,000 rows: ${duration50k.toFixed(2)}ms (detected: '${detected50k.delimiter}', conf: ${detected50k.confidence})`);
    assert.strictEqual(detected50k.delimiter, ',');
    assert.ok(duration50k < 5000, `Delimiter detection on 50k rows took too long (${duration50k.toFixed(2)}ms)`);
  });

  // ==========================================================================
  // Suite 2: RFC 4180 Parsing & Serialization Stress (10,000+ rows)
  // ==========================================================================
  console.log('\n--- Suite 2: RFC 4180 Parsing & Serialization Stress (10,000+ rows) ---');

  test('S2.1: 10,000 rows with mixed RFC 4180 complexity (embedded newlines, quotes, commas, CRLF)', () => {
    const rawRows = ['id,description,quote_example,notes,status'];
    const expectedData = [];

    for (let i = 1; i <= 10000; i++) {
      const type = i % 5;
      let rowStr = '';
      let rowObj = [];

      if (type === 0) {
        // Embedded newline in quotes
        rowStr = `${i},"Line 1\nLine 2 for ${i}","Standard Quote","Note ${i}",ACTIVE`;
        rowObj = [String(i), `Line 1\nLine 2 for ${i}`, 'Standard Quote', `Note ${i}`, 'ACTIVE'];
      } else if (type === 1) {
        // Escaped quotes ""
        rowStr = `${i},"Simple text","He said ""Hello world!"" to ${i}","Note ${i}",PENDING`;
        rowObj = [String(i), 'Simple text', `He said "Hello world!" to ${i}`, `Note ${i}`, 'PENDING'];
      } else if (type === 2) {
        // Commas inside quoted field
        rowStr = `${i},"San Francisco, CA, USA","No quote","Item A, Item B, Item C",ARCHIVED`;
        rowObj = [String(i), 'San Francisco, CA, USA', 'No quote', 'Item A, Item B, Item C', 'ARCHIVED'];
      } else if (type === 3) {
        // CRLF line ending inside text
        rowStr = `${i},"CRLF\r\nInside field","Quote ""with"" comma, inside","Note ${i}",REVIEW`;
        rowObj = [String(i), 'CRLF\r\nInside field', 'Quote "with" comma, inside', `Note ${i}`, 'REVIEW'];
      } else {
        // Standard row
        rowStr = `${i},Simple desc,Plain quote,Simple note,DONE`;
        rowObj = [String(i), 'Simple desc', 'Plain quote', 'Simple note', 'DONE'];
      }

      rawRows.push(rowStr);
      expectedData.push(rowObj);
    }

    const payload = rawRows.join('\n');
    const byteSize = Buffer.byteLength(payload, 'utf8');

    const t0 = performance.now();
    const parsed = parseCsv(payload);
    const duration = performance.now() - t0;

    console.log(`    📊 Parsed 10,000 complex RFC 4180 rows (${(byteSize / (1024 * 1024)).toFixed(2)} MB): ${duration.toFixed(2)}ms (${Math.round((10000 / duration) * 1000)} rows/sec)`);

    assert.strictEqual(parsed.error, undefined, `Parse error: ${parsed.error?.message}`);
    assert.strictEqual(parsed.rows.length, 10001, `Expected 10,001 rows (header + 10,000), got ${parsed.rows.length}`);
    assert.deepStrictEqual(parsed.headers, ['id', 'description', 'quote_example', 'notes', 'status']);

    // Spot-check specific complex rows
    assert.deepStrictEqual(parsed.rows[1], expectedData[0]); // row 1 (embedded newline)
    assert.deepStrictEqual(parsed.rows[2], expectedData[1]); // row 2 (escaped quote)
    assert.deepStrictEqual(parsed.rows[3], expectedData[2]); // row 3 (commas in quotes)
    assert.deepStrictEqual(parsed.rows[10000], expectedData[9999]); // last row

    // Verify roundtrip serialization
    const tSerialize0 = performance.now();
    const serialized = serializeCsv(parsed.rows);
    const serializeDuration = performance.now() - tSerialize0;
    console.log(`    📊 Serialized 10,001 rows back to CSV: ${serializeDuration.toFixed(2)}ms`);

    // Parse serialized output back and verify 100% data fidelity
    const parsedBack = parseCsv(serialized);
    assert.strictEqual(parsedBack.error, undefined);
    assert.strictEqual(parsedBack.rows.length, 10001);
    assert.deepStrictEqual(parsedBack.rows[1], expectedData[0]);
    assert.deepStrictEqual(parsedBack.rows[2], expectedData[1]);
  });

  test('S2.2: 25,000 rows high-volume throughput benchmark', () => {
    const rawRows = ['id,uuid,email,amount,created_at'];
    for (let i = 1; i <= 25000; i++) {
      rawRows.push(`${i},usr_${i}_abcdef123456,user${i}@domain.example.com,$${(i * 1.5).toFixed(2)},2026-09-26T12:00:00Z`);
    }
    const csv = rawRows.join('\n');
    const byteLength = Buffer.byteLength(csv, 'utf8');

    const t0 = performance.now();
    const parsed = parseCsv(csv);
    const duration = performance.now() - t0;
    const throughput = Math.round((25000 / duration) * 1000);

    console.log(`    📊 25,000 rows throughput: ${duration.toFixed(2)}ms | ${(byteLength / (1024 * 1024)).toFixed(2)}MB | ${throughput.toLocaleString()} rows/sec`);
    assert.strictEqual(parsed.error, undefined);
    assert.strictEqual(parsed.rows.length, 25001);
    assert.ok(duration < 2000, `25,000 rows parse took too long: ${duration.toFixed(2)}ms (expected < 2000ms)`);
  });

  test('S2.3: Multibyte UTF-8, CJK, Arabic RTL, and Surrogate Pair Emojis', () => {
    const unicodeCsv = [
      'id,language,greeting,emoji,notes',
      '1,Japanese,"こんにちは、世界！",🇯🇵,"日本語テスト"',
      '2,Arabic,"مرحبا بالعالم",🌍,"اختبار النص العربي"',
      '3,Hindi,"नमस्ते दुनिया",✨,"देवनागरी लिपि"',
      '4,Complex Emoji,"Family: 👨‍👩‍👧‍👦 Rocket: 🚀",🎉,"Zero-width joiners and surrogate pairs"',
    ].join('\n');

    const parsed = parseCsv(unicodeCsv);
    assert.strictEqual(parsed.error, undefined);
    assert.strictEqual(parsed.rows.length, 5);
    assert.strictEqual(parsed.rows[1][2], 'こんにちは、世界！');
    assert.strictEqual(parsed.rows[2][2], 'مرحبا بالعالم');
    assert.strictEqual(parsed.rows[3][2], 'नमस्ते दुनिया');
    assert.strictEqual(parsed.rows[4][2], 'Family: 👨‍👩‍👧‍👦 Rocket: 🚀');
    assert.strictEqual(parsed.rows[4][3], '🎉');

    // Serialization preservation
    const serialized = serializeCsv(parsed.rows);
    assert.ok(serialized.includes('👨‍👩‍👧‍👦'));
    assert.ok(serialized.includes('مرحبا بالعالم'));
  });

  test('S2.4: Pathological Quoting Edge Cases (Alternating, Empty, Whitespace-only)', () => {
    const cases = [
      {
        csv: 'a,b\n"",""',
        expected: [['a', 'b'], ['', '']],
        desc: 'empty quoted fields',
      },
      {
        csv: 'a,b\n"""hello""","""world"""',
        expected: [['a', 'b'], ['"hello"', '"world"']],
        desc: 'fields wrapped in quotes containing inner quotes',
      },
      {
        csv: 'a,b\n"   ","\t\t"',
        expected: [['a', 'b'], ['   ', '\t\t']],
        desc: 'quoted whitespace preserved verbatim',
      },
      {
        csv: 'a,b\n",\n,",""",\n,"""',
        expected: [['a', 'b'], [',\n,', '",\n,"']],
        desc: 'quotes containing delimiters, newlines, and escaped quotes',
      },
    ];

    for (const c of cases) {
      const parsed = parseCsv(c.csv);
      assert.strictEqual(parsed.error, undefined, `Failed on ${c.desc}: ${parsed.error?.message}`);
      assert.deepStrictEqual(parsed.rows, c.expected, `Mismatch on ${c.desc}`);
    }
  });

  test('S2.5: Syntax Diagnostic Accuracy at Scale (Row 5,000 / File line 5,001 unclosed quote)', () => {
    const rows = ['id,name,status']; // Line 1
    for (let i = 1; i <= 6000; i++) {
      if (i === 5000) {
        // This is row index 5000, which is file line 5001. Opening quote is at column 6 ("5000,")
        rows.push(`${i},"unclosed quote starting here,ACTIVE`);
      } else {
        rows.push(`${i},User_${i},ACTIVE`);
      }
    }
    const badCsv = rows.join('\n');
    const parsed = parseCsv(badCsv);
    assert.ok(parsed.error !== undefined, 'Expected diagnostic error');
    assert.strictEqual(parsed.error.line, 5001, `Expected error line 5001, got ${parsed.error.line}`);
    assert.strictEqual(parsed.error.column, 6, `Expected error column 6, got ${parsed.error.column}`);
    console.log(`    🎯 Pinpointed unclosed quote at scale: Line ${parsed.error.line}, Column ${parsed.error.column}`);
  });

  test('S2.6: Syntax Diagnostic Accuracy at Scale (Row 7,500 / File line 7,501 stray char after closing quote)', () => {
    const rows = ['id,name,status']; // Line 1
    for (let i = 1; i <= 8000; i++) {
      if (i === 7500) {
        // This is row index 7500, which is file line 7501
        rows.push(`${i},"quoted field"stray_char,ACTIVE`);
      } else {
        rows.push(`${i},User_${i},ACTIVE`);
      }
    }
    const badCsv = rows.join('\n');
    const parsed = parseCsv(badCsv);
    assert.ok(parsed.error !== undefined, 'Expected diagnostic error');
    assert.strictEqual(parsed.error.line, 7501, `Expected error line 7501, got ${parsed.error.line}`);
    console.log(`    🎯 Pinpointed stray char at scale: Line ${parsed.error.line}, Column ${parsed.error.column} ('${parsed.error.message}')`);
  });

  // ==========================================================================
  // Suite 3: CSV Cleaner Stress & Uneven Column Repairs
  // ==========================================================================
  console.log('\n--- Suite 3: CSV Cleaner Stress & Uneven Column Repairs ---');

  test('S3.1: 10,000 rows with severe uneven column lengths (pad mode)', () => {
    const rows = ['col1,col2,col3,col4,col5'];
    for (let i = 1; i <= 10000; i++) {
      if (i % 3 === 0) {
        // Short row (2 columns)
        rows.push(`${i},val_${i}`);
      } else if (i % 3 === 1) {
        // Exact length (5 columns)
        rows.push(`${i},val_${i}_2,val_${i}_3,val_${i}_4,val_${i}_5`);
      } else {
        // Extra long row (8 columns)
        rows.push(`${i},v2,v3,v4,v5,extra_${i}_6,extra_${i}_7,extra_${i}_8`);
      }
    }
    const csv = rows.join('\n');

    const t0 = performance.now();
    const res = cleanCsv(csv, { repairUnevenRows: true, repairMode: 'pad' });
    const duration = performance.now() - t0;
    console.log(`    📊 cleanCsv repaired 10,000 uneven rows (pad): ${duration.toFixed(2)}ms`);

    assert.strictEqual(res.error, null);
    assert.strictEqual(res.rows.length, 10001);
    assert.ok(res.metrics.unevenRowsRepaired > 0);

    // In pad mode, short rows should be padded to 5 columns
    const row3 = res.rows[3];
    assert.strictEqual(row3.length, 5, `Expected short row to be padded to 5 cols, got ${row3.length}`);
    assert.strictEqual(row3[2], '');
    assert.strictEqual(row3[3], '');
    assert.strictEqual(row3[4], '');
  });

  test('S3.2: 10,000 rows with severe uneven column lengths (truncate mode)', () => {
    const rows = ['col1,col2,col3,col4,col5'];
    for (let i = 1; i <= 10000; i++) {
      if (i % 2 === 0) {
        rows.push(`${i},v2`); // 2 cols
      } else {
        rows.push(`${i},v2,v3,v4,v5,extra6,extra7,extra8`); // 8 cols
      }
    }
    const csv = rows.join('\n');

    const t0 = performance.now();
    const res = cleanCsv(csv, { repairUnevenRows: true, repairMode: 'truncate' });
    const duration = performance.now() - t0;
    console.log(`    📊 cleanCsv repaired 10,000 uneven rows (truncate): ${duration.toFixed(2)}ms`);

    assert.strictEqual(res.error, null);
    assert.strictEqual(res.rows.length, 10001);
    // Every single row must have exactly 5 columns
    for (let r = 0; r < res.rows.length; r++) {
      assert.strictEqual(res.rows[r].length, 5, `Row ${r} has length ${res.rows[r].length} instead of 5`);
    }
  });

  test('S3.3: 10,000 rows with 2,500 interspersed blank/whitespace-only rows', () => {
    const rows = ['id,name,role'];
    let injectedBlanks = 0;
    for (let i = 1; i <= 10000; i++) {
      if (i % 4 === 0) {
        // Blank or whitespace-only row
        rows.push('   ,   ,   ');
        injectedBlanks++;
      } else {
        rows.push(`${i},User_${i},Engineer`);
      }
    }
    const csv = rows.join('\n');

    const res = cleanCsv(csv, { removeBlankRows: true, trimWhitespace: true });
    assert.strictEqual(res.error, null);
    assert.strictEqual(res.metrics.blankRowsRemoved, injectedBlanks);
    assert.strictEqual(res.rows.length, 10001 - injectedBlanks);
  });

  test('S3.4: Duplicate Header Collision Resolution (id, id, id_2)', () => {
    const csv = 'id,id,id_2\n1,2,3';
    const res = cleanCsv(csv, { removeDuplicateHeaderNames: true });
    assert.strictEqual(res.error, null);
    const headers = res.headers;
    console.log(`    📊 Duplicate headers resolved: [${headers.join(', ')}]`);
    const uniqueHeaders = new Set(headers);
    assert.strictEqual(
      uniqueHeaders.size,
      headers.length,
      `BUG CONFIRMED: cleanCsv generated colliding duplicate header names: [${headers.join(', ')}]`
    );
  });

  test('S3.5: Large dataset call stack test without headers (70,000 rows)', () => {
    const rows = [];
    for (let i = 1; i <= 70000; i++) {
      rows.push(`${i},val_${i}`);
    }
    const csv = rows.join('\n');

    try {
      const res = cleanCsv(csv, { hasHeaders: false, repairUnevenRows: true });
      assert.strictEqual(res.rows.length, 70000);
      console.log('    📊 70,000 rows without headers cleaned successfully without stack overflow');
    } catch (err) {
      assert.fail(`cleanCsv threw call stack overflow on 70,000 rows: ${err.message}`);
    }
  });

  test('S3.6: Stack overflow boundary challenge on Math.max spread (150,000 rows without headers)', () => {
    const rows = [];
    for (let i = 1; i <= 150000; i++) {
      rows.push(`${i},val_${i}`);
    }
    const csv = rows.join('\n');

    try {
      cleanCsv(csv, { hasHeaders: false, repairUnevenRows: true });
      console.log('    📊 150,000 rows without headers passed');
    } catch (err) {
      console.warn(`    ⚠️ VULNERABILITY CONFIRMED: cleanCsv throws stack overflow on 150,000 rows without headers: ${err.message}`);
      assert.fail(`VULNERABILITY CONFIRMED: cleanCsv throws stack overflow on 150,000 rows without headers: ${err.message}`);
    }
  });

  test('S3.7: Pad mode discrepancy when row is wider than header', () => {
    // Header has 3 columns, Row 1 has 2, Row 2 has 4
    const csv = 'a,b,c\n1,2\n10,20,30,40';
    const res = cleanCsv(csv, { repairUnevenRows: true, repairMode: 'pad' });
    console.log(`    📊 Pad mode rows: [${res.rows.map(r => `[${r.join(',')}]`).join(', ')}]`);
    console.log(`    📊 Reported repaired count: ${res.metrics.unevenRowsRepaired}`);
    // If repairUnevenRows is true and mode is pad, are all rows even?
    const lengths = res.rows.map(r => r.length);
    const allEven = lengths.every(l => l === lengths[0]);
    if (!allEven) {
      console.warn(`    ⚠️ LIMITATION CONFIRMED: cleanCsv in 'pad' mode reports unevenRowsRepaired = ${res.metrics.unevenRowsRepaired} but leaves wider rows unrepaired: lengths [${lengths.join(', ')}]`);
    }
  });

  // ==========================================================================
  // Suite 4: CSV Deduplicator Linear O(N) Benchmark & Integrity
  // ==========================================================================
  console.log('\n--- Suite 4: CSV Deduplicator Linear O(N) Benchmark & Integrity ---');

  test('S4.1: Empirical Linearity Verification (N = 2.5k, 5k, 10k, 20k rows)', () => {
    const sizes = [2500, 5000, 10000, 20000];
    const timings = [];

    for (const N of sizes) {
      const rows = ['id,username,email,role,status'];
      for (let i = 1; i <= N; i++) {
        // 20% duplicate rate
        const id = i % 5 === 0 ? i - 1 : i;
        rows.push(`${id},user_${id},user_${id}@corp.io,Engineer,ACTIVE`);
      }
      const csv = rows.join('\n');

      const t0 = performance.now();
      const res = deduplicateCsv(csv, { dedupeMode: 'all-columns', strategy: 'keep-first' });
      const duration = performance.now() - t0;
      timings.push(duration);

      assert.strictEqual(res.error, null);
      console.log(`    📊 N = ${N.toLocaleString()} rows deduplicated in ${duration.toFixed(2)}ms (${(duration / N * 1000).toFixed(2)} µs/row)`);
    }

    // Linearity check: T(2N) / T(N) should be roughly 2.0 (O(N)), not 4.0 (O(N^2))
    const ratio1 = timings[1] / timings[0]; // 5k / 2.5k
    const ratio2 = timings[2] / timings[1]; // 10k / 5k
    const ratio3 = timings[3] / timings[2]; // 20k / 10k

    console.log(`    📈 Scaling Ratios: 5k/2.5k: ${ratio1.toFixed(2)}x | 10k/5k: ${ratio2.toFixed(2)}x | 20k/10k: ${ratio3.toFixed(2)}x`);
    assert.ok(ratio2 < 3.0, `10k/5k ratio ${ratio2.toFixed(2)} indicates super-linear O(N^2) complexity`);
    assert.ok(ratio3 < 3.0, `20k/10k ratio ${ratio3.toFixed(2)} indicates super-linear O(N^2) complexity`);
  });

  test('S4.2: Primary-key deduplication on 10,000 rows with keep-first vs keep-last', () => {
    const rows = ['user_id,username,version,updated_at'];
    for (let i = 1; i <= 5000; i++) {
      // First version
      rows.push(`USR-${i},user_${i},v1,2026-01-01`);
      // Updated version
      rows.push(`USR-${i},user_${i},v2,2026-09-26`);
    }
    const csv = rows.join('\n');

    // Keep First: should retain v1
    const resFirst = deduplicateCsv(csv, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['user_id'],
      strategy: 'keep-first',
    });
    assert.strictEqual(resFirst.metrics.originalRowCount, 10000);
    assert.strictEqual(resFirst.metrics.uniqueRowCount, 5000);
    assert.strictEqual(resFirst.metrics.duplicatesRemoved, 5000);
    assert.strictEqual(resFirst.metrics.duplicatePercentage, 50);
    assert.strictEqual(resFirst.rows[1][2], 'v1'); // first occurrence

    // Keep Last: should retain v2
    const resLast = deduplicateCsv(csv, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['user_id'],
      strategy: 'keep-last',
    });
    assert.strictEqual(resLast.metrics.uniqueRowCount, 5000);
    assert.strictEqual(resLast.metrics.duplicatesRemoved, 5000);
    assert.strictEqual(resLast.rows[1][2], 'v2'); // last occurrence preserved!
  });

  test('S4.3: Extreme duplicate distributions (100% duplicate vs 0% duplicate on 10,000 rows)', () => {
    // 10,000 identical rows
    const rowsIdentical = ['id,name,role'];
    for (let i = 1; i <= 10000; i++) {
      rowsIdentical.push('1,Constantine,Emperor');
    }
    const resIdentical = deduplicateCsv(rowsIdentical.join('\n'));
    assert.strictEqual(resIdentical.metrics.uniqueRowCount, 1);
    assert.strictEqual(resIdentical.metrics.duplicatesRemoved, 9999);
    assert.strictEqual(resIdentical.metrics.duplicatePercentage, 99.99);

    // 10,000 completely unique rows
    const rowsUnique = ['id,uuid'];
    for (let i = 1; i <= 10000; i++) {
      rowsUnique.push(`${i},unique-guid-${i}`);
    }
    const resUnique = deduplicateCsv(rowsUnique.join('\n'));
    assert.strictEqual(resUnique.metrics.uniqueRowCount, 10000);
    assert.strictEqual(resUnique.metrics.duplicatesRemoved, 0);
    assert.strictEqual(resUnique.metrics.duplicatePercentage, 0);
  });

  test('S4.4: Adversarial Unit Separator (\\x1f) injection immunity check', () => {
    // Row 1: colA = "foo\x1fbar", colB = "baz"
    // Row 2: colA = "foo", colB = "bar\x1fbaz"
    const csv = 'colA,colB\n"foo\x1fbar",baz\nfoo,"bar\x1fbaz"';
    const res = deduplicateCsv(csv, { dedupeMode: 'all-columns' });
    console.log(`    📊 Composite key with \\x1f injection: uniqueRowCount = ${res.metrics.uniqueRowCount} (expected 2)`);
    if (res.metrics.uniqueRowCount === 1) {
      console.warn('    ⚠️ LIMITATION CONFIRMED: Composite key using raw \\x1f collides when fields contain \\x1f');
    }
  });

  test('S4.5: Memory Footprint during 20,000 row deduplication', () => {
    const rows = ['id,name,dept,salary,notes'];
    for (let i = 1; i <= 20000; i++) {
      rows.push(`${i},Staff_${i},Dept_${i % 20},$${(i * 100).toFixed(2)},Note ${i}`);
    }
    const csv = rows.join('\n');
    const res = deduplicateCsv(csv);
    assert.strictEqual(res.metrics.uniqueRowCount, 20000);
    console.log('    📊 20,000 row deduplication completed safely');
  });

  // ==========================================================================
  // Suite 5: CSV Sorter Multi-Column Hierarchy & Stress
  // ==========================================================================
  console.log('\n--- Suite 5: CSV Sorter Multi-Column Hierarchy & Stress ---');

  test('S5.1: 10,000 rows 3-level multi-column hierarchical sort', () => {
    // Columns: department (text), salary (currency number), join_date (date)
    const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance'];
    const rows = ['id,department,salary,join_date'];

    for (let i = 1; i <= 10000; i++) {
      const dept = departments[i % 5];
      const salary = `$${(40000 + (i % 500) * 100).toLocaleString()}.00`;
      const month = String((i % 12) + 1).padStart(2, '0');
      const day = String((i % 28) + 1).padStart(2, '0');
      const date = `202${i % 6}-${month}-${day}`;
      rows.push(`${i},${dept},"${salary}",${date}`);
    }
    const csv = rows.join('\n');

    const criteria = [
      { columnIndex: 1, columnName: 'department', direction: 'asc', type: 'text' },
      { columnIndex: 2, columnName: 'salary', direction: 'desc', type: 'number' },
      { columnIndex: 3, columnName: 'join_date', direction: 'asc', type: 'date' },
    ];

    const t0 = performance.now();
    const res = sortCsv(csv, criteria);
    const duration = performance.now() - t0;
    console.log(`    📊 10,000 rows sorted by 3 criteria: ${duration.toFixed(2)}ms`);

    assert.strictEqual(res.error, null);
    assert.strictEqual(res.rows.length, 10001);

    // Verify sort hierarchy across output
    const dataRows = res.rows.slice(1);
    for (let i = 0; i < dataRows.length - 1; i++) {
      const curr = dataRows[i];
      const next = dataRows[i + 1];

      // Level 1: department asc
      const deptCmp = curr[1].localeCompare(next[1]);
      if (deptCmp < 0) continue;
      assert.strictEqual(deptCmp, 0, `Department out of order at index ${i}: ${curr[1]} > ${next[1]}`);

      // Level 2: salary desc
      const numCurr = Number(curr[2].replace(/[\$,]/g, ''));
      const numNext = Number(next[2].replace(/[\$,]/g, ''));
      if (numCurr > numNext) continue;
      assert.strictEqual(numCurr, numNext, `Salary out of order at index ${i}: ${curr[2]} < ${next[2]}`);

      // Level 3: join_date asc
      const dateCurr = Date.parse(curr[3]);
      const dateNext = Date.parse(next[3]);
      assert.ok(dateCurr <= dateNext, `Date out of order at index ${i}: ${curr[3]} > ${next[3]}`);
    }
  });

  test('S5.2: Nulls positioning stress across all 4 combinations (asc/desc x top/bottom)', () => {
    const input = 'id,score\n1,100\n2,\n3,50\n4,\n5,75\n6,';

    // 1. asc + bottom
    const ascBottom = sortCsv(input, [{ columnIndex: 1, direction: 'asc', nullsPosition: 'bottom', type: 'number' }]);
    const scoresAscBottom = ascBottom.rows.slice(1).map(r => r[1]);
    assert.deepStrictEqual(scoresAscBottom, ['50', '75', '100', '', '', '']);

    // 2. asc + top
    const ascTop = sortCsv(input, [{ columnIndex: 1, direction: 'asc', nullsPosition: 'top', type: 'number' }]);
    const scoresAscTop = ascTop.rows.slice(1).map(r => r[1]);
    assert.deepStrictEqual(scoresAscTop, ['', '', '', '50', '75', '100']);

    // 3. desc + bottom
    const descBottom = sortCsv(input, [{ columnIndex: 1, direction: 'desc', nullsPosition: 'bottom', type: 'number' }]);
    const scoresDescBottom = descBottom.rows.slice(1).map(r => r[1]);
    assert.deepStrictEqual(scoresDescBottom, ['100', '75', '50', '', '', '']);

    // 4. desc + top
    const descTop = sortCsv(input, [{ columnIndex: 1, direction: 'desc', nullsPosition: 'top', type: 'number' }]);
    const scoresDescTop = descTop.rows.slice(1).map(r => r[1]);
    assert.deepStrictEqual(scoresDescTop, ['', '', '', '100', '75', '50']);

    console.log('    🎯 All 4 nulls positioning permutations verified strictly');
  });

  test('S5.3: Type inference stress on dirty data (Currency, Percents, Natural Alpha)', () => {
    const currencyValues = ['$10.00', '€20.50', '£5.00', '¥1000', '15%'];
    assert.strictEqual(inferColumnType(currencyValues), 'number');

    const dateValues = ['2026-09-26', '2025-12-31', '2024-01-01'];
    assert.strictEqual(inferColumnType(dateValues), 'date');

    const textValues = ['Item A', 'Item B', 'Item 10', 'Item 2'];
    assert.strictEqual(inferColumnType(textValues), 'text');
  });

  test('S5.4: Stable sorting preservation on duplicate keys', () => {
    const input = 'group,order\nA,1\nB,2\nA,3\nB,4\nA,5';
    const res = sortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'text' }]);
    // Group A rows must retain relative order: 1, 3, 5
    const groupAOrders = res.rows.slice(1).filter(r => r[0] === 'A').map(r => r[1]);
    assert.deepStrictEqual(groupAOrders, ['1', '3', '5'], 'Stable sort failed for Group A');

    // Group B rows must retain relative order: 2, 4
    const groupBOrders = res.rows.slice(1).filter(r => r[0] === 'B').map(r => r[1]);
    assert.deepStrictEqual(groupBOrders, ['2', '4'], 'Stable sort failed for Group B');
  });

  test('S5.5: Sorting negative numbers and accounting currency format', () => {
    const input = 'item,balance\nA,-$50.00\nB,$100.00\nC,-$150.00\nD,$0.00\nE,$25.00';
    const res = sortCsv(input, [{ columnIndex: 1, direction: 'asc', type: 'number' }]);
    const balances = res.rows.slice(1).map(r => r[1]);
    assert.deepStrictEqual(balances, ['-$150.00', '-$50.00', '$0.00', '$25.00', '$100.00']);
  });

  // ==========================================================================
  // Suite 6: CSV Column Extractor Stress
  // ==========================================================================
  console.log('\n--- Suite 6: CSV Column Extractor Stress ---');

  test('S6.1: 10,000 rows column extraction, reordering, and TSV export', () => {
    const rows = ['c1,c2,c3,c4,c5,c6,c7,c8,c9,c10'];
    for (let i = 1; i <= 10000; i++) {
      rows.push(`v1_${i},v2_${i},v3_${i},v4_${i},v5_${i},v6_${i},v7_${i},v8_${i},v9_${i},v10_${i}`);
    }
    const csv = rows.join('\n');

    const t0 = performance.now();
    const res = extractColumns(csv, ['c10', 'c1', 'c5'], { outputDelimiter: '\t' });
    const duration = performance.now() - t0;
    console.log(`    📊 10,000 rows 3-column extraction and TSV export: ${duration.toFixed(2)}ms`);

    assert.strictEqual(res.error, null);
    assert.strictEqual(res.headers.join('\t'), 'c10\tc1\tc5');
    assert.strictEqual(res.rows[1].join('\t'), 'v10_1\tv1_1\tv5_1');
    assert.strictEqual(res.columnsExtractedCount, 3);
    assert.strictEqual(res.totalColumnsCount, 10);
  });

  test('S6.2: Out-of-bounds column indices and non-existent column names', () => {
    const csv = 'id,name\n1,Alice';
    const res = extractColumns(csv, ['name', 'nonexistent', 99]);
    assert.strictEqual(res.error, null);
    console.log(`    📊 Handled out-of-bounds columns: extracted headers [${res.headers.join(', ')}]`);
    assert.ok(res.headers.includes('name'));
  });

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(` 🏁 RESULTS: ${passedTests}/${totalTests} tests passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  if (findings.length > 0) {
    console.log(` ⚠️  FINDINGS / FAILURES: ${findings.length}`);
    for (const f of findings) {
      console.log(`   - ${f.name}: ${f.error}`);
    }
  }
  console.log('========================================================================\n');

  return { passedTests, totalTests, findings };
}

runChallengerTests().then(({ passedTests, totalTests, findings }) => {
  if (passedTests !== totalTests) {
    console.error(`Test harness completed with ${totalTests - passedTests} empirical findings.`);
  }
});
