import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generatePassword,
  generateMultiplePasswords,
  generateRandomInt,
  generateRandomFloat,
  generateRandomSet,
  getTimestamps,
  dateToTimestamp,
  timestampToDate,
} from '../lib/generators/engines.ts';
import { checkPasswordStrength } from '../lib/security/engines.ts';
import { TOOLS, COMING_SOON_CATEGORIES, getToolsByCategory } from '../lib/registry.ts';

describe('Generator Category & Engines Test Suite', () => {
  describe('Registry Verification', () => {
    it('Generators category is marked active (not in COMING_SOON_CATEGORIES)', () => {
      assert.strictEqual(
        COMING_SOON_CATEGORIES.includes('Generators'),
        false,
        'Generators should be active and removed from COMING_SOON_CATEGORIES'
      );
    });

    it('All 6 Generator tools are present and marked active', () => {
      const generatorTools = getToolsByCategory('Generators');
      assert.strictEqual(generatorTools.length, 6, 'Should have exactly 6 Generator tools');

      const slugs = generatorTools.map(t => t.slug);
      const expectedSlugs = [
        'qr-generator',
        'barcode-generator',
        'password-generator',
        'random-number',
        'placeholder-image',
        'timestamp-generator',
      ];

      for (const expected of expectedSlugs) {
        assert.ok(slugs.includes(expected), `Tool ${expected} should be in Generators`);
        const tool = generatorTools.find(t => t.slug === expected);
        assert.strictEqual(tool?.status, 'active', `${expected} should have status: 'active'`);
      }
    });
  });

  describe('Password Generator Engine', () => {
    it('Generates password of exact requested length', () => {
      for (const len of [8, 16, 24, 32, 64]) {
        const pwd = generatePassword({
          length: len,
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: true,
          excludeAmbiguous: false,
          customSymbols: '',
        });
        assert.strictEqual(pwd.length, len, `Password length should be ${len}`);
      }
    });

    it('Respects character set constraints', () => {
      // Numbers only
      const pin = generatePassword({
        length: 12,
        uppercase: false,
        lowercase: false,
        numbers: true,
        symbols: false,
        excludeAmbiguous: false,
        customSymbols: '',
      });
      assert.match(pin, /^[0-9]+$/, 'Should only contain numbers');

      // Uppercase only
      const upper = generatePassword({
        length: 15,
        uppercase: true,
        lowercase: false,
        numbers: false,
        symbols: false,
        excludeAmbiguous: false,
        customSymbols: '',
      });
      assert.match(upper, /^[A-Z]+$/, 'Should only contain uppercase letters');

      // Exclude ambiguous
      const unambiguous = generatePassword({
        length: 50,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: false,
        excludeAmbiguous: true,
        customSymbols: '',
      });
      assert.strictEqual(/[0O1lI]/.test(unambiguous), false, 'Should not contain ambiguous characters');
    });

    it('Generates batch of distinct passwords', () => {
      const count = 10;
      const list = generateMultiplePasswords(
        {
          length: 16,
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: true,
          excludeAmbiguous: false,
          customSymbols: '',
        },
        count
      );
      assert.strictEqual(list.length, count, `Should generate ${count} passwords`);
      const uniqueSet = new Set(list);
      assert.strictEqual(uniqueSet.size, count, 'Generated passwords in batch should be distinct');
    });

    it('Evaluates password strength accurately', () => {
      const weak = checkPasswordStrength('123456');
      assert.ok(weak.score <= 1, 'Simple password should have score <= 1');

      const strong = checkPasswordStrength('Kx9#mQ2$pL8&vR4!');
      assert.ok(strong.score >= 3, 'Complex password should have score >= 3');
      assert.ok(strong.entropy > 60, 'Complex password should have high entropy');
    });
  });

  describe('Random Number Generator Engine', () => {
    it('Generates integers strictly within [min, max] range', () => {
      for (let i = 0; i < 50; i++) {
        const val = generateRandomInt(10, 20);
        assert.ok(val >= 10 && val <= 20, `Value ${val} should be in [10, 20]`);
      }
    });

    it('Generates float numbers with specified decimal precision', () => {
      for (let i = 0; i < 20; i++) {
        const val = generateRandomFloat(0, 5, 3);
        assert.ok(val >= 0 && val <= 5, `Value ${val} should be in [0, 5]`);
        const decParts = val.toString().split('.')[1] || '';
        assert.ok(decParts.length <= 3, 'Decimals should not exceed 3');
      }
    });

    it('Generates unique sets of random numbers', () => {
      const set = generateRandomSet(1, 20, 10, true);
      assert.strictEqual(set.length, 10, 'Set should have 10 items');
      const unique = new Set(set);
      assert.strictEqual(unique.size, 10, 'All items in set should be unique');
    });
  });

  describe('Timestamp Generator Engine', () => {
    it('Provides valid timestamps snapshot', () => {
      const ts = getTimestamps();
      assert.ok(ts.unix > 1700000000, 'Unix seconds should be reasonable epoch');
      assert.ok(ts.unixMs > ts.unix * 1000 - 1000, 'Unix ms should match seconds scale');
      assert.ok(ts.iso.includes('T') && ts.iso.endsWith('Z'), 'ISO should be valid ISO 8601');
    });

    it('Converts timestamp to date and back idempotently', () => {
      const testUnix = 1731778900;
      const converted = timestampToDate(testUnix);
      assert.strictEqual(converted.unix, testUnix, 'Roundtrip unix should match exactly');
    });
  });
});
