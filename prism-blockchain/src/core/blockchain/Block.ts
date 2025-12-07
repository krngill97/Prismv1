import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { Transaction, TransactionData } from '../transaction/Transaction.js';

/**
 * Block data structure for serialization
 */
export interface BlockData {
  number: number;
  index?: number;  // Alias for number
  timestamp: number;
  transactions: TransactionData[];
  previousHash: string;
  validator: string;
  hash: string;
  merkleRoot: string;
}

/**
 * Block constructor parameters
 */
export interface BlockParams {
  number: number;
  timestamp?: number;
  transactions: Transaction[];
  previousHash: string;
  validator: string;
  hash?: string;
  merkleRoot?: string;
}

/**
 * Block class representing a blockchain block
 *
 * Features:
 * - Merkle tree for transaction verification
 * - SHA256 block hashing
 * - Transaction signature verification
 * - Full serialization support
 */
export class Block {
  public readonly number: number;
  public readonly index: number;  // Alias for number
  public readonly timestamp: number;
  public readonly transactions: Transaction[];
  public readonly previousHash: string;
  public readonly validator: string;
  public readonly merkleRoot: string;
  public hash: string;

  /**
   * Create a new Block
   * @param params Block parameters
   */
  constructor(params: BlockParams) {
    this.number = params.number;
    this.index = params.number;  // index is same as number
    this.timestamp = params.timestamp ?? Date.now();
    this.transactions = params.transactions;
    this.previousHash = params.previousHash;
    this.validator = params.validator;
    this.merkleRoot = params.merkleRoot ?? this.calculateMerkleRoot();
    this.hash = params.hash ?? this.calculateHash();
  }

  /**
   * Calculate SHA256 hash of the block
   * Hash includes: number, timestamp, merkleRoot, previousHash, validator
   * @returns Hex string of the block hash
   */
  calculateHash(): string {
    const data = `${this.number}${this.timestamp}${this.merkleRoot}${this.previousHash}${this.validator}`;
    const hashBytes = sha256(new TextEncoder().encode(data));
    return bytesToHex(hashBytes);
  }

  /**
   * Calculate the Merkle root of all transactions
   * Uses a binary Merkle tree structure
   * @returns Hex string of the Merkle root
   */
  calculateMerkleRoot(): string {
    if (this.transactions.length === 0) {
      // Empty block has a hash of all zeros
      return bytesToHex(sha256(new TextEncoder().encode('0')));
    }

    // Get all transaction hashes
    const txHashes = this.transactions.map(tx => tx.hash);

    // Build Merkle tree
    return this.buildMerkleTree(txHashes);
  }

  /**
   * Build a Merkle tree from an array of hashes
   * @param hashes Array of transaction hashes
   * @returns Merkle root hash
   */
  private buildMerkleTree(hashes: string[]): string {
    if (hashes.length === 0) {
      return bytesToHex(sha256(new TextEncoder().encode('0')));
    }

    if (hashes.length === 1) {
      return hashes[0];
    }

    const newLevel: string[] = [];

    // Process pairs of hashes
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left; // Duplicate last hash if odd

      // Concatenate and hash the pair
      const combined = left + right;
      const hashBytes = sha256(new TextEncoder().encode(combined));
      newLevel.push(bytesToHex(hashBytes));
    }

    // Recursively build the tree
    return this.buildMerkleTree(newLevel);
  }

  /**
   * Verify all transactions in the block
   * Checks cryptographic signatures for each transaction
   * @returns Promise resolving to true if all transactions are valid
   */
  async verifyTransactions(): Promise<boolean> {
    // Check basic validity first
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    // Verify cryptographic signatures
    const verificationPromises = this.transactions.map(tx => tx.verify());
    const results = await Promise.all(verificationPromises);

    // All must be valid
    return results.every(result => result === true);
  }

  /**
   * Verify the Merkle root matches the calculated root
   * @returns True if Merkle root is valid
   */
  verifyMerkleRoot(): boolean {
    return this.merkleRoot === this.calculateMerkleRoot();
  }

  /**
   * Verify the block hash matches the calculated hash
   * @returns True if hash is valid
   */
  verifyHash(): boolean {
    return this.hash === this.calculateHash();
  }

  /**
   * Basic validation checks for the block
   * - Hash is correct
   * - Merkle root is correct
   * - Transactions pass basic validation
   *
   * Note: This does NOT verify transaction signatures.
   * Use verifyTransactions() for full verification.
   *
   * @param previousBlock Optional previous block for chain validation
   * @returns True if block passes basic validation
   */
  isValid(previousBlock?: Block): boolean {
    // Verify hash
    if (!this.verifyHash()) {
      return false;
    }

    // Verify merkle root
    if (!this.verifyMerkleRoot()) {
      return false;
    }

    // Check previous block link
    if (previousBlock) {
      if (this.previousHash !== previousBlock.hash) {
        return false;
      }

      if (this.number !== previousBlock.number + 1) {
        return false;
      }

      if (this.timestamp <= previousBlock.timestamp) {
        return false;
      }
    }

    // Basic transaction validation
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a specific transaction by hash
   * @param txHash Transaction hash
   * @returns Transaction if found, undefined otherwise
   */
  getTransaction(txHash: string): Transaction | undefined {
    return this.transactions.find(tx => tx.hash === txHash);
  }

  /**
   * Check if a transaction exists in the block
   * @param txHash Transaction hash
   * @returns True if transaction exists
   */
  hasTransaction(txHash: string): boolean {
    return this.transactions.some(tx => tx.hash === txHash);
  }

  /**
   * Get the number of transactions in the block
   * @returns Transaction count
   */
  getTransactionCount(): number {
    return this.transactions.length;
  }

  /**
   * Get the total transaction fees in the block
   * @returns Total fees as bigint
   */
  getTotalFees(): bigint {
    return this.transactions.reduce((total, tx) => total + tx.fee, BigInt(0));
  }

  /**
   * Get the total transaction volume in the block
   * @returns Total volume as bigint
   */
  getTotalVolume(): bigint {
    return this.transactions.reduce((total, tx) => total + tx.amount, BigInt(0));
  }

  /**
   * Calculate block size in bytes (approximate)
   * @returns Estimated block size
   */
  getSize(): number {
    const jsonString = JSON.stringify(this.toJSON());
    return new TextEncoder().encode(jsonString).length;
  }

  /**
   * Build a Merkle proof for a specific transaction
   * @param txHash Transaction hash to prove
   * @returns Array of hashes forming the proof, or null if tx not found
   */
  getMerkleProof(txHash: string): string[] | null {
    const txIndex = this.transactions.findIndex(tx => tx.hash === txHash);
    if (txIndex === -1) {
      return null;
    }

    const proof: string[] = [];
    const hashes = this.transactions.map(tx => tx.hash);
    let currentIndex = txIndex;

    const buildProof = (level: string[], index: number): void => {
      if (level.length <= 1) {
        return;
      }

      const newLevel: string[] = [];
      const pairIndex = index % 2 === 0 ? index + 1 : index - 1;

      // Add sibling to proof
      if (pairIndex < level.length) {
        proof.push(level[pairIndex]);
      } else {
        proof.push(level[index]); // Duplicate if odd
      }

      // Build next level
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left;
        const combined = left + right;
        const hashBytes = sha256(new TextEncoder().encode(combined));
        newLevel.push(bytesToHex(hashBytes));
      }

      buildProof(newLevel, Math.floor(index / 2));
    };

    buildProof(hashes, currentIndex);
    return proof;
  }

  /**
   * Verify a Merkle proof for a transaction
   * @param txHash Transaction hash
   * @param proof Merkle proof
   * @param root Merkle root to verify against
   * @returns True if proof is valid
   */
  static verifyMerkleProof(txHash: string, proof: string[], root: string): boolean {
    let hash = txHash;

    for (const sibling of proof) {
      const combined = hash + sibling;
      const hashBytes = sha256(new TextEncoder().encode(combined));
      hash = bytesToHex(hashBytes);
    }

    return hash === root;
  }

  /**
   * Serialize block to JSON
   * @returns BlockData object
   */
  toJSON(): BlockData {
    return {
      number: this.number,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      previousHash: this.previousHash,
      validator: this.validator,
      hash: this.hash,
      merkleRoot: this.merkleRoot
    };
  }

  /**
   * Deserialize block from JSON
   * @param data BlockData object
   * @returns New Block instance
   */
  static fromJSON(data: BlockData): Block {
    const transactions = data.transactions.map(tx => Transaction.fromJSON(tx));

    return new Block({
      number: data.number,
      timestamp: data.timestamp,
      transactions,
      previousHash: data.previousHash,
      validator: data.validator,
      hash: data.hash,
      merkleRoot: data.merkleRoot
    });
  }

  /**
   * Create a genesis block
   * @param validator Validator ID
   * @returns New genesis Block
   */
  static createGenesis(validator: string = 'genesis'): Block {
    return new Block({
      number: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: '0'.repeat(64),
      validator
    });
  }

  /**
   * Create a string representation of the block
   * @returns Human-readable block string
   */
  toString(): string {
    return `Block #${this.number} {
  timestamp: ${new Date(this.timestamp).toISOString()}
  validator: ${this.validator}
  transactions: ${this.transactions.length}
  previousHash: ${this.previousHash.substring(0, 16)}...
  merkleRoot: ${this.merkleRoot.substring(0, 16)}...
  hash: ${this.hash.substring(0, 16)}...
  totalFees: ${this.getTotalFees()}
  totalVolume: ${this.getTotalVolume()}
  size: ${this.getSize()} bytes
}`;
  }

  /**
   * Clone the block
   * @returns New Block instance with same data
   */
  clone(): Block {
    return new Block({
      number: this.number,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.clone()),
      previousHash: this.previousHash,
      validator: this.validator,
      hash: this.hash,
      merkleRoot: this.merkleRoot
    });
  }
}
