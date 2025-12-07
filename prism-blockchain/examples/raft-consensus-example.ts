/**
 * Raft Consensus Example
 *
 * This file demonstrates how to use the RaftConsensus class
 * for leader election and block replication
 * Run with: npx ts-node examples/raft-consensus-example.ts
 */

import { RaftConsensus } from '../src/consensus/RaftConsensus';
import { Blockchain } from '../src/core/blockchain/Blockchain';
import { Block } from '../src/core/blockchain/Block';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';
import * as fs from 'fs';
import * as path from 'path';

// Clean up test data
function cleanupTestData() {
  const paths = [
    './data/raft-test-1',
    './data/raft-test-2',
    './data/raft-test-3'
  ];

  for (const p of paths) {
    const dataDir = path.join(process.cwd(), p);
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Raft Consensus Example - Prism Blockchain');
  console.log('='.repeat(60));
  console.log();

  // Clean up before starting
  cleanupTestData();

  // 1. Create blockchains for 3 validators
  console.log('1. Creating blockchains for 3 validators...');
  const blockchain1 = new Blockchain({ nodeId: 'validator1', dbPath: './data/raft-test-1' });
  const blockchain2 = new Blockchain({ nodeId: 'validator2', dbPath: './data/raft-test-2' });
  const blockchain3 = new Blockchain({ nodeId: 'validator3', dbPath: './data/raft-test-3' });

  await blockchain1.init();
  await blockchain2.init();
  await blockchain3.init();

  console.log('   Validator 1 blockchain initialized');
  console.log('   Validator 2 blockchain initialized');
  console.log('   Validator 3 blockchain initialized');
  console.log();

  // 2. Create Raft consensus instances
  console.log('2. Creating Raft consensus instances...');
  const raft1 = new RaftConsensus('validator1', ['validator2', 'validator3'], blockchain1);
  const raft2 = new RaftConsensus('validator2', ['validator1', 'validator3'], blockchain2);
  const raft3 = new RaftConsensus('validator3', ['validator1', 'validator2'], blockchain3);

  console.log('   Raft consensus created for all validators');
  console.log('   Election timeout: 150-300ms');
  console.log('   Heartbeat interval: 50ms');
  console.log('   Block proposal interval: 100ms');
  console.log();

  // 3. Setup event listeners
  console.log('3. Setting up event listeners...');

  // Validator 1 events
  raft1.on('state-changed', (data) => {
    console.log(`   [V1] State: ${data.previousState} -> ${data.newState} (term ${data.term})`);
  });

  raft1.on('leader-elected', (data) => {
    console.log(`   [V1] 🎉 Became leader! (term ${data.term})`);
  });

  raft1.on('vote-request', (data) => {
    console.log(`   [V1] Requesting votes for term ${data.request.term}...`);
    // Simulate vote responses
    simulateVoteResponse(raft1, data.request);
  });

  raft1.on('block-proposed', (data) => {
    console.log(`   [V1] Proposed block #${data.block.index} (${data.blockHash.substring(0, 16)}...)`);
    // Simulate block replication
    simulateBlockReplication(raft1, raft2, raft3, data.block);
  });

  raft1.on('block-committed', (data) => {
    console.log(`   [V1] ✓ Block #${data.blockIndex} committed with ${data.acks} ACKs`);
  });

  // Validator 2 events
  raft2.on('state-changed', (data) => {
    console.log(`   [V2] State: ${data.previousState} -> ${data.newState} (term ${data.term})`);
  });

  raft2.on('leader-elected', (data) => {
    console.log(`   [V2] 🎉 Became leader! (term ${data.term})`);
  });

  raft2.on('vote-request', (data) => {
    console.log(`   [V2] Requesting votes for term ${data.request.term}...`);
    simulateVoteResponse(raft2, data.request);
  });

  // Validator 3 events
  raft3.on('state-changed', (data) => {
    console.log(`   [V3] State: ${data.previousState} -> ${data.newState} (term ${data.term})`);
  });

  raft3.on('leader-elected', (data) => {
    console.log(`   [V3] 🎉 Became leader! (term ${data.term})`);
  });

  raft3.on('vote-request', (data) => {
    console.log(`   [V3] Requesting votes for term ${data.request.term}...`);
    simulateVoteResponse(raft3, data.request);
  });

  console.log('   Event listeners registered');
  console.log();

  // Helper function to simulate vote responses
  function simulateVoteResponse(requester: RaftConsensus, request: any) {
    const validators = [raft1, raft2, raft3];

    for (const validator of validators) {
      if (validator !== requester) {
        setTimeout(() => {
          const response = validator.onVoteRequest(request);
          requester.onVoteResponse(response);
        }, 10);
      }
    }
  }

  // Helper function to simulate block replication
  async function simulateBlockReplication(
    leader: RaftConsensus,
    follower1: RaftConsensus,
    follower2: RaftConsensus,
    block: Block
  ) {
    const followers = [follower1, follower2];

    for (const follower of followers) {
      setTimeout(async () => {
        const replication = {
          term: leader.getCurrentTerm(),
          leaderId: leader.getNodeId(),
          block: block,
          prevBlockHash: '0'
        };

        const ack = await follower.onBlockReceived(replication);
        await leader.onBlockAck(ack);
      }, 20);
    }
  }

  // 4. Start consensus
  console.log('4. Starting Raft consensus...');
  raft1.start();
  raft2.start();
  raft3.start();

  console.log('   All validators started');
  console.log('   Election process beginning...');
  console.log();

  // 5. Wait for leader election
  console.log('5. Waiting for leader election...');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check who became leader
  const stats1 = raft1.getStats();
  const stats2 = raft2.getStats();
  const stats3 = raft3.getStats();

  console.log();
  console.log('   Current states:');
  console.log(`   Validator 1: ${stats1.state} (term ${stats1.term})`);
  console.log(`   Validator 2: ${stats2.state} (term ${stats2.term})`);
  console.log(`   Validator 3: ${stats3.state} (term ${stats3.term})`);
  console.log();

  // Find the leader
  let leader = raft1.isLeader() ? raft1 : raft2.isLeader() ? raft2 : raft3;
  const leaderName = raft1.isLeader() ? 'Validator 1' : raft2.isLeader() ? 'Validator 2' : 'Validator 3';

  console.log(`   Leader elected: ${leaderName}`);
  console.log();

  // 6. Create test blocks
  console.log('6. Creating test blocks...');
  const validatorKeys = await generateKeyPair();
  const alice = await generateKeyPair();
  const bob = await generateKeyPair();

  const testBlocks: Block[] = [];

  for (let i = 0; i < 3; i++) {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount: BigInt(100 + i),
      nonce: i,
      timestamp: Date.now(),
      fee: BigInt(10)
    });
    await tx.sign(alice.privateKey);

    const latestBlock = await blockchain1.getLatestBlock();
    const block = new Block({
      index: latestBlock.index + 1 + i,
      timestamp: Date.now(),
      transactions: [tx],
      previousHash: latestBlock.hash,
      validator: validatorKeys.publicKey,
      merkleRoot: ''
    });

    testBlocks.push(block);
  }

  console.log(`   Created ${testBlocks.length} test blocks`);
  console.log();

  // 7. Propose blocks from leader
  console.log('7. Proposing blocks from leader...');

  for (let i = 0; i < testBlocks.length; i++) {
    const block = testBlocks[i];
    console.log(`   Proposing block #${block.index}...`);

    const proposed = await leader.proposeBlock(block);
    if (proposed) {
      console.log('     ✓ Proposed successfully');
    } else {
      console.log('     ✗ Failed to propose');
    }

    // Wait for block to be committed
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log();

  // 8. Check consensus statistics
  console.log('8. Consensus statistics...');

  const finalStats1 = raft1.getStats();
  const finalStats2 = raft2.getStats();
  const finalStats3 = raft3.getStats();

  console.log('   Validator 1:');
  console.log(`     State: ${finalStats1.state}`);
  console.log(`     Term: ${finalStats1.term}`);
  console.log(`     Log length: ${finalStats1.logLength}`);
  console.log(`     Commit index: ${finalStats1.commitIndex}`);
  console.log();

  console.log('   Validator 2:');
  console.log(`     State: ${finalStats2.state}`);
  console.log(`     Term: ${finalStats2.term}`);
  console.log(`     Log length: ${finalStats2.logLength}`);
  console.log(`     Commit index: ${finalStats2.commitIndex}`);
  console.log();

  console.log('   Validator 3:');
  console.log(`     State: ${finalStats3.state}`);
  console.log(`     Term: ${finalStats3.term}`);
  console.log(`     Log length: ${finalStats3.logLength}`);
  console.log(`     Commit index: ${finalStats3.commitIndex}`);
  console.log();

  // 9. Verify blockchain consistency
  console.log('9. Verifying blockchain consistency...');

  const block1 = await blockchain1.getLatestBlock();
  const block2 = await blockchain2.getLatestBlock();
  const block3 = await blockchain3.getLatestBlock();

  console.log(`   Validator 1 latest block: #${block1.index} (${block1.hash.substring(0, 16)}...)`);
  console.log(`   Validator 2 latest block: #${block2.index} (${block2.hash.substring(0, 16)}...)`);
  console.log(`   Validator 3 latest block: #${block3.index} (${block3.hash.substring(0, 16)}...)`);
  console.log();

  const consistent = block1.index === block2.index && block2.index === block3.index;
  console.log(`   Blockchains consistent: ${consistent ? '✓ YES' : '✗ NO'}`);
  console.log();

  // 10. Test leader failure and re-election
  console.log('10. Testing leader failure and re-election...');

  if (leader === raft1) {
    console.log('   Stopping Validator 1 (current leader)...');
    raft1.stop();
  } else if (leader === raft2) {
    console.log('   Stopping Validator 2 (current leader)...');
    raft2.stop();
  } else {
    console.log('   Stopping Validator 3 (current leader)...');
    raft3.stop();
  }

  console.log('   Waiting for re-election...');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check new leader
  const newLeader = raft1.isLeader() ? 'Validator 1' : raft2.isLeader() ? 'Validator 2' : raft3.isLeader() ? 'Validator 3' : 'None';
  console.log(`   New leader: ${newLeader}`);
  console.log();

  // 11. Stop all validators
  console.log('11. Stopping all validators...');
  raft1.stop();
  raft2.stop();
  raft3.stop();

  console.log('   All validators stopped');
  console.log();

  // 12. Close blockchains
  console.log('12. Closing blockchains...');
  await blockchain1.close();
  await blockchain2.close();
  await blockchain3.close();

  console.log('   All blockchains closed');
  console.log();

  // Cleanup
  cleanupTestData();

  console.log('='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
  console.log();
  console.log('Summary:');
  console.log('- Created 3-validator Raft cluster');
  console.log('- Performed leader election');
  console.log('- Replicated blocks with majority consensus');
  console.log('- Tested leader failure and re-election');
  console.log('- Verified blockchain consistency');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
