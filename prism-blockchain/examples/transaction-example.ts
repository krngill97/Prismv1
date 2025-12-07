/**
 * Transaction Usage Example
 *
 * This file demonstrates how to use the Transaction class
 * Run with: npx ts-node examples/transaction-example.ts
 */

import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';

async function main() {
  console.log('='.repeat(60));
  console.log('Transaction Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // 1. Generate key pairs for sender and receiver
  console.log('1. Generating key pairs...');
  const sender = await generateKeyPair();
  const receiver = await generateKeyPair();

  console.log(`   Sender Address:   ${sender.publicKey.substring(0, 20)}...`);
  console.log(`   Receiver Address: ${receiver.publicKey.substring(0, 20)}...`);
  console.log();

  // 2. Create a transaction
  console.log('2. Creating transaction...');
  const tx = new Transaction({
    from: sender.publicKey,
    to: receiver.publicKey,
    amount: BigInt(100),
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(1000)  // Optional, defaults to 1000
  });

  console.log(`   Amount: ${tx.amount}`);
  console.log(`   Fee: ${tx.fee}`);
  console.log(`   Total Cost: ${tx.getTotalCost()}`);
  console.log(`   Hash: ${tx.hash.substring(0, 32)}...`);
  console.log();

  // 3. Sign the transaction
  console.log('3. Signing transaction...');
  await tx.sign(sender.privateKey);
  console.log(`   Signature: ${tx.signature.substring(0, 32)}...`);
  console.log();

  // 4. Verify the transaction
  console.log('4. Verifying transaction...');
  const isValid = await tx.verify();
  console.log(`   Signature Valid: ${isValid}`);
  console.log(`   Basic Validation: ${tx.isValid()}`);
  console.log(`   Hash Valid: ${tx.verifyHash()}`);
  console.log();

  // 5. Serialize to JSON
  console.log('5. Serializing to JSON...');
  const jsonData = tx.toJSON();
  console.log('   JSON:', JSON.stringify(jsonData, null, 2));
  console.log();

  // 6. Deserialize from JSON
  console.log('6. Deserializing from JSON...');
  const restoredTx = Transaction.fromJSON(jsonData);
  console.log(`   Restored Hash: ${restoredTx.hash.substring(0, 32)}...`);
  console.log(`   Hashes Match: ${restoredTx.hash === tx.hash}`);
  console.log();

  // 7. Verify restored transaction
  console.log('7. Verifying restored transaction...');
  const restoredValid = await restoredTx.verify();
  console.log(`   Restored Signature Valid: ${restoredValid}`);
  console.log();

  // 8. Test invalid signature detection
  console.log('8. Testing invalid signature detection...');
  const invalidTx = new Transaction({
    from: sender.publicKey,
    to: receiver.publicKey,
    amount: BigInt(200),  // Different amount
    nonce: 0,
    timestamp: Date.now(),
    fee: BigInt(1000),
    signature: tx.signature  // Using signature from different transaction
  });

  const invalidValid = await invalidTx.verify();
  console.log(`   Invalid Signature Detected: ${!invalidValid}`);
  console.log();

  // 9. Display transaction details
  console.log('9. Transaction string representation:');
  console.log(tx.toString());
  console.log();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
