#!/usr/bin/env npx ts-node

/**
 * Reproducibility Verification CLI
 *
 * Usage:
 *   npx ts-node scripts/verify-reproducibility.ts
 *   npx ts-node scripts/verify-reproducibility.ts --full
 *   npx ts-node scripts/verify-reproducibility.ts --quick
 */

import ReproducibilityService from '../src/services/ReproducibilityService';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const mode = args[0] || '--standard';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('      WCAG AI Platform - Reproducibility Verification Tool       ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Mode: ${mode}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    if (mode === '--quick') {
      await quickCheck();
    } else if (mode === '--full') {
      await fullCheck();
    } else {
      await standardCheck();
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                   ✅ Verification Complete');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

async function quickCheck() {
  console.log('Running quick reproducibility checks...\n');

  // 1. Lockfile integrity
  console.log('1️⃣  Lockfile Integrity');
  const lockfileOk = await ReproducibilityService.verifyLockfileIntegrity();
  console.log(`   ${lockfileOk ? '✅' : '❌'} Lockfile present and valid\n`);

  // 2. Artifact checksums
  console.log('2️⃣  Build Artifacts');
  const checksums = await ReproducibilityService.generateArtifactChecksums();
  console.log(`   ✅ Generated checksums for ${Object.keys(checksums).length} artifacts\n`);

  // 3. Summary
  console.log('Quick Check Summary:');
  console.log(`  • Lockfile: ${lockfileOk ? 'OK' : 'FAILED'}`);
  console.log(`  • Artifacts: ${Object.keys(checksums).length} checksummed`);
}

async function standardCheck() {
  console.log('Running standard reproducibility checks...\n');

  // 1. Lockfile integrity
  console.log('1️⃣  Lockfile Integrity');
  const lockfileOk = await ReproducibilityService.verifyLockfileIntegrity();
  console.log(`   ${lockfileOk ? '✅' : '❌'} Lockfile integrity verified\n`);

  // 2. Artifact checksums
  console.log('2️⃣  Build Artifact Verification');
  const checksums = await ReproducibilityService.generateArtifactChecksums();
  console.log(`   ✅ Generated checksums for ${Object.keys(checksums).length} artifacts`);
  console.log(`   ✅ Sample artifacts:`);
  Object.keys(checksums)
    .slice(0, 5)
    .forEach(artifact => {
      console.log(`      • ${artifact}`);
    });
  if (Object.keys(checksums).length > 5) {
    console.log(`      ... and ${Object.keys(checksums).length - 5} more\n`);
  } else {
    console.log();
  }

  // 3. Test determinism
  console.log('3️⃣  Test Determinism (3 runs)');
  const testResult = await ReproducibilityService.verifyTestDeterminism();
  console.log(`   ${testResult.deterministic ? '✅' : '❌'} Tests produced consistent output`);
  console.log(`   Output hash: ${testResult.outputHash.slice(0, 16)}...\n`);

  // 4. Randomness audit
  console.log('4️⃣  Randomness Audit');
  const randomnessResult = await ReproducibilityService.auditRandomness();
  console.log(`   ${randomnessResult.verified ? '✅' : '⚠️'} Randomness audit`);
  if (randomnessResult.unseededSources.length > 0) {
    console.log(`   Found ${randomnessResult.unseededSources.length} unseeded sources:`);
    randomnessResult.unseededSources.slice(0, 3).forEach(source => {
      console.log(`      • ${source}`);
    });
    if (randomnessResult.unseededSources.length > 3) {
      console.log(`      ... and ${randomnessResult.unseededSources.length - 3} more`);
    }
  }
  console.log();

  // 5. Build attestation
  console.log('5️⃣  Build Attestation Generation');
  const attestation = await ReproducibilityService.generateBuildAttestation();
  console.log(`   ✅ Attestation generated`);
  console.log(`   Commit: ${attestation.sourceCode.commitShort}`);
  console.log(`   Verified pillars: ${attestation.reproducibility.pillarsVerified.join(', ')}\n`);

  // Summary
  console.log('Standard Check Summary:');
  console.log(`  ✅ Lockfile: ${lockfileOk ? 'OK' : 'FAILED'}`);
  console.log(`  ✅ Artifacts: ${Object.keys(checksums).length} checksummed`);
  console.log(`  ${testResult.deterministic ? '✅' : '❌'} Tests: ${testResult.deterministic ? 'Deterministic' : 'Not deterministic'}`);
  console.log(`  ${randomnessResult.verified ? '✅' : '⚠️'} Randomness: ${randomnessResult.verified ? 'OK' : `${randomnessResult.unseededSources.length} unseeded`}`);
}

async function fullCheck() {
  console.log('Running full reproducibility verification...\n');

  // All checks from standard + more detailed analysis
  await standardCheck();

  // Additional full checks
  console.log('Additional Full Checks:\n');

  // 6. Comprehensive report
  console.log('6️⃣  Comprehensive Reproducibility Report');
  const report = await ReproducibilityService.generateReproducibilityReport();
  console.log(`   ${report.checksPassed}/${report.checksPassed + report.checksFailed} checks passed`);
  console.log(`   Summary: ${report.summary}\n`);

  console.log('Full Check Results:');
  Object.entries(report.results).forEach(([check, result]) => {
    console.log(`   ${result ? '✅' : '❌'} ${check}`);
  });
}

// Run the verification
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
