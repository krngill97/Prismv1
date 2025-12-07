/**
 * Validator Node for Prism Blockchain
 *
 * Integrates all components:
 * - Blockchain state
 * - Transaction pool
 * - Micro-batch builder
 * - Probabilistic finality tracker
 *
 * Validators create batches, validate transactions, and achieve instant finality
 */

import { EventEmitter } from 'events';
import { Blockchain } from '../core/blockchain/Blockchain.js';
import { TransactionPool } from '../core/pool/TransactionPool.js';
import { Transaction } from '../core/transaction/Transaction.js';
import { Block } from '../core/blockchain/Block.js';
import { MicroBatchBuilder, MicroBatch } from '../consensus/MicroBatchBuilder.js';
import { ProbabilisticFinalityTracker, InstantFinalityEvent } from '../consensus/ProbabilisticFinalityTracker.js';
import { KeyPair } from '../utils/crypto.js';

/**
 * Validator configuration
 */
export interface ValidatorConfig {
  validatorId: string;
  validatorKeys: KeyPair;
  dbPath: string;
  totalValidators?: number;       // Total validators in network (default: 1)
  batchInterval?: number;          // Batch creation interval (default: 10ms)
  maxBatchSize?: number;           // Max transactions per batch (default: 1000)
  instantThreshold?: number;       // Instant finality threshold (default: 0.20)
  poolMaxSize?: number;            // Transaction pool max size (default: 100000)
  poolExpirationTime?: number;     // Transaction expiration (default: 60000ms)
}

/**
 * Validator statistics
 */
export interface ValidatorStats {
  validatorId: string;
  isRunning: boolean;
  blockHeight: number;
  pendingTransactions: number;
  totalBatches: number;
  finalizedBatches: number;
  finalityRate: number;
  uptime: number;
}

/**
 * Batch acknowledgment message
 */
export interface BatchAck {
  batchId: string;
  validatorId: string;
  signature: string;
  timestamp: number;
}

/**
 * Validator Node
 *
 * Main component that runs a validator node in the Prism network
 *
 * Features:
 * - Automatic batch creation every 10ms
 * - Instant finality detection with 20% threshold
 * - Transaction validation and execution
 * - Block production from finalized batches
 * - Event-driven architecture
 *
 * @extends EventEmitter
 * @fires Validator#batch-created
 * @fires Validator#instant-finality
 * @fires Validator#block-created
 * @fires Validator#transaction-added
 */
export class Validator extends EventEmitter {
  private validatorId: string;
  private validatorKeys: KeyPair;
  private blockchain: Blockchain;
  private txPool: TransactionPool;
  private batchBuilder: MicroBatchBuilder;
  private finalityTracker: ProbabilisticFinalityTracker;
  private running: boolean;
  private startTime: number;
  private totalValidators: number;

  // Batch management
  private pendingBatches: Map<string, MicroBatch>;  // Batches awaiting finality
  private finalizedBatches: Map<string, MicroBatch>; // Batches with instant finality
  private batchAcks: Map<string, Set<string>>;      // batchId -> Set of validatorIds

  /**
   * Create a new Validator
   * @param config Validator configuration
   */
  constructor(config: ValidatorConfig) {
    super();

    this.validatorId = config.validatorId;
    this.validatorKeys = config.validatorKeys;
    this.running = false;
    this.startTime = 0;
    this.totalValidators = config.totalValidators ?? 1;

    // Initialize blockchain
    this.blockchain = new Blockchain({
      nodeId: config.validatorId,
      dbPath: config.dbPath
    });

    // Initialize transaction pool
    this.txPool = new TransactionPool({
      maxSize: config.poolMaxSize ?? 100000,
      expirationTime: config.poolExpirationTime ?? 60000
    });

    // Initialize batch builder
    this.batchBuilder = new MicroBatchBuilder(
      this.txPool,
      this.blockchain,
      {
        batchInterval: config.batchInterval ?? 10,
        maxBatchSize: config.maxBatchSize ?? 1000
      }
    );

    // Initialize finality tracker
    this.finalityTracker = new ProbabilisticFinalityTracker({
      totalValidators: this.totalValidators,
      instantThreshold: config.instantThreshold ?? 0.20,
      timeoutWindow: 10
    });

    // Batch management
    this.pendingBatches = new Map();
    this.finalizedBatches = new Map();
    this.batchAcks = new Map();

    this.setupEventListeners();
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    // Listen for batch creation
    this.batchBuilder.on('batch-created', async (batch: MicroBatch) => {
      await this.handleBatchCreated(batch);
    });

    // Listen for instant finality
    this.finalityTracker.on('instant-finality', (event: InstantFinalityEvent) => {
      this.handleInstantFinality(event);
    });
  }

  /**
   * Initialize the validator
   * Must be called before start()
   */
  async init(): Promise<void> {
    await this.blockchain.init();
  }

  /**
   * Start the validator
   * Begins batch creation and transaction processing
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.startTime = Date.now();

    // Start batch builder
    this.batchBuilder.start();

    this.emit('started', {
      validatorId: this.validatorId,
      timestamp: Date.now()
    });
  }

  /**
   * Stop the validator
   * Stops batch creation but maintains state
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Stop batch builder
    this.batchBuilder.stop();

    this.emit('stopped', {
      validatorId: this.validatorId,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    });
  }

  /**
   * Shutdown the validator completely
   * Closes all resources including database
   */
  async shutdown(): Promise<void> {
    this.stop();
    await this.blockchain.close();
  }

  /**
   * Handle batch created event
   * Starts finality tracking and broadcasts batch
   */
  private async handleBatchCreated(batch: MicroBatch): Promise<void> {
    // Store as pending
    this.pendingBatches.set(batch.id, batch);

    // Start tracking finality
    await this.finalityTracker.trackInstantFinality(batch);

    // ACK our own batch
    this.acknowledgeBatch(batch.id, this.validatorId);

    /**
     * Batch created event
     * @event Validator#batch-created
     */
    this.emit('batch-created', {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      transactionCount: batch.transactions.length,
      validatorId: this.validatorId,
      timestamp: batch.timestamp
    });
  }

  /**
   * Handle instant finality event
   * Creates block from finalized batch
   */
  private async handleInstantFinality(event: InstantFinalityEvent): Promise<void> {
    const batch = this.pendingBatches.get(event.batchId);
    if (!batch) {
      return;
    }

    // Move to finalized
    this.pendingBatches.delete(event.batchId);
    this.finalizedBatches.set(event.batchId, batch);

    // Create block from finalized batch
    await this.createBlockFromBatch(batch);

    /**
     * Instant finality achieved event
     * @event Validator#instant-finality
     */
    this.emit('instant-finality', {
      batchId: event.batchId,
      batchNumber: event.batchNumber,
      confidence: event.confidence,
      validators: event.validators,
      timeToFinality: event.timeToFinality,
      timestamp: event.timestamp
    });
  }

  /**
   * Create a block from a finalized batch
   * Executes transactions and adds block to chain
   */
  private async createBlockFromBatch(batch: MicroBatch): Promise<void> {
    // Get latest block info
    const latestBlock = await this.blockchain.getLatestBlock();

    // Create block
    const block = new Block({
      number: latestBlock.index + 1,
      timestamp: Date.now(),
      transactions: batch.transactions,
      previousHash: latestBlock.hash,
      validator: this.validatorKeys.publicKey,
      merkleRoot: batch.merkleRoot
    });

    // Add to blockchain
    const added = await this.blockchain.addBlock(block);

    if (added) {
      /**
       * Block created event
       * @event Validator#block-created
       */
      this.emit('block-created', {
        blockIndex: block.index,
        blockHash: block.hash,
        transactionCount: block.transactions.length,
        batchId: batch.id,
        validatorId: this.validatorId,
        timestamp: block.timestamp
      });
    }
  }

  /**
   * Add a transaction to the pool
   * @param transaction Transaction to add
   * @returns True if added successfully
   */
  async addTransaction(transaction: Transaction): Promise<boolean> {
    // Validate transaction
    const isValid = await transaction.verify();
    if (!isValid) {
      return false;
    }

    // Add to pool
    const added = this.txPool.add(transaction);

    if (added) {
      /**
       * Transaction added event
       * @event Validator#transaction-added
       */
      this.emit('transaction-added', {
        transactionHash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount.toString(),
        fee: transaction.fee.toString(),
        timestamp: transaction.timestamp
      });
    }

    return added;
  }

  /**
   * Acknowledge a batch
   * Records validator acknowledgment for finality tracking
   *
   * @param batchId Batch identifier
   * @param validatorId Validator who is ACKing
   */
  acknowledgeBatch(batchId: string, validatorId: string): void {
    // Record ACK
    this.finalityTracker.onValidatorAck(batchId, validatorId);

    // Track ACKs locally
    if (!this.batchAcks.has(batchId)) {
      this.batchAcks.set(batchId, new Set());
    }
    this.batchAcks.get(batchId)!.add(validatorId);
  }

  /**
   * Receive a batch acknowledgment from another validator
   * @param ack Batch acknowledgment
   */
  receiveBatchAck(ack: BatchAck): void {
    this.acknowledgeBatch(ack.batchId, ack.validatorId);

    this.emit('batch-ack-received', {
      batchId: ack.batchId,
      fromValidator: ack.validatorId,
      timestamp: ack.timestamp
    });
  }

  /**
   * Get validator statistics
   * @returns Current validator stats
   */
  async getStats(): Promise<ValidatorStats> {
    const latestBlock = await this.blockchain.getLatestBlock();
    const trackerStats = this.finalityTracker.getStats();
    const batchStats = this.batchBuilder.getStats();

    return {
      validatorId: this.validatorId,
      isRunning: this.running,
      blockHeight: latestBlock.index,
      pendingTransactions: this.txPool.size(),
      totalBatches: batchStats.totalBatches,
      finalizedBatches: trackerStats.finalizedBatches,
      finalityRate: trackerStats.finalityRate,
      uptime: this.running ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Get the validator ID
   * @returns Validator identifier
   */
  getValidatorId(): string {
    return this.validatorId;
  }

  /**
   * Get the validator's public key
   * @returns Public key
   */
  getPublicKey(): string {
    return this.validatorKeys.publicKey;
  }

  /**
   * Check if validator is running
   * @returns True if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the blockchain instance
   * @returns Blockchain
   */
  getBlockchain(): Blockchain {
    return this.blockchain;
  }

  /**
   * Get the transaction pool instance
   * @returns Transaction pool
   */
  getTransactionPool(): TransactionPool {
    return this.txPool;
  }

  /**
   * Get the batch builder instance
   * @returns Batch builder
   */
  getBatchBuilder(): MicroBatchBuilder {
    return this.batchBuilder;
  }

  /**
   * Get the finality tracker instance
   * @returns Finality tracker
   */
  getFinalityTracker(): ProbabilisticFinalityTracker {
    return this.finalityTracker;
  }

  /**
   * Get pending batches
   * @returns Array of pending batches
   */
  getPendingBatches(): MicroBatch[] {
    return Array.from(this.pendingBatches.values());
  }

  /**
   * Get finalized batches
   * @returns Array of finalized batches
   */
  getFinalizedBatches(): MicroBatch[] {
    return Array.from(this.finalizedBatches.values());
  }

  /**
   * Get batch by ID
   * @param batchId Batch identifier
   * @returns Batch or null if not found
   */
  getBatch(batchId: string): MicroBatch | null {
    return this.pendingBatches.get(batchId) || this.finalizedBatches.get(batchId) || null;
  }

  /**
   * Get acknowledgments for a batch
   * @param batchId Batch identifier
   * @returns Array of validator IDs who ACKed
   */
  getBatchAcks(batchId: string): string[] {
    const acks = this.batchAcks.get(batchId);
    return acks ? Array.from(acks) : [];
  }

  /**
   * Get the latest block
   * @returns Latest block
   */
  async getLatestBlock(): Promise<Block> {
    return this.blockchain.getLatestBlock();
  }

  /**
   * Get block by index
   * @param index Block index
   * @returns Block or null if not found
   */
  async getBlock(index: number): Promise<Block | null> {
    return this.blockchain.getBlock(index);
  }

  /**
   * Get account balance
   * @param address Account address
   * @returns Balance in BigInt
   */
  async getBalance(address: string): Promise<bigint> {
    const account = await this.blockchain.getAccount(address);
    return account ? account.balance : BigInt(0);
  }

  /**
   * Get account nonce
   * @param address Account address
   * @returns Current nonce
   */
  async getNonce(address: string): Promise<number> {
    const account = await this.blockchain.getAccount(address);
    return account ? account.nonce : 0;
  }

  /**
   * Update total validators count
   * @param count New validator count
   */
  setTotalValidators(count: number): void {
    this.totalValidators = count;
    this.finalityTracker.setTotalValidators(count);
  }

  /**
   * Get total validators count
   * @returns Number of validators
   */
  getTotalValidators(): number {
    return this.totalValidators;
  }
}

/**
 * Event types for TypeScript
 */
export interface ValidatorEvents {
  'started': (data: { validatorId: string; timestamp: number }) => void;
  'stopped': (data: { validatorId: string; timestamp: number; uptime: number }) => void;
  'batch-created': (data: {
    batchId: string;
    batchNumber: number;
    transactionCount: number;
    validatorId: string;
    timestamp: number;
  }) => void;
  'instant-finality': (data: {
    batchId: string;
    batchNumber: number;
    confidence: number;
    validators: string[];
    timeToFinality: number;
    timestamp: number;
  }) => void;
  'block-created': (data: {
    blockIndex: number;
    blockHash: string;
    transactionCount: number;
    batchId: string;
    validatorId: string;
    timestamp: number;
  }) => void;
  'transaction-added': (data: {
    transactionHash: string;
    from: string;
    to: string;
    amount: string;
    fee: string;
    timestamp: number;
  }) => void;
  'batch-ack-received': (data: {
    batchId: string;
    fromValidator: string;
    timestamp: number;
  }) => void;
}

/**
 * Typed event emitter for Validator
 */
export declare interface Validator {
  on<U extends keyof ValidatorEvents>(
    event: U,
    listener: ValidatorEvents[U]
  ): this;

  emit<U extends keyof ValidatorEvents>(
    event: U,
    ...args: Parameters<ValidatorEvents[U]>
  ): boolean;
}
