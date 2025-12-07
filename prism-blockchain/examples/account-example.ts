/**
 * Account Usage Example
 *
 * This file demonstrates how to use the Account class
 * Run with: npx ts-node examples/account-example.ts
 */

import { Account } from '../src/core/account/Account';

function main() {
  console.log('='.repeat(60));
  console.log('Account Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // 1. Create a new account
  console.log('1. Creating a new account...');
  const account = new Account('0x1234567890abcdef', BigInt(1000));
  console.log(account.toString());
  console.log();

  // 2. Add balance
  console.log('2. Adding balance...');
  account.addBalance(BigInt(500));
  console.log(`   New balance: ${account.balance}`);
  console.log();

  // 3. Subtract balance
  console.log('3. Subtracting balance...');
  const success = account.subtractBalance(BigInt(200));
  console.log(`   Success: ${success}`);
  console.log(`   New balance: ${account.balance}`);
  console.log();

  // 4. Try to subtract more than available
  console.log('4. Attempting to subtract more than available...');
  const failed = account.subtractBalance(BigInt(10000));
  console.log(`   Success: ${failed}`);
  console.log(`   Balance unchanged: ${account.balance}`);
  console.log();

  // 5. Check balance
  console.log('5. Checking balance...');
  console.log(`   Has 100: ${account.hasBalance(BigInt(100))}`);
  console.log(`   Has 10000: ${account.hasBalance(BigInt(10000))}`);
  console.log();

  // 6. Increment nonce
  console.log('6. Incrementing nonce...');
  console.log(`   Initial nonce: ${account.nonce}`);
  account.incrementNonce();
  account.incrementNonce();
  account.incrementNonce();
  console.log(`   After 3 transactions: ${account.nonce}`);
  console.log();

  // 7. Storage operations
  console.log('7. Storage operations...');
  account.setStorage('owner', '0xabcdef');
  account.setStorage('totalSupply', '1000000');
  account.setStorage('name', 'MyToken');
  console.log(`   Storage size: ${account.getStorageSize()}`);
  console.log(`   Owner: ${account.getStorage('owner')}`);
  console.log(`   Total Supply: ${account.getStorage('totalSupply')}`);
  console.log(`   All storage:`, account.getAllStorage());
  console.log();

  // 8. Contract code
  console.log('8. Setting contract code...');
  account.setCode('contract MyContract { ... }');
  console.log(`   Is contract: ${account.isContract()}`);
  console.log(`   Code length: ${account.getCode().length} bytes`);
  console.log();

  // 9. Serialize to JSON
  console.log('9. Serializing to JSON...');
  const json = account.toJSON();
  console.log('   JSON:', JSON.stringify(json, null, 2));
  console.log();

  // 10. Deserialize from JSON
  console.log('10. Deserializing from JSON...');
  const restored = Account.fromJSON(json);
  console.log(`   Addresses match: ${restored.address === account.address}`);
  console.log(`   Balances match: ${restored.balance === account.balance}`);
  console.log(`   Nonces match: ${restored.nonce === account.nonce}`);
  console.log(`   Storage match: ${restored.getStorageSize() === account.getStorageSize()}`);
  console.log();

  // 11. Genesis account
  console.log('11. Creating genesis account...');
  const genesis = Account.createGenesisAccount(
    '0xgenesis000000000000000000000000000000000',
    BigInt(1000000000000)
  );
  console.log(genesis.toString());
  console.log();

  // 12. Empty account
  console.log('12. Creating empty account...');
  const empty = Account.createEmpty('0xempty0000000000000000000000000000000000');
  console.log(`   Is empty: ${empty.isEmpty()}`);
  console.log(`   Balance: ${empty.balance}`);
  console.log();

  // 13. Clone account
  console.log('13. Cloning account...');
  const clone = account.clone();
  console.log(`   Clone equals original: ${clone.equals(account)}`);
  clone.addBalance(BigInt(100));
  console.log(`   After modification: ${clone.equals(account)}`);
  console.log(`   Original balance: ${account.balance}`);
  console.log(`   Clone balance: ${clone.balance}`);
  console.log();

  // 14. Snapshot and restore
  console.log('14. Snapshot and restore...');
  const snapshot = account.snapshot();
  console.log(`   Snapshot balance: ${snapshot.balance}`);

  account.addBalance(BigInt(5000));
  console.log(`   Modified balance: ${account.balance}`);

  account.restore(snapshot);
  console.log(`   Restored balance: ${account.balance}`);
  console.log();

  // 15. Multiple accounts example
  console.log('15. Multiple accounts example (transfer simulation)...');
  const alice = new Account('0xalice', BigInt(1000));
  const bob = new Account('0xbob', BigInt(500));

  console.log(`   Alice initial: ${alice.balance}`);
  console.log(`   Bob initial: ${bob.balance}`);

  const transferAmount = BigInt(200);
  if (alice.subtractBalance(transferAmount)) {
    bob.addBalance(transferAmount);
    alice.incrementNonce();
    console.log(`   Transfer successful!`);
    console.log(`   Alice final: ${alice.balance} (nonce: ${alice.nonce})`);
    console.log(`   Bob final: ${bob.balance}`);
  }
  console.log();

  // 16. Smart contract account example
  console.log('16. Smart contract account example...');
  const contract = new Account({
    address: '0xcontract1234567890abcdef',
    balance: BigInt(0),
    nonce: 0,
    code: 'pragma solidity ^0.8.0; contract Token { ... }',
    storage: new Map([
      ['totalSupply', '1000000'],
      ['decimals', '18'],
      ['symbol', 'TKN']
    ])
  });

  console.log(contract.toString());
  console.log(`   Is contract: ${contract.isContract()}`);
  console.log(`   Storage entries: ${contract.getStorageSize()}`);
  console.log(`   Token symbol: ${contract.getStorage('symbol')}`);
  console.log();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
}

main();
