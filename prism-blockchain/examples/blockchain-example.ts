/**
 * Blockchain Usage Example
 *
 * This file demonstrates how to use the Blockchain class
 * Run with: npx ts-node examples/blockchain-example.ts
 */

import { Blockchain } from '../src/core/blockchain/Blockchain';
import { Block } from '../src/core/blockchain/Block';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';
import * as fs from 'fs';
import * as path from 'path';

// Clean up test data
function cleanupTestData() {
  const dataDir = path.join(process.cwd(), 'data', 'blockchain-test');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Blockchain Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // Clean up before starting
  cleanupTestData();

  // 1. Create and initialize blockchain
  console.log('1. Creating and initializing blockchain...');
  const blockchain = new Blockchain({
    nodeId: 'test',
    dbPath: './data/blockchain-test'
  });

  await blockchain.init();
  console.log(`   Blockchain initialized`);
  console.log(`   Genesis block created: ${blockchain.getLatestBlock().hash.substring(0, 16)}...`);
  console.log();

  // 2. Check genesis account
  console.log('2. Checking genesis account...');
  const GENESIS_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const genesisAccount = blockchain.getAccount(GENESIS_ADDRESS);
  console.log(`   Genesis balance: ${genesisAccount.balance} PRISM`);
  console.log(`   Genesis nonce: ${genesisAccount.nonce}`);
  console.log();

  // 3. Generate user accounts
  console.log('3. Generating user accounts...');
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();
  const charlie = await generateKeyPair();
  console.log(`   Alice: ${alice.publicKey.substring(0, 20)}...`);
  console.log(`   Bob: ${bob.publicKey.substring(0, 20)}...`);
  console.log(`   Charlie: ${charlie.publicKey.substring(0, 20)}...`);
  console.log();

  // 4. Create and add transaction to mempool
  console.log('4. Creating transaction from genesis to Alice...');
  const tx1 = new Transaction({
    from: GENESIS_ADDRESS,
    to: alice.publicKey,
    amount: BigInt(10000),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10)
  });

  // Note: In real scenario, genesis account would need a private key
  // For demo, we'll manually execute this transaction by adding it to a block
  console.log(`   Transaction hash: ${tx1.hash.substring(0, 16)}...`);
  console.log(`   Amount: ${tx1.amount} PRISM`);
  console.log(`   Fee: ${tx1.fee} PRISM`);
  console.log();

  // 5. Create transactions between users
  console.log('5. Creating transactions from Alice...');

  const tx2 = new Transaction({
    from: alice.publicKey,
    to: bob.publicKey,
    amount: BigInt(1000),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10)
  });
  await tx2.sign(alice.privateKey);

  const tx3 = new Transaction({
    from: alice.publicKey,
    to: charlie.publicKey,
    amount: BigInt(500),
    nonce: 1,
    timestamp: Date.now(),
    fee: BigInt(10)
  });
  await tx3.sign(alice.privateKey);

  console.log(`   Transaction 2: Alice -> Bob (${tx2.amount} PRISM)`);
  console.log(`   Transaction 3: Alice -> Charlie (${tx3.amount} PRISM)`);
  console.log();

  // 6. Create block with transactions
  console.log('6. Creating block with transactions...');

  // First, execute genesis transaction to give Alice funds
  const genesisBlock = blockchain.getLatestBlock();
  const block1 = new Block({
    number: 1,
    timestamp: Date.now(),
    transactions: [tx1],
    previousHash: genesisBlock.hash,
    validator: 'test'
  });

  const added1 = await blockchain.addBlock(block1);
  console.log(`   Block 1 added: ${added1}`);
  console.log(`   Alice balance: ${blockchain.getAccount(alice.publicKey).balance}`);
  console.log();

  // 7. Add transactions to mempool
  console.log('7. Adding transactions to mempool...');
  const addedTx2 = await blockchain.addTransaction(tx2);
  const addedTx3 = await blockchain.addTransaction(tx3);
  console.log(`   Transaction 2 added to mempool: ${addedTx2}`);
  console.log(`   Transaction 3 added to mempool: ${addedTx3}`);
  console.log(`   Pending transactions: ${blockchain.getPendingTransactionCount()}`);
  console.log();

  // 8. Get pending transactions and create block
  console.log('8. Creating block from pending transactions...');
  const pendingTxs = blockchain.getPendingTransactions(100);
  console.log(`   Retrieved ${pendingTxs.length} pending transactions`);

  const block2 = new Block({
    number: 2,
    timestamp: Date.now(),
    transactions: pendingTxs,
    previousHash: block1.hash,
    validator: 'test'
  });

  const added2 = await blockchain.addBlock(block2);
  console.log(`   Block 2 added: ${added2}`);
  console.log(`   Pending transactions after block: ${blockchain.getPendingTransactionCount()}`);
  console.log();

  // 9. Check account balances
  console.log('9. Checking account balances...');
  const aliceAccount = blockchain.getAccount(alice.publicKey);
  const bobAccount = blockchain.getAccount(bob.publicKey);
  const charlieAccount = blockchain.getAccount(charlie.publicKey);
  const genesisAcct = blockchain.getAccount(GENESIS_ADDRESS);

  console.log(`   Genesis: ${genesisAcct.balance} PRISM (nonce: ${genesisAcct.nonce})`);
  console.log(`   Alice: ${aliceAccount.balance} PRISM (nonce: ${aliceAccount.nonce})`);
  console.log(`   Bob: ${bobAccount.balance} PRISM (nonce: ${bobAccount.nonce})`);
  console.log(`   Charlie: ${charlieAccount.balance} PRISM (nonce: ${charlieAccount.nonce})`);
  console.log();

  // 10. Get blockchain statistics
  console.log('10. Blockchain statistics...');
  const stats = blockchain.getStats();
  console.log(`   Total blocks: ${stats.blocks}`);
  console.log(`   Total accounts: ${stats.accounts}`);
  console.log(`   Pending transactions: ${stats.pendingTransactions}`);
  console.log(`   Total supply: ${stats.totalSupply} PRISM`);
  console.log();

  // 11. Validate the entire chain
  console.log('11. Validating blockchain...');
  const chainValid = await blockchain.isChainValid();
  console.log(`   Chain valid: ${chainValid}`);
  console.log();

  // 12. Get blocks
  console.log('12. Retrieving blocks...');
  console.log(`   Genesis block: #${genesisBlock.number}`);
  console.log(`   Block 1: #${block1.number}, ${block1.transactions.length} txs`);
  console.log(`   Block 2: #${block2.number}, ${block2.transactions.length} txs`);
  console.log(`   Latest block: #${blockchain.getLatestBlock().number}`);
  console.log(`   Chain length: ${blockchain.getChainLength()}`);
  console.log();

  // 13. Test nonce validation
  console.log('13. Testing nonce validation...');
  const invalidNonceTx = new Transaction({
    from: alice.publicKey,
    to: bob.publicKey,
    amount: BigInt(100),
    nonce: 0, // Invalid: should be 2
    timestamp: Date.now(),
    fee: BigInt(10)
  });
  await invalidNonceTx.sign(alice.privateKey);

  const addedInvalid = await blockchain.addTransaction(invalidNonceTx);
  console.log(`   Transaction with invalid nonce rejected: ${!addedInvalid}`);
  console.log();

  // 14. Test insufficient balance
  console.log('14. Testing insufficient balance...');
  const insufficientTx = new Transaction({
    from: bob.publicKey,
    to: alice.publicKey,
    amount: BigInt(999999999), // More than Bob has
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10)
  });
  await insufficientTx.sign(bob.privateKey);

  const addedInsufficient = await blockchain.addTransaction(insufficientTx);
  console.log(`   Transaction with insufficient balance rejected: ${!addedInsufficient}`);
  console.log();

  // 15. Create a chain of blocks
  console.log('15. Creating a chain of blocks...');

  for (let i = 0; i < 3; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(100),
      nonce: aliceAccount.nonce,
      timestamp: Date.now(),
      fee: BigInt(10)
    });
    await tx.sign(alice.privateKey);

    const latestBlock = blockchain.getLatestBlock();
    const block = new Block({
      number: latestBlock.number + 1,
      timestamp: Date.now() + i * 1000,
      transactions: [tx],
      previousHash: latestBlock.hash,
      validator: 'test'
    });

    await blockchain.addBlock(block);
    console.log(`   Block ${block.number} added`);
  }
  console.log();

  // 16. Display final chain
  console.log('16. Final blockchain state...');
  const chain = blockchain.getChain();
  console.log('   Chain:');
  for (const block of chain) {
    console.log(`     Block #${block.number}: ${block.transactions.length} txs, ${block.hash.substring(0, 16)}...`);
  }
  console.log();

  // 17. Display final balances
  console.log('17. Final account balances...');
  const finalStats = blockchain.getStats();
  console.log(`   Genesis: ${blockchain.getAccount(GENESIS_ADDRESS).balance}`);
  console.log(`   Alice: ${blockchain.getAccount(alice.publicKey).balance}`);
  console.log(`   Bob: ${blockchain.getAccount(bob.publicKey).balance}`);
  console.log(`   Charlie: ${blockchain.getAccount(charlie.publicKey).balance}`);
  console.log(`   Total supply: ${finalStats.totalSupply}`);
  console.log();

  // 18. Close database
  console.log('18. Closing database...');
  await blockchain.close();
  console.log('   Database closed');
  console.log();

  // 19. Reopen blockchain to test persistence
  console.log('19. Testing persistence - reopening blockchain...');
  const blockchain2 = new Blockchain({
    nodeId: 'test',
    dbPath: './data/blockchain-test'
  });
  await blockchain2.init();

  console.log(`   Loaded blockchain with ${blockchain2.getChainLength()} blocks`);
  console.log(`   Alice balance after reload: ${blockchain2.getAccount(alice.publicKey).balance}`);
  console.log(`   Bob balance after reload: ${blockchain2.getAccount(bob.publicKey).balance}`);

  await blockchain2.close();
  console.log();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));

  // Cleanup
  cleanupTestData();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
