/**
 * Account data structure for serialization
 */
export interface AccountData {
  address: string;
  balance: string;  // bigint as string for JSON compatibility
  nonce: number;
  code: string;
  storage: Record<string, string>;  // Map serialized as object
}

/**
 * Account constructor parameters
 */
export interface AccountParams {
  address: string;
  balance?: bigint;
  nonce?: number;
  code?: string;
  storage?: Map<string, string>;
}

/**
 * Account class representing a blockchain account
 *
 * Features:
 * - BigInt balance for precise arithmetic
 * - Nonce for transaction ordering
 * - Code storage for future smart contracts
 * - Key-value storage for contract state
 * - Full serialization support
 */
export class Account {
  public readonly address: string;
  public balance: bigint;
  public nonce: number;
  public code: string;
  public storage: Map<string, string>;

  /**
   * Create a new Account
   * @param params Account parameters
   */
  constructor(params: AccountParams | string, balance?: bigint, nonce?: number) {
    // Support both object and positional parameters for backward compatibility
    if (typeof params === 'string') {
      this.address = params;
      this.balance = balance ?? BigInt(0);
      this.nonce = nonce ?? 0;
      this.code = '';
      this.storage = new Map();
    } else {
      this.address = params.address;
      this.balance = params.balance ?? BigInt(0);
      this.nonce = params.nonce ?? 0;
      this.code = params.code ?? '';
      this.storage = params.storage ?? new Map();
    }
  }

  /**
   * Add balance to the account
   * @param amount Amount to add (must be positive)
   * @returns True if successful
   * @throws Error if amount is not positive
   */
  addBalance(amount: bigint): boolean {
    if (amount <= BigInt(0)) {
      throw new Error('Amount must be positive');
    }

    this.balance += amount;
    return true;
  }

  /**
   * Subtract balance from the account
   * @param amount Amount to subtract (must be positive)
   * @returns True if successful, false if insufficient balance
   */
  subtractBalance(amount: bigint): boolean {
    if (amount <= BigInt(0)) {
      throw new Error('Amount must be positive');
    }

    if (this.balance < amount) {
      return false;  // Insufficient balance
    }

    this.balance -= amount;
    return true;
  }

  /**
   * Check if account has sufficient balance
   * @param amount Amount to check
   * @returns True if balance is sufficient
   */
  hasBalance(amount: bigint): boolean {
    return this.balance >= amount;
  }

  /**
   * Increment the account nonce
   * Used after each transaction from this account
   */
  incrementNonce(): void {
    this.nonce++;
  }

  /**
   * Get the current nonce
   * @returns Current nonce value
   */
  getNonce(): number {
    return this.nonce;
  }

  /**
   * Set contract code (for smart contracts)
   * @param code Contract bytecode or source
   */
  setCode(code: string): void {
    this.code = code;
  }

  /**
   * Get contract code
   * @returns Contract code or empty string
   */
  getCode(): string {
    return this.code;
  }

  /**
   * Check if this is a contract account
   * @returns True if account has code
   */
  isContract(): boolean {
    return this.code.length > 0;
  }

  /**
   * Set a storage value
   * @param key Storage key
   * @param value Storage value
   */
  setStorage(key: string, value: string): void {
    this.storage.set(key, value);
  }

  /**
   * Get a storage value
   * @param key Storage key
   * @returns Storage value or undefined
   */
  getStorage(key: string): string | undefined {
    return this.storage.get(key);
  }

  /**
   * Check if storage key exists
   * @param key Storage key
   * @returns True if key exists
   */
  hasStorage(key: string): boolean {
    return this.storage.has(key);
  }

  /**
   * Delete a storage value
   * @param key Storage key
   * @returns True if key was deleted
   */
  deleteStorage(key: string): boolean {
    return this.storage.delete(key);
  }

  /**
   * Clear all storage
   */
  clearStorage(): void {
    this.storage.clear();
  }

  /**
   * Get all storage entries
   * @returns Array of [key, value] pairs
   */
  getAllStorage(): [string, string][] {
    return Array.from(this.storage.entries());
  }

  /**
   * Get the number of storage entries
   * @returns Storage size
   */
  getStorageSize(): number {
    return this.storage.size;
  }

  /**
   * Check if account is empty (zero balance, no code, no storage)
   * @returns True if account is empty
   */
  isEmpty(): boolean {
    return this.balance === BigInt(0) &&
           this.code.length === 0 &&
           this.storage.size === 0;
  }

  /**
   * Serialize account to JSON
   * BigInt values are converted to strings for JSON compatibility
   * Map is converted to object
   * @returns AccountData object
   */
  toJSON(): AccountData {
    const storageObj: Record<string, string> = {};
    for (const [key, value] of this.storage.entries()) {
      storageObj[key] = value;
    }

    return {
      address: this.address,
      balance: this.balance.toString(),
      nonce: this.nonce,
      code: this.code,
      storage: storageObj
    };
  }

  /**
   * Deserialize account from JSON
   * String balance is converted back to BigInt
   * Storage object is converted back to Map
   * @param data AccountData object
   * @returns New Account instance
   */
  static fromJSON(data: AccountData): Account {
    const storage = new Map<string, string>();
    if (data.storage) {
      for (const [key, value] of Object.entries(data.storage)) {
        storage.set(key, value);
      }
    }

    return new Account({
      address: data.address,
      balance: BigInt(data.balance),
      nonce: data.nonce,
      code: data.code || '',
      storage
    });
  }

  /**
   * Create a genesis account with initial balance
   * @param address Account address
   * @param balance Initial balance
   * @returns New Account instance
   */
  static createGenesisAccount(address: string, balance: bigint): Account {
    return new Account({
      address,
      balance,
      nonce: 0,
      code: '',
      storage: new Map()
    });
  }

  /**
   * Create an empty account
   * @param address Account address
   * @returns New Account instance with zero balance
   */
  static createEmpty(address: string): Account {
    return new Account({
      address,
      balance: BigInt(0),
      nonce: 0,
      code: '',
      storage: new Map()
    });
  }

  /**
   * Clone the account
   * @returns New Account instance with same data
   */
  clone(): Account {
    const storageClone = new Map<string, string>();
    for (const [key, value] of this.storage.entries()) {
      storageClone.set(key, value);
    }

    return new Account({
      address: this.address,
      balance: this.balance,
      nonce: this.nonce,
      code: this.code,
      storage: storageClone
    });
  }

  /**
   * Create a string representation of the account
   * @returns Human-readable account string
   */
  toString(): string {
    const storageInfo = this.storage.size > 0
      ? `\n  storage: ${this.storage.size} entries`
      : '';

    return `Account {
  address: ${this.address.substring(0, 20)}...
  balance: ${this.balance}
  nonce: ${this.nonce}
  code: ${this.code.length > 0 ? `${this.code.length} bytes` : 'none'}${storageInfo}
}`;
  }

  /**
   * Compare two accounts for equality
   * @param other Account to compare with
   * @returns True if accounts are equal
   */
  equals(other: Account): boolean {
    if (this.address !== other.address) return false;
    if (this.balance !== other.balance) return false;
    if (this.nonce !== other.nonce) return false;
    if (this.code !== other.code) return false;
    if (this.storage.size !== other.storage.size) return false;

    for (const [key, value] of this.storage.entries()) {
      if (other.storage.get(key) !== value) return false;
    }

    return true;
  }

  /**
   * Create a snapshot of the account for rollback purposes
   * @returns AccountData snapshot
   */
  snapshot(): AccountData {
    return this.toJSON();
  }

  /**
   * Restore account from a snapshot
   * @param snapshot AccountData snapshot
   */
  restore(snapshot: AccountData): void {
    this.balance = BigInt(snapshot.balance);
    this.nonce = snapshot.nonce;
    this.code = snapshot.code;

    this.storage.clear();
    if (snapshot.storage) {
      for (const [key, value] of Object.entries(snapshot.storage)) {
        this.storage.set(key, value);
      }
    }
  }
}
