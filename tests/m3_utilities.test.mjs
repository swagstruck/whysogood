// @ts-check
import assert from 'node:assert';
import {
  testRegex,
  decodeJwt,
  computeDiff,
  generateCron,
  explainCron,
  getNextCronRuns,
  generateUuids,
  convertTimestamp,
  generateHashes,
  validateJson,
  autoFixJson,
} from '../lib/developer/utilities.ts';

console.log('======================================================');
console.log(' 🧪 RUNNING COMPREHENSIVE M3 UTILITIES TEST SUITE');
console.log('======================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] #${totalTests}: ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] #${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ [PASS] #${totalTests}: ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] #${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ============================================================================
// 1. REGEX TESTER & SUBSTITUTOR
// ============================================================================
console.log('\n--- 1. Regex Tester & Substitutor ---');

runTest('Regex: Matches multiple occurrences with g flag', () => {
  const res = testRegex('\\d+', 'g', 'Port 80 and 443 are open');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.matches.length, 2);
  assert.strictEqual(res.matches[0].match, '80');
  assert.strictEqual(res.matches[0].index, 5);
  assert.strictEqual(res.matches[1].match, '443');
});

runTest('Regex: Extracts positional capture groups', () => {
  const res = testRegex('(\\w+)-(\\d+)', '', 'Order-9921');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.matches.length, 1);
  assert.strictEqual(res.matches[0].captures[0], 'Order');
  assert.strictEqual(res.matches[0].captures[1], '9921');
  assert.strictEqual(res.matches[0].groups[0], 'Order');
});

runTest('Regex: Executes replacement substitution with backreferences', () => {
  const res = testRegex('(\\w+)\\s(\\w+)', 'g', 'Jane Doe', '$2, $1');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.replacement, 'Doe, Jane');
  assert.strictEqual(res.replaced, 'Doe, Jane');
});

runTest('Regex: Case-insensitive matching with i flag', () => {
  const res = testRegex('apple', 'i', 'APPLE pie');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.matches.length, 1);
  assert.strictEqual(res.matches[0].match, 'APPLE');
});

runTest('Regex: Multiline anchors with m flag', () => {
  const res = testRegex('^test', 'm', 'line 1\ntest line 2');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.matches.length, 1);
  assert.strictEqual(res.matches[0].index, 7);
});

runTest('Regex: Handles invalid syntax gracefully with isValid=false', () => {
  const res = testRegex('[unclosed-bracket', '', 'sample');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.matches.length, 0);
  assert.ok(res.error);
});

runTest('Regex: Handles invalid flags gracefully', () => {
  const res = testRegex('hello', 'xyz', 'hello');
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error);
});

runTest('Regex: Zero-length match does not infinite loop', () => {
  const res = testRegex('^', 'g', 'abc');
  assert.strictEqual(res.isValid, true);
  assert.ok(res.matches.length >= 1);
});

// ============================================================================
// 2. JWT DECODER & EXPIRATION TRACKER
// ============================================================================
console.log('\n--- 2. JWT Decoder & Expiration Tracker ---');

const b64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

runTest('JWT: Decodes standard 3-part token header & payload', () => {
  const header = b64Url({ alg: 'RS256', typ: 'JWT', kid: 'k1' });
  const payload = b64Url({ sub: 'usr_777', role: 'admin', team: 'infra' });
  const token = `${header}.${payload}.sample_sig`;

  const res = decodeJwt(token);
  assert.strictEqual(res.header.alg, 'RS256');
  assert.strictEqual(res.header.kid, 'k1');
  assert.strictEqual(res.payload.sub, 'usr_777');
  assert.strictEqual(res.payload.role, 'admin');
  assert.strictEqual(res.signature, 'sample_sig');
  assert.strictEqual(res.state, 'no_expiry');
});

runTest('JWT: Detects active unexpired token', () => {
  const future = Math.floor(Date.now() / 1000) + 7200;
  const token = `${b64Url({ alg: 'HS256' })}.${b64Url({ exp: future })}.sig`;

  const res = decodeJwt(token);
  assert.strictEqual(res.isExpired, false);
  assert.strictEqual(res.state, 'active');
  assert.ok(res.expiresAt);
  assert.ok(res.relativeExpiration.includes('Expires in'));
});

runTest('JWT: Detects expired token', () => {
  const past = Math.floor(Date.now() / 1000) - 3600;
  const token = `${b64Url({ alg: 'HS256' })}.${b64Url({ exp: past })}.sig`;

  const res = decodeJwt(token);
  assert.strictEqual(res.isExpired, true);
  assert.strictEqual(res.state, 'expired');
  assert.ok(res.relativeExpiration.includes('Expired'));
});

runTest('JWT: Detects not yet valid token with future nbf', () => {
  const future = Math.floor(Date.now() / 1000) + 3600;
  const token = `${b64Url({ alg: 'HS256' })}.${b64Url({ nbf: future })}.sig`;

  const res = decodeJwt(token);
  assert.strictEqual(res.state, 'not_yet_valid');
  assert.ok(res.notBefore);
});

runTest('JWT: Formats iat timestamp into ISO string', () => {
  const now = 1758750000;
  const token = `${b64Url({ alg: 'HS256' })}.${b64Url({ iat: now })}.sig`;

  const res = decodeJwt(token);
  assert.strictEqual(res.issuedAt, new Date(now * 1000).toISOString());
});

runTest('JWT: Rejects token with invalid segment count', () => {
  const res = decodeJwt('part1.part2');
  assert.strictEqual(res.header, null);
  assert.ok(res.error);
});

runTest('JWT: Rejects token with invalid base64 encoding', () => {
  const res = decodeJwt('not_json.not_json.sig');
  assert.strictEqual(res.header, null);
  assert.ok(res.error);
});

// ============================================================================
// 3. TEXT & CODE DIFF
// ============================================================================
console.log('\n--- 3. Text & Code Diff (Myers / LCS) ---');

runTest('Diff: Identifies unchanged lines', () => {
  const res = computeDiff('hello\nworld', 'hello\nworld');
  assert.strictEqual(res.summary.added, 0);
  assert.strictEqual(res.summary.removed, 0);
  assert.strictEqual(res.summary.unchanged, 2);
});

runTest('Diff: Identifies additions', () => {
  const res = computeDiff('line 1\nline 3', 'line 1\nline 2\nline 3');
  assert.strictEqual(res.summary.added, 1);
  assert.strictEqual(res.summary.removed, 0);
  assert.strictEqual(res.summary.unchanged, 2);
  assert.ok(res.chunks.some((c) => c.type === 'added' && c.value === 'line 2'));
});

runTest('Diff: Identifies deletions', () => {
  const res = computeDiff('line 1\nline to delete\nline 2', 'line 1\nline 2');
  assert.strictEqual(res.summary.removed, 1);
  assert.strictEqual(res.summary.added, 0);
  assert.strictEqual(res.summary.unchanged, 2);
});

runTest('Diff: Identifies modifications as addition + deletion', () => {
  const res = computeDiff('const x = 1;', 'const x = 2;');
  assert.strictEqual(res.summary.removed, 1);
  assert.strictEqual(res.summary.added, 1);
  assert.strictEqual(res.summary.unchanged, 0);
});

runTest('Diff: Empty original text handles all additions', () => {
  const res = computeDiff('', 'new line 1\nnew line 2');
  assert.strictEqual(res.summary.added, 2);
  assert.strictEqual(res.summary.removed, 0);
});

runTest('Diff: Empty modified text handles all deletions', () => {
  const res = computeDiff('old line 1\nold line 2', '');
  assert.strictEqual(res.summary.removed, 2);
  assert.strictEqual(res.summary.added, 0);
});

runTest('Diff: Supports ignoreWhitespace option', () => {
  const res = computeDiff('   trim me   ', 'trim me', { ignoreWhitespace: true });
  assert.strictEqual(res.summary.added, 0);
  assert.strictEqual(res.summary.removed, 0);
  assert.strictEqual(res.summary.unchanged, 1);
});

runTest('Diff: Supports ignoreCase option', () => {
  const res = computeDiff('HELLO WORLD', 'hello world', { ignoreCase: true });
  assert.strictEqual(res.summary.added, 0);
  assert.strictEqual(res.summary.removed, 0);
  assert.strictEqual(res.summary.unchanged, 1);
});

// ============================================================================
// 4. CRON EXPRESSION GENERATOR, EXPLAINER & NEXT RUNS
// ============================================================================
console.log('\n--- 4. Cron Generator, Explainer & Next Runs ---');

runTest('Cron: Constructs 5-field expression from parts', () => {
  const res = generateCron({ minute: '*/15', hour: '9-17', dayOfWeek: '1-5' });
  assert.strictEqual(res.expression, '*/15 9-17 * * 1-5');
});

runTest('Cron: Explains every minute (* * * * *)', () => {
  const exp = explainCron('* * * * *');
  assert.strictEqual(exp, 'Every minute');
});

runTest('Cron: Explains hourly interval (0 * * * *)', () => {
  const exp = explainCron('0 * * * *');
  assert.strictEqual(exp, 'Every hour at minute 0');
});

runTest('Cron: Explains daily midnight (0 0 * * *)', () => {
  const exp = explainCron('0 0 * * *');
  assert.strictEqual(exp, 'Every day at midnight (00:00)');
});

runTest('Cron: Computes 5 next runs as valid future ISO timestamps', () => {
  const nextRuns = getNextCronRuns('0 12 * * *', 5);
  assert.strictEqual(nextRuns.length, 5);
  for (const r of nextRuns) {
    const d = new Date(r);
    assert.strictEqual(isNaN(d.getTime()), false);
    assert.strictEqual(d.getHours(), 12);
    assert.strictEqual(d.getMinutes(), 0);
  }
});

runTest('Cron: Handles step minute values */10', () => {
  const nextRuns = getNextCronRuns('*/10 * * * *', 3);
  assert.strictEqual(nextRuns.length, 3);
  for (const r of nextRuns) {
    const d = new Date(r);
    assert.strictEqual(d.getMinutes() % 10, 0);
  }
});

runTest('Cron: Handles Sunday day of week 0 and 7', () => {
  const c0 = generateCron({ dayOfWeek: '0' });
  const c7 = generateCron({ dayOfWeek: '7' });
  assert.ok(c0.expression.endsWith('0'));
  assert.ok(c7.expression.endsWith('7'));
});

// ============================================================================
// 5. UUID GENERATOR (v4, v1 & NanoID)
// ============================================================================
console.log('\n--- 5. UUID & NanoID Generator ---');

runTest('UUID: Generates valid RFC 4122 v4 UUID', () => {
  const ids = generateUuids(1, 'v4');
  assert.strictEqual(ids.length, 1);
  assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ids[0]));
});

runTest('UUID: Bulk generation produces unique IDs', () => {
  const ids = generateUuids(50, 'v4');
  assert.strictEqual(ids.length, 50);
  const set = new Set(ids);
  assert.strictEqual(set.size, 50);
});

runTest('UUID: Generates valid RFC 4122 v1 UUID (version digit 1)', () => {
  const ids = generateUuids(3, 'v1');
  assert.strictEqual(ids.length, 3);
  for (const id of ids) {
    assert.strictEqual(id[14], '1');
    assert.ok(['8', '9', 'a', 'b'].includes(id[19].toLowerCase()));
  }
});

runTest('UUID: Generates NanoID of default length 21', () => {
  const ids = generateUuids(5, 'nanoid');
  assert.strictEqual(ids.length, 5);
  for (const id of ids) {
    assert.strictEqual(id.length, 21);
    assert.ok(/^[A-Za-z0-9_-]+$/.test(id));
  }
});

runTest('UUID: Uppercase option formats all letters to uppercase', () => {
  const ids = generateUuids(2, 'v4', true, false);
  assert.strictEqual(ids[0], ids[0].toUpperCase());
});

runTest('UUID: noHyphens option outputs 32 character hex string', () => {
  const ids = generateUuids(2, 'v4', false, true);
  assert.strictEqual(ids[0].length, 32);
  assert.strictEqual(ids[0].includes('-'), false);
});

runTest('UUID: Combined uppercase and noHyphens options', () => {
  const ids = generateUuids(1, 'v4', { uppercase: true, noHyphens: true });
  assert.strictEqual(ids[0].length, 32);
  assert.strictEqual(ids[0], ids[0].toUpperCase());
  assert.strictEqual(ids[0].includes('-'), false);
});

runTest('UUID: Handles count = 0 gracefully', () => {
  const ids = generateUuids(0, 'v4');
  assert.strictEqual(ids.length, 0);
});

// ============================================================================
// 6. TIMESTAMP CONVERTER
// ============================================================================
console.log('\n--- 6. Timestamp Converter ---');

runTest('Timestamp: Converts Unix seconds (10 digits) to ISO and UTC', () => {
  const ts = convertTimestamp(1700000000);
  assert.strictEqual(ts.isValid, true);
  assert.strictEqual(ts.unixSeconds, 1700000000);
  assert.strictEqual(ts.unixMillis, 1700000000000);
  assert.strictEqual(ts.iso, '2023-11-14T22:13:20.000Z');
  assert.strictEqual(ts.utc, 'Tue, 14 Nov 2023 22:13:20 GMT');
});

runTest('Timestamp: Converts Unix milliseconds (13 digits)', () => {
  const ts = convertTimestamp(1700000000000);
  assert.strictEqual(ts.isValid, true);
  assert.strictEqual(ts.unixSeconds, 1700000000);
  assert.strictEqual(ts.iso, '2023-11-14T22:13:20.000Z');
});

runTest('Timestamp: Parses ISO 8601 string', () => {
  const ts = convertTimestamp('2026-09-24T12:00:00.000Z');
  assert.strictEqual(ts.isValid, true);
  assert.strictEqual(ts.iso, '2026-09-24T12:00:00.000Z');
  assert.strictEqual(ts.unixSeconds, 1790251200);
});

runTest('Timestamp: Handles Unix epoch 0 (1970-01-01T00:00:00.000Z)', () => {
  const ts = convertTimestamp(0);
  assert.strictEqual(ts.isValid, true);
  assert.strictEqual(ts.iso, '1970-01-01T00:00:00.000Z');
});

runTest('Timestamp: Handles pre-1970 negative timestamps', () => {
  const ts = convertTimestamp(-31536000);
  assert.strictEqual(ts.isValid, true);
  assert.ok(ts.iso.startsWith('1969-'));
});

runTest('Timestamp: Distant future year 2100 timestamp', () => {
  const ts = convertTimestamp(4102444800);
  assert.strictEqual(ts.isValid, true);
  assert.ok(ts.iso.startsWith('2100-'));
});

runTest('Timestamp: Computes calendar metrics (dayOfWeek, dayOfYear, isLeapYear)', () => {
  const ts = convertTimestamp('2024-02-29T00:00:00.000Z'); // Leap year
  assert.strictEqual(ts.isValid, true);
  assert.strictEqual(ts.dayOfWeek, 'Thursday');
  assert.strictEqual(ts.dayOfYear, 60);
  assert.strictEqual(ts.isLeapYear, true);
});

runTest('Timestamp: Flags invalid date input with isValid=false', () => {
  const ts = convertTimestamp('invalid-date-string');
  assert.strictEqual(ts.isValid, false);
  assert.ok(ts.error);
});

// ============================================================================
// 7. HASH & HMAC GENERATOR
// ============================================================================
console.log('\n--- 7. Hash & HMAC Generator ---');

await runAsyncTest('Hash: Standard MD5 vectors (empty string & hello world)', async () => {
  const empty = await generateHashes('');
  assert.strictEqual(empty.md5, 'd41d8cd98f00b204e9800998ecf8427e');

  const hw = await generateHashes('hello world');
  assert.strictEqual(hw.md5, '5eb63bbbe01eeed093cb22bb8f5acdc3');
});

await runAsyncTest('Hash: Standard SHA-1 vectors', async () => {
  const empty = await generateHashes('');
  assert.strictEqual(empty.sha1, 'da39a3ee5e6b4b0d3255bfef95601890afd80709');

  const hw = await generateHashes('hello world');
  assert.strictEqual(hw.sha1, '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed');
});

await runAsyncTest('Hash: Standard SHA-256 vectors', async () => {
  const empty = await generateHashes('');
  assert.strictEqual(empty.sha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

  const hw = await generateHashes('hello world');
  assert.strictEqual(hw.sha256, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
});

await runAsyncTest('Hash: Standard SHA-512 length 128 characters', async () => {
  const hw = await generateHashes('hello world');
  assert.strictEqual(hw.sha512.length, 128);
  assert.strictEqual(hw.sha512Upper, hw.sha512.toUpperCase());
});

await runAsyncTest('Hash: HMAC mode generates distinct keyed hash', async () => {
  const text = 'payload message';
  const plain = await generateHashes(text);
  const hmac = await generateHashes(text, 'secret-key');
  assert.notStrictEqual(hmac.sha256, plain.sha256);
  assert.notStrictEqual(hmac.md5, plain.md5);
});

await runAsyncTest('Hash: Handles multi-byte Unicode strings and emojis', async () => {
  const text = 'Whysogood 🚀 2026';
  const hashes = await generateHashes(text);
  assert.strictEqual(hashes.sha256.length, 64);
  assert.ok(hashes.md5);
});

// ============================================================================
// 8. JSON VALIDATOR & AUTO-FIXER
// ============================================================================
console.log('\n--- 8. JSON Syntax Validator & Auto-Fixer ---');

runTest('JSON Validator: Confirms valid JSON payload', () => {
  const res = validateJson('{"name": "whysogood", "tools": 18, "active": true}');
  assert.strictEqual(res.isValid, true);
  assert.ok(res.formatted);
});

runTest('JSON Validator: Pinpoints line and column of syntax errors', () => {
  const input = '{\n  "title": "Unclosed\n}';
  const res = validateJson(input);
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error);
  assert.ok(res.error.line >= 1);
  assert.ok(res.error.column >= 1);
});

runTest('JSON Validator: Detects single quotes and suggests double quotes fix', () => {
  const res = validateJson("{'key': 'value'}");
  assert.strictEqual(res.isValid, false);
  assert.ok(res.fixSuggestion.includes('quote'));
});

runTest('JSON Validator: Detects unquoted object keys', () => {
  const res = validateJson('{ username: "alex" }');
  assert.strictEqual(res.isValid, false);
  assert.ok(res.fixSuggestion.includes('key'));
});

runTest('JSON Validator: Detects trailing commas', () => {
  const res = validateJson('{"a": 1, "b": 2,}');
  assert.strictEqual(res.isValid, false);
  assert.ok(res.fixSuggestion.toLowerCase().includes('comma'));
});

runTest('JSON AutoFix: Repairs single quotes, unquoted keys, and trailing commas', () => {
  const malformed = `{\n  // User record\n  name: 'Ada Lovelace',\n  roles: ['admin', 'dev',],\n}`;
  const fix = autoFixJson(malformed);
  assert.strictEqual(fix.isValid, true);
  assert.ok(fix.appliedFixes.length > 0);

  const parsed = JSON.parse(fix.fixed);
  assert.strictEqual(parsed.name, 'Ada Lovelace');
  assert.deepStrictEqual(parsed.roles, ['admin', 'dev']);
});

runTest('JSON Validator: Handles empty string returning invalid', () => {
  const res = validateJson('');
  assert.strictEqual(res.isValid, false);
});

console.log('\n======================================================');
console.log(` 🎉 ALL ${passedTests}/${totalTests} M3 UTILITIES TESTS PASSED (100%)!`);
console.log('======================================================');
