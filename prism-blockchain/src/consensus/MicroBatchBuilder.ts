/**
 * Micro-Batch Builder for Prism Blockchain
 *
 * Creates batches of transactions every 10ms for high throughput
 * Uses EventEmitter to notify when batches are ready
 */

import { EventEmitter } from 'events';
import { Transaction } from '../core/transaction/Transaction.js';
import { TransactionPool } from '../core/pool/TransactionPool.js';
import { Blockchain } from '../core/blockchain/Blockchain.js';
import { merkleRoot as calculateMerkleRoot } from '../utils/crypto.js';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Micro-batch structure
 */
export interface MicroBatch {
  id: string;
  batchNumber: number;
  timestamp: number;
  transactions: Transaction[];
  merkleRoot: string;
}

/**
 * Micro-batch builder configuration
 */
export interface MicroBatchBuilderConfig {
  batchInterval?: number;    // Milliseconds between batches (default: 10ms)
  maxBatchSize?: number;     // Max transactions per batch (default: 1000)
}

/**
 * Micro-Batch Builder
 *
 * Creates transaction batches at regular intervals for block production
 * Emits 'batch-created' events when batches are ready
 *
 * Features:
 * - High-frequency batch creation (10ms default)
 * - Priority-based transaction selection
 * - Merkle root calculation
 * - Sequential batch numbering
 *
 * @extends EventEmitter
 * @fires MicroBatchBuilder#batch-created
 */
export class MicroBatchBuilder extends EventEmitter {
  private batchInterval: number;
  private maxBatchSize: number;
  private currentBatch: Transaction[];
  private batchNumber: number;
  private batchTimer: NodeJS.Timeout | null;
  private running: boolean;
  private txPool: TransactionPool;
  private blockchain: Blockchain;

  /**
   * Create a new MicroBatchBuilder
   * @param txPool Transaction pool to pull transactions from
   * @param blockchain Blockchain reference for validation
   * @param config Builder configuration
   */
  constructor(
    txPool: TransactionPool,
    blockchain: Blockchain,
    config: MicroBatchBuilderConfig = {}
  ) {
    super();

    this.txPool = txPool;
    this.blockchain = blockchain;
    this.batchInterval = config.batchInterval ?? 10; // 10ms default
    this.maxBatchSize = config.maxBatchSize ?? 1000;
    this.currentBatch = [];
    this.batchNumber = 0;
    this.batchTimer = null;
    this.running = false;
  }

  /**
   * Start the batch creation process
   * Creates batches every batchInterval milliseconds
   *
   * @example
   * builder.start();
   * builder.on('batch-created', (batch) => {
   *   console.log(`Batch ${batch.id} ready`);
   * });
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.scheduleNextBatch();

    this.emit('started');
  }

  /**
   * Stop the batch creation process
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Finalize any pending batch
    if (this.currentBatch.length > 0) {
      this.finalizeBatch();
    }

    this.emit('stopped');
  }

  /**
   * Schedule the next batch creation
   */
  private scheduleNextBatch(): void {
    if (!this.running) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      this.createAndBroadcastBatch();
      this.scheduleNextBatch();
    }, this.batchInterval);
  }

  /**
   * Create a batch from pending transactions and broadcast it
   * Main method called by the timer
   */
  createAndBroadcastBatch(): void {
    // Get transactions from pool
    const pendingTxs = this.txPool.getPendingByPriority(this.maxBatchSize);

    if (pendingTxs.length === 0) {
      // No transactions to batch
      return;
    }

    // Add to current batch
    this.currentBatch.push(...pendingTxs);

    // Finalize if we have transactions
    if (this.currentBatch.length > 0) {
      this.finalizeBatch();
    }
  }

  /**
   * Finalize the current batch and emit event
   */
  private finalizeBatch(): void {
    if (this.currentBatch.length === 0) {
      return;
    }

    // Create batch
    const batch: MicroBatch = {
      id: this.generateBatchId(),
      batchNumber: this.batchNumber++,
      timestamp: Date.now(),
      transactions: [...this.currentBatch],
      merkleRoot: this.calculateMerkleRootForBatch(this.currentBatch)
    };

    // Clear current batch
    this.currentBatch = [];

    /**
     * Batch created event
     * @event MicroBatchBuilder#batch-created
     * @type {MicroBatch}
     */
    this.emit('batch-created', batch);
  }

  /**
   * Generate a unique batch ID
   * Uses timestamp, batch number, and transaction count
   * @returns Unique batch identifier
   */
  generateBatchId(): string {
    const data = `${Date.now()}-${this.batchNumber}-${this.currentBatch.length}-${Math.random()}`;
    const hash = sha256(new TextEncoder().encode(data));
    return bytesToHex(hash);
  }

  /**
   * Calculate Merkle root for a batch of transactions
   * @param transactions Array of transactions
   * @returns Merkle root hash
   */
  calculateMerkleRootForBatch(transactions: Transaction[]): string {
    if (transactions.length === 0) {
      return calculateMerkleRoot([]);
    }

    const txHashes = transactions.map(tx => tx.hash);
    return calculateMerkleRoot(txHashes);
  }

  /**
   * Add a transaction to the current batch manually
   * @param transaction Transaction to add
   * @returns True if added
   */
  addTransaction(transaction: Transaction): boolean {
    if (this.currentBatch.length >= this.maxBatchSize) {
      return false;
    }

    this.currentBatch.push(transaction);

    // Auto-finalize if batch is full
    if (this.currentBatch.length >= this.maxBatchSize) {
      this.finalizeBatch();
    }

    return true;
  }

  /**
   * Force creation of a batch immediately
   * Does not wait for timer
   */
  forceBatch(): void {
    if (this.currentBatch.length > 0) {
      this.finalizeBatch();
    }
  }

  /**
   * Get the current batch size
   * @returns Number of transactions in current batch
   */
  getCurrentBatchSize(): number {
    return this.currentBatch.length;
  }

  /**
   * Get the current batch number
   * @returns Current batch counter
   */
  getBatchNumber(): number {
    return this.batchNumber;
  }

  /**
   * Check if builder is running
   * @returns True if actively creating batches
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get configuration
   * @returns Builder configuration
   */
  getConfig(): {
    batchInterval: number;
    maxBatchSize: number;
    currentBatchSize: number;
    batchNumber: number;
    running: boolean;
  } {
    return {
      batchInterval: this.batchInterval,
      maxBatchSize: this.maxBatchSize,
      currentBatchSize: this.currentBatch.length,
      batchNumber: this.batchNumber,
      running: this.running
    };
  }

  /**
   * Get statistics about batch creation
   * @returns Statistics object
   */
  getStats(): {
    totalBatches: number;
    currentBatchSize: number;
    averageBatchSize: number;
    isRunning: boolean;
  } {
    return {
      totalBatches: this.batchNumber,
      currentBatchSize: this.currentBatch.length,
      averageBatchSize: this.batchNumber > 0 ? this.currentBatch.length : 0,
      isRunning: this.running
    };
  }

  /**
   * Reset the batch builder
   * Clears current batch and resets counter
   */
  reset(): void {
    this.stop();
    this.currentBatch = [];
    this.batchNumber = 0;
  }

  /**
   * Set the batch interval
   * @param interval New interval in milliseconds
   */
  setBatchInterval(interval: number): void {
    if (interval < 1) {
      throw new Error('Batch interval must be at least 1ms');
    }

    this.batchInterval = interval;

    // Restart if running
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /**
   * Set the max batch size
   * @param size New max batch size
   */
  setMaxBatchSize(size: number): void {
    if (size < 1) {
      throw new Error('Max batch size must be at least 1');
    }

    this.maxBatchSize = size;
  }

  /**
   * Get the transaction pool reference
   * @returns Transaction pool
   */
  getTransactionPool(): TransactionPool {
    return this.txPool;
  }

  /**
   * Get the blockchain reference
   * @returns Blockchain
   */
  getBlockchain(): Blockchain {
    return this.blockchain;
  }
}

/**
 * Event types for TypeScript
 */
export interface MicroBatchBuilderEvents {
  'batch-created': (batch: MicroBatch) => void;
  'started': () => void;
  'stopped': () => void;
}

/**
 * Typed event emitter for MicroBatchBuilder
 */
export declare interface MicroBatchBuilder {
  on<U extends keyof MicroBatchBuilderEvents>(
    event: U,
    listener: MicroBatchBuilderEvents[U]
  ): this;

  emit<U extends keyof MicroBatchBuilderEvents>(
    event: U,
    ...args: Parameters<MicroBatchBuilderEvents[U]>
  ): boolean;
}
