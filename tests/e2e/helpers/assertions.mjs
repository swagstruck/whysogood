// @ts-check
import assert from 'node:assert';

export class TestResultTracker {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
    this.startTime = Date.now();
  }

  async runTest(name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const duration = Date.now() - t0;
      this.passed++;
      this.tests.push({ name, status: 'PASS', duration });
      console.log(`  ✔ [PASS] ${name} (${duration}ms)`);
      return true;
    } catch (err) {
      const duration = Date.now() - t0;
      this.failed++;
      const message = err instanceof Error ? err.message : String(err);
      this.tests.push({ name, status: 'FAIL', duration, error: message });
      console.error(`  ✖ [FAIL] ${name} (${duration}ms)`);
      console.error(`     Error: ${message}`);
      return false;
    }
  }

  summary() {
    const totalDuration = Date.now() - this.startTime;
    return {
      suite: this.suiteName,
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      durationMs: totalDuration,
      tests: this.tests,
    };
  }
}

export function assertEqual(actual, expected, message) {
  assert.strictEqual(actual, expected, message || `Expected ${expected}, but received ${actual}`);
}

export function assertTrue(val, message) {
  assert.strictEqual(Boolean(val), true, message || `Expected truthy value, but received ${val}`);
}

export function assertFalse(val, message) {
  assert.strictEqual(Boolean(val), false, message || `Expected falsy value, but received ${val}`);
}

export function assertIncludes(haystack, needle, message) {
  const contains = String(haystack).includes(needle);
  assert.strictEqual(contains, true, message || `Expected "${haystack}" to include "${needle}"`);
}

export function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert.strictEqual(threw, true, message || `Expected function to throw`);
}
