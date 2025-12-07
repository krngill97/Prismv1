/**
 * Block Usage Example
 *
 * This file demonstrates how to use the Block class with Merkle trees
 * Run with: npx ts-node examples/block-example.ts
 */

import { Block } from '../src/core/blockchain/Block';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';

async function main() {
  console.log('='.repeat(60));
  console.log('Block Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // 1. Generate keys for transactions
  console.log('1. Generating keys...');
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();
  const charlie = await generateKeyPair();
  console.log('   Keys generated for Alice, Bob, and Charlie');
  console.log();

  // 2. Create some transactions
  console.log('2. Creating transactions...');
  const tx1 = new Transaction({
    from: alice.publicKey,
    to: bob.publicKey,
    amount: BigInt(100),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10)
  });
  await tx1.sign(alice.privateKey);

  const tx2 = new Transaction({
    from: bob.publicKey,
    to: charlie.publicKey,
    amount: BigInt(50),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10)
  });
  await tx2.sign(bob.privateKey);

  const tx3 = new Transaction({
    from: charlie.publicKey,
    to: alice.publicKey,
    amount: BigInt(25),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10)
  });
  await tx3.sign(charlie.privateKey);

  console.log(`   Created ${3} transactions`);
  console.log();

  // 3. Create a genesis block
  console.log('3. Creating genesis block...');
  const genesisBlock = Block.createGenesis('validator1');
  console.log(genesisBlock.toString());
  console.log();

  // 4. Create a block with transactions
  console.log('4. Creating block with transactions...');
  const block = new Block({
    number: 1,
    timestamp: Date.now(),
    transactions: [tx1, tx2, tx3],
    previousHash: genesisBlock.hash,
    validator: 'validator1'
  });

  console.log(block.toString());
  console.log();

  // 5. Verify Merkle root
  console.log('5. Verifying Merkle root...');
  const merkleRootValid = block.verifyMerkleRoot();
  console.log(`   Merkle root valid: ${merkleRootValid}`);
  console.log(`   Merkle root: ${block.merkleRoot}`);
  console.log();

  // 6. Verify block hash
  console.log('6. Verifying block hash...');
  const hashValid = block.verifyHash();
  console.log(`   Hash valid: ${hashValid}`);
  console.log(`   Block hash: ${block.hash}`);
  console.log();

  // 7. Verify all transactions
  console.log('7. Verifying all transactions...');
  const transactionsValid = await block.verifyTransactions();
  console.log(`   All transactions valid: ${transactionsValid}`);
  console.log();

  // 8. Basic block validation
  console.log('8. Performing basic validation...');
  const blockValid = block.isValid(genesisBlock);
  console.log(`   Block valid: ${blockValid}`);
  console.log();

  // 9. Get block statistics
  console.log('9. Block statistics...');
  console.log(`   Transaction count: ${block.getTransactionCount()}`);
  console.log(`   Total fees: ${block.getTotalFees()}`);
  console.log(`   Total volume: ${block.getTotalVolume()}`);
  console.log(`   Block size: ${block.getSize()} bytes`);
  console.log();

  // 10. Find a transaction
  console.log('10. Finding transaction...');
  const foundTx = block.getTransaction(tx2.hash);
  console.log(`   Transaction found: ${foundTx !== undefined}`);
  console.log(`   Amount: ${foundTx?.amount}`);
  console.log(`   From: ${foundTx?.from.substring(0, 20)}...`);
  console.log();

  // 11. Generate Merkle proof
  console.log('11. Generating Merkle proof for transaction...');
  const merkleProof = block.getMerkleProof(tx2.hash);
  if (merkleProof) {
    console.log(`   Proof length: ${merkleProof.length} hashes`);
    console.log('   Proof hashes:');
    merkleProof.forEach((hash, i) => {
      console.log(`     [${i}] ${hash.substring(0, 32)}...`);
    });
  }
  console.log();

  // 12. Verify Merkle proof
  console.log('12. Verifying Merkle proof...');
  if (merkleProof) {
    const proofValid = Block.verifyMerkleProof(tx2.hash, merkleProof, block.merkleRoot);
    console.log(`   Proof valid: ${proofValid}`);
  }
  console.log();

  // 13. Serialize and deserialize
  console.log('13. Serializing and deserializing block...');
  const json = block.toJSON();
  console.log(`   JSON size: ${JSON.stringify(json).length} bytes`);

  const restoredBlock = Block.fromJSON(json);
  console.log(`   Block number matches: ${restoredBlock.number === block.number}`);
  console.log(`   Hash matches: ${restoredBlock.hash === block.hash}`);
  console.log(`   Merkle root matches: ${restoredBlock.merkleRoot === block.merkleRoot}`);
  console.log(`   Transactions match: ${restoredBlock.getTransactionCount() === block.getTransactionCount()}`);
  console.log();

  // 14. Clone block
  console.log('14. Cloning block...');
  const clonedBlock = block.clone();
  console.log(`   Clone hash matches: ${clonedBlock.hash === block.hash}`);
  console.log(`   Clone is different object: ${clonedBlock !== block}`);
  console.log();

  // 15. Demonstrate invalid block detection
  console.log('15. Testing invalid block detection...');

  // Create block with tampered transaction
  const tamperedTx = new Transaction({
    from: alice.publicKey,
    to: bob.publicKey,
    amount: BigInt(999999), // Different amount
    nonce: 0,
    timestamp: tx1.timestamp,
    fee: BigInt(10),
    signature: tx1.signature, // Using signature from different transaction
    hash: tx1.hash
  });

  const invalidBlock = new Block({
    number: 2,
    timestamp: Date.now(),
    transactions: [tamperedTx],
    previousHash: block.hash,
    validator: 'validator1'
  });

  const invalidTransactionsValid = await invalidBlock.verifyTransactions();
  console.log(`   Invalid block detected: ${!invalidTransactionsValid}`);
  console.log();

  // 16. Create a chain of blocks
  console.log('16. Creating a chain of blocks...');
  const chain: Block[] = [genesisBlock, block];

  const block2 = new Block({
    number: 2,
    timestamp: Date.now() + 1000,
    transactions: [tx1],
    previousHash: block.hash,
    validator: 'validator2'
  });

  const block3 = new Block({
    number: 3,
    timestamp: Date.now() + 2000,
    transactions: [tx2, tx3],
    previousHash: block2.hash,
    validator: 'validator3'
  });

  chain.push(block2, block3);

  console.log('   Chain created:');
  for (let i = 0; i < chain.length; i++) {
    const b = chain[i];
    const prevBlock = i > 0 ? chain[i - 1] : undefined;
    const isValid = b.isValid(prevBlock);
    console.log(`     Block #${b.number}: ${isValid ? '✓' : '✗'} ${b.hash.substring(0, 16)}...`);
  }
  console.log();

  // 17. Test Merkle tree with different transaction counts
  console.log('17. Testing Merkle tree with different transaction counts...');

  const testCounts = [0, 1, 2, 3, 4, 5, 7, 8, 15, 16];
  for (const count of testCounts) {
    const txs: Transaction[] = [];
    for (let i = 0; i < count; i++) {
      const tx = new Transaction({
        from: alice.publicKey,
        to: bob.publicKey,
        amount: BigInt(i + 1),
        nonce: i,
        timestamp: Date.now(),
        fee: BigInt(1)
      });
      await tx.sign(alice.privateKey);
      txs.push(tx);
    }

    const testBlock = new Block({
      number: 1,
      transactions: txs,
      previousHash: '0'.repeat(64),
      validator: 'test'
    });

    const merkleValid = testBlock.verifyMerkleRoot();
    console.log(`     ${count} transactions: ${merkleValid ? '✓' : '✗'} merkle root valid`);
  }
  console.log();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
