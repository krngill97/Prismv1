/**
 * RPC Server Example
 *
 * This file demonstrates how to run a validator with an RPC server
 * Run with: npx ts-node examples/rpc-server-example.ts
 *
 * Then test with:
 * curl http://localhost:3000/health
 * curl http://localhost:3000/api/block/latest
 * curl -X POST http://localhost:3000/rpc -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"getBlockHeight","id":1}'
 */

import { Validator } from '../src/validator/Validator';
import { RPCServer } from '../src/rpc/RPCServer';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';
import * as fs from 'fs';
import * as path from 'path';

// Clean up test data
function cleanupTestData() {
  const dataDir = path.join(process.cwd(), 'data', 'rpc-test');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('RPC Server Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // Clean up before starting
  cleanupTestData();

  // 1. Create validator
  console.log('1. Creating validator...');
  const validatorKeys = await generateKeyPair();

  const validator = new Validator({
    validatorId: 'rpc-validator',
    validatorKeys: validatorKeys,
    dbPath: './data/rpc-test',
    totalValidators: 3,
    batchInterval: 1000, // 1 second for demo
    maxBatchSize: 100
  });

  await validator.init();
  console.log('   Validator initialized');
  console.log();

  // 2. Create RPC server
  console.log('2. Creating RPC server...');
  const rpcServer = new RPCServer(validator, {
    port: 3000,
    host: 'localhost',
    corsOrigin: '*'
  });

  console.log('   RPC server created');
  console.log();

  // 3. Setup validator event listeners
  console.log('3. Setting up event listeners...');

  validator.on('started', () => {
    console.log('   [VALIDATOR] Started');
  });

  validator.on('batch-created', (data) => {
    console.log(`   [BATCH] #${data.batchNumber} created with ${data.transactionCount} txs`);
  });

  validator.on('instant-finality', (data) => {
    console.log(`   [FINALITY] Batch #${data.batchNumber} finalized (${data.confidence.toFixed(2)}%)`);
  });

  validator.on('block-created', (data) => {
    console.log(`   [BLOCK] #${data.blockIndex} created with ${data.transactionCount} txs`);
  });

  console.log('   Event listeners registered');
  console.log();

  // 4. Start RPC server
  console.log('4. Starting RPC server...');
  await rpcServer.start();
  console.log();

  // 5. Start validator
  console.log('5. Starting validator...');
  validator.start();
  console.log();

  // 6. Add some test transactions
  console.log('6. Adding test transactions...');
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();

  // Funding transaction
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
  console.log('   Added funding transaction');

  // Regular transactions
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
    await validator.addTransaction(tx);
  }

  console.log('   Added 5 transactions');
  console.log();

  // 7. Simulate validator acknowledgments
  console.log('7. Simulating validator acknowledgments...');
  validator.on('batch-created', (data) => {
    validator.acknowledgeBatch(data.batchId, 'validator-1');
    validator.acknowledgeBatch(data.batchId, 'validator-2');
  });
  console.log('   Auto-ACK enabled');
  console.log();

  // 8. Show available endpoints
  console.log('8. Available RPC endpoints:');
  console.log();
  console.log('   Health Check:');
  console.log('   GET http://localhost:3000/health');
  console.log();
  console.log('   REST API:');
  console.log('   GET  http://localhost:3000/api/block/latest');
  console.log('   GET  http://localhost:3000/api/block/:index');
  console.log('   GET  http://localhost:3000/api/account/:address/balance');
  console.log('   GET  http://localhost:3000/api/account/:address/nonce');
  console.log('   POST http://localhost:3000/api/transaction');
  console.log('   GET  http://localhost:3000/api/stats');
  console.log();
  console.log('   JSON-RPC:');
  console.log('   POST http://localhost:3000/rpc');
  console.log();

  // 9. Show example curl commands
  console.log('9. Example curl commands:');
  console.log();
  console.log('   # Health check');
  console.log('   curl http://localhost:3000/health');
  console.log();
  console.log('   # Get latest block');
  console.log('   curl http://localhost:3000/api/block/latest');
  console.log();
  console.log('   # Get validator stats');
  console.log('   curl http://localhost:3000/api/stats');
  console.log();
  console.log('   # Get Alice\'s balance');
  console.log(`   curl http://localhost:3000/api/account/${alice.publicKey}/balance`);
  console.log();
  console.log('   # JSON-RPC: Get block height');
  console.log('   curl -X POST http://localhost:3000/rpc \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"jsonrpc":"2.0","method":"getBlockHeight","id":1}\'');
  console.log();
  console.log('   # JSON-RPC: Get balance');
  console.log('   curl -X POST http://localhost:3000/rpc \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log(`     -d '{"jsonrpc":"2.0","method":"getBalance","params":{"address":"${alice.publicKey}"},"id":2}'`);
  console.log();

  // 10. Show JSON-RPC methods
  console.log('10. Available JSON-RPC methods:');
  console.log('    - getBlockHeight');
  console.log('    - getBlock (params: {index: number})');
  console.log('    - getLatestBlock');
  console.log('    - getBalance (params: {address: string})');
  console.log('    - getNonce (params: {address: string})');
  console.log('    - getTransactionPoolSize');
  console.log('    - sendTransaction (params: transaction JSON)');
  console.log('    - getValidatorStats');
  console.log('    - getBatch (params: {batchId: string})');
  console.log('    - getFinalizedBatches');
  console.log('    - getPendingBatches');
  console.log();

  // 11. Wait and show periodic stats
  console.log('11. Server running... (showing stats every 5 seconds)');
  console.log('    Press Ctrl+C to stop');
  console.log();

  let statsInterval: NodeJS.Timeout;

  const showStats = async () => {
    const stats = await validator.getStats();
    console.log(`   [STATS] Height: ${stats.blockHeight}, Batches: ${stats.totalBatches}, Finalized: ${stats.finalizedBatches}, Pool: ${stats.pendingTransactions}`);
  };

  statsInterval = setInterval(showStats, 5000);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log();
    console.log('Shutting down...');

    clearInterval(statsInterval);

    await rpcServer.stop();
    console.log('RPC server stopped');

    await validator.shutdown();
    console.log('Validator stopped');

    cleanupTestData();

    console.log('='.repeat(60));
    console.log('Example completed!');
    console.log('='.repeat(60));

    process.exit(0);
  });

  // Show initial stats
  await showStats();

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
