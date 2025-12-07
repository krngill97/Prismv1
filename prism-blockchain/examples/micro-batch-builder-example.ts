/**
 * Micro-Batch Builder Example
 *
 * This file demonstrates how to use the MicroBatchBuilder class
 * Run with: npx ts-node examples/micro-batch-builder-example.ts
 */

import { MicroBatchBuilder, MicroBatch } from '../src/consensus/MicroBatchBuilder';
import { TransactionPool } from '../src/core/pool/TransactionPool';
import { Blockchain } from '../src/core/blockchain/Blockchain';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';
import * as fs from 'fs';
import * as path from 'path';

// Clean up test data
function cleanupTestData() {
  const dataDir = path.join(process.cwd(), 'data', 'blockchain-batch-test');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Micro-Batch Builder Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // Clean up before starting
  cleanupTestData();

  // 1. Setup blockchain and transaction pool
  console.log('1. Setting up blockchain and transaction pool...');
  const blockchain = new Blockchain({
    nodeId: 'batch-test',
    dbPath: './data/blockchain-batch-test'
  });
  await blockchain.init();

  const txPool = new TransactionPool({
    maxSize: 10000,
    expirationTime: 60000
  });

  console.log('   Blockchain initialized');
  console.log('   Transaction pool ready');
  console.log();

  // 2. Create micro-batch builder
  console.log('2. Creating micro-batch builder...');
  const builder = new MicroBatchBuilder(txPool, blockchain, {
    batchInterval: 100, // 100ms for demo (default is 10ms)
    maxBatchSize: 10
  });

  console.log('   Builder created');
  console.log(`   Batch interval: ${builder.getConfig().batchInterval}ms`);
  console.log(`   Max batch size: ${builder.getConfig().maxBatchSize}`);
  console.log();

  // 3. Setup event listeners
  console.log('3. Setting up event listeners...');
  let batchesCreated = 0;

  builder.on('batch-created', (batch: MicroBatch) => {
    batchesCreated++;
    console.log(`   [BATCH ${batch.batchNumber}] Created:`);
    console.log(`     ID: ${batch.id.substring(0, 16)}...`);
    console.log(`     Transactions: ${batch.transactions.length}`);
    console.log(`     Merkle Root: ${batch.merkleRoot.substring(0, 16)}...`);
    console.log(`     Timestamp: ${new Date(batch.timestamp).toISOString()}`);
  });

  builder.on('started', () => {
    console.log('   [EVENT] Builder started');
  });

  builder.on('stopped', () => {
    console.log('   [EVENT] Builder stopped');
  });

  console.log('   Event listeners registered');
  console.log();

  // 4. Generate accounts and transactions
  console.log('4. Generating accounts and transactions...');
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();
  const charlie = await generateKeyPair();

  // Give Alice some tokens
  const genesisAddr = '0x' + '0'.repeat(64);
  const fundingTx = new Transaction({
    from: genesisAddr,
    to: alice.publicKey,
    amount: BigInt(10000),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10)
  });

  console.log('   Generated Alice, Bob, and Charlie');
  console.log();

  // 5. Add transactions to pool
  console.log('5. Adding transactions to pool...');

  // Create 25 transactions
  const transactions: Transaction[] = [];
  for (let i = 0; i < 25; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: i % 2 === 0 ? bob.publicKey : charlie.publicKey,
      amount: BigInt(10 + i),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(5 + i) // Varying fees for priority testing
    });
    await tx.sign(alice.privateKey);
    transactions.push(tx);
    txPool.add(tx);
  }

  console.log(`   Added ${transactions.length} transactions to pool`);
  console.log(`   Pool size: ${txPool.size()}`);
  console.log();

  // 6. Start batch builder
  console.log('6. Starting batch builder...');
  builder.start();

  console.log('   Batch builder started');
  console.log('   Creating batches every 100ms...');
  console.log();

  // 7. Wait for batches to be created
  console.log('7. Waiting for batches to be created...');
  console.log('   (batches will appear above)');
  console.log();

  await new Promise(resolve => setTimeout(resolve, 500));

  // 8. Stop batch builder
  console.log();
  console.log('8. Stopping batch builder...');
  builder.stop();
  console.log('   Builder stopped');
  console.log();

  // 9. Show statistics
  console.log('9. Batch builder statistics...');
  const stats = builder.getStats();
  console.log(`   Total batches created: ${stats.totalBatches}`);
  console.log(`   Current batch size: ${stats.currentBatchSize}`);
  console.log(`   Is running: ${stats.isRunning}`);
  console.log();

  // 10. Show transaction pool after batching
  console.log('10. Transaction pool after batching...');
  console.log(`   Remaining transactions: ${txPool.size()}`);
  console.log();

  // 11. Test manual batch creation
  console.log('11. Testing manual batch creation...');

  // Add more transactions
  for (let i = 0; i < 5; i++) {
    const tx = new Transaction({
      from: bob.publicKey,
      to: alice.publicKey,
      amount: BigInt(5 + i),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(10)
    });
    await tx.sign(bob.privateKey);
    txPool.add(tx);
  }

  console.log(`   Added 5 more transactions`);
  console.log(`   Pool size: ${txPool.size()}`);

  // Start builder again
  builder.start();
  await new Promise(resolve => setTimeout(resolve, 150));
  builder.stop();

  console.log();

  // 12. Test force batch
  console.log('12. Testing force batch...');

  // Add transactions
  for (let i = 0; i < 3; i++) {
    const tx = new Transaction({
      from: charlie.publicKey,
      to: alice.publicKey,
      amount: BigInt(1 + i),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(20)
    });
    await tx.sign(charlie.privateKey);
    builder.addTransaction(tx);
  }

  console.log(`   Added 3 transactions manually`);
  console.log(`   Current batch size: ${builder.getCurrentBatchSize()}`);

  builder.forceBatch();
  console.log('   Forced batch creation');
  console.log();

  // 13. Test configuration changes
  console.log('13. Testing configuration changes...');
  const oldInterval = builder.getConfig().batchInterval;
  const oldSize = builder.getConfig().maxBatchSize;

  builder.setBatchInterval(50);
  builder.setMaxBatchSize(5);

  console.log(`   Changed batch interval: ${oldInterval}ms -> ${builder.getConfig().batchInterval}ms`);
  console.log(`   Changed max batch size: ${oldSize} -> ${builder.getConfig().maxBatchSize}`);
  console.log();

  // 14. Test reset
  console.log('14. Testing reset...');
  const beforeReset = builder.getBatchNumber();
  builder.reset();
  const afterReset = builder.getBatchNumber();

  console.log(`   Batch number before reset: ${beforeReset}`);
  console.log(`   Batch number after reset: ${afterReset}`);
  console.log();

  // 15. High-frequency batching test
  console.log('15. High-frequency batching test (10ms interval)...');

  builder.setBatchInterval(10); // 10ms = 100 batches per second

  // Add many transactions
  for (let i = 0; i < 100; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(1),
      nonce: i + 25,
      timestamp: Date.now(),
      fee: BigInt(5)
    });
    await tx.sign(alice.privateKey);
    txPool.add(tx);
  }

  console.log('   Added 100 transactions');
  console.log('   Starting high-frequency batching...');

  const startBatches = builder.getBatchNumber();
  builder.start();

  await new Promise(resolve => setTimeout(resolve, 200));

  builder.stop();
  const endBatches = builder.getBatchNumber();

  console.log(`   Created ${endBatches - startBatches} batches in 200ms`);
  console.log(`   Rate: ${((endBatches - startBatches) / 0.2).toFixed(2)} batches/second`);
  console.log();

  // 16. Merkle root verification
  console.log('16. Merkle root verification...');

  // Create a batch manually
  const testTxs: Transaction[] = [];
  for (let i = 0; i < 5; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(i + 1),
      nonce: i + 125,
      timestamp: Date.now(),
      fee: BigInt(10)
    });
    await tx.sign(alice.privateKey);
    testTxs.push(tx);
  }

  const merkleRoot1 = builder.calculateMerkleRootForBatch(testTxs);
  const merkleRoot2 = builder.calculateMerkleRootForBatch(testTxs);

  console.log(`   Merkle root 1: ${merkleRoot1.substring(0, 32)}...`);
  console.log(`   Merkle root 2: ${merkleRoot2.substring(0, 32)}...`);
  console.log(`   Deterministic: ${merkleRoot1 === merkleRoot2}`);
  console.log();

  // 17. Final statistics
  console.log('17. Final statistics...');
  const finalStats = builder.getStats();
  const finalConfig = builder.getConfig();

  console.log('   Configuration:');
  console.log(`     Batch interval: ${finalConfig.batchInterval}ms`);
  console.log(`     Max batch size: ${finalConfig.maxBatchSize}`);
  console.log('   Statistics:');
  console.log(`     Total batches: ${finalStats.totalBatches}`);
  console.log(`     Current batch size: ${finalStats.currentBatchSize}`);
  console.log(`     Total batches created: ${batchesCreated}`);
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
