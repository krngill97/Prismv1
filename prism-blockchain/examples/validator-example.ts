/**
 * Validator Node Example
 *
 * This file demonstrates how to run a complete validator node
 * Run with: npx ts-node examples/validator-example.ts
 */

import { Validator } from '../src/validator/Validator';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';
import * as fs from 'fs';
import * as path from 'path';

// Clean up test data
function cleanupTestData() {
  const dataDir = path.join(process.cwd(), 'data', 'validator-test');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Validator Node Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // Clean up before starting
  cleanupTestData();

  // 1. Create validator keys
  console.log('1. Creating validator keys...');
  const validatorKeys = await generateKeyPair();
  console.log(`   Public key: ${validatorKeys.publicKey.substring(0, 32)}...`);
  console.log(`   Validator ID: validator-1`);
  console.log();

  // 2. Create validator instance
  console.log('2. Creating validator instance...');
  const validator = new Validator({
    validatorId: 'validator-1',
    validatorKeys: validatorKeys,
    dbPath: './data/validator-test',
    totalValidators: 5,       // 5 validators in network
    batchInterval: 100,       // 100ms for demo (default: 10ms)
    maxBatchSize: 10,
    instantThreshold: 0.20,   // 20% threshold
    poolMaxSize: 10000
  });

  console.log('   Validator created');
  console.log(`   Batch interval: 100ms`);
  console.log(`   Total validators: 5`);
  console.log(`   Instant threshold: 20% (1 out of 5 validators)`);
  console.log();

  // 3. Setup event listeners
  console.log('3. Setting up event listeners...');

  validator.on('started', (data) => {
    console.log(`   [EVENT] Validator started: ${data.validatorId}`);
  });

  validator.on('stopped', (data) => {
    console.log(`   [EVENT] Validator stopped: ${data.validatorId}`);
    console.log(`           Uptime: ${data.uptime}ms`);
  });

  validator.on('batch-created', (data) => {
    console.log(`   [BATCH] Created #${data.batchNumber}`);
    console.log(`           ID: ${data.batchId.substring(0, 16)}...`);
    console.log(`           Transactions: ${data.transactionCount}`);
  });

  validator.on('instant-finality', (data) => {
    console.log(`   [FINALITY] Batch #${data.batchNumber} achieved instant finality!`);
    console.log(`              Confidence: ${data.confidence.toFixed(2)}%`);
    console.log(`              Validators: ${data.validators.length}`);
    console.log(`              Time to finality: ${data.timeToFinality}ms`);
  });

  validator.on('block-created', (data) => {
    console.log(`   [BLOCK] Created #${data.blockIndex}`);
    console.log(`           Hash: ${data.blockHash.substring(0, 32)}...`);
    console.log(`           Transactions: ${data.transactionCount}`);
    console.log(`           From batch: ${data.batchId.substring(0, 16)}...`);
  });

  validator.on('transaction-added', (data) => {
    console.log(`   [TX] Added to pool: ${data.transactionHash.substring(0, 16)}...`);
  });

  validator.on('batch-ack-received', (data) => {
    console.log(`   [ACK] Received for batch ${data.batchId.substring(0, 16)}...`);
    console.log(`         From: ${data.fromValidator}`);
  });

  console.log('   Event listeners registered');
  console.log();

  // 4. Initialize validator
  console.log('4. Initializing validator...');
  await validator.init();
  console.log('   Validator initialized');
  console.log('   Genesis block created');
  console.log();

  // 5. Check initial state
  console.log('5. Checking initial state...');
  const genesisBlock = await validator.getLatestBlock();
  const genesisBalance = await validator.getBalance('0x' + '0'.repeat(64));

  console.log(`   Genesis block index: ${genesisBlock.index}`);
  console.log(`   Genesis block hash: ${genesisBlock.hash.substring(0, 32)}...`);
  console.log(`   Genesis balance: ${genesisBalance} PRISM`);
  console.log();

  // 6. Create test accounts
  console.log('6. Creating test accounts...');
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();
  const charlie = await generateKeyPair();

  console.log(`   Alice: ${alice.publicKey.substring(0, 20)}...`);
  console.log(`   Bob: ${bob.publicKey.substring(0, 20)}...`);
  console.log(`   Charlie: ${charlie.publicKey.substring(0, 20)}...`);
  console.log();

  // 7. Start validator
  console.log('7. Starting validator...');
  validator.start();
  console.log();

  await new Promise(resolve => setTimeout(resolve, 150));

  // 8. Add transactions
  console.log('8. Adding transactions to pool...');

  // Create funding transaction from genesis
  const genesisAddr = '0x' + '0'.repeat(64);
  const fundingTx = new Transaction({
    from: genesisAddr,
    to: alice.publicKey,
    amount: BigInt(10000),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(0)
  });

  await validator.addTransaction(fundingTx);
  console.log('   Added funding transaction for Alice');

  // Wait for batch creation
  await new Promise(resolve => setTimeout(resolve, 150));

  // Create transactions between accounts
  for (let i = 0; i < 20; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: i % 2 === 0 ? bob.publicKey : charlie.publicKey,
      amount: BigInt(10 + i),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(5 + i)
    });
    await tx.sign(alice.privateKey);
    await validator.addTransaction(tx);
  }

  console.log('   Added 20 transactions');
  console.log();

  // 9. Simulate validator acknowledgments
  console.log('9. Simulating validator acknowledgments...');
  const pendingBatches = validator.getPendingBatches();

  for (const batch of pendingBatches) {
    console.log(`   Simulating ACKs for batch ${batch.id.substring(0, 16)}...`);

    // Simulate other validators ACKing
    // With 5 validators and 20% threshold, we need 1 ACK (already have our own)
    // Let's simulate 2 more validators ACKing
    setTimeout(() => {
      validator.acknowledgeBatch(batch.id, 'validator-2');
    }, 10);

    setTimeout(() => {
      validator.acknowledgeBatch(batch.id, 'validator-3');
    }, 20);
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  console.log();

  // 10. Check validator statistics
  console.log('10. Validator statistics...');
  const stats = await validator.getStats();
  console.log(`   Validator ID: ${stats.validatorId}`);
  console.log(`   Running: ${stats.isRunning}`);
  console.log(`   Block height: ${stats.blockHeight}`);
  console.log(`   Pending transactions: ${stats.pendingTransactions}`);
  console.log(`   Total batches: ${stats.totalBatches}`);
  console.log(`   Finalized batches: ${stats.finalizedBatches}`);
  console.log(`   Finality rate: ${stats.finalityRate.toFixed(2)}%`);
  console.log(`   Uptime: ${stats.uptime}ms`);
  console.log();

  // 11. Check account balances
  console.log('11. Checking account balances...');
  const aliceBalance = await validator.getBalance(alice.publicKey);
  const bobBalance = await validator.getBalance(bob.publicKey);
  const charlieBalance = await validator.getBalance(charlie.publicKey);

  console.log(`   Alice: ${aliceBalance} PRISM`);
  console.log(`   Bob: ${bobBalance} PRISM`);
  console.log(`   Charlie: ${charlieBalance} PRISM`);
  console.log();

  // 12. Check nonces
  console.log('12. Checking account nonces...');
  const aliceNonce = await validator.getNonce(alice.publicKey);
  const bobNonce = await validator.getNonce(bob.publicKey);

  console.log(`   Alice nonce: ${aliceNonce}`);
  console.log(`   Bob nonce: ${bobNonce}`);
  console.log();

  // 13. Query blockchain
  console.log('13. Querying blockchain...');
  const latestBlock = await validator.getLatestBlock();
  console.log(`   Latest block: #${latestBlock.index}`);
  console.log(`   Hash: ${latestBlock.hash.substring(0, 32)}...`);
  console.log(`   Transactions: ${latestBlock.transactions.length}`);
  console.log(`   Timestamp: ${new Date(latestBlock.timestamp).toISOString()}`);
  console.log();

  // 14. Query specific blocks
  console.log('14. Querying specific blocks...');
  for (let i = 0; i <= latestBlock.index && i < 5; i++) {
    const block = await validator.getBlock(i);
    if (block) {
      console.log(`   Block #${i}: ${block.transactions.length} txs, ${block.hash.substring(0, 16)}...`);
    }
  }
  console.log();

  // 15. Test batch queries
  console.log('15. Querying batches...');
  const finalizedBatches = validator.getFinalizedBatches();
  console.log(`   Finalized batches: ${finalizedBatches.length}`);

  finalizedBatches.slice(0, 3).forEach((batch, i) => {
    const acks = validator.getBatchAcks(batch.id);
    console.log(`   Batch ${i + 1}: ${batch.transactions.length} txs, ${acks.length} ACKs`);
  });
  console.log();

  // 16. Add more transactions while running
  console.log('16. Adding more transactions while running...');

  for (let i = 0; i < 10; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(5),
      nonce: 20 + i,
      timestamp: Date.now(),
      fee: BigInt(10)
    });
    await tx.sign(alice.privateKey);
    await validator.addTransaction(tx);
  }

  console.log('   Added 10 more transactions');

  // Simulate ACKs for new batches
  await new Promise(resolve => setTimeout(resolve, 150));

  const newPendingBatches = validator.getPendingBatches();
  for (const batch of newPendingBatches) {
    validator.acknowledgeBatch(batch.id, 'validator-2');
    validator.acknowledgeBatch(batch.id, 'validator-3');
  }

  await new Promise(resolve => setTimeout(resolve, 150));
  console.log();

  // 17. Test validator count update
  console.log('17. Testing validator count update...');
  const oldValidators = validator.getTotalValidators();
  validator.setTotalValidators(10);
  const newValidators = validator.getTotalValidators();

  console.log(`   Updated validators: ${oldValidators} -> ${newValidators}`);
  console.log(`   New threshold: ${Math.ceil(newValidators * 0.2)} validators (20%)`);
  console.log();

  // 18. Access internal components
  console.log('18. Accessing internal components...');
  const blockchain = validator.getBlockchain();
  const txPool = validator.getTransactionPool();
  const batchBuilder = validator.getBatchBuilder();
  const finalityTracker = validator.getFinalityTracker();

  console.log(`   Blockchain: ${await blockchain.getLatestBlock().then(b => b.index)} blocks`);
  console.log(`   Transaction pool: ${txPool.size()} pending`);
  console.log(`   Batch builder: ${batchBuilder.isRunning() ? 'Running' : 'Stopped'}`);
  console.log(`   Finality tracker: ${finalityTracker.getFinalizedCount()} finalized`);
  console.log();

  // 19. Stop validator
  console.log('19. Stopping validator...');
  validator.stop();

  await new Promise(resolve => setTimeout(resolve, 100));
  console.log();

  // 20. Final statistics
  console.log('20. Final statistics...');
  const finalStats = await validator.getStats();
  console.log(`   Final block height: ${finalStats.blockHeight}`);
  console.log(`   Total batches created: ${finalStats.totalBatches}`);
  console.log(`   Finalized batches: ${finalStats.finalizedBatches}`);
  console.log(`   Finality rate: ${finalStats.finalityRate.toFixed(2)}%`);
  console.log(`   Total uptime: ${finalStats.uptime}ms`);
  console.log();

  // 21. Shutdown
  console.log('21. Shutting down validator...');
  await validator.shutdown();
  console.log('   Validator shutdown complete');
  console.log();

  // Cleanup
  cleanupTestData();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
  console.log();
  console.log('Summary:');
  console.log(`- Created and ran a complete validator node`);
  console.log(`- Processed ${finalStats.totalBatches} batches`);
  console.log(`- Achieved instant finality for ${finalStats.finalizedBatches} batches`);
  console.log(`- Created ${finalStats.blockHeight} blocks`);
  console.log(`- ${finalStats.finalityRate.toFixed(2)}% finality rate`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
