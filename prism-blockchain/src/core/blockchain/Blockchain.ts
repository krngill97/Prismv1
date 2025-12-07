import { Block } from './Block.js';
import { Transaction } from '../transaction/Transaction.js';
import { Account, AccountData } from '../account/Account.js';
import { Level } from 'level';

/**
 * Genesis configuration
 */
const GENESIS_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const GENESIS_SUPPLY = BigInt(1_000_000_000); // 1 billion PRISM tokens

/**
 * Blockchain configuration options
 */
export interface BlockchainConfig {
  nodeId: string;
  dbPath?: string;
}

/**
 * Blockchain class managing the distributed ledger
 *
 * Features:
 * - Genesis block with initial token supply
 * - Account state management with BigInt balances
 * - Transaction execution with nonce validation
 * - LevelDB persistence for blocks and accounts
 * - Mempool for pending transactions
 * - Chain validation and reorganization
 */
export class Blockchain {
  private chain: Block[];
  private accounts: Map<string, Account>;
  private pendingTransactions: Transaction[];
  private db: Level<string, string>;
  private nodeId: string;
  private initialized: boolean;

  /**
   * Create a new Blockchain instance
   * @param config Blockchain configuration
   */
  constructor(config: BlockchainConfig | string) {
    // Support both new API and legacy string parameter
    if (typeof config === 'string') {
      this.nodeId = config;
      this.db = new Level('./data/blockchain', { valueEncoding: 'utf8' });
    } else {
      this.nodeId = config.nodeId;
      this.db = new Level(config.dbPath || `./data/blockchain-${config.nodeId}`, {
        valueEncoding: 'utf8'
      });
    }

    this.chain = [];
    this.accounts = new Map();
    this.pendingTransactions = [];
    this.initialized = false;
  }

  /**
   * Initialize the blockchain
   * Loads existing chain or creates genesis block
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.db.open();
    } catch (error) {
      // DB already open or error opening
    }

    try {
      // Try to load existing blockchain
      const latestBlockNumber = await this.db.get('latestBlockNumber');
      await this.loadChain(parseInt(latestBlockNumber));
      await this.loadAccounts();

      console.log(`[${this.nodeId}] Loaded blockchain with ${this.chain.length} blocks`);
    } catch (error) {
      // No existing blockchain, create genesis
      console.log(`[${this.nodeId}] Creating genesis block...`);
      await this.createGenesisBlock();
    }

    this.initialized = true;
  }

  /**
   * Create the genesis block with initial token supply
   */
  private async createGenesisBlock(): Promise<void> {
    // Create genesis account with initial supply
    const genesisAccount = Account.createGenesisAccount(GENESIS_ADDRESS, GENESIS_SUPPLY);
    this.accounts.set(GENESIS_ADDRESS, genesisAccount);

    // Create genesis block
    const genesisBlock = Block.createGenesis(this.nodeId);

    this.chain.push(genesisBlock);

    // Save to database
    await this.saveBlock(genesisBlock);
    await this.saveAccount(genesisAccount);
    await this.db.put('latestBlockNumber', '0');

    console.log(`[${this.nodeId}] Genesis block created with ${GENESIS_SUPPLY} PRISM tokens`);
  }

  /**
   * Load the blockchain from database
   * @param latestBlockNumber Latest block number to load
   */
  private async loadChain(latestBlockNumber: number): Promise<void> {
    for (let i = 0; i <= latestBlockNumber; i++) {
      const blockData = await this.db.get(`block-${i}`);
      const block = Block.fromJSON(JSON.parse(blockData));
      this.chain.push(block);
    }
  }

  /**
   * Load all accounts from database
   */
  async loadAccounts(): Promise<void> {
    try {
      const accountsList = await this.db.get('accounts-list');
      const addresses: string[] = JSON.parse(accountsList);

      for (const address of addresses) {
        const accountData = await this.db.get(`account-${address}`);
        const account = Account.fromJSON(JSON.parse(accountData));
        this.accounts.set(address, account);
      }

      console.log(`[${this.nodeId}] Loaded ${this.accounts.size} accounts`);
    } catch (error) {
      // No accounts yet
      console.log(`[${this.nodeId}] No existing accounts found`);
    }
  }

  /**
   * Save a block to the database
   * @param block Block to save
   */
  private async saveBlock(block: Block): Promise<void> {
    await this.db.put(`block-${block.number}`, JSON.stringify(block.toJSON()));
    await this.db.put('latestBlockNumber', block.number.toString());
  }

  /**
   * Save an account to the database
   * @param account Account to save
   */
  async saveAccount(account: Account): Promise<void> {
    await this.db.put(`account-${account.address}`, JSON.stringify(account.toJSON()));

    // Update accounts list
    try {
      const accountsList = await this.db.get('accounts-list');
      const addresses: string[] = JSON.parse(accountsList);
      if (!addresses.includes(account.address)) {
        addresses.push(account.address);
        await this.db.put('accounts-list', JSON.stringify(addresses));
      }
    } catch (error) {
      // First account
      await this.db.put('accounts-list', JSON.stringify([account.address]));
    }
  }

  /**
   * Save all accounts to database
   */
  private async saveAllAccounts(): Promise<void> {
    const addresses: string[] = [];

    for (const [address, account] of this.accounts) {
      await this.db.put(`account-${address}`, JSON.stringify(account.toJSON()));
      addresses.push(address);
    }

    await this.db.put('accounts-list', JSON.stringify(addresses));
  }

  /**
   * Get the latest block in the chain
   * @returns Latest block
   */
  getLatestBlock(): Block {
    if (this.chain.length === 0) {
      throw new Error('Blockchain not initialized');
    }
    return this.chain[this.chain.length - 1];
  }

  /**
   * Get a block by its number (height)
   * @param number Block number
   * @returns Block or null if not found
   */
  getBlock(number: number): Block | null {
    return this.chain[number] || null;
  }

  /**
   * Get the total number of blocks in the chain
   * @returns Chain length
   */
  getChainLength(): number {
    return this.chain.length;
  }

  /**
   * Get the entire blockchain
   * @returns Array of all blocks
   */
  getChain(): Block[] {
    return this.chain;
  }

  /**
   * Get an account by address, creates new account if doesn't exist
   * @param address Account address
   * @returns Account instance
   */
  getAccount(address: string): Account {
    if (!this.accounts.has(address)) {
      const account = Account.createEmpty(address);
      this.accounts.set(address, account);
    }
    return this.accounts.get(address)!;
  }

  /**
   * Get all accounts
   * @returns Map of all accounts
   */
  getAllAccounts(): Map<string, Account> {
    return new Map(this.accounts);
  }

  /**
   * Add a transaction to the mempool
   * Validates the transaction before adding
   * @param tx Transaction to add
   * @returns True if added successfully
   */
  async addTransaction(tx: Transaction): Promise<boolean> {
    // Basic validation
    if (!tx.isValid()) {
      console.log(`[${this.nodeId}] Transaction invalid: basic validation failed`);
      return false;
    }

    // Verify signature
    const signatureValid = await tx.verify();
    if (!signatureValid) {
      console.log(`[${this.nodeId}] Transaction invalid: signature verification failed`);
      return false;
    }

    // Check if transaction already exists in mempool
    if (this.pendingTransactions.some(t => t.hash === tx.hash)) {
      console.log(`[${this.nodeId}] Transaction already in mempool`);
      return false;
    }

    // Check sender has sufficient balance
    const sender = this.getAccount(tx.from);
    const totalCost = tx.getTotalCost();

    if (!sender.hasBalance(totalCost)) {
      console.log(`[${this.nodeId}] Transaction invalid: insufficient balance`);
      return false;
    }

    // Check nonce
    if (tx.nonce !== sender.nonce) {
      console.log(`[${this.nodeId}] Transaction invalid: nonce mismatch (expected ${sender.nonce}, got ${tx.nonce})`);
      return false;
    }

    // Add to mempool
    this.pendingTransactions.push(tx);
    console.log(`[${this.nodeId}] Transaction added to mempool: ${tx.hash.substring(0, 16)}...`);

    return true;
  }

  /**
   * Get pending transactions for batching
   * @param limit Maximum number of transactions to return
   * @returns Array of pending transactions
   */
  getPendingTransactions(limit: number): Transaction[] {
    return this.pendingTransactions.slice(0, limit);
  }

  /**
   * Get the number of pending transactions
   * @returns Mempool size
   */
  getPendingTransactionCount(): number {
    return this.pendingTransactions.length;
  }

  /**
   * Remove transactions from mempool
   * @param txHashes Array of transaction hashes to remove
   */
  private removePendingTransactions(txHashes: string[]): void {
    const hashSet = new Set(txHashes);
    this.pendingTransactions = this.pendingTransactions.filter(
      tx => !hashSet.has(tx.hash)
    );
  }

  /**
   * Execute a single transaction
   * Updates account balances and nonces
   * @param tx Transaction to execute
   * @returns True if execution successful
   */
  executeTransaction(tx: Transaction): boolean {
    const sender = this.getAccount(tx.from);
    const receiver = this.getAccount(tx.to);

    // Verify nonce
    if (sender.nonce !== tx.nonce) {
      console.log(`[${this.nodeId}] Transaction execution failed: invalid nonce`);
      return false;
    }

    // Calculate total cost (amount + fee)
    const totalCost = tx.getTotalCost();

    // Verify sufficient balance
    if (!sender.hasBalance(totalCost)) {
      console.log(`[${this.nodeId}] Transaction execution failed: insufficient balance`);
      return false;
    }

    // Execute transaction
    const deducted = sender.subtractBalance(totalCost);
    if (!deducted) {
      console.log(`[${this.nodeId}] Transaction execution failed: balance deduction failed`);
      return false;
    }

    receiver.addBalance(tx.amount);
    sender.incrementNonce();

    // Note: Fees go to validator (could be implemented as validator reward)

    return true;
  }

  /**
   * Validate a block before adding to chain
   * @param block Block to validate
   * @returns True if block is valid
   */
  async validateBlock(block: Block): Promise<boolean> {
    const latestBlock = this.getLatestBlock();

    // Check block number
    if (block.number !== latestBlock.number + 1) {
      console.log(`[${this.nodeId}] Block validation failed: invalid block number`);
      return false;
    }

    // Check previous hash
    if (block.previousHash !== latestBlock.hash) {
      console.log(`[${this.nodeId}] Block validation failed: invalid previous hash`);
      return false;
    }

    // Check timestamp
    if (block.timestamp <= latestBlock.timestamp) {
      console.log(`[${this.nodeId}] Block validation failed: invalid timestamp`);
      return false;
    }

    // Verify block hash
    if (!block.verifyHash()) {
      console.log(`[${this.nodeId}] Block validation failed: invalid hash`);
      return false;
    }

    // Verify merkle root
    if (!block.verifyMerkleRoot()) {
      console.log(`[${this.nodeId}] Block validation failed: invalid merkle root`);
      return false;
    }

    // Verify all transaction signatures
    const transactionsValid = await block.verifyTransactions();
    if (!transactionsValid) {
      console.log(`[${this.nodeId}] Block validation failed: invalid transactions`);
      return false;
    }

    return true;
  }

  /**
   * Add a block to the blockchain
   * Validates and executes all transactions
   * @param block Block to add
   * @returns True if block was added successfully
   */
  async addBlock(block: Block): Promise<boolean> {
    // Validate block
    const isValid = await this.validateBlock(block);
    if (!isValid) {
      return false;
    }

    // Create snapshots for rollback
    const accountSnapshots = new Map<string, AccountData>();
    for (const [address, account] of this.accounts) {
      accountSnapshots.set(address, account.snapshot());
    }

    try {
      // Execute all transactions
      for (const tx of block.transactions) {
        const executed = this.executeTransaction(tx);
        if (!executed) {
          throw new Error(`Failed to execute transaction ${tx.hash}`);
        }
      }

      // Add block to chain
      this.chain.push(block);

      // Save to database
      await this.saveBlock(block);
      await this.saveAllAccounts();

      // Remove transactions from mempool
      const txHashes = block.transactions.map(tx => tx.hash);
      this.removePendingTransactions(txHashes);

      console.log(`[${this.nodeId}] Block #${block.number} added to chain (${block.transactions.length} txs)`);

      return true;
    } catch (error) {
      // Rollback account state
      console.log(`[${this.nodeId}] Rolling back block execution: ${error}`);

      for (const [address, snapshot] of accountSnapshots) {
        const account = this.getAccount(address);
        account.restore(snapshot);
      }

      return false;
    }
  }

  /**
   * Validate the entire blockchain
   * @returns True if chain is valid
   */
  async isChainValid(): Promise<boolean> {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Basic validation
      if (!currentBlock.isValid(previousBlock)) {
        return false;
      }

      // Verify transaction signatures
      const transactionsValid = await currentBlock.verifyTransactions();
      if (!transactionsValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Replace the current chain with a new chain
   * Used for chain reorganization
   * @param newChain New blockchain
   * @returns True if replacement successful
   */
  async replaceChain(newChain: Block[]): Promise<boolean> {
    // New chain must be longer
    if (newChain.length <= this.chain.length) {
      console.log(`[${this.nodeId}] Chain replacement failed: new chain not longer`);
      return false;
    }

    // Validate new chain
    for (let i = 1; i < newChain.length; i++) {
      const currentBlock = newChain[i];
      const previousBlock = newChain[i - 1];

      if (!currentBlock.isValid(previousBlock)) {
        console.log(`[${this.nodeId}] Chain replacement failed: invalid block at height ${i}`);
        return false;
      }

      const transactionsValid = await currentBlock.verifyTransactions();
      if (!transactionsValid) {
        console.log(`[${this.nodeId}] Chain replacement failed: invalid transactions at height ${i}`);
        return false;
      }
    }

    console.log(`[${this.nodeId}] Replacing chain (${this.chain.length} -> ${newChain.length} blocks)`);

    // Reset state
    this.chain = [];
    this.accounts.clear();
    this.pendingTransactions = [];

    // Replay all blocks
    for (const block of newChain) {
      if (block.number === 0) {
        // Genesis block
        this.chain.push(block);
        const genesisAccount = Account.createGenesisAccount(GENESIS_ADDRESS, GENESIS_SUPPLY);
        this.accounts.set(GENESIS_ADDRESS, genesisAccount);
      } else {
        // Execute transactions
        for (const tx of block.transactions) {
          this.executeTransaction(tx);
        }
        this.chain.push(block);
      }
    }

    // Save to database
    for (const block of this.chain) {
      await this.saveBlock(block);
    }
    await this.saveAllAccounts();

    console.log(`[${this.nodeId}] Chain replacement complete`);

    return true;
  }

  /**
   * Get blockchain statistics
   * @returns Statistics object
   */
  getStats(): {
    blocks: number;
    accounts: number;
    pendingTransactions: number;
    totalSupply: bigint;
  } {
    let totalSupply = BigInt(0);
    for (const account of this.accounts.values()) {
      totalSupply += account.balance;
    }

    return {
      blocks: this.chain.length,
      accounts: this.accounts.size,
      pendingTransactions: this.pendingTransactions.length,
      totalSupply
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Get the node ID
   * @returns Node identifier
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Check if blockchain is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
