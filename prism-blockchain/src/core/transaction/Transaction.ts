import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import * as ed25519 from '@noble/ed25519';

/**
 * Transaction data structure for serialization
 */
export interface TransactionData {
  from: string;
  to: string;
  amount: string;  // bigint as string for JSON compatibility
  nonce: number;
  timestamp: number;
  fee: string;     // bigint as string for JSON compatibility
  signature?: string;
  hash?: string;
}

/**
 * Transaction constructor parameters
 */
export interface TransactionParams {
  from: string;
  to: string;
  amount: bigint;
  nonce: number;
  timestamp: number;
  fee?: bigint;
  signature?: string;
  hash?: string;
}

/**
 * Transaction class representing a blockchain transaction
 *
 * Features:
 * - Ed25519 signature verification
 * - SHA256 transaction hashing
 * - BigInt support for amounts and fees
 * - Full serialization support
 */
export class Transaction {
  public readonly from: string;
  public readonly to: string;
  public readonly amount: bigint;
  public readonly nonce: number;
  public readonly timestamp: number;
  public readonly fee: bigint;
  public signature: string;
  public hash: string;

  /**
   * Create a new Transaction
   * @param params Transaction parameters
   */
  constructor(params: TransactionParams) {
    this.from = params.from;
    this.to = params.to;
    this.amount = params.amount;
    this.nonce = params.nonce;
    this.timestamp = params.timestamp;
    this.fee = params.fee ?? BigInt(1000);
    this.signature = params.signature || '';
    this.hash = params.hash || this.calculateHash();
  }

  /**
   * Calculate SHA256 hash of the transaction data
   * Hash includes: from, to, amount, nonce, timestamp, fee
   * Does NOT include signature (to allow signing the hash)
   * @returns Hex string of the transaction hash
   */
  calculateHash(): string {
    const data = `${this.from}${this.to}${this.amount.toString()}${this.nonce}${this.timestamp}${this.fee.toString()}`;
    const hashBytes = sha256(new TextEncoder().encode(data));
    return bytesToHex(hashBytes);
  }

  /**
   * Sign the transaction with a private key using Ed25519
   * @param privateKey Hex string of the private key
   * @returns Promise resolving to the signature hex string
   */
  async sign(privateKey: string): Promise<string> {
    try {
      const privateKeyBytes = hexToBytes(privateKey);
      const messageBytes = hexToBytes(this.hash);

      const signatureBytes = await ed25519.signAsync(messageBytes, privateKeyBytes);
      this.signature = bytesToHex(signatureBytes);

      return this.signature;
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Set the transaction signature
   * @param signature Hex string of the signature
   */
  setSignature(signature: string): void {
    this.signature = signature;
    this.hash = this.calculateHash();
  }

  /**
   * Verify the transaction signature using Ed25519
   * Validates that the signature was created by the owner of the 'from' address
   * @returns Promise resolving to true if signature is valid, false otherwise
   */
  async verify(): Promise<boolean> {
    if (!this.signature || this.signature.length === 0) {
      return false;
    }

    if (!this.from || this.from.length === 0) {
      return false;
    }

    try {
      const publicKeyBytes = hexToBytes(this.from);
      const signatureBytes = hexToBytes(this.signature);
      const messageBytes = hexToBytes(this.hash);

      const isValid = await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
      return isValid;
    } catch (error) {
      // Invalid signature format or verification error
      return false;
    }
  }

  /**
   * Verify the transaction hash matches the calculated hash
   * @returns True if hash is valid
   */
  verifyHash(): boolean {
    return this.hash === this.calculateHash();
  }

  /**
   * Basic validation checks for the transaction
   * - Has valid signature
   * - Amount is positive
   * - Fee is non-negative
   * - Has valid addresses
   * - Hash is correct
   *
   * Note: This does NOT verify the cryptographic signature.
   * Use verify() for signature verification.
   *
   * @returns True if transaction passes basic validation
   */
  isValid(): boolean {
    // Must have signature
    if (!this.signature || this.signature.length === 0) {
      return false;
    }

    // Amount must be positive
    if (this.amount <= BigInt(0)) {
      return false;
    }

    // Fee must be non-negative
    if (this.fee < BigInt(0)) {
      return false;
    }

    // Must have valid addresses
    if (!this.from || this.from.length === 0) {
      return false;
    }

    if (!this.to || this.to.length === 0) {
      return false;
    }

    // Verify hash is correct
    if (!this.verifyHash()) {
      return false;
    }

    return true;
  }

  /**
   * Get the total cost of the transaction (amount + fee)
   * @returns Total cost as bigint
   */
  getTotalCost(): bigint {
    return this.amount + this.fee;
  }

  /**
   * Serialize transaction to JSON
   * BigInt values are converted to strings for JSON compatibility
   * @returns TransactionData object
   */
  toJSON(): TransactionData {
    return {
      from: this.from,
      to: this.to,
      amount: this.amount.toString(),
      nonce: this.nonce,
      timestamp: this.timestamp,
      fee: this.fee.toString(),
      signature: this.signature,
      hash: this.hash
    };
  }

  /**
   * Deserialize transaction from JSON
   * String amounts are converted back to BigInt
   * @param data TransactionData object
   * @returns New Transaction instance
   */
  static fromJSON(data: TransactionData): Transaction {
    return new Transaction({
      from: data.from,
      to: data.to,
      amount: BigInt(data.amount),
      nonce: data.nonce,
      timestamp: data.timestamp,
      fee: BigInt(data.fee),
      signature: data.signature,
      hash: data.hash
    });
  }

  /**
   * Create a string representation of the transaction
   * @returns Human-readable transaction string
   */
  toString(): string {
    return `Transaction {
  from: ${this.from.substring(0, 10)}...
  to: ${this.to.substring(0, 10)}...
  amount: ${this.amount}
  fee: ${this.fee}
  nonce: ${this.nonce}
  timestamp: ${this.timestamp}
  hash: ${this.hash.substring(0, 16)}...
  signed: ${this.signature.length > 0}
}`;
  }

  /**
   * Clone the transaction
   * @returns New Transaction instance with same data
   */
  clone(): Transaction {
    return new Transaction({
      from: this.from,
      to: this.to,
      amount: this.amount,
      nonce: this.nonce,
      timestamp: this.timestamp,
      fee: this.fee,
      signature: this.signature,
      hash: this.hash
    });
  }
}
