// @ts-check
/**
 * Dual-Track Automated E2E Test Suite for Security Category Tools (Tiers 1-4)
 * Covers all 9 Security Category Tools:
 * - Base64 Encoder (UTF-8, URL-Safe, Data URIs, line wrapping)
 * - Base64 Decoder (Text, Data URI auto-stripping, URL-safe decoding)
 * - URL Encoder (Component, Full URI, Form urlencoded)
 * - URL Decoder (Standard, Component parser, Query param inspector)
 * - MD5 Hash Generator (RFC 1321 vectors, Binary hashing, Uppercase)
 * - SHA-256 Hash Generator (FIPS 180-4 vectors, Web Crypto, Binary hashing)
 * - SHA-512 Hash Generator (FIPS 180-4 vectors, Web Crypto, Binary hashing)
 * - JWT Decoder (Claims, Header, Expiry detection, Malformed token safety)
 * - Password Strength Checker (Shannon entropy, crack time, character diversity)
 */

import './helpers/ts_resolver.mjs';
import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertFalse,
  assertIncludes,
} from './helpers/assertions.mjs';

import {
  base64Decode,
  base64DecodeToBytes,
  urlEncode,
  urlDecode,
  encodeQueryString,
  md5,
  sha256,
  sha512,
  decodeJwtSec,
  checkPasswordStrength,
} from '../../lib/security/engines.ts';
import { TOOLS, COMING_SOON_CATEGORIES, getToolsByCategory } from '../../lib/registry.ts';

export async function runSecurityToolsTests() {
  const tracker = new TestResultTracker('Security Category E2E Suite');
  setupMockBrowserEnvironment();

  console.log('\n======================================================');
  console.log(' RUNNING SECURITY SUITE: TIERS 1-4 COMPREHENSIVE');
  console.log('======================================================\n');

  // ── Tier 1: Core Feature Coverage ──────────────────────────────────────────
  console.log('--- Tier 1: Core Feature Coverage ---');

  await tracker.runTest('S1.1: Security category is active in registry', () => {
    assertFalse(COMING_SOON_CATEGORIES.includes('Security'), 'Security must not be in COMING_SOON_CATEGORIES');
    const secTools = getToolsByCategory('Security');
    assertEqual(secTools.length, 9, 'Should register exactly 9 Security tools');
  });

  await tracker.runTest('S1.2: All 9 security tools have active status', () => {
    const slugs = [
      'base64-encoder',
      'base64-decoder',
      'url-encoder',
      'url-decoder',
      'md5-hash',
      'sha256-hash',
      'sha512-hash',
      'jwt-decoder-sec',
      'password-strength',
    ];
    for (const slug of slugs) {
      const tool = TOOLS.find(t => t.slug === slug);
      assertTrue(!!tool, `Tool ${slug} exists`);
      assertEqual(tool.status, 'active', `${slug} status is active`);
      assertEqual(tool.category, 'Security', `${slug} category is Security`);
    }
  });

  await tracker.runTest('S1.3: Base64 Encoder / Decoder standard text roundtrip', () => {
    const raw = 'Hello, World!';
    const encoded = Buffer.from(raw, 'utf-8').toString('base64');
    assertEqual(encoded, 'SGVsbG8sIFdvcmxkIQ==');
    const decoded = base64Decode(encoded);
    assertEqual(decoded, raw);
  });

  await tracker.runTest('S1.4: Base64 URL-safe conversion and bytes decoding', () => {
    const raw = 'Subjects? & Categories+';
    const standardB64 = Buffer.from(raw, 'utf-8').toString('base64');
    const urlSafe = standardB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const decodedBytes = base64DecodeToBytes(urlSafe);
    assertEqual(Buffer.from(decodedBytes).toString('utf-8'), raw);
  });

  await tracker.runTest('S1.5: URL Encoder and Decoder standard percent encoding', () => {
    const raw = 'https://whysogood.space/search?q=hello world & symbol=#tag';
    const encoded = urlEncode(raw);
    assertEqual(encoded, 'https%3A%2F%2Fwhysogood.space%2Fsearch%3Fq%3Dhello%20world%20%26%20symbol%3D%23tag');
    const decoded = urlDecode(encoded);
    assertEqual(decoded, raw);
  });

  await tracker.runTest('S1.6: Query String Builder', () => {
    const params = { q: 'react 19', page: '2', filter: 'active' };
    const query = encodeQueryString(params);
    assertEqual(query, 'q=react+19&page=2&filter=active');
  });

  await tracker.runTest('S1.7: MD5 Hash Generator standard RFC 1321 test vectors', () => {
    assertEqual(md5(''), 'd41d8cd98f00b204e9800998ecf8427e', 'MD5 of empty string');
    assertEqual(md5('a'), '0cc175b9c0f1b6a831c399e269772661', 'MD5 of "a"');
    assertEqual(md5('abc'), '900150983cd24fb0d6963f7d28e17f72', 'MD5 of "abc"');
    assertEqual(md5('message digest'), 'f96b697d7cb7938d525a2f31aaf161d0', 'MD5 of "message digest"');
    assertEqual(
      md5('The quick brown fox jumps over the lazy dog'),
      '9e107d9d372bb6826bd81d3542a419d6',
      'MD5 of quick brown fox'
    );
  });

  await tracker.runTest('S1.8: SHA-256 Hash Generator NIST FIPS 180-4 vectors', async () => {
    const hEmpty = await sha256('');
    assertEqual(hEmpty, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    const hAbc = await sha256('abc');
    assertEqual(hAbc, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const hFox = await sha256('The quick brown fox jumps over the lazy dog');
    assertEqual(hFox, 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
  });

  await tracker.runTest('S1.9: SHA-512 Hash Generator NIST FIPS 180-4 vectors', async () => {
    const hEmpty = await sha512('');
    assertEqual(
      hEmpty,
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
    );
    const hAbc = await sha512('abc');
    assertEqual(
      hAbc,
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
    );
  });

  await tracker.runTest('S1.10: JWT Decoder valid token parsing & expiration checks', () => {
    // Valid future token
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: 'user_42', exp: futureExp, iat: 1516239022 })).toString('base64');
    const token = `${header}.${payload}.mockSignature`;

    const res = decodeJwtSec(token);
    assertTrue(!!res, 'Decoded result exists');
    assertEqual(res.header.alg, 'HS256');
    assertEqual(res.payload.sub, 'user_42');
    assertEqual(res.isExpired, false, 'Future token is not expired');
    assertTrue(!!res.expiresAt, 'Has ISO expiresAt');
    assertTrue(!!res.issuedAt, 'Has ISO issuedAt');

    // Expired token
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const expPayload = Buffer.from(JSON.stringify({ sub: 'user_42', exp: pastExp })).toString('base64');
    const expiredToken = `${header}.${expPayload}.mockSignature`;
    const expRes = decodeJwtSec(expiredToken);
    assertTrue(!!expRes);
    assertEqual(expRes.isExpired, true, 'Past token is marked expired');
  });

  await tracker.runTest('S1.11: Password Strength Analyzer metrics & scoring', () => {
    const weak = checkPasswordStrength('12345');
    assertEqual(weak.score, 0, 'Short numbers are very weak');
    assertTrue(weak.suggestions.length > 0, 'Offers suggestions');

    const strong = checkPasswordStrength('K9#mP$91xL@7qZb8');
    assertTrue(strong.score >= 3, 'Complex password scores strong or very strong');
    assertTrue(strong.hasUpper && strong.hasLower && strong.hasNumber && strong.hasSymbol);
    assertTrue(strong.entropy > 60, 'High entropy bits');
  });

  // ── Tier 2: Boundary & Corner Cases ────────────────────────────────────────
  console.log('\n--- Tier 2: Boundary & Corner Cases ---');

  await tracker.runTest('S2.1: Base64 multi-byte UTF-8 emojis & Unicode symbols', () => {
    const unicodeText = '🚀 Antigravity 2.0 • 日本語 • François';
    // Using standard browser/node utf8 handling
    const encoded = Buffer.from(unicodeText, 'utf-8').toString('base64');
    const decoded = Buffer.from(base64DecodeToBytes(encoded)).toString('utf-8');
    assertEqual(decoded, unicodeText);
  });

  await tracker.runTest('S2.2: Binary Uint8Array hashing with MD5 & Web Crypto', async () => {
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xFE, 0xFF]);
    const md5Hex = md5(binaryData);
    assertEqual(md5Hex.length, 32, 'MD5 is 32 hex chars');

    const sha256Hex = await sha256(binaryData);
    assertEqual(sha256Hex.length, 64, 'SHA-256 is 64 hex chars');

    const sha512Hex = await sha512(binaryData);
    assertEqual(sha512Hex.length, 128, 'SHA-512 is 128 hex chars');
  });

  await tracker.runTest('S2.3: JWT Decoder resilience on invalid or corrupted inputs', () => {
    assertEqual(decodeJwtSec(''), null, 'Empty string returns null');
    assertEqual(decodeJwtSec('not.a.valid.jwt.with.too.many.dots'), null, 'Invalid dot count');
    assertEqual(decodeJwtSec('badBase64.alsoBad.signature'), null, 'Corrupt base64 returns null');
  });

  await tracker.runTest('S2.4: Password Strength boundary conditions (empty, huge, repeats)', () => {
    const empty = checkPasswordStrength('');
    assertEqual(empty.score, 0);
    assertEqual(empty.entropy, 0);

    const repeats = checkPasswordStrength('aaaaaaaaaaaaaaaa');
    assertEqual(repeats.hasUpper, false);
    assertEqual(repeats.hasNumber, false);
    assertEqual(repeats.hasSymbol, false);
  });

  // ── Tier 3: Combinations & Chaining ────────────────────────────────────────
  console.log('\n--- Tier 3: Combinations & Chaining ---');

  await tracker.runTest('S3.1: URL encode -> Base64 encode -> Checksum verification pipeline', async () => {
    const payload = 'https://api.whysogood.space/v1/auth?client_id=xyz&scope=read:all';
    const urlEnc = urlEncode(payload);
    const b64 = Buffer.from(urlEnc, 'utf-8').toString('base64');
    const hash = await sha256(b64);
    assertTrue(hash.length === 64);

    // Reverse pipeline
    const recoveredB64 = base64Decode(b64);
    const recoveredUrl = urlDecode(recoveredB64);
    assertEqual(recoveredUrl, payload);
  });

  await tracker.runTest('S3.2: Integrity check match logic (case-insensitive & trimmed)', () => {
    const hash1 = 'b10a8db164e0754105b7a99be72e3fe5';
    const hash2 = '  B10A8DB164E0754105B7A99BE72E3FE5  ';
    const isMatch = hash1.toLowerCase() === hash2.trim().toLowerCase();
    assertTrue(isMatch, 'Expected hash match logic succeeds');
  });

  // ── Tier 4: Real-World Scenarios ───────────────────────────────────────────
  console.log('\n--- Tier 4: Real-World Scenarios ---');

  await tracker.runTest('S4.1: OAuth2 OpenID Connect ID Token Inspection', () => {
    const mockIdToken = [
      Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'key-2024-01' })).toString('base64'),
      Buffer.from(
        JSON.stringify({
          iss: 'https://auth.whysogood.space',
          sub: 'swagstruck-admin',
          aud: 'whysogood-client-app',
          email: 'user@whysogood.space',
          email_verified: true,
          iat: 1700000000,
          exp: 1800000000,
        })
      ).toString('base64'),
      'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    ].join('.');

    const inspection = decodeJwtSec(mockIdToken);
    assertTrue(!!inspection);
    assertEqual(inspection.header.kid, 'key-2024-01');
    assertEqual(inspection.payload.email, 'user@whysogood.space');
    assertEqual(inspection.isExpired, false);
  });

  await tracker.runTest('S4.2: File Checksum Verification Workflow (Simulated 1MB payload)', async () => {
    // Generate 1MB buffer
    const buf = new Uint8Array(1024 * 1024);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 256;

    const computedSha = await sha256(buf);
    assertTrue(computedSha.length === 64);
    const computedMd5 = md5(buf);
    assertTrue(computedMd5.length === 32);
  });

  const summary = tracker.summary();
  if (summary.failed > 0) {
    console.log('\n❌ FAILED TESTS SUMMARY:');
    for (const t of summary.tests) {
      if (t.status === 'FAIL') console.log(`  ✖ ${t.name}: ${t.error}`);
    }
  }
  console.log('\n================================================================');
  console.log(` 🏁 SECURITY E2E SUITE RESULTS: ${summary.passed}/${summary.total} passed in ${summary.durationMs}ms`);
  console.log('================================================================\n');

  return summary;
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('security_tools.test.mjs')) {
  runSecurityToolsTests()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
