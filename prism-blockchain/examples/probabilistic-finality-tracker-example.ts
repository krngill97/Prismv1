/**
 * Probabilistic Finality Tracker Example
 *
 * This file demonstrates how to use the ProbabilisticFinalityTracker
 * to detect instant finality with micro-batches
 * Run with: npx ts-node examples/probabilistic-finality-tracker-example.ts
 */

import { ProbabilisticFinalityTracker, InstantFinalityEvent } from '../src/consensus/ProbabilisticFinalityTracker';
import { MicroBatchBuilder, MicroBatch } from '../src/consensus/MicroBatchBuilder';
import { TransactionPool } from '../src/core/pool/TransactionPool';
import { Blockchain } from '../src/core/blockchain/Blockchain';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';
import * as fs from 'fs';
import * as path from 'path';

// Clean up test data
function cleanupTestData() {
  const dataDir = path.join(process.cwd(), 'data', 'blockchain-finality-test');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

// Simulate validator acknowledgments
function simulateValidatorAcks(
  tracker: ProbabilisticFinalityTracker,
  batchId: string,
  validatorCount: number,
  delayMs: number = 0
): void {
  for (let i = 0; i < validatorCount; i++) {
    setTimeout(() => {
      const validatorId = `validator-${i}`;
      const triggeredFinality = tracker.onValidatorAck(batchId, validatorId);

      if (triggeredFinality) {
        console.log(`   [INSTANT] Validator ${i + 1} triggered instant finality!`);
      }
    }, delayMs * i);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Probabilistic Finality Tracker Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // Clean up before starting
  cleanupTestData();

  // 1. Setup
  console.log('1. Setting up blockchain and components...');
  const blockchain = new Blockchain({
    nodeId: 'finality-test',
    dbPath: './data/blockchain-finality-test'
  });
  await blockchain.init();

  const txPool = new TransactionPool({
    maxSize: 10000,
    expirationTime: 60000
  });

  const batchBuilder = new MicroBatchBuilder(txPool, blockchain, {
    batchInterval: 100,
    maxBatchSize: 10
  });

  console.log('   Blockchain initialized');
  console.log('   Transaction pool ready');
  console.log('   Batch builder ready');
  console.log();

  // 2. Create finality tracker
  console.log('2. Creating probabilistic finality tracker...');
  const totalValidators = 30;
  const tracker = new ProbabilisticFinalityTracker({
    totalValidators: totalValidators,
    instantThreshold: 0.20,  // 20%
    timeoutWindow: 10        // 10ms
  });

  console.log(`   Total validators: ${totalValidators}`);
  console.log(`   Instant threshold: 20% (${Math.ceil(totalValidators * 0.2)} validators)`);
  console.log(`   Timeout window: 10ms`);
  console.log();

  // 3. Setup event listeners
  console.log('3. Setting up event listeners...');
  let finalityCount = 0;

  tracker.on('instant-finality', (event: InstantFinalityEvent) => {
    finalityCount++;
    console.log(`   [FINALITY EVENT #${finalityCount}]`);
    console.log(`     Batch ID: ${event.batchId.substring(0, 16)}...`);
    console.log(`     Batch Number: ${event.batchNumber}`);
    console.log(`     Confidence: ${event.confidence.toFixed(2)}%`);
    console.log(`     Validators: ${event.validators.length}/${totalValidators}`);
    console.log(`     Time to finality: ${event.timeToFinality}ms`);
    console.log();
  });

  console.log('   Event listeners registered');
  console.log();

  // 4. Test Case 1: Instant finality with 20% validators
  console.log('4. Test Case 1: Instant finality with 20% validators...');
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();

  // Create test transactions
  const testTxs: Transaction[] = [];
  for (let i = 0; i < 5; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(100 + i),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(10)
    });
    await tx.sign(alice.privateKey);
    testTxs.push(tx);
  }

  // Create a test batch
  const testBatch: MicroBatch = {
    id: 'test-batch-1',
    batchNumber: 1,
    timestamp: Date.now(),
    transactions: testTxs,
    merkleRoot: batchBuilder.calculateMerkleRootForBatch(testTxs)
  };

  console.log(`   Created test batch with ${testTxs.length} transactions`);
  console.log(`   Batch ID: ${testBatch.id}`);

  // Start tracking
  await tracker.trackInstantFinality(testBatch);
  console.log('   Started tracking instant finality...');

  // Simulate 6 validators ACKing (20% of 30)
  console.log('   Simulating 6 validators ACKing (20%)...');
  simulateValidatorAcks(tracker, testBatch.id, 6, 1);

  await new Promise(resolve => setTimeout(resolve, 50));

  // Check finality status
  const status1 = tracker.getFinalityStatus(testBatch.id);
  if (status1) {
    console.log('   Finality Status:');
    console.log(`     ACKs: ${status1.ackCount}/${status1.totalValidators}`);
    console.log(`     Confidence: ${status1.confidence.toFixed(2)}%`);
    console.log(`     Reversal Probability: ${(status1.reversalProbability * 100).toFixed(4)}%`);
    console.log(`     Has Instant Finality: ${status1.hasInstantFinality}`);
  }
  console.log();

  // 5. Test Case 2: Gradual ACKs reaching threshold
  console.log('5. Test Case 2: Gradual ACKs reaching threshold...');
  const testBatch2: MicroBatch = {
    id: 'test-batch-2',
    batchNumber: 2,
    timestamp: Date.now(),
    transactions: testTxs,
    merkleRoot: batchBuilder.calculateMerkleRootForBatch(testTxs)
  };

  await tracker.trackInstantFinality(testBatch2);
  console.log('   Started tracking batch 2...');

  // Simulate ACKs arriving over time
  console.log('   Simulating ACKs arriving gradually...');
  for (let i = 0; i < 10; i++) {
    const validatorId = `validator-${i}`;
    tracker.onValidatorAck(testBatch2.id, validatorId);

    const currentStatus = tracker.getFinalityStatus(testBatch2.id);
    if (currentStatus) {
      console.log(`     ACK ${i + 1}: ${currentStatus.confidence.toFixed(2)}% confidence`);
    }

    await new Promise(resolve => setTimeout(resolve, 2));
  }
  console.log();

  // 6. Test Case 3: Below threshold (no instant finality)
  console.log('6. Test Case 3: Below threshold (no instant finality)...');
  const testBatch3: MicroBatch = {
    id: 'test-batch-3',
    batchNumber: 3,
    timestamp: Date.now(),
    transactions: testTxs,
    merkleRoot: batchBuilder.calculateMerkleRootForBatch(testTxs)
  };

  await tracker.trackInstantFinality(testBatch3);
  console.log('   Started tracking batch 3...');

  // Only 5 validators ACK (16.67%, below 20% threshold)
  console.log('   Simulating only 5 validators ACKing (16.67%)...');
  simulateValidatorAcks(tracker, testBatch3.id, 5, 1);

  await new Promise(resolve => setTimeout(resolve, 50));

  const status3 = tracker.getFinalityStatus(testBatch3.id);
  if (status3) {
    console.log('   Finality Status:');
    console.log(`     ACKs: ${status3.ackCount}/${status3.totalValidators}`);
    console.log(`     Confidence: ${status3.confidence.toFixed(2)}%`);
    console.log(`     Has Instant Finality: ${status3.hasInstantFinality}`);
    console.log('   (Below 20% threshold - no instant finality)');
  }
  console.log();

  // 7. Test Case 4: High confidence (67%+)
  console.log('7. Test Case 4: High confidence with 67%+ validators...');
  const testBatch4: MicroBatch = {
    id: 'test-batch-4',
    batchNumber: 4,
    timestamp: Date.now(),
    transactions: testTxs,
    merkleRoot: batchBuilder.calculateMerkleRootForBatch(testTxs)
  };

  await tracker.trackInstantFinality(testBatch4);
  console.log('   Started tracking batch 4...');

  // 20 validators ACK (66.67%)
  console.log('   Simulating 20 validators ACKing (66.67%)...');
  simulateValidatorAcks(tracker, testBatch4.id, 20, 0);

  await new Promise(resolve => setTimeout(resolve, 50));

  const status4 = tracker.getFinalityStatus(testBatch4.id);
  if (status4) {
    console.log('   Finality Status:');
    console.log(`     ACKs: ${status4.ackCount}/${status4.totalValidators}`);
    console.log(`     Confidence: ${status4.confidence.toFixed(2)}%`);
    console.log(`     Reversal Probability: ${(status4.reversalProbability * 100).toFixed(6)}%`);
    console.log(`     Has Instant Finality: ${status4.hasInstantFinality}`);
  }
  console.log();

  // 8. Test reversal probability calculation
  console.log('8. Testing reversal probability calculation...');
  const confidenceLevels = [0, 10, 20, 30, 40, 50, 60, 67, 70, 80, 90, 100];

  console.log('   Confidence -> Reversal Probability:');
  for (const confidence of confidenceLevels) {
    const probability = tracker.calculateReversalProbability(confidence);
    console.log(`     ${confidence.toString().padStart(3)}% -> ${(probability * 100).toFixed(6)}%`);
  }
  console.log();

  // 9. Integration with batch builder
  console.log('9. Integration test with batch builder...');

  // Add transactions to pool
  for (let i = 0; i < 25; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(10 + i),
      nonce: i + 100,
      timestamp: Date.now(),
      fee: BigInt(5)
    });
    await tx.sign(alice.privateKey);
    txPool.add(tx);
  }

  console.log('   Added 25 transactions to pool');

  // Listen for batch-created events and track finality
  batchBuilder.on('batch-created', async (batch: MicroBatch) => {
    console.log(`   [BATCH ${batch.batchNumber}] Created with ${batch.transactions.length} txs`);

    // Start tracking finality
    await tracker.trackInstantFinality(batch);

    // Simulate validators ACKing
    const ackCount = Math.floor(Math.random() * 15) + 6; // 6-20 validators
    console.log(`     Simulating ${ackCount} validators ACKing...`);
    simulateValidatorAcks(tracker, batch.id, ackCount, 1);
  });

  // Start batch builder
  console.log('   Starting batch builder...');
  batchBuilder.start();

  await new Promise(resolve => setTimeout(resolve, 350));

  batchBuilder.stop();
  console.log('   Stopped batch builder');
  console.log();

  // 10. Statistics
  console.log('10. Tracker statistics...');
  const stats = tracker.getStats();
  console.log(`   Total validators: ${stats.totalValidators}`);
  console.log(`   Instant threshold: ${(stats.instantThreshold * 100).toFixed(0)}%`);
  console.log(`   Timeout window: ${stats.timeoutWindow}ms`);
  console.log(`   Tracked batches: ${stats.trackedBatches}`);
  console.log(`   Finalized batches: ${stats.finalizedBatches}`);
  console.log(`   Finality rate: ${stats.finalityRate.toFixed(2)}%`);
  console.log();

  // 11. Query finalized batches
  console.log('11. Finalized batches...');
  const finalizedBatches = tracker.getFinalizedBatches();
  console.log(`   Total finalized: ${finalizedBatches.length}`);
  finalizedBatches.slice(0, 5).forEach((batchId, i) => {
    const status = tracker.getFinalityStatus(batchId);
    if (status) {
      console.log(`   Batch ${i + 1}: ${status.confidence.toFixed(2)}% confidence, ${status.ackCount} ACKs`);
    }
  });
  console.log();

  // 12. Test cleanup
  console.log('12. Testing cleanup methods...');
  const beforeCleanup = tracker.getTrackedCount();

  // Clear a specific batch
  const firstBatch = tracker.getTrackedBatches()[0];
  if (firstBatch) {
    tracker.clearBatch(firstBatch);
    console.log(`   Cleared batch: ${firstBatch.substring(0, 16)}...`);
  }

  const afterCleanup = tracker.getTrackedCount();
  console.log(`   Tracked batches: ${beforeCleanup} -> ${afterCleanup}`);
  console.log();

  // 13. Validator count update test
  console.log('13. Testing validator count update...');
  const oldValidators = tracker.getTotalValidators();
  tracker.setTotalValidators(50);
  const newValidators = tracker.getTotalValidators();
  console.log(`   Updated validators: ${oldValidators} -> ${newValidators}`);
  console.log(`   New threshold: ${Math.ceil(newValidators * 0.2)} validators (20%)`);
  console.log();

  // 14. Edge cases
  console.log('14. Testing edge cases...');

  // Test with 1 validator
  const singleValidatorTracker = new ProbabilisticFinalityTracker({
    totalValidators: 1,
    instantThreshold: 0.20
  });

  const edgeBatch: MicroBatch = {
    id: 'edge-batch',
    batchNumber: 100,
    timestamp: Date.now(),
    transactions: [],
    merkleRoot: '0'
  };

  await singleValidatorTracker.trackInstantFinality(edgeBatch);
  singleValidatorTracker.onValidatorAck(edgeBatch.id, 'validator-0');

  const edgeStatus = singleValidatorTracker.getFinalityStatus(edgeBatch.id);
  if (edgeStatus) {
    console.log('   Single validator test:');
    console.log(`     Confidence: ${edgeStatus.confidence.toFixed(2)}%`);
    console.log(`     Has Instant Finality: ${edgeStatus.hasInstantFinality}`);
  }
  console.log();

  // 15. Performance test
  console.log('15. Performance test...');
  const perfTracker = new ProbabilisticFinalityTracker({
    totalValidators: 100,
    instantThreshold: 0.20
  });

  const startTime = Date.now();
  const batchCount = 1000;

  for (let i = 0; i < batchCount; i++) {
    const perfBatch: MicroBatch = {
      id: `perf-batch-${i}`,
      batchNumber: i,
      timestamp: Date.now(),
      transactions: [],
      merkleRoot: '0'
    };

    await perfTracker.trackInstantFinality(perfBatch);

    // Simulate 30 validators ACKing
    for (let j = 0; j < 30; j++) {
      perfTracker.onValidatorAck(perfBatch.id, `validator-${j}`);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`   Processed ${batchCount} batches in ${elapsed}ms`);
  console.log(`   Rate: ${(batchCount / (elapsed / 1000)).toFixed(2)} batches/second`);
  console.log(`   Average: ${(elapsed / batchCount).toFixed(2)}ms per batch`);
  console.log();

  // 16. Final summary
  console.log('16. Final summary...');
  console.log(`   Total instant finality events: ${finalityCount}`);
  console.log(`   Finality detection working: ${finalityCount > 0 ? 'YES' : 'NO'}`);
  console.log();

  // Cleanup
  await blockchain.close();
  cleanupTestData();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
