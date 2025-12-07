import { Transaction } from '../transaction/Transaction.js';

/**
 * Transaction pool configuration
 */
export interface TransactionPoolConfig {
  maxSize?: number;
  expirationTime?: number; // milliseconds
}

/**
 * Transaction pool (mempool) for managing pending transactions
 *
 * Features:
 * - Priority sorting by transaction fee
 * - Automatic expiration of old transactions
 * - Account-based indexing for quick lookup
 * - Duplicate prevention
 * - Memory-efficient with size limits
 */
export class TransactionPool {
  private transactions: Map<string, Transaction>;
  private byAccount: Map<string, Set<string>>;
  private timestamps: Map<string, number>;
  private maxSize: number;
  private expirationTime: number;

  /**
   * Create a new TransactionPool
   * @param config Pool configuration
   */
  constructor(config: TransactionPoolConfig = {}) {
    this.transactions = new Map();
    this.byAccount = new Map();
    this.timestamps = new Map();
    this.maxSize = config.maxSize ?? 100000;
    this.expirationTime = config.expirationTime ?? 60000; // 60 seconds
  }

  /**
   * Add a transaction to the pool
   * @param tx Transaction to add
   * @returns True if added successfully
   */
  add(tx: Transaction): boolean {
    // Check if transaction already exists
    if (this.transactions.has(tx.hash)) {
      return false;
    }

    // Check pool size limit
    if (this.transactions.size >= this.maxSize) {
      // Try to evict expired transactions first
      this.evictExpired();

      // If still full, evict lowest fee transaction
      if (this.transactions.size >= this.maxSize) {
        this.evictLowestFee();
      }

      // Check again after eviction
      if (this.transactions.size >= this.maxSize) {
        return false;
      }
    }

    // Add transaction
    this.transactions.set(tx.hash, tx);
    this.timestamps.set(tx.hash, Date.now());

    // Index by sender account
    if (!this.byAccount.has(tx.from)) {
      this.byAccount.set(tx.from, new Set());
    }
    this.byAccount.get(tx.from)!.add(tx.hash);

    return true;
  }

  /**
   * Remove a transaction from the pool
   * @param txHash Transaction hash
   * @returns True if removed
   */
  remove(txHash: string): boolean {
    const tx = this.transactions.get(txHash);
    if (!tx) {
      return false;
    }

    // Remove from main map
    this.transactions.delete(txHash);
    this.timestamps.delete(txHash);

    // Remove from account index
    const accountTxs = this.byAccount.get(tx.from);
    if (accountTxs) {
      accountTxs.delete(txHash);
      if (accountTxs.size === 0) {
        this.byAccount.delete(tx.from);
      }
    }

    return true;
  }

  /**
   * Remove multiple transactions
   * @param txHashes Array of transaction hashes
   * @returns Number of transactions removed
   */
  removeMany(txHashes: string[]): number {
    let removed = 0;
    for (const hash of txHashes) {
      if (this.remove(hash)) {
        removed++;
      }
    }
    return removed;
  }

  /**
   * Get a transaction by hash
   * @param txHash Transaction hash
   * @returns Transaction or undefined
   */
  get(txHash: string): Transaction | undefined {
    return this.transactions.get(txHash);
  }

  /**
   * Check if a transaction exists in the pool
   * @param txHash Transaction hash
   * @returns True if exists
   */
  has(txHash: string): boolean {
    return this.transactions.has(txHash);
  }

  /**
   * Get all transactions from a specific account
   * @param address Account address
   * @returns Array of transactions from the account
   */
  getByAccount(address: string): Transaction[] {
    const txHashes = this.byAccount.get(address);
    if (!txHashes) {
      return [];
    }

    const transactions: Transaction[] = [];
    for (const hash of txHashes) {
      const tx = this.transactions.get(hash);
      if (tx) {
        transactions.push(tx);
      }
    }

    // Sort by nonce (ascending)
    return transactions.sort((a, b) => a.nonce - b.nonce);
  }

  /**
   * Get pending transactions (FIFO order)
   * @param limit Maximum number of transactions
   * @returns Array of transactions
   */
  getPending(limit: number): Transaction[] {
    const transactions = Array.from(this.transactions.values());
    return transactions.slice(0, Math.min(limit, transactions.length));
  }

  /**
   * Get pending transactions sorted by fee (highest first)
   * @param limit Maximum number of transactions
   * @returns Array of transactions sorted by fee
   */
  getPendingByPriority(limit: number): Transaction[] {
    const transactions = Array.from(this.transactions.values());

    // Sort by fee (descending), then by timestamp (ascending)
    transactions.sort((a, b) => {
      const feeDiff = Number(b.fee - a.fee);
      if (feeDiff !== 0) {
        return feeDiff;
      }

      // If fees are equal, prefer older transactions
      const timestampA = this.timestamps.get(a.hash) || 0;
      const timestampB = this.timestamps.get(b.hash) || 0;
      return timestampA - timestampB;
    });

    return transactions.slice(0, Math.min(limit, transactions.length));
  }

  /**
   * Get all transactions sorted by nonce per account
   * Useful for processing transactions in correct order
   * @param limit Maximum number of transactions
   * @returns Array of transactions
   */
  getPendingByNonce(limit: number): Transaction[] {
    // Group by account
    const byAccount = new Map<string, Transaction[]>();

    for (const tx of this.transactions.values()) {
      if (!byAccount.has(tx.from)) {
        byAccount.set(tx.from, []);
      }
      byAccount.get(tx.from)!.push(tx);
    }

    // Sort each account's transactions by nonce
    for (const txs of byAccount.values()) {
      txs.sort((a, b) => a.nonce - b.nonce);
    }

    // Collect transactions
    const result: Transaction[] = [];
    const iterators = new Map<string, number>();

    // Initialize iterators
    for (const [account, _txs] of byAccount) {
      iterators.set(account, 0);
    }

    // Round-robin collection from each account
    while (result.length < limit) {
      let addedAny = false;

      for (const [account, txs] of byAccount) {
        const index = iterators.get(account)!;
        if (index < txs.length) {
          result.push(txs[index]);
          iterators.set(account, index + 1);
          addedAny = true;

          if (result.length >= limit) {
            break;
          }
        }
      }

      if (!addedAny) {
        break;
      }
    }

    return result;
  }

  /**
   * Evict expired transactions
   * @returns Number of transactions evicted
   */
  evictExpired(): number {
    const now = Date.now();
    const expiredHashes: string[] = [];

    for (const [hash, timestamp] of this.timestamps) {
      if (now - timestamp > this.expirationTime) {
        expiredHashes.push(hash);
      }
    }

    return this.removeMany(expiredHashes);
  }

  /**
   * Evict the lowest fee transaction
   * Called when pool is full
   * @returns True if a transaction was evicted
   */
  private evictLowestFee(): boolean {
    if (this.transactions.size === 0) {
      return false;
    }

    let lowestFeeTx: Transaction | null = null;
    let lowestFee = BigInt(Number.MAX_SAFE_INTEGER);

    for (const tx of this.transactions.values()) {
      if (tx.fee < lowestFee) {
        lowestFee = tx.fee;
        lowestFeeTx = tx;
      }
    }

    if (lowestFeeTx) {
      this.remove(lowestFeeTx.hash);
      return true;
    }

    return false;
  }

  /**
   * Get the number of transactions in the pool
   * @returns Pool size
   */
  size(): number {
    return this.transactions.size;
  }

  /**
   * Get all transactions
   * @returns Array of all transactions
   */
  getAll(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get all transactions (alias for getAll)
   * @returns Array of all transactions
   */
  getAllTransactions(): Transaction[] {
    return this.getAll();
  }

  /**
   * Add a transaction (alias for add)
   * @param tx Transaction to add
   * @returns Promise resolving to true if added
   */
  async addTransaction(tx: Transaction): Promise<boolean> {
    return this.add(tx);
  }

  /**
   * Remove multiple transactions
   * @param txHashes Array of transaction hashes to remove
   */
  removeTransactions(txHashes: string[]): void {
    this.removeMany(txHashes);
  }

  /**
   * Clear all transactions from the pool
   */
  clear(): void {
    this.transactions.clear();
    this.byAccount.clear();
    this.timestamps.clear();
  }

  /**
   * Get pool statistics
   * @returns Statistics object
   */
  getStats(): {
    size: number;
    maxSize: number;
    byAccount: number;
    averageFee: string;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    let totalFee = BigInt(0);
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const tx of this.transactions.values()) {
      totalFee += tx.fee;
    }

    for (const timestamp of this.timestamps.values()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
      }
      if (timestamp > newestTimestamp) {
        newestTimestamp = timestamp;
      }
    }

    const averageFee = this.transactions.size > 0
      ? (totalFee / BigInt(this.transactions.size)).toString()
      : '0';

    return {
      size: this.transactions.size,
      maxSize: this.maxSize,
      byAccount: this.byAccount.size,
      averageFee,
      oldestTimestamp: oldestTimestamp === Infinity ? 0 : oldestTimestamp,
      newestTimestamp
    };
  }

  /**
   * Get accounts with pending transactions
   * @returns Array of account addresses
   */
  getAccounts(): string[] {
    return Array.from(this.byAccount.keys());
  }

  /**
   * Get the number of accounts with pending transactions
   * @returns Number of unique accounts
   */
  getAccountCount(): number {
    return this.byAccount.size;
  }

  /**
   * Remove all transactions from a specific account
   * @param address Account address
   * @returns Number of transactions removed
   */
  removeByAccount(address: string): number {
    const txHashes = this.byAccount.get(address);
    if (!txHashes) {
      return 0;
    }

    const hashes = Array.from(txHashes);
    return this.removeMany(hashes);
  }

  /**
   * Get transactions that should be included in the next block
   * Uses priority-based selection with nonce ordering per account
   * @param limit Maximum number of transactions
   * @returns Array of transactions
   */
  getForBlock(limit: number): Transaction[] {
    // Group by account
    const byAccount = new Map<string, Transaction[]>();

    for (const tx of this.transactions.values()) {
      if (!byAccount.has(tx.from)) {
        byAccount.set(tx.from, []);
      }
      byAccount.get(tx.from)!.push(tx);
    }

    // Sort each account's transactions by nonce
    for (const txs of byAccount.values()) {
      txs.sort((a, b) => a.nonce - b.nonce);
    }

    // Select highest fee transactions while respecting nonce ordering
    const candidates: Array<{ tx: Transaction; accountTxs: Transaction[]; index: number }> = [];

    for (const [_account, txs] of byAccount) {
      if (txs.length > 0) {
        candidates.push({
          tx: txs[0],
          accountTxs: txs,
          index: 0
        });
      }
    }

    const result: Transaction[] = [];

    while (result.length < limit && candidates.length > 0) {
      // Sort candidates by fee (descending)
      candidates.sort((a, b) => Number(b.tx.fee - a.tx.fee));

      // Take highest fee transaction
      const selected = candidates[0];
      result.push(selected.tx);

      // Move to next transaction from this account
      selected.index++;
      if (selected.index < selected.accountTxs.length) {
        selected.tx = selected.accountTxs[selected.index];
      } else {
        // No more transactions from this account
        candidates.shift();
      }
    }

    return result;
  }

  /**
   * Check if pool is full
   * @returns True if pool is at max capacity
   */
  isFull(): boolean {
    return this.transactions.size >= this.maxSize;
  }

  /**
   * Get the current fill percentage
   * @returns Percentage (0-100)
   */
  getFillPercentage(): number {
    return (this.transactions.size / this.maxSize) * 100;
  }

  /**
   * Get transactions by fee range
   * @param minFee Minimum fee
   * @param maxFee Maximum fee (optional)
   * @returns Array of transactions
   */
  getByFeeRange(minFee: bigint, maxFee?: bigint): Transaction[] {
    const transactions = Array.from(this.transactions.values());

    return transactions.filter(tx => {
      if (tx.fee < minFee) return false;
      if (maxFee && tx.fee > maxFee) return false;
      return true;
    });
  }

  /**
   * Get the highest fee in the pool
   * @returns Highest fee or 0n if pool is empty
   */
  getHighestFee(): bigint {
    let highest = BigInt(0);

    for (const tx of this.transactions.values()) {
      if (tx.fee > highest) {
        highest = tx.fee;
      }
    }

    return highest;
  }

  /**
   * Get the lowest fee in the pool
   * @returns Lowest fee or 0n if pool is empty
   */
  getLowestFee(): bigint {
    if (this.transactions.size === 0) {
      return BigInt(0);
    }

    let lowest = BigInt(Number.MAX_SAFE_INTEGER);

    for (const tx of this.transactions.values()) {
      if (tx.fee < lowest) {
        lowest = tx.fee;
      }
    }

    return lowest;
  }
}
