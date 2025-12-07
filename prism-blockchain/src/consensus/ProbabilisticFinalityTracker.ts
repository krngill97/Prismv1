/**
 * Probabilistic Finality Tracker for Prism Blockchain
 *
 * Tracks batch acknowledgments from validators to determine instant finality
 * Uses a 10ms window and 20% threshold for instant finality detection
 */

import { EventEmitter } from 'events';
import { MicroBatch } from './MicroBatchBuilder.js';

/**
 * Finality status for a batch
 */
export interface FinalityStatus {
  batchId: string;
  batchNumber: number;
  ackCount: number;
  totalValidators: number;
  confidence: number;        // Percentage (0-100)
  reversalProbability: number; // Probability of reversal (0-1)
  hasInstantFinality: boolean;
  timestamp: number;
  validators: string[];      // Validators who ACKed
}

/**
 * Instant finality event data
 */
export interface InstantFinalityEvent {
  batchId: string;
  batchNumber: number;
  confidence: number;
  validators: string[];
  timestamp: number;
  timeToFinality: number;    // Milliseconds from batch creation
}

/**
 * Tracker configuration
 */
export interface TrackerConfig {
  totalValidators: number;
  instantThreshold?: number;  // Default: 0.20 (20%)
  timeoutWindow?: number;     // Default: 10ms
}

/**
 * Probabilistic Finality Tracker
 *
 * Tracks batch acknowledgments from validators and determines instant finality
 * based on the percentage of validators that ACK within a time window
 *
 * Features:
 * - 10ms timeout window for instant finality
 * - 20% threshold (configurable)
 * - Confidence calculation
 * - Reversal probability estimation
 * - Event-driven notifications
 *
 * @extends EventEmitter
 * @fires ProbabilisticFinalityTracker#instant-finality
 */
export class ProbabilisticFinalityTracker extends EventEmitter {
  private batchAcks: Map<string, Set<string>>;  // batchId -> Set of validatorIds
  private batchTimestamps: Map<string, number>; // batchId -> creation timestamp
  private batchNumbers: Map<string, number>;    // batchId -> batch number
  private batchTimeouts: Map<string, NodeJS.Timeout>; // batchId -> timeout
  private finalizedBatches: Set<string>;        // Batches with instant finality
  private totalValidators: number;
  private instantThreshold: number;
  private timeoutWindow: number;

  /**
   * Create a new ProbabilisticFinalityTracker
   * @param config Tracker configuration
   */
  constructor(config: TrackerConfig) {
    super();

    this.batchAcks = new Map();
    this.batchTimestamps = new Map();
    this.batchNumbers = new Map();
    this.batchTimeouts = new Map();
    this.finalizedBatches = new Set();

    this.totalValidators = config.totalValidators;
    this.instantThreshold = config.instantThreshold ?? 0.20; // 20%
    this.timeoutWindow = config.timeoutWindow ?? 10; // 10ms

    if (this.totalValidators < 1) {
      throw new Error('Total validators must be at least 1');
    }

    if (this.instantThreshold <= 0 || this.instantThreshold > 1) {
      throw new Error('Instant threshold must be between 0 and 1');
    }
  }

  /**
   * Start tracking instant finality for a batch
   * Sets up a 10ms timeout to check if threshold is reached
   *
   * @param batch Micro-batch to track
   *
   * @example
   * await tracker.trackInstantFinality(batch);
   */
  async trackInstantFinality(batch: MicroBatch): Promise<void> {
    const batchId = batch.id;

    // Initialize tracking
    this.batchAcks.set(batchId, new Set());
    this.batchTimestamps.set(batchId, Date.now());
    this.batchNumbers.set(batchId, batch.batchNumber);

    // Set timeout to check finality
    const timeout = setTimeout(() => {
      this.checkInstantFinality(batch);
    }, this.timeoutWindow);

    this.batchTimeouts.set(batchId, timeout);
  }

  /**
   * Add a block confirmation from a validator
   * Alias for onValidatorAck for block-based tracking
   *
   * @param blockHash Block hash or identifier
   * @param validatorId Validator who is confirming
   * @returns True if this confirmation triggered instant finality
   *
   * @example
   * tracker.addBlockConfirmation(block.hash, "validator1");
   */
  addBlockConfirmation(blockHash: string, validatorId: string): boolean {
    return this.onValidatorAck(blockHash, validatorId);
  }

  /**
   * Record a validator acknowledgment for a batch
   * Checks if instant finality threshold is reached
   *
   * @param batchId Batch identifier
   * @param validatorId Validator who is ACKing
   * @returns True if this ACK triggered instant finality
   *
   * @example
   * tracker.onValidatorAck(batch.id, "validator1");
   */
  onValidatorAck(batchId: string, validatorId: string): boolean {
    // Get or create ACK set for this batch
    let acks = this.batchAcks.get(batchId);
    if (!acks) {
      acks = new Set();
      this.batchAcks.set(batchId, acks);

      // If we don't have a timestamp, set it now
      if (!this.batchTimestamps.has(batchId)) {
        this.batchTimestamps.set(batchId, Date.now());
      }
    }

    // Check if already finalized
    if (this.finalizedBatches.has(batchId)) {
      return false;
    }

    // Add validator ACK
    acks.add(validatorId);

    // Check if threshold reached
    const confidence = this.calculateConfidence(batchId);
    const thresholdReached = confidence >= this.instantThreshold * 100;

    if (thresholdReached && !this.finalizedBatches.has(batchId)) {
      this.markAsFinalized(batchId);
      return true;
    }

    return false;
  }

  /**
   * Check if a batch has reached instant finality
   * Called after the timeout window
   *
   * @param batch Batch to check
   * @returns True if instant finality reached
   */
  checkInstantFinality(batch: MicroBatch): boolean {
    const batchId = batch.id;

    // Clear timeout
    const timeout = this.batchTimeouts.get(batchId);
    if (timeout) {
      clearTimeout(timeout);
      this.batchTimeouts.delete(batchId);
    }

    // Check if already finalized
    if (this.finalizedBatches.has(batchId)) {
      return true;
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(batchId);
    const thresholdReached = confidence >= this.instantThreshold * 100;

    if (thresholdReached) {
      this.markAsFinalized(batchId);
      return true;
    }

    return false;
  }

  /**
   * Mark a batch as finalized and emit event
   * @param batchId Batch identifier
   */
  private markAsFinalized(batchId: string): void {
    this.finalizedBatches.add(batchId);

    const acks = this.batchAcks.get(batchId) || new Set();
    const timestamp = this.batchTimestamps.get(batchId) || Date.now();
    const batchNumber = this.batchNumbers.get(batchId) || 0;
    const confidence = this.calculateConfidence(batchId);
    const timeToFinality = Date.now() - timestamp;

    const event: InstantFinalityEvent = {
      batchId,
      batchNumber,
      confidence,
      validators: Array.from(acks),
      timestamp: Date.now(),
      timeToFinality
    };

    /**
     * Instant finality event
     * @event ProbabilisticFinalityTracker#instant-finality
     * @type {InstantFinalityEvent}
     */
    this.emit('instant-finality', event);
  }

  /**
   * Calculate confidence percentage for a batch
   * Confidence = (ACKs / Total Validators) * 100
   *
   * @param batchId Batch identifier
   * @returns Confidence percentage (0-100)
   *
   * @example
   * const confidence = tracker.calculateConfidence(batchId);
   * console.log(`${confidence}% confidence`);
   */
  calculateConfidence(batchId: string): number {
    const acks = this.batchAcks.get(batchId);
    if (!acks) {
      return 0;
    }

    return (acks.size / this.totalValidators) * 100;
  }

  /**
   * Calculate the probability of reversal based on confidence
   * Uses exponential decay: P(reversal) = e^(-k * confidence)
   * where k is chosen such that 20% confidence = ~13% reversal probability
   *
   * @param confidence Confidence percentage (0-100)
   * @returns Reversal probability (0-1)
   *
   * @example
   * const prob = tracker.calculateReversalProbability(66.67);
   * console.log(`${(prob * 100).toFixed(2)}% chance of reversal`);
   */
  calculateReversalProbability(confidence: number): number {
    if (confidence <= 0) {
      return 1.0; // 100% chance of reversal with no confirmations
    }

    if (confidence >= 100) {
      return 0.0; // 0% chance of reversal with 100% confirmation
    }

    // Exponential decay function
    // k = 10 gives reasonable probabilities:
    // - 20% confidence -> ~13.5% reversal probability
    // - 50% confidence -> ~0.67% reversal probability
    // - 67% confidence -> ~0.013% reversal probability
    const k = 10;
    const probability = Math.exp(-k * (confidence / 100));

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Get finality status for a batch
   * @param batchId Batch identifier
   * @returns Finality status or null if not tracked
   */
  getFinalityStatus(batchId: string): FinalityStatus | null {
    if (!this.batchAcks.has(batchId)) {
      return null;
    }

    const acks = this.batchAcks.get(batchId)!;
    const confidence = this.calculateConfidence(batchId);
    const reversalProbability = this.calculateReversalProbability(confidence);
    const hasInstantFinality = this.finalizedBatches.has(batchId);
    const timestamp = this.batchTimestamps.get(batchId) || Date.now();
    const batchNumber = this.batchNumbers.get(batchId) || 0;

    return {
      batchId,
      batchNumber,
      ackCount: acks.size,
      totalValidators: this.totalValidators,
      confidence,
      reversalProbability,
      hasInstantFinality,
      timestamp,
      validators: Array.from(acks)
    };
  }

  /**
   * Check if a batch has instant finality
   * @param batchId Batch identifier
   * @returns True if batch has instant finality
   */
  hasInstantFinality(batchId: string): boolean {
    return this.finalizedBatches.has(batchId);
  }

  /**
   * Get all batches with instant finality
   * @returns Array of batch IDs
   */
  getFinalizedBatches(): string[] {
    return Array.from(this.finalizedBatches);
  }

  /**
   * Get the number of finalized batches
   * @returns Count of finalized batches
   */
  getFinalizedCount(): number {
    return this.finalizedBatches.size;
  }

  /**
   * Get all tracked batches
   * @returns Array of batch IDs
   */
  getTrackedBatches(): string[] {
    return Array.from(this.batchAcks.keys());
  }

  /**
   * Get the number of tracked batches
   * @returns Count of tracked batches
   */
  getTrackedCount(): number {
    return this.batchAcks.size;
  }

  /**
   * Get ACK count for a batch
   * @param batchId Batch identifier
   * @returns Number of ACKs received
   */
  getAckCount(batchId: string): number {
    const acks = this.batchAcks.get(batchId);
    return acks ? acks.size : 0;
  }

  /**
   * Get validators who ACKed a batch
   * @param batchId Batch identifier
   * @returns Array of validator IDs
   */
  getValidators(batchId: string): string[] {
    const acks = this.batchAcks.get(batchId);
    return acks ? Array.from(acks) : [];
  }

  /**
   * Clear tracking data for a batch
   * @param batchId Batch identifier
   */
  clearBatch(batchId: string): void {
    // Clear timeout
    const timeout = this.batchTimeouts.get(batchId);
    if (timeout) {
      clearTimeout(timeout);
      this.batchTimeouts.delete(batchId);
    }

    // Clear data
    this.batchAcks.delete(batchId);
    this.batchTimestamps.delete(batchId);
    this.batchNumbers.delete(batchId);
    this.finalizedBatches.delete(batchId);
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    // Clear all timeouts
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.batchAcks.clear();
    this.batchTimestamps.clear();
    this.batchNumbers.clear();
    this.batchTimeouts.clear();
    this.finalizedBatches.clear();
  }

  /**
   * Get tracker statistics
   * @returns Statistics object
   */
  getStats(): {
    totalValidators: number;
    instantThreshold: number;
    timeoutWindow: number;
    trackedBatches: number;
    finalizedBatches: number;
    finalityRate: number;
  } {
    const trackedCount = this.getTrackedCount();
    const finalizedCount = this.getFinalizedCount();
    const finalityRate = trackedCount > 0 ? (finalizedCount / trackedCount) * 100 : 0;

    return {
      totalValidators: this.totalValidators,
      instantThreshold: this.instantThreshold,
      timeoutWindow: this.timeoutWindow,
      trackedBatches: trackedCount,
      finalizedBatches: finalizedCount,
      finalityRate
    };
  }

  /**
   * Update the total number of validators
   * @param count New validator count
   */
  setTotalValidators(count: number): void {
    if (count < 1) {
      throw new Error('Total validators must be at least 1');
    }
    this.totalValidators = count;
  }

  /**
   * Get the total number of validators
   * @returns Validator count
   */
  getTotalValidators(): number {
    return this.totalValidators;
  }

  /**
   * Get the instant finality threshold
   * @returns Threshold as decimal (0-1)
   */
  getInstantThreshold(): number {
    return this.instantThreshold;
  }

  /**
   * Get the timeout window in milliseconds
   * @returns Timeout window
   */
  getTimeoutWindow(): number {
    return this.timeoutWindow;
  }
}

/**
 * Event types for TypeScript
 */
export interface ProbabilisticFinalityTrackerEvents {
  'instant-finality': (event: InstantFinalityEvent) => void;
}

/**
 * Typed event emitter for ProbabilisticFinalityTracker
 */
export declare interface ProbabilisticFinalityTracker {
  on<U extends keyof ProbabilisticFinalityTrackerEvents>(
    event: U,
    listener: ProbabilisticFinalityTrackerEvents[U]
  ): this;

  emit<U extends keyof ProbabilisticFinalityTrackerEvents>(
    event: U,
    ...args: Parameters<ProbabilisticFinalityTrackerEvents[U]>
  ): boolean;
}
