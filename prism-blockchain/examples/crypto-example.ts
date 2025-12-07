/**
 * Crypto Utilities Example
 *
 * This file demonstrates all cryptographic functions
 * Run with: npx ts-node examples/crypto-example.ts
 */

import * as crypto from '../src/utils/crypto';

async function main() {
  console.log('='.repeat(60));
  console.log('Crypto Utilities Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // 1. Generate key pair
  console.log('1. Generating Ed25519 key pair...');
  const keys = await crypto.generateKeyPair();
  console.log(`   Public key:  ${keys.publicKey.substring(0, 32)}...`);
  console.log(`   Private key: ${keys.privateKey.substring(0, 32)}...`);
  console.log();

  // 2. Convert public key to address
  console.log('2. Converting public key to address...');
  const address = crypto.publicKeyToAddress(keys.publicKey);
  console.log(`   Address: ${address}`);
  console.log(`   Address (short): ${address.substring(0, 16)}...`);
  console.log();

  // 3. Generate random address
  console.log('3. Generating random address...');
  const randomAddr = crypto.generateAddress();
  console.log(`   Random address: ${randomAddr.substring(0, 16)}...`);
  console.log();

  // 4. Hash data
  console.log('4. Hashing data...');
  const data = 'Hello, Blockchain!';
  const dataHash = crypto.hash(data);
  console.log(`   Data: "${data}"`);
  console.log(`   SHA256: ${dataHash}`);
  console.log();

  // 5. Sign and verify data
  console.log('5. Signing and verifying data...');
  const message = 'This is a signed message';
  const signature = await crypto.sign(message, keys.privateKey);
  console.log(`   Message: "${message}"`);
  console.log(`   Signature: ${signature.substring(0, 32)}...`);

  const isValid = await crypto.verify(message, signature, keys.publicKey);
  console.log(`   Signature valid: ${isValid}`);

  const isTampered = await crypto.verify('Tampered message', signature, keys.publicKey);
  console.log(`   Tampered message valid: ${isTampered}`);
  console.log();

  // 6. Merkle tree
  console.log('6. Building Merkle tree...');
  const txHashes = [
    crypto.hash('tx1'),
    crypto.hash('tx2'),
    crypto.hash('tx3'),
    crypto.hash('tx4'),
    crypto.hash('tx5')
  ];

  console.log('   Transaction hashes:');
  txHashes.forEach((h, i) => {
    console.log(`     TX${i + 1}: ${h.substring(0, 16)}...`);
  });

  const merkleRootHash = crypto.merkleRoot(txHashes);
  console.log(`   Merkle root: ${merkleRootHash.substring(0, 32)}...`);
  console.log();

  // 7. Merkle tree with odd number
  console.log('7. Merkle tree with odd number of hashes...');
  const oddHashes = [
    crypto.hash('a'),
    crypto.hash('b'),
    crypto.hash('c')
  ];
  const oddRoot = crypto.merkleRoot(oddHashes);
  console.log(`   3 hashes, Merkle root: ${oddRoot.substring(0, 32)}...`);
  console.log();

  // 8. Empty merkle tree
  console.log('8. Empty Merkle tree...');
  const emptyRoot = crypto.merkleRoot([]);
  console.log(`   Empty Merkle root: ${emptyRoot.substring(0, 32)}...`);
  console.log();

  // 9. Hash multiple data
  console.log('9. Hashing multiple pieces of data...');
  const multiHash = crypto.hashMultiple('hello', 'world', '123');
  console.log(`   Hash of ['hello', 'world', '123']: ${multiHash.substring(0, 32)}...`);
  console.log();

  // 10. Deterministic keys from seed
  console.log('10. Generating deterministic keys from seed...');
  const seed = 'my-secret-seed';
  const seedKeys = await crypto.keyPairFromSeed(seed);
  console.log(`   Seed: "${seed}"`);
  console.log(`   Public key: ${seedKeys.publicKey.substring(0, 32)}...`);

  // Generate again to show determinism
  const seedKeys2 = await crypto.keyPairFromSeed(seed);
  console.log(`   Same seed generates same keys: ${seedKeys.publicKey === seedKeys2.publicKey}`);
  console.log();

  // 11. Address from seed
  console.log('11. Generating address from seed...');
  const seedAddr = crypto.addressFromSeed('test-seed');
  const seedAddr2 = crypto.addressFromSeed('test-seed');
  console.log(`   Address 1: ${seedAddr.substring(0, 20)}...`);
  console.log(`   Address 2: ${seedAddr2.substring(0, 20)}...`);
  console.log(`   Deterministic: ${seedAddr === seedAddr2}`);
  console.log();

  // 12. Validation functions
  console.log('12. Validating addresses, keys, and hashes...');
  console.log(`   Valid address: ${crypto.isValidAddress(address)}`);
  console.log(`   Invalid address: ${crypto.isValidAddress('0x123')}`);
  console.log(`   Valid public key: ${crypto.isValidPublicKey(keys.publicKey)}`);
  console.log(`   Valid hash: ${crypto.isValidHash(dataHash)}`);
  console.log();

  // 13. Sign raw bytes
  console.log('13. Signing raw bytes...');
  const rawData = new Uint8Array([1, 2, 3, 4, 5]);
  const rawSignature = await crypto.signRaw(rawData, keys.privateKey);
  console.log(`   Raw data: [${Array.from(rawData).join(', ')}]`);
  console.log(`   Signature: ${rawSignature.substring(0, 32)}...`);

  const rawValid = await crypto.verifyRaw(rawData, rawSignature, keys.publicKey);
  console.log(`   Signature valid: ${rawValid}`);
  console.log();

  // 14. Hex conversion utilities
  console.log('14. Hex conversion utilities...');
  const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const hex1 = crypto.toHex(bytes, false);
  const hex2 = crypto.toHex(bytes, true);
  console.log(`   Bytes: [${Array.from(bytes).join(', ')}]`);
  console.log(`   Hex (no prefix): ${hex1}`);
  console.log(`   Hex (with 0x): ${hex2}`);

  const bytesBack = crypto.fromHex(hex2);
  console.log(`   Back to bytes: [${Array.from(bytesBack).join(', ')}]`);
  console.log();

  // 15. Random utilities
  console.log('15. Random value generation...');
  const nonce = crypto.randomNonce();
  console.log(`   Random nonce: ${nonce}`);

  const randomByteArray = crypto.randomBytes(16);
  console.log(`   Random 16 bytes: ${crypto.toHex(randomByteArray).substring(0, 32)}...`);

  const randomHexString = crypto.randomHex(32);
  console.log(`   Random 32-byte hex: ${randomHexString.substring(0, 32)}...`);
  console.log();

  // 16. Multiple key pairs
  console.log('16. Creating multiple accounts...');
  const alice = await crypto.generateKeyPair();
  const bob = await crypto.generateKeyPair();
  const charlie = await crypto.generateKeyPair();

  console.log(`   Alice:   ${crypto.publicKeyToAddress(alice.publicKey).substring(0, 20)}...`);
  console.log(`   Bob:     ${crypto.publicKeyToAddress(bob.publicKey).substring(0, 20)}...`);
  console.log(`   Charlie: ${crypto.publicKeyToAddress(charlie.publicKey).substring(0, 20)}...`);
  console.log();

  // 17. Cross-signing demonstration
  console.log('17. Cross-signing (Alice signs, Bob verifies)...');
  const aliceMessage = 'Message from Alice';
  const aliceSignature = await crypto.sign(aliceMessage, alice.privateKey);

  const verifiedByBob = await crypto.verify(aliceMessage, aliceSignature, alice.publicKey);
  const wrongKey = await crypto.verify(aliceMessage, aliceSignature, bob.publicKey);

  console.log(`   Alice's message: "${aliceMessage}"`);
  console.log(`   Verified with Alice's key: ${verifiedByBob}`);
  console.log(`   Verified with Bob's key: ${wrongKey}`);
  console.log();

  // 18. Merkle tree with single element
  console.log('18. Merkle tree edge cases...');
  const singleHash = [crypto.hash('single')];
  const singleRoot = crypto.merkleRoot(singleHash);
  console.log(`   Single element: ${singleRoot.substring(0, 32)}...`);
  console.log(`   Same as input: ${singleRoot === singleHash[0]}`);
  console.log();

  // 19. Large merkle tree
  console.log('19. Large Merkle tree (1000 transactions)...');
  const largeHashes = [];
  for (let i = 0; i < 1000; i++) {
    largeHashes.push(crypto.hash(`transaction-${i}`));
  }
  const largeRoot = crypto.merkleRoot(largeHashes);
  console.log(`   1000 transactions -> Merkle root: ${largeRoot.substring(0, 32)}...`);
  console.log();

  // 20. Performance test
  console.log('20. Performance test...');

  const startHash = Date.now();
  for (let i = 0; i < 10000; i++) {
    crypto.hash(`data-${i}`);
  }
  const hashTime = Date.now() - startHash;
  console.log(`   10,000 hashes: ${hashTime}ms`);

  const startSign = Date.now();
  for (let i = 0; i < 100; i++) {
    await crypto.sign(`message-${i}`, keys.privateKey);
  }
  const signTime = Date.now() - startSign;
  console.log(`   100 signatures: ${signTime}ms`);

  const startVerify = Date.now();
  for (let i = 0; i < 100; i++) {
    await crypto.verify(`message-${i}`, signature, keys.publicKey);
  }
  const verifyTime = Date.now() - startVerify;
  console.log(`   100 verifications: ${verifyTime}ms`);
  console.log();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
