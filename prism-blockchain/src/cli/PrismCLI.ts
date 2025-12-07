/**
 * Prism CLI - Command Line Interface for Prism Blockchain
 *
 * Provides commands for interacting with the blockchain:
 * - Account management (generate keys, check balance)
 * - Transaction creation and submission
 * - Blockchain queries
 */

import { generateKeyPair, KeyPair, publicKeyToAddress } from '../utils/crypto.js';
import { Transaction } from '../core/transaction/Transaction.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI Configuration
 */
export interface CLIConfig {
  rpcUrl?: string;
  keystorePath?: string;
}

/**
 * Prism CLI
 *
 * Command-line interface for interacting with Prism blockchain
 */
export class PrismCLI {
  private config: CLIConfig;
  private keystorePath: string;

  constructor(config: CLIConfig = {}) {
    this.config = config;
    this.keystorePath = config.keystorePath || path.join(process.cwd(), '.prism-keystore');

    // Ensure keystore directory exists
    if (!fs.existsSync(this.keystorePath)) {
      fs.mkdirSync(this.keystorePath, { recursive: true });
    }
  }

  /**
   * Generate a new key pair and save to keystore
   * @param name Account name
   * @returns Generated key pair
   */
  async generateAccount(name: string): Promise<KeyPair> {
    const keys = await generateKeyPair();
    const address = publicKeyToAddress(keys.publicKey);

    // Save to keystore
    const accountPath = path.join(this.keystorePath, `${name}.json`);
    const accountData = {
      name,
      address,
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      createdAt: Date.now()
    };

    fs.writeFileSync(accountPath, JSON.stringify(accountData, null, 2));

    console.log(`Account created: ${name}`);
    console.log(`Address: ${address}`);
    console.log(`Public Key: ${keys.publicKey}`);
    console.log(`Saved to: ${accountPath}`);

    return keys;
  }

  /**
   * Load account from keystore
   * @param name Account name
   * @returns Key pair or null if not found
   */
  loadAccount(name: string): KeyPair | null {
    const accountPath = path.join(this.keystorePath, `${name}.json`);

    if (!fs.existsSync(accountPath)) {
      return null;
    }

    const accountData = JSON.parse(fs.readFileSync(accountPath, 'utf-8'));
    return {
      publicKey: accountData.publicKey,
      privateKey: accountData.privateKey
    };
  }

  /**
   * List all accounts in keystore
   * @returns Array of account info
   */
  listAccounts(): Array<{ name: string; address: string; publicKey: string }> {
    const files = fs.readdirSync(this.keystorePath);
    const accounts = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const accountPath = path.join(this.keystorePath, file);
        const accountData = JSON.parse(fs.readFileSync(accountPath, 'utf-8'));
        accounts.push({
          name: accountData.name,
          address: accountData.address,
          publicKey: accountData.publicKey
        });
      }
    }

    return accounts;
  }

  /**
   * Create and sign a transaction
   * @param from Account name (must exist in keystore)
   * @param to Recipient public key or address
   * @param amount Amount to send
   * @param fee Transaction fee
   * @param nonce Transaction nonce
   * @returns Signed transaction
   */
  async createTransaction(
    from: string,
    to: string,
    amount: bigint,
    fee: bigint,
    nonce: number
  ): Promise<Transaction> {
    const keys = this.loadAccount(from);
    if (!keys) {
      throw new Error(`Account not found: ${from}`);
    }

    const tx = new Transaction({
      from: keys.publicKey,
      to: to,
      amount: amount,
      nonce: nonce,
      timestamp: Date.now(),
      fee: fee
    });

    await tx.sign(keys.privateKey);
    return tx;
  }

  /**
   * Send transaction to RPC server
   * @param transaction Transaction to send
   * @returns Transaction hash or null if failed
   */
  async sendTransaction(transaction: Transaction): Promise<string | null> {
    const rpcUrl = this.config.rpcUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${rpcUrl}/api/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transaction.toJSON())
      });

      const result = await response.json() as any;

      if (result.success) {
        return result.hash;
      } else {
        console.error('Transaction rejected:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Failed to send transaction:', error);
      return null;
    }
  }

  /**
   * Get account balance from RPC server
   * @param address Account address or public key
   * @returns Balance or null if failed
   */
  async getBalance(address: string): Promise<bigint | null> {
    const rpcUrl = this.config.rpcUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${rpcUrl}/api/account/${address}/balance`);
      const result = await response.json() as any;

      if (result.balance !== undefined) {
        return BigInt(result.balance);
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  }

  /**
   * Get account nonce from RPC server
   * @param address Account address or public key
   * @returns Nonce or null if failed
   */
  async getNonce(address: string): Promise<number | null> {
    const rpcUrl = this.config.rpcUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${rpcUrl}/api/account/${address}/nonce`);
      const result = await response.json() as any;

      if (result.nonce !== undefined) {
        return result.nonce;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to get nonce:', error);
      return null;
    }
  }

  /**
   * Get latest block from RPC server
   * @returns Block data or null if failed
   */
  async getLatestBlock(): Promise<any | null> {
    const rpcUrl = this.config.rpcUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${rpcUrl}/api/block/latest`);
      const result = await response.json() as any;
      return result;
    } catch (error) {
      console.error('Failed to get latest block:', error);
      return null;
    }
  }

  /**
   * Get block by index from RPC server
   * @param index Block index
   * @returns Block data or null if failed
   */
  async getBlock(index: number): Promise<any | null> {
    const rpcUrl = this.config.rpcUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${rpcUrl}/api/block/${index}`);
      const result = await response.json() as any;
      return result.error ? null : result;
    } catch (error) {
      console.error('Failed to get block:', error);
      return null;
    }
  }

  /**
   * Get validator stats from RPC server
   * @returns Stats or null if failed
   */
  async getStats(): Promise<any | null> {
    const rpcUrl = this.config.rpcUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${rpcUrl}/api/stats`);
      const result = await response.json() as any;
      return result;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * RPC call helper
   * @param method RPC method name
   * @param params Method parameters
   * @returns Result or null if failed
   */
  async rpcCall(method: string, params?: any): Promise<any | null> {
    const rpcUrl = this.config.rpcUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${rpcUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        })
      });

      const result = await response.json() as any;

      if (result.error) {
        console.error('RPC Error:', result.error);
        return null;
      }

      return result.result;
    } catch (error) {
      console.error('RPC call failed:', error);
      return null;
    }
  }

  /**
   * Export account to JSON
   * @param name Account name
   * @returns Account data or null if not found
   */
  exportAccount(name: string): any | null {
    const accountPath = path.join(this.keystorePath, `${name}.json`);

    if (!fs.existsSync(accountPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(accountPath, 'utf-8'));
  }

  /**
   * Import account from JSON
   * @param accountData Account data
   */
  importAccount(accountData: any): void {
    const accountPath = path.join(this.keystorePath, `${accountData.name}.json`);
    fs.writeFileSync(accountPath, JSON.stringify(accountData, null, 2));
    console.log(`Account imported: ${accountData.name}`);
  }

  /**
   * Delete account from keystore
   * @param name Account name
   */
  deleteAccount(name: string): boolean {
    const accountPath = path.join(this.keystorePath, `${name}.json`);

    if (!fs.existsSync(accountPath)) {
      return false;
    }

    fs.unlinkSync(accountPath);
    return true;
  }

  /**
   * Get keystore path
   */
  getKeystorePath(): string {
    return this.keystorePath;
  }

  /**
   * Set RPC URL
   */
  setRpcUrl(url: string): void {
    this.config.rpcUrl = url;
  }

  /**
   * Get RPC URL
   */
  getRpcUrl(): string {
    return this.config.rpcUrl || 'http://localhost:3000';
  }
}
