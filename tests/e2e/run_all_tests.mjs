// @ts-check
/**
 * Master E2E Test Runner for whysogood.app
 * Aggregates and runs Dual-Track Test Suites:
 * - Simple Mode Workbench E2E Suites (Tiers 1-4)
 * - File Compression Upgrade E2E Suites (Tiers 1-4: Images, PDFs, Streaming Archives)
 * - Automated Static Strict Typecheck (`npx tsc --noEmit`)
 * 
 * Executable via: `node tests/e2e/run_all_tests.mjs`
 */

import { runTier1Tests } from './tier1_features.test.mjs';
import { runTier2Tests } from './tier2_boundaries.test.mjs';
import { runTier3Tests } from './tier3_combinations.test.mjs';
import { runTier4Tests } from './tier4_scenarios.test.mjs';
import { runCompressionTests } from './compression_tiers1_4.test.mjs';
import { runDeveloperToolsTests } from './developer_tools.test.mjs';
import { execSync } from 'node:child_process';

async function main() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log(' 🚀 WHYSOGOOD.APP — DUAL-TRACK COMPREHENSIVE E2E MASTER RUNNER');
  console.log('================================================================');
  console.log(` Node Version:     ${process.version}`);
  console.log(` Target Directory: ${process.cwd()}`);
  console.log(` Timestamp:        ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // Step 1: Automated Static Check: TypeScript Strict Compilation
  console.log('🔍 [STEP 1/7] Verifying Strict TypeScript (npx tsc --noEmit)...');
  let tscPassed = false;
  let tscError = '';
  try {
    execSync('npx tsc --noEmit', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('  ✔ TypeScript check PASSED: 0 errors.\n');
    tscPassed = true;
  } catch (err) {
    tscPassed = false;
    tscError = (err.stdout || err.stderr || err.message).trim();
    console.error('  ✖ TypeScript check FAILED:');
    console.error(`     ${tscError.split('\n')[0]}`);
    console.error('     (Continuing to execute behavioral test tiers...)\n');
  }

  // Step 2: Run Tier 1: Feature Coverage (F1-F16)
  console.log('🧪 [STEP 2/7] Running Simple Mode Tier 1: Feature Coverage Suite...');
  const t1 = await runTier1Tests();

  // Step 3: Run Tier 2: Boundary & Corner Cases
  console.log('\n🧪 [STEP 3/7] Running Simple Mode Tier 2: Boundary & Corner Cases Suite...');
  const t2 = await runTier2Tests();

  // Step 4: Run Tier 3: Cross-Feature Combinations
  console.log('\n🧪 [STEP 4/7] Running Simple Mode Tier 3: Cross-Feature Combinations Suite...');
  const t3 = await runTier3Tests();

  // Step 5: Run Tier 4: Real-World Application Scenarios
  console.log('\n🧪 [STEP 5/7] Running Simple Mode Tier 4: Real-World Application Scenarios Suite...');
  const t4 = await runTier4Tests();

  // Step 6: Run File Compression Upgrade Suite (Tiers 1-4)
  console.log('\n🧪 [STEP 6/7] Running File Compression Upgrade E2E Suite (Tiers 1-4)...');
  const tCompress = await runCompressionTests();

  // Step 7: Run Developer Tools Suite (Tiers 1-4)
  console.log('\n🧪 [STEP 7/7] Running Developer Tools E2E Suite (Tiers 1-4)...');
  const tDev = await runDeveloperToolsTests();

  // Aggregate Metrics
  const totalBehavioralTests = t1.total + t2.total + t3.total + t4.total + tCompress.total + tDev.total;
  const totalBehavioralPassed = t1.passed + t2.passed + t3.passed + t4.passed + tCompress.passed + tDev.passed;
  const totalBehavioralFailed = t1.failed + t2.failed + t3.failed + t4.failed + tCompress.failed + tDev.failed;
  const totalDuration = Date.now() - startTime;
  const passRate = ((totalBehavioralPassed / totalBehavioralTests) * 100).toFixed(1);

  console.log('\n================================================================');
  console.log(' 📊 MASTER DUAL-TRACK TEST EXECUTION SUMMARY REPORT');
  console.log('================================================================');
  console.log(` Static Typecheck (tsc):          ${tscPassed ? 'PASSED (0 errors)' : 'FAILED'}`);
  console.log(` Simple Mode Tier 1 (Features):   ${t1.passed}/${t1.total} passed in ${t1.durationMs}ms`);
  console.log(` Simple Mode Tier 2 (Boundaries): ${t2.passed}/${t2.total} passed in ${t2.durationMs}ms`);
  console.log(` Simple Mode Tier 3 (Combos):     ${t3.passed}/${t3.total} passed in ${t3.durationMs}ms`);
  console.log(` Simple Mode Tier 4 (Scenarios):  ${t4.passed}/${t4.total} passed in ${t4.durationMs}ms`);
  console.log(` Compression Upgrade (Tiers 1-4): ${tCompress.passed}/${tCompress.total} passed in ${tCompress.durationMs}ms`);
  console.log(` Developer Tools (Tiers 1-4):     ${tDev.passed}/${tDev.total} passed in ${tDev.durationMs}ms`);
  console.log('----------------------------------------------------------------');
  console.log(` TOTAL BEHAVIORAL TESTS:          ${totalBehavioralTests}`);
  console.log(` TOTAL PASSED:                    ${totalBehavioralPassed}`);
  console.log(` TOTAL FAILED:                    ${totalBehavioralFailed}`);
  console.log(` PASS RATE:                       ${passRate}%`);
  console.log(` TOTAL TIME:                      ${totalDuration}ms`);
  console.log('================================================================\n');

  if (!tscPassed || totalBehavioralFailed > 0) {
    console.error(`❌ MASTER SUITE FAILED: ${totalBehavioralFailed} behavioral failure(s), tscPassed=${tscPassed}`);
    process.exit(1);
  } else {
    console.log('✅ ALL DUAL-TRACK TESTS PASSED SUCCESSFULLY! All acceptance criteria verified.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
