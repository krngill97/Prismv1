/**
 * Prism CLI Interactive Example
 *
 * This file demonstrates the CLI functionality
 * Run with: npx ts-node examples/cli-example.ts
 *
 * Make sure you have an RPC server running first:
 * npx ts-node examples/rpc-server-example.ts
 */

import { PrismCLI } from '../src/cli/PrismCLI';

async function main() {
  console.log('='.repeat(60));
  console.log('Prism CLI Example - Interactive Demonstration');
  console.log('='.repeat(60));
  console.log();

  // Create CLI instance
  const cli = new PrismCLI({
    rpcUrl: 'http://localhost:3000',
    keystorePath: './.prism-cli-example'
  });

  console.log(`CLI initialized`);
  console.log(`RPC URL: ${cli.getRpcUrl()}`);
  console.log(`Keystore: ${cli.getKeystorePath()}`);
  console.log();

  // 1. Generate accounts
  console.log('1. Generating accounts...');
  console.log();

  const alice = await cli.generateAccount('alice');
  console.log();

  const bob = await cli.generateAccount('bob');
  console.log();

  const charlie = await cli.generateAccount('charlie');
  console.log();

  // 2. List accounts
  console.log('2. Listing all accounts...');
  const accounts = cli.listAccounts();
  console.log(`Total accounts: ${accounts.length}`);
  console.log();

  for (const account of accounts) {
    console.log(`  ${account.name}:`);
    console.log(`    Address: ${account.address}`);
    console.log(`    Public Key: ${account.publicKey.substring(0, 32)}...`);
    console.log();
  }

  // 3. Check RPC server availability
  console.log('3. Checking RPC server...');
  const stats = await cli.getStats();

  if (!stats) {
    console.log('   ERROR: RPC server not available');
    console.log('   Please start the RPC server first:');
    console.log('   npx ts-node examples/rpc-server-example.ts');
    console.log();
    return;
  }

  console.log('   RPC server is running');
  console.log(`   Validator: ${stats.validatorId}`);
  console.log(`   Block height: ${stats.blockHeight}`);
  console.log(`   Running: ${stats.isRunning}`);
  console.log();

  // 4. Check balances
  console.log('4. Checking account balances...');
  console.log();

  for (const account of accounts) {
    const balance = await cli.getBalance(account.publicKey);
    console.log(`  ${account.name}: ${balance} PRISM`);
  }
  console.log();

  // 5. Fund Alice from genesis
  console.log('5. Funding Alice from genesis account...');
  const genesisAddr = '0x' + '0'.repeat(64);

  try {
    // Note: In a real scenario, you'd need the genesis private key
    // For demo purposes, we'll show the transaction structure
    console.log('   Creating funding transaction...');
    console.log(`   From: ${genesisAddr}`);
    console.log(`   To: Alice (${alice.publicKey.substring(0, 32)}...)`);
    console.log(`   Amount: 10000 PRISM`);
    console.log('   Note: This requires genesis account access');
    console.log();
  } catch (error) {
    console.log(`   Error: ${error}`);
    console.log();
  }

  // 6. Get Alice's nonce
  console.log('6. Getting Alice\'s nonce...');
  const aliceNonce = await cli.getNonce(alice.publicKey);
  console.log(`   Alice's nonce: ${aliceNonce}`);
  console.log();

  // 7. Create transaction from Alice to Bob
  console.log('7. Creating transaction from Alice to Bob...');
  console.log('   Amount: 100 PRISM');
  console.log('   Fee: 10 PRISM');
  console.log();

  try {
    const tx = await cli.createTransaction(
      'alice',
      bob.publicKey,
      BigInt(100),
      BigInt(10),
      aliceNonce || 0
    );

    console.log('   Transaction created:');
    console.log(`     Hash: ${tx.hash.substring(0, 32)}...`);
    console.log(`     From: ${tx.from.substring(0, 32)}...`);
    console.log(`     To: ${tx.to.substring(0, 32)}...`);
    console.log(`     Amount: ${tx.amount} PRISM`);
    console.log(`     Fee: ${tx.fee} PRISM`);
    console.log(`     Nonce: ${tx.nonce}`);
    console.log();

    // Send transaction
    console.log('   Sending transaction to network...');
    const txHash = await cli.sendTransaction(tx);

    if (txHash) {
      console.log(`   Transaction sent successfully!`);
      console.log(`   Hash: ${txHash.substring(0, 32)}...`);
    } else {
      console.log('   Transaction failed');
    }
    console.log();
  } catch (error) {
    console.log(`   Error: ${error}`);
    console.log();
  }

  // 8. Query blockchain
  console.log('8. Querying blockchain...');
  console.log();

  const latestBlock = await cli.getLatestBlock();
  if (latestBlock) {
    console.log('   Latest block:');
    console.log(`     Index: ${latestBlock.index}`);
    console.log(`     Hash: ${latestBlock.hash.substring(0, 32)}...`);
    console.log(`     Transactions: ${latestBlock.transactions.length}`);
    console.log(`     Timestamp: ${new Date(latestBlock.timestamp).toISOString()}`);
    console.log();
  }

  // 9. Query specific block
  console.log('9. Querying genesis block...');
  const genesisBlock = await cli.getBlock(0);
  if (genesisBlock) {
    console.log('   Genesis block:');
    console.log(`     Index: ${genesisBlock.index}`);
    console.log(`     Hash: ${genesisBlock.hash.substring(0, 32)}...`);
    console.log(`     Timestamp: ${new Date(genesisBlock.timestamp).toISOString()}`);
    console.log();
  }

  // 10. RPC call examples
  console.log('10. Testing RPC calls...');
  console.log();

  const blockHeight = await cli.rpcCall('getBlockHeight');
  console.log(`   Block height (RPC): ${blockHeight}`);

  const poolSize = await cli.rpcCall('getTransactionPoolSize');
  console.log(`   Transaction pool size: ${poolSize}`);

  const finalizedBatches = await cli.rpcCall('getFinalizedBatches');
  console.log(`   Finalized batches: ${finalizedBatches ? finalizedBatches.length : 0}`);
  console.log();

  // 11. Export account
  console.log('11. Exporting account...');
  const aliceData = cli.exportAccount('alice');
  if (aliceData) {
    console.log('   Alice account exported:');
    console.log(`     Name: ${aliceData.name}`);
    console.log(`     Address: ${aliceData.address}`);
    console.log(`     Created: ${new Date(aliceData.createdAt).toISOString()}`);
    console.log();
  }

  // 12. Account management operations
  console.log('12. Account management...');
  console.log();

  // Load account
  const loadedBob = cli.loadAccount('bob');
  if (loadedBob) {
    console.log('   ✓ Bob account loaded from keystore');
  }

  // List accounts again
  const accountList = cli.listAccounts();
  console.log(`   ✓ Total accounts in keystore: ${accountList.length}`);
  console.log();

  // 13. Advanced RPC queries
  console.log('13. Advanced queries...');
  console.log();

  const validatorStats = await cli.getStats();
  if (validatorStats) {
    console.log('   Validator Statistics:');
    console.log(`     ID: ${validatorStats.validatorId}`);
    console.log(`     Block height: ${validatorStats.blockHeight}`);
    console.log(`     Pending transactions: ${validatorStats.pendingTransactions}`);
    console.log(`     Total batches: ${validatorStats.totalBatches}`);
    console.log(`     Finalized batches: ${validatorStats.finalizedBatches}`);
    console.log(`     Finality rate: ${validatorStats.finalityRate.toFixed(2)}%`);
    console.log(`     Running: ${validatorStats.isRunning}`);
    console.log();
  }

  // 14. Demonstration complete
  console.log('='.repeat(60));
  console.log('CLI Demonstration Complete!');
  console.log('='.repeat(60));
  console.log();
  console.log('Summary of CLI capabilities:');
  console.log('  ✓ Account generation and management');
  console.log('  ✓ Keystore import/export');
  console.log('  ✓ Transaction creation and signing');
  console.log('  ✓ Transaction submission to network');
  console.log('  ✓ Balance and nonce queries');
  console.log('  ✓ Block queries');
  console.log('  ✓ Validator statistics');
  console.log('  ✓ JSON-RPC calls');
  console.log();
  console.log('Available Commands:');
  console.log('  - cli.generateAccount(name)');
  console.log('  - cli.loadAccount(name)');
  console.log('  - cli.listAccounts()');
  console.log('  - cli.createTransaction(from, to, amount, fee, nonce)');
  console.log('  - cli.sendTransaction(transaction)');
  console.log('  - cli.getBalance(address)');
  console.log('  - cli.getNonce(address)');
  console.log('  - cli.getLatestBlock()');
  console.log('  - cli.getBlock(index)');
  console.log('  - cli.getStats()');
  console.log('  - cli.rpcCall(method, params)');
  console.log('  - cli.exportAccount(name)');
  console.log('  - cli.importAccount(data)');
  console.log('  - cli.deleteAccount(name)');
  console.log();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
