/**
 * Tests for Validator
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Validator } from '../src/validator/Validator';
import { Transaction } from '../src/core/transaction/Transaction';
import { generateKeyPair } from '../src/utils/crypto';
import * as fs from 'fs';
import * as path from 'path';

describe('Validator', () => {
  let validator: Validator;
  let validatorKeys: any;
  const testDbPath = './data/test-validator';

  beforeEach(async () => {
    // Clean up test data
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }

    // Create validator keys
    validatorKeys = await generateKeyPair();

    // Create validator
    validator = new Validator({
      validatorId: 'test-validator',
      validatorKeys: validatorKeys,
      dbPath: testDbPath,
      totalValidators: 3,
      batchInterval: 50,
      maxBatchSize: 10,
      instantThreshold: 0.33
    });

    await validator.init();
  });

  afterEach(async () => {
    await validator.shutdown();

    // Clean up test data
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should create validator with correct config', () => {
      expect(validator.getValidatorId()).toBe('test-validator');
      expect(validator.getPublicKey()).toBe(validatorKeys.publicKey);
      expect(validator.getTotalValidators()).toBe(3);
    });

    it('should initialize blockchain with genesis block', async () => {
      const genesisBlock = await validator.getLatestBlock();
      expect(genesisBlock.index).toBe(0);
      expect(genesisBlock.transactions.length).toBe(0);
    });

    it('should have genesis balance', async () => {
      const genesisAddr = '0x' + '0'.repeat(64);
      const balance = await validator.getBalance(genesisAddr);
      expect(balance).toBe(BigInt(1_000_000_000)); // 1 billion PRISM
    });
  });

  describe('Start and Stop', () => {
    it('should start validator', (done) => {
      validator.on('started', (data) => {
        expect(data.validatorId).toBe('test-validator');
        expect(validator.isRunning()).toBe(true);
        done();
      });

      validator.start();
    });

    it('should stop validator', (done) => {
      validator.start();

      setTimeout(() => {
        validator.on('stopped', (data) => {
          expect(data.validatorId).toBe('test-validator');
          expect(validator.isRunning()).toBe(false);
          done();
        });

        validator.stop();
      }, 100);
    });

    it('should not start if already running', () => {
      validator.start();
      expect(validator.isRunning()).toBe(true);

      validator.start(); // Should do nothing
      expect(validator.isRunning()).toBe(true);
    });
  });

  describe('Transaction Management', () => {
    it('should add valid transaction', async () => {
      const alice = await generateKeyPair();
      const bob = await generateKeyPair();

      const tx = new Transaction({
        from: alice.publicKey,
        to: bob.publicKey,
        amount: BigInt(100),
        nonce: 0,
        timestamp: Date.now(),
        fee: BigInt(10)
      });
      await tx.sign(alice.privateKey);

      const added = await validator.addTransaction(tx);
      expect(added).toBe(true);
    });

    it('should reject invalid transaction', async () => {
      const alice = await generateKeyPair();
      const bob = await generateKeyPair();

      const tx = new Transaction({
        from: alice.publicKey,
        to: bob.publicKey,
        amount: BigInt(100),
        nonce: 0,
        timestamp: Date.now(),
        fee: BigInt(10)
      });
      // Don't sign - invalid transaction

      const added = await validator.addTransaction(tx);
      expect(added).toBe(false);
    });

    it('should emit transaction-added event', (done) => {
      validator.on('transaction-added', async (data) => {
        expect(data.amount).toBe('100');
        expect(data.fee).toBe('10');
        done();
      });

      (async () => {
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const tx = new Transaction({
          from: alice.publicKey,
          to: bob.publicKey,
          amount: BigInt(100),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(10)
        });
        await tx.sign(alice.privateKey);
        await validator.addTransaction(tx);
      })();
    });
  });

  describe('Batch Creation', () => {
    it('should create batches when transactions available', (done) => {
      let batchCreated = false;

      validator.on('batch-created', (data) => {
        expect(data.validatorId).toBe('test-validator');
        expect(data.transactionCount).toBeGreaterThan(0);
        batchCreated = true;
      });

      (async () => {
        // Add transactions
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const genesisAddr = '0x' + '0'.repeat(64);
        const fundingTx = new Transaction({
          from: genesisAddr,
          to: alice.publicKey,
          amount: BigInt(1000),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(0)
        });
        await validator.addTransaction(fundingTx);

        for (let i = 0; i < 5; i++) {
          const tx = new Transaction({
            from: alice.publicKey,
            to: bob.publicKey,
            amount: BigInt(10),
            nonce: i,
            timestamp: Date.now(),
            fee: BigInt(5)
          });
          await tx.sign(alice.privateKey);
          await validator.addTransaction(tx);
        }

        // Start validator
        validator.start();

        // Wait for batches
        setTimeout(() => {
          expect(batchCreated).toBe(true);
          done();
        }, 200);
      })();
    });
  });

  describe('Instant Finality', () => {
    it('should achieve instant finality with threshold ACKs', (done) => {
      validator.on('instant-finality', (data) => {
        expect(data.confidence).toBeGreaterThanOrEqual(33);
        expect(data.validators.length).toBeGreaterThanOrEqual(1);
        done();
      });

      validator.on('batch-created', (data) => {
        // Simulate validator ACKs (need 33% of 3 = 1 ACK)
        validator.acknowledgeBatch(data.batchId, 'test-validator');
        validator.acknowledgeBatch(data.batchId, 'validator-2');
      });

      (async () => {
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const genesisAddr = '0x' + '0'.repeat(64);
        const fundingTx = new Transaction({
          from: genesisAddr,
          to: alice.publicKey,
          amount: BigInt(1000),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(0)
        });
        await validator.addTransaction(fundingTx);

        validator.start();
      })();
    });
  });

  describe('Block Creation', () => {
    it('should create blocks from finalized batches', (done) => {
      validator.on('block-created', async (data) => {
        expect(data.blockIndex).toBeGreaterThan(0);
        expect(data.transactionCount).toBeGreaterThan(0);

        const block = await validator.getBlock(data.blockIndex);
        expect(block).not.toBeNull();
        expect(block!.index).toBe(data.blockIndex);

        done();
      });

      validator.on('batch-created', (data) => {
        // Simulate ACKs to trigger finality
        validator.acknowledgeBatch(data.batchId, 'validator-1');
        validator.acknowledgeBatch(data.batchId, 'validator-2');
      });

      (async () => {
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const genesisAddr = '0x' + '0'.repeat(64);
        const fundingTx = new Transaction({
          from: genesisAddr,
          to: alice.publicKey,
          amount: BigInt(1000),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(0)
        });
        await validator.addTransaction(fundingTx);

        validator.start();
      })();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const stats = await validator.getStats();

      expect(stats.validatorId).toBe('test-validator');
      expect(stats.isRunning).toBe(false);
      expect(stats.blockHeight).toBe(0);
      expect(stats.pendingTransactions).toBe(0);
    });

    it('should track uptime when running', (done) => {
      validator.start();

      setTimeout(async () => {
        const stats = await validator.getStats();
        expect(stats.uptime).toBeGreaterThan(0);
        done();
      }, 100);
    });
  });

  describe('Account Queries', () => {
    it('should get account balance', async () => {
      const genesisAddr = '0x' + '0'.repeat(64);
      const balance = await validator.getBalance(genesisAddr);
      expect(balance).toBe(BigInt(1_000_000_000));
    });

    it('should get account nonce', async () => {
      const alice = await generateKeyPair();
      const nonce = await validator.getNonce(alice.publicKey);
      expect(nonce).toBe(0);
    });

    it('should return 0 for non-existent account', async () => {
      const alice = await generateKeyPair();
      const balance = await validator.getBalance(alice.publicKey);
      expect(balance).toBe(BigInt(0));
    });
  });

  describe('Batch Queries', () => {
    it('should track pending batches', (done) => {
      validator.on('batch-created', () => {
        const pending = validator.getPendingBatches();
        expect(pending.length).toBeGreaterThan(0);
        done();
      });

      (async () => {
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const tx = new Transaction({
          from: alice.publicKey,
          to: bob.publicKey,
          amount: BigInt(100),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(10)
        });
        await tx.sign(alice.privateKey);
        await validator.addTransaction(tx);

        validator.start();
      })();
    });

    it('should track finalized batches', (done) => {
      validator.on('instant-finality', () => {
        const finalized = validator.getFinalizedBatches();
        expect(finalized.length).toBeGreaterThan(0);
        done();
      });

      validator.on('batch-created', (data) => {
        validator.acknowledgeBatch(data.batchId, 'validator-1');
        validator.acknowledgeBatch(data.batchId, 'validator-2');
      });

      (async () => {
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const genesisAddr = '0x' + '0'.repeat(64);
        const fundingTx = new Transaction({
          from: genesisAddr,
          to: alice.publicKey,
          amount: BigInt(1000),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(0)
        });
        await validator.addTransaction(fundingTx);

        validator.start();
      })();
    });

    it('should get batch by ID', (done) => {
      validator.on('batch-created', (data) => {
        const batch = validator.getBatch(data.batchId);
        expect(batch).not.toBeNull();
        expect(batch!.id).toBe(data.batchId);
        done();
      });

      (async () => {
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const tx = new Transaction({
          from: alice.publicKey,
          to: bob.publicKey,
          amount: BigInt(100),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(10)
        });
        await tx.sign(alice.privateKey);
        await validator.addTransaction(tx);

        validator.start();
      })();
    });
  });

  describe('Batch Acknowledgments', () => {
    it('should track batch ACKs', (done) => {
      validator.on('batch-created', (data) => {
        validator.acknowledgeBatch(data.batchId, 'validator-1');
        validator.acknowledgeBatch(data.batchId, 'validator-2');

        const acks = validator.getBatchAcks(data.batchId);
        expect(acks.length).toBeGreaterThanOrEqual(2);
        expect(acks).toContain('validator-1');
        expect(acks).toContain('validator-2');
        done();
      });

      (async () => {
        const alice = await generateKeyPair();
        const bob = await generateKeyPair();

        const tx = new Transaction({
          from: alice.publicKey,
          to: bob.publicKey,
          amount: BigInt(100),
          nonce: 0,
          timestamp: Date.now(),
          fee: BigInt(10)
        });
        await tx.sign(alice.privateKey);
        await validator.addTransaction(tx);

        validator.start();
      })();
    });

    it('should emit batch-ack-received event', (done) => {
      validator.on('batch-ack-received', (data) => {
        expect(data.fromValidator).toBe('validator-2');
        done();
      });

      validator.receiveBatchAck({
        batchId: 'test-batch',
        validatorId: 'validator-2',
        signature: 'test-sig',
        timestamp: Date.now()
      });
    });
  });

  describe('Component Access', () => {
    it('should provide access to blockchain', () => {
      const blockchain = validator.getBlockchain();
      expect(blockchain).toBeDefined();
    });

    it('should provide access to transaction pool', () => {
      const txPool = validator.getTransactionPool();
      expect(txPool).toBeDefined();
    });

    it('should provide access to batch builder', () => {
      const batchBuilder = validator.getBatchBuilder();
      expect(batchBuilder).toBeDefined();
    });

    it('should provide access to finality tracker', () => {
      const finalityTracker = validator.getFinalityTracker();
      expect(finalityTracker).toBeDefined();
    });
  });

  describe('Validator Count Management', () => {
    it('should update total validators', () => {
      expect(validator.getTotalValidators()).toBe(3);

      validator.setTotalValidators(5);
      expect(validator.getTotalValidators()).toBe(5);

      const tracker = validator.getFinalityTracker();
      expect(tracker.getTotalValidators()).toBe(5);
    });
  });
});
