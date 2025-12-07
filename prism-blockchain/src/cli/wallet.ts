#!/usr/bin/env node

import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { Transaction } from '../core/transaction/Transaction.js';

/**
 * CLI Configuration
 */
interface CLIConfig {
  rpcUrl: string;
  command: string;
  args: string[];
}

/**
 * Wallet data structure
 */
interface Wallet {
  address: string;
  publicKey: string;
  privateKey: string;
}

/**
 * RPC client for blockchain interaction
 */
class RPCClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make JSON-RPC 2.0 request
   */
  private async rpcRequest(method: string, params: any[] = []): Promise<any> {
    const response = await fetch(`${this.baseUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as any;

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<bigint> {
    const result = await this.rpcRequest('getBalance', [address]);
    return BigInt(result);
  }

  /**
   * Get account details
   */
  async getAccount(address: string): Promise<any> {
    return await this.rpcRequest('getAccount', [address]);
  }

  /**
   * Send transaction
   */
  async sendTransaction(tx: any): Promise<any> {
    return await this.rpcRequest('sendTransaction', [tx]);
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string): Promise<any> {
    return await this.rpcRequest('getTransaction', [hash]);
  }

  /**
   * Get block by number
   */
  async getBlock(number: number): Promise<any> {
    return await this.rpcRequest('getBlock', [number]);
  }

  /**
   * Get latest block
   */
  async getLatestBlock(): Promise<any> {
    return await this.rpcRequest('getLatestBlock', []);
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<any> {
    return await this.rpcRequest('getNetworkStats', []);
  }

  /**
   * Get chain length
   */
  async getChainLength(): Promise<number> {
    return await this.rpcRequest('getChainLength', []);
  }
}

/**
 * CLI Wallet Tool
 */
class WalletCLI {
  private rpcClient: RPCClient;

  constructor(rpcUrl: string) {
    this.rpcClient = new RPCClient(rpcUrl);
  }

  /**
   * Generate new wallet (keypair)
   */
  generateWallet(): Wallet {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    const address = this.deriveAddress(publicKey);

    return {
      address,
      publicKey: bytesToHex(publicKey),
      privateKey: bytesToHex(privateKey),
    };
  }

  /**
   * Import wallet from private key
   */
  importWallet(privateKeyHex: string): Wallet {
    const privateKey = hexToBytes(privateKeyHex);
    const publicKey = ed25519.getPublicKey(privateKey);
    const address = this.deriveAddress(publicKey);

    return {
      address,
      publicKey: bytesToHex(publicKey),
      privateKey: privateKeyHex,
    };
  }

  /**
   * Derive address from public key
   */
  private deriveAddress(publicKey: Uint8Array): string {
    const hash = sha256(publicKey);
    return '0x' + bytesToHex(hash.slice(0, 20));
  }

  /**
   * Get balance for address
   */
  async getBalance(address: string): Promise<bigint> {
    return await this.rpcClient.getBalance(address);
  }

  /**
   * Get account nonce
   */
  async getNonce(address: string): Promise<number> {
    const account = await this.rpcClient.getAccount(address);
    return account.nonce || 0;
  }

  /**
   * Send transaction
   */
  async sendTransaction(
    fromPrivateKey: string,
    toAddress: string,
    amount: bigint,
    fee: bigint = BigInt(1000)
  ): Promise<any> {
    // Import sender wallet
    const wallet = this.importWallet(fromPrivateKey);

    // Get current nonce
    const nonce = await this.getNonce(wallet.address);

    // Create transaction
    const tx = new Transaction({
      from: wallet.address,
      to: toAddress,
      amount,
      nonce: nonce + 1,
      timestamp: Date.now(),
      fee,
      signature: '',
    });

    // Sign transaction
    await tx.sign(fromPrivateKey);

    // Submit to network
    const txData = {
      from: tx.from,
      to: tx.to,
      amount: tx.amount.toString(),
      nonce: tx.nonce,
      timestamp: tx.timestamp,
      fee: tx.fee.toString(),
      signature: tx.signature,
    };

    return await this.rpcClient.sendTransaction(txData);
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: string): Promise<any> {
    return await this.rpcClient.getTransaction(hash);
  }

  /**
   * Get block by number
   */
  async getBlock(number: number): Promise<any> {
    return await this.rpcClient.getBlock(number);
  }

  /**
   * Get latest block
   */
  async getLatestBlock(): Promise<any> {
    return await this.rpcClient.getLatestBlock();
  }

  /**
   * Get network statistics
   */
  async getStats(): Promise<any> {
    return await this.rpcClient.getNetworkStats();
  }
}

/**
 * Formatting utilities
 */
class Formatter {
  static printBox(title: string, content: string[]): void {
    const maxLength = Math.max(title.length, ...content.map((s) => s.length)) + 4;
    const topBorder = '╔' + '═'.repeat(maxLength) + '╗';
    const bottomBorder = '╚' + '═'.repeat(maxLength) + '╝';
    const titleLine = '║ ' + title + ' '.repeat(maxLength - title.length - 1) + '║';
    const separator = '╟' + '─'.repeat(maxLength) + '╢';

    console.log(topBorder);
    console.log(titleLine);
    console.log(separator);

    content.forEach((line) => {
      console.log('║ ' + line + ' '.repeat(maxLength - line.length - 1) + '║');
    });

    console.log(bottomBorder);
  }

  static printWallet(wallet: Wallet): void {
    this.printBox('🔑 Wallet Generated Successfully', [
      '',
      `Address:     ${wallet.address}`,
      `Public Key:  ${wallet.publicKey}`,
      `Private Key: ${wallet.privateKey}`,
      '',
      '⚠️  IMPORTANT: Save your private key securely!',
      '   Never share it with anyone!',
      '',
    ]);
  }

  static printBalance(address: string, balance: bigint): void {
    const balanceStr = this.formatTokenAmount(balance);
    this.printBox('💰 Account Balance', [
      '',
      `Address: ${address}`,
      `Balance: ${balanceStr} PRISM`,
      '',
    ]);
  }

  static printNonce(address: string, nonce: number): void {
    this.printBox('🔢 Account Nonce', [
      '',
      `Address: ${address}`,
      `Nonce:   ${nonce}`,
      '',
    ]);
  }

  static printTransaction(tx: any): void {
    this.printBox('📝 Transaction Details', [
      '',
      `Hash:      ${tx.hash || 'N/A'}`,
      `From:      ${tx.from}`,
      `To:        ${tx.to}`,
      `Amount:    ${this.formatTokenAmount(BigInt(tx.amount))} PRISM`,
      `Fee:       ${this.formatTokenAmount(BigInt(tx.fee))} PRISM`,
      `Nonce:     ${tx.nonce}`,
      `Timestamp: ${new Date(tx.timestamp).toLocaleString()}`,
      `Status:    ${tx.status || 'Pending'}`,
      '',
    ]);
  }

  static printBlock(block: any): void {
    const txCount = block.transactions?.length || 0;
    this.printBox('📦 Block Details', [
      '',
      `Number:       ${block.number}`,
      `Hash:         ${block.hash}`,
      `Previous:     ${block.previousHash}`,
      `Timestamp:    ${new Date(block.timestamp).toLocaleString()}`,
      `Validator:    ${block.validator}`,
      `Transactions: ${txCount}`,
      `Merkle Root:  ${block.merkleRoot || 'N/A'}`,
      '',
    ]);

    if (txCount > 0) {
      console.log('\nTransactions:');
      block.transactions.forEach((tx: any, i: number) => {
        console.log(
          `  ${i + 1}. ${tx.from.slice(0, 10)}... → ${tx.to.slice(0, 10)}... (${this.formatTokenAmount(BigInt(tx.amount))} PRISM)`
        );
      });
      console.log('');
    }
  }

  static printStats(stats: any): void {
    this.printBox('📊 Network Statistics', [
      '',
      `Chain Length:     ${stats.chainLength || 0}`,
      `Pending TXs:      ${stats.pendingTransactions || 0}`,
      `Total Validators: ${stats.validatorCount || 0}`,
      `Network Status:   ${stats.status || 'Unknown'}`,
      '',
    ]);
  }

  static printSendSuccess(result: any): void {
    this.printBox('✅ Transaction Sent Successfully', [
      '',
      `Hash:        ${result.hash}`,
      `Status:      ${result.status}`,
      `Submitted:   ${new Date(result.submittedAt).toLocaleString()}`,
      '',
      '💡 Use "get-transaction" command to check status',
      '',
    ]);
  }

  static printError(error: string): void {
    console.log('\n╔' + '═'.repeat(62) + '╗');
    console.log('║' + ' '.repeat(62) + '║');
    console.log('║  ❌ ERROR' + ' '.repeat(51) + '║');
    console.log('║' + ' '.repeat(62) + '║');
    console.log('╟' + '─'.repeat(62) + '╢');

    // Split long error messages into multiple lines
    const maxLineLength = 60;
    const words = error.split(' ');
    let currentLine = '';

    words.forEach((word) => {
      if (currentLine.length + word.length + 1 <= maxLineLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        console.log('║ ' + currentLine + ' '.repeat(61 - currentLine.length) + '║');
        currentLine = word;
      }
    });

    if (currentLine) {
      console.log('║ ' + currentLine + ' '.repeat(61 - currentLine.length) + '║');
    }

    console.log('║' + ' '.repeat(62) + '║');
    console.log('╚' + '═'.repeat(62) + '╝\n');
  }

  static formatTokenAmount(amount: bigint): string {
    // Assuming 18 decimals
    const decimals = 18;
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;

    if (fraction === BigInt(0)) {
      return whole.toString();
    }

    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmed = fractionStr.replace(/0+$/, '');

    return `${whole}.${trimmed}`;
  }

  static printHelp(): void {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║             PRISM BLOCKCHAIN - WALLET CLI TOOL                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  wallet [OPTIONS] <command> [args...]

OPTIONS:
  --rpc <url>    RPC server URL (default: http://localhost:9001)
  --help, -h     Show this help message

WALLET COMMANDS:
  generate-wallet
      Generate a new wallet (keypair)
      Example: wallet generate-wallet

  import-wallet <privateKey>
      Import an existing wallet from private key
      Example: wallet import-wallet 0x1234...

  get-balance <address>
      Check balance of an address
      Example: wallet get-balance 0x1234...

  get-nonce <address>
      Get current nonce for an address
      Example: wallet get-nonce 0x1234...

TRANSACTION COMMANDS:
  send <privateKey> <toAddress> <amount> [fee]
      Send tokens to an address
      Example: wallet send 0xabcd... 0x1234... 100
      Example: wallet send 0xabcd... 0x1234... 100 2000

  get-transaction <hash>
      Get transaction details by hash
      Example: wallet get-transaction 0xdef...

BLOCKCHAIN COMMANDS:
  get-block <number>
      Get block by number
      Example: wallet get-block 42

  get-latest-block
      Get the most recent block
      Example: wallet get-latest-block

  get-stats
      Get network statistics
      Example: wallet get-stats

EXAMPLES:
  # Generate new wallet
  node dist/cli/wallet.js generate-wallet

  # Check balance
  node dist/cli/wallet.js get-balance 0x1234567890abcdef...

  # Send 100 tokens with default fee
  node dist/cli/wallet.js send 0xprivatekey... 0xrecipient... 100

  # Send 100 tokens with custom fee of 2000
  node dist/cli/wallet.js send 0xprivatekey... 0xrecipient... 100 2000

  # Get latest block
  node dist/cli/wallet.js get-latest-block

  # Use custom RPC server
  node dist/cli/wallet.js --rpc http://localhost:9002 get-balance 0x1234...

NOTES:
  • Private keys should be kept secure and never shared
  • Token amounts are specified in whole units (not wei)
  • Default fee is 1000 units if not specified
  • All addresses should be in hexadecimal format (0x...)

`);
  }
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CLIConfig {
  const args = process.argv.slice(2);
  let rpcUrl = 'http://localhost:9001';
  let command = '';
  const commandArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rpc' && args[i + 1]) {
      rpcUrl = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      Formatter.printHelp();
      process.exit(0);
    } else if (!command) {
      command = args[i];
    } else {
      commandArgs.push(args[i]);
    }
  }

  return { rpcUrl, command, args: commandArgs };
}

/**
 * Main CLI handler
 */
async function main(): Promise<void> {
  const config = parseArgs();

  if (!config.command) {
    Formatter.printHelp();
    process.exit(0);
  }

  const wallet = new WalletCLI(config.rpcUrl);

  try {
    switch (config.command) {
      case 'generate-wallet': {
        const newWallet = wallet.generateWallet();
        Formatter.printWallet(newWallet);
        break;
      }

      case 'import-wallet': {
        if (config.args.length < 1) {
          throw new Error('Missing private key argument');
        }
        const importedWallet = wallet.importWallet(config.args[0]);
        Formatter.printWallet(importedWallet);
        break;
      }

      case 'get-balance': {
        if (config.args.length < 1) {
          throw new Error('Missing address argument');
        }
        const address = config.args[0];
        const balance = await wallet.getBalance(address);
        Formatter.printBalance(address, balance);
        break;
      }

      case 'get-nonce': {
        if (config.args.length < 1) {
          throw new Error('Missing address argument');
        }
        const address = config.args[0];
        const nonce = await wallet.getNonce(address);
        Formatter.printNonce(address, nonce);
        break;
      }

      case 'send': {
        if (config.args.length < 3) {
          throw new Error('Missing arguments. Usage: send <privateKey> <toAddress> <amount> [fee]');
        }
        const privateKey = config.args[0];
        const toAddress = config.args[1];
        const amount = BigInt(Math.floor(parseFloat(config.args[2]) * 1e18));
        const fee = config.args[3] ? BigInt(Math.floor(parseFloat(config.args[3]) * 1e18)) : BigInt(1000);

        const result = await wallet.sendTransaction(privateKey, toAddress, amount, fee);
        Formatter.printSendSuccess(result);
        break;
      }

      case 'get-transaction': {
        if (config.args.length < 1) {
          throw new Error('Missing transaction hash argument');
        }
        const hash = config.args[0];
        const tx = await wallet.getTransaction(hash);
        Formatter.printTransaction(tx);
        break;
      }

      case 'get-block': {
        if (config.args.length < 1) {
          throw new Error('Missing block number argument');
        }
        const number = parseInt(config.args[0]);
        const block = await wallet.getBlock(number);
        Formatter.printBlock(block);
        break;
      }

      case 'get-latest-block': {
        const block = await wallet.getLatestBlock();
        Formatter.printBlock(block);
        break;
      }

      case 'get-stats': {
        const stats = await wallet.getStats();
        Formatter.printStats(stats);
        break;
      }

      default:
        throw new Error(`Unknown command: ${config.command}`);
    }
  } catch (error: any) {
    Formatter.printError(error.message || String(error));
    process.exit(1);
  }
}

// Run CLI
main();
