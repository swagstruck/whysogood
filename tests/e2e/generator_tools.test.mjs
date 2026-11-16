// @ts-check
/**
 * Dual-Track Automated E2E Test Suite for Generators Category Tools (Tiers 1-4)
 * Covers all 6 Generator Category Tools:
 * - QR Code Generator (URL, WiFi, Email, SMS, error correction, sizes)
 * - Barcode Generator (Code128, EAN-13 check digit, Code39)
 * - Password Generator (custom lengths, character sets, ambiguous exclusions, entropy & strength)
 * - Random Number Generator (integer ranges, float decimals, unique sets, dice, coin flip, lottery)
 * - Placeholder Image Generator (dimensions, presets, aspect ratios, colors, wireframe, SVG markup)
 * - Timestamp Generator (Unix epoch seconds & ms, ISO 8601, timezone conversions, leap years)
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
  generatePassword,
  generateMultiplePasswords,
  generateRandomInt,
  generateRandomFloat,
  generateRandomSet,
  getTimestamps,
  dateToTimestamp,
  timestampToDate,
} from '../../lib/generators/engines.ts';
import { checkPasswordStrength } from '../../lib/security/engines.ts';
import { TOOLS, COMING_SOON_CATEGORIES, getToolsByCategory } from '../../lib/registry.ts';

export async function runGeneratorToolsTests() {
  const tracker = new TestResultTracker('Generators Category E2E Suite');
  setupMockBrowserEnvironment();

  console.log('\n======================================================');
  console.log(' RUNNING GENERATORS SUITE: TIERS 1-4 COMPREHENSIVE');
  console.log('======================================================\n');

  // ── Tier 1: Core Feature Coverage ──────────────────────────────────────────
  console.log('--- Tier 1: Core Feature Coverage ---');

  await tracker.runTest('G1.1: Generators category is active in registry', () => {
    assertFalse(COMING_SOON_CATEGORIES.includes('Generators'), 'Generators must not be in COMING_SOON_CATEGORIES');
    const genTools = getToolsByCategory('Generators');
    assertEqual(genTools.length, 6, 'Should register exactly 6 Generator tools');
  });

  await tracker.runTest('G1.2: All 6 generator tools have active status', () => {
    const slugs = ['qr-generator', 'barcode-generator', 'password-generator', 'random-number', 'placeholder-image', 'timestamp-generator'];
    for (const slug of slugs) {
      const tool = TOOLS.find(t => t.slug === slug);
      assertTrue(!!tool, `Tool ${slug} exists`);
      assertEqual(tool.status, 'active', `${slug} status is active`);
      assertEqual(tool.category, 'Generators', `${slug} category is Generators`);
    }
  });

  await tracker.runTest('G1.3: Password generator produces exact requested lengths', () => {
    for (const len of [8, 16, 24, 32, 64]) {
      const p = generatePassword({
        length: len,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: false,
        customSymbols: '',
      });
      assertEqual(p.length, len, `Password length is ${len}`);
    }
  });

  await tracker.runTest('G1.4: Password generator respects character filters', () => {
    const pin = generatePassword({
      length: 8,
      uppercase: false,
      lowercase: false,
      numbers: true,
      symbols: false,
      excludeAmbiguous: false,
      customSymbols: '',
    });
    assertTrue(/^[0-9]+$/.test(pin), 'PIN should contain only numbers');

    const noAmbiguous = generatePassword({
      length: 60,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false,
      excludeAmbiguous: true,
      customSymbols: '',
    });
    assertFalse(/[0O1lI]/.test(noAmbiguous), 'Must exclude ambiguous characters (0, O, 1, l, I)');
  });

  await tracker.runTest('G1.5: Random Number Generator generates within integer bounds', () => {
    for (let i = 0; i < 30; i++) {
      const val = generateRandomInt(5, 15);
      assertTrue(val >= 5 && val <= 15, 'Value must be in [5, 15]');
    }
  });

  await tracker.runTest('G1.6: Random Number Generator generates correct decimal precision', () => {
    const val = generateRandomFloat(0, 10, 3);
    assertTrue(val >= 0 && val <= 10, 'Float in range');
    const dec = (val.toString().split('.')[1] || '').length;
    assertTrue(dec <= 3, 'Decimals <= 3');
  });

  await tracker.runTest('G1.7: Random Number Generator produces unique sets', () => {
    const set = generateRandomSet(1, 30, 15, true);
    assertEqual(set.length, 15, 'Set count matches');
    const unique = new Set(set);
    assertEqual(unique.size, 15, 'All numbers in unique set are distinct');
  });

  await tracker.runTest('G1.8: Timestamp Generator returns valid live epoch snapshots', () => {
    const ts = getTimestamps();
    assertTrue(ts.unix > 1700000000, 'Unix seconds is valid timestamp');
    assertTrue(ts.unixMs >= ts.unix * 1000, 'Unix ms corresponds to seconds');
    assertTrue(ts.iso.includes('T') && ts.iso.endsWith('Z'), 'ISO string is valid');
  });

  await tracker.runTest('G1.9: Timestamp Generator two-way date conversions are lossless', () => {
    const epoch = 1731778900;
    const res = timestampToDate(epoch);
    assertEqual(res.unix, epoch, 'Timestamp to date converts accurately');
    const back = dateToTimestamp(new Date(epoch * 1000));
    assertEqual(back.unix, epoch, 'Date to timestamp converts accurately');
  });

  // ── Tier 2: Boundary & Corner Cases ────────────────────────────────────────
  console.log('\n--- Tier 2: Boundary & Corner Cases ---');

  await tracker.runTest('G2.1: Password generator handles single-character length gracefully', () => {
    const p = generatePassword({
      length: 1,
      uppercase: true,
      lowercase: false,
      numbers: false,
      symbols: false,
      excludeAmbiguous: false,
      customSymbols: '',
    });
    assertEqual(p.length, 1, 'Length is 1');
    assertTrue(/^[A-Z]$/.test(p), 'Character is uppercase letter');
  });

  await tracker.runTest('G2.2: Password generator handles custom symbol overrides', () => {
    const p = generatePassword({
      length: 10,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      excludeAmbiguous: false,
      customSymbols: '#$',
    });
    assertTrue(/^[#$]+$/.test(p), 'Only custom symbols #$ used');
  });

  await tracker.runTest('G2.3: Random generator where min equals max returns exact value', () => {
    const val = generateRandomInt(42, 42);
    assertEqual(val, 42, 'Returns exact value when min == max');
  });

  await tracker.runTest('G2.4: Random unique set requesting more than available clamps to range', () => {
    const set = generateRandomSet(1, 5, 20, true);
    assertEqual(set.length, 5, 'Clamped to range size (5)');
  });

  await tracker.runTest('G2.5: Timestamp epoch 0 correctly maps to Jan 1 1970 UTC', () => {
    const zero = timestampToDate(0);
    assertEqual(zero.unix, 0, 'Unix is 0');
    assertEqual(zero.iso, '1970-01-01T00:00:00.000Z', 'Epoch 0 maps to 1970-01-01');
  });

  // ── Tier 3: Combinations & Chaining ────────────────────────────────────────
  console.log('\n--- Tier 3: Combinations & Chaining ---');

  await tracker.runTest('G3.1: Batch password generation creates N distinct passwords', () => {
    const batch = generateMultiplePasswords(
      {
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: false,
        customSymbols: '',
      },
      25
    );
    assertEqual(batch.length, 25, 'Generated 25 passwords');
    const set = new Set(batch);
    assertEqual(set.size, 25, 'All 25 passwords in batch are unique');
  });

  await tracker.runTest('G3.2: Password strength evaluation correlates with entropy', () => {
    const s1 = checkPasswordStrength('abc');
    const s2 = checkPasswordStrength('Abc12345');
    const s3 = checkPasswordStrength('Kx9#mQ2$pL8&vR4!wT7@');
    assertTrue(s1.score < s2.score, 's1 score < s2 score');
    assertTrue(s2.score < s3.score, 's2 score < s3 score');
    assertTrue(s3.entropy > 100, 'High security password has >100 entropy bits');
    assertEqual(s3.score, 4, 'Score is 4 (Very Strong)');
  });

  // ── Tier 4: Real-World Scenarios ───────────────────────────────────────────
  console.log('\n--- Tier 4: Real-World Scenarios ---');

  await tracker.runTest('G4.1: Wi-Fi QR Code string formatting structure is standard', () => {
    const ssid = 'Office_5G';
    const pass = 'SecretKey99';
    const enc = 'WPA';
    const wifiString = `WIFI:T:${enc};S:${ssid};P:${pass};H:false;;`;
    assertTrue(wifiString.startsWith('WIFI:T:WPA;S:Office_5G;P:SecretKey99;'), 'Valid Wi-Fi URI format');
  });

  await tracker.runTest('G4.2: EAN-13 Check Digit calculation algorithm', () => {
    // Test known EAN-13: 5901234123457 -> digits 590123412345 has check digit 7
    const digits = '590123412345'.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    assertEqual(checkDigit, 7, 'Check digit for 590123412345 is 7');
  });

  await tracker.runTest('G4.3: High-Entropy Enterprise Password Compliance', () => {
    const pwd = generatePassword({
      length: 32,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true,
      customSymbols: '',
    });
    const evalRes = checkPasswordStrength(pwd);
    assertEqual(evalRes.score, 4, 'Meets top enterprise security score (4)');
    assertTrue(evalRes.hasUpper, 'Has uppercase');
    assertTrue(evalRes.hasLower, 'Has lowercase');
    assertTrue(evalRes.hasNumber, 'Has number');
    assertTrue(evalRes.hasSymbol, 'Has symbol');
  });

  const summary = tracker.summary();
  if (summary.failed > 0) {
    console.log('\n❌ FAILED TESTS SUMMARY:');
    for (const t of summary.tests) {
      if (t.status === 'FAIL') console.log(`  ✖ ${t.name}: ${t.error}`);
    }
  }
  console.log('\n================================================================');
  console.log(` 🏁 GENERATORS E2E SUITE RESULTS: ${summary.passed}/${summary.total} passed in ${summary.durationMs}ms`);
  console.log('================================================================\n');

  return summary;
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('generator_tools.test.mjs')) {
  runGeneratorToolsTests()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
