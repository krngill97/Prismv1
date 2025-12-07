/**
 * Transaction Pool Usage Example
 *
 * This file demonstrates how to use the TransactionPool class
 * Run with: npx ts-node examples/transaction-pool-example.ts
 */

import { TransactionPool } from '../src/core/pool/TransactionPool';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';

async function main() {
  console.log('='.repeat(60));
  console.log('Transaction Pool Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // 1. Create transaction pool
  console.log('1. Creating transaction pool...');
  const pool = new TransactionPool({
    maxSize: 1000,
    expirationTime: 10000 // 10 seconds for demo
  });
  console.log(`   Pool created (max size: ${pool['maxSize']})`);
  console.log();

  // 2. Generate accounts
  console.log('2. Generating accounts...');
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();
  const charlie = await generateKeyPair();
  console.log('   Generated Alice, Bob, and Charlie');
  console.log();

  // 3. Create and add transactions
  console.log('3. Creating transactions with different fees...');

  const transactions: Transaction[] = [];

  // High fee transaction
  const tx1 = new Transaction({
    from: alice.publicKey,
    to: bob.publicKey,
    amount: BigInt(100),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(100) // High fee
  });
  await tx1.sign(alice.privateKey);
  transactions.push(tx1);

  // Medium fee transaction
  const tx2 = new Transaction({
    from: alice.publicKey,
    to: charlie.publicKey,
    amount: BigInt(50),
    nonce: 1,
    timestamp: Date.now(),
    fee: BigInt(50) // Medium fee
  });
  await tx2.sign(alice.privateKey);
  transactions.push(tx2);

  // Low fee transaction
  const tx3 = new Transaction({
    from: bob.publicKey,
    to: charlie.publicKey,
    amount: BigInt(25),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(10) // Low fee
  });
  await tx3.sign(bob.privateKey);
  transactions.push(tx3);

  // Add all transactions
  for (const tx of transactions) {
    const added = pool.add(tx);
    console.log(`   Transaction added: ${added} (fee: ${tx.fee})`);
  }
  console.log();

  // 4. Get pool statistics
  console.log('4. Pool statistics...');
  const stats = pool.getStats();
  console.log(`   Size: ${stats.size}/${stats.maxSize}`);
  console.log(`   Unique accounts: ${stats.byAccount}`);
  console.log(`   Average fee: ${stats.averageFee}`);
  console.log(`   Fill percentage: ${pool.getFillPercentage().toFixed(2)}%`);
  console.log();

  // 5. Get transactions by priority
  console.log('5. Getting transactions by priority (highest fee first)...');
  const byPriority = pool.getPendingByPriority(10);
  console.log('   Priority order:');
  for (const tx of byPriority) {
    console.log(`     Fee: ${tx.fee}, From: ${tx.from.substring(0, 10)}..., Nonce: ${tx.nonce}`);
  }
  console.log();

  // 6. Get transactions by account
  console.log('6. Getting transactions from Alice...');
  const aliceTxs = pool.getByAccount(alice.publicKey);
  console.log(`   Alice has ${aliceTxs.length} transactions in pool:`);
  for (const tx of aliceTxs) {
    console.log(`     Nonce: ${tx.nonce}, Amount: ${tx.amount}, Fee: ${tx.fee}`);
  }
  console.log();

  // 7. Add more transactions for different accounts
  console.log('7. Adding more transactions...');

  for (let i = 0; i < 5; i++) {
    const tx = new Transaction({
      from: charlie.publicKey,
      to: alice.publicKey,
      amount: BigInt(10 + i),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(20 + i * 5)
    });
    await tx.sign(charlie.privateKey);
    pool.add(tx);
  }

  console.log(`   Pool size now: ${pool.size()}`);
  console.log(`   Accounts in pool: ${pool.getAccountCount()}`);
  console.log();

  // 8. Get transactions for block creation
  console.log('8. Getting transactions for block (priority + nonce ordering)...');
  const forBlock = pool.getForBlock(5);
  console.log(`   Selected ${forBlock.length} transactions:`);
  for (const tx of forBlock) {
    console.log(`     From: ${tx.from.substring(0, 10)}..., Nonce: ${tx.nonce}, Fee: ${tx.fee}`);
  }
  console.log();

  // 9. Get fee statistics
  console.log('9. Fee statistics...');
  console.log(`   Highest fee: ${pool.getHighestFee()}`);
  console.log(`   Lowest fee: ${pool.getLowestFee()}`);
  console.log();

  // 10. Get transactions by fee range
  console.log('10. Getting transactions with fee >= 50...');
  const highFee = pool.getByFeeRange(BigInt(50));
  console.log(`   Found ${highFee.length} high-fee transactions`);
  for (const tx of highFee) {
    console.log(`     Fee: ${tx.fee}, From: ${tx.from.substring(0, 10)}...`);
  }
  console.log();

  // 11. Test duplicate prevention
  console.log('11. Testing duplicate prevention...');
  const duplicate = pool.add(tx1); // Try to add same transaction
  console.log(`   Adding duplicate transaction: ${duplicate ? 'allowed' : 'prevented'}`);
  console.log();

  // 12. Remove transaction
  console.log('12. Removing a transaction...');
  const removed = pool.remove(tx1.hash);
  console.log(`   Transaction removed: ${removed}`);
  console.log(`   Pool size: ${pool.size()}`);
  console.log();

  // 13. Get pending by nonce (round-robin from accounts)
  console.log('13. Getting transactions by nonce (round-robin)...');
  const byNonce = pool.getPendingByNonce(6);
  console.log(`   Round-robin selection:`);
  for (const tx of byNonce) {
    console.log(`     From: ${tx.from.substring(0, 10)}..., Nonce: ${tx.nonce}, Fee: ${tx.fee}`);
  }
  console.log();

  // 14. Remove transactions by account
  console.log('14. Removing all transactions from Charlie...');
  const removedCount = pool.removeByAccount(charlie.publicKey);
  console.log(`   Removed ${removedCount} transactions`);
  console.log(`   Pool size: ${pool.size()}`);
  console.log(`   Accounts: ${pool.getAccountCount()}`);
  console.log();

  // 15. Test expiration
  console.log('15. Testing transaction expiration...');
  console.log('   Waiting 11 seconds for transactions to expire...');
  console.log('   (This demonstrates the expiration feature)');

  await new Promise(resolve => setTimeout(resolve, 11000));

  const expiredCount = pool.evictExpired();
  console.log(`   Evicted ${expiredCount} expired transactions`);
  console.log(`   Pool size: ${pool.size()}`);
  console.log();

  // 16. Add many transactions to test pool limits
  console.log('16. Testing pool size limits...');
  const david = await generateKeyPair();

  for (let i = 0; i < 10; i++) {
    const tx = new Transaction({
      from: david.publicKey,
      to: alice.publicKey,
      amount: BigInt(i + 1),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(5 + i)
    });
    await tx.sign(david.privateKey);
    pool.add(tx);
  }

  console.log(`   Added more transactions`);
  console.log(`   Current size: ${pool.size()}`);
  console.log(`   Is full: ${pool.isFull()}`);
  console.log();

  // 17. Get all accounts with pending transactions
  console.log('17. Accounts with pending transactions...');
  const accounts = pool.getAccounts();
  console.log(`   Total accounts: ${accounts.length}`);
  for (const account of accounts) {
    const txs = pool.getByAccount(account);
    console.log(`     ${account.substring(0, 10)}...: ${txs.length} transactions`);
  }
  console.log();

  // 18. Final statistics
  console.log('18. Final pool statistics...');
  const finalStats = pool.getStats();
  console.log(`   Size: ${finalStats.size}/${finalStats.maxSize}`);
  console.log(`   Accounts: ${finalStats.byAccount}`);
  console.log(`   Average fee: ${finalStats.averageFee}`);
  console.log(`   Fill: ${pool.getFillPercentage().toFixed(2)}%`);
  console.log(`   Oldest tx age: ${Date.now() - finalStats.oldestTimestamp}ms`);
  console.log();

  // 19. Clear pool
  console.log('19. Clearing pool...');
  pool.clear();
  console.log(`   Pool size after clear: ${pool.size()}`);
  console.log();

  // 20. Demonstrate priority sorting with many transactions
  console.log('20. Demonstrating priority sorting...');

  const fees = [100, 50, 25, 200, 75, 150, 10, 300, 5, 125];
  for (let i = 0; i < fees.length; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(100),
      nonce: i,
      timestamp: Date.now() + i, // Different timestamps
      fee: BigInt(fees[i])
    });
    await tx.sign(alice.privateKey);
    pool.add(tx);
  }

  console.log('   Added transactions with random fees');
  console.log('   Getting top 5 by priority:');

  const top5 = pool.getPendingByPriority(5);
  for (let i = 0; i < top5.length; i++) {
    console.log(`     #${i + 1}: Fee ${top5[i].fee}, Nonce ${top5[i].nonce}`);
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
