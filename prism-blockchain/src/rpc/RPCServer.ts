/**
 * RPC Server for Prism Blockchain
 *
 * Provides HTTP/JSON-RPC API for querying blockchain state
 * and submitting transactions
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Validator } from '../validator/Validator.js';
import { Transaction } from '../core/transaction/Transaction.js';
import { Server } from 'http';

/**
 * RPC Server configuration
 */
export interface RPCServerConfig {
  port: number;
  host?: string;
  corsOrigin?: string;
}

/**
 * JSON-RPC request format
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number;
}

/**
 * JSON-RPC response format
 */
interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

/**
 * RPC Server
 *
 * Provides a JSON-RPC API over HTTP for interacting with the validator
 *
 * Supported methods:
 * - getBlockHeight: Get current block height
 * - getBlock: Get block by index
 * - getLatestBlock: Get latest block
 * - getBalance: Get account balance
 * - getNonce: Get account nonce
 * - getTransaction: Get transaction pool size
 * - sendTransaction: Submit a transaction
 * - getValidatorStats: Get validator statistics
 * - getBatch: Get batch by ID
 * - getFinalizedBatches: Get all finalized batches
 */
export class RPCServer {
  private app: Express;
  private server: Server | null;
  private validator: Validator;
  private config: RPCServerConfig;

  /**
   * Create a new RPC Server
   * @param validator Validator instance to expose via RPC
   * @param config Server configuration
   */
  constructor(validator: Validator, config: RPCServerConfig) {
    this.validator = validator;
    this.config = config;
    this.server = null;

    // Setup Express
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors({
      origin: config.corsOrigin || '*'
    }));

    this.setupRoutes();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        validator: this.validator.getValidatorId(),
        running: this.validator.isRunning(),
        timestamp: Date.now()
      });
    });

    // JSON-RPC endpoint
    this.app.post('/rpc', async (req: Request, res: Response) => {
      const request = req.body as JSONRPCRequest;

      try {
        const result = await this.handleRPCRequest(request);
        res.json(result);
      } catch (error) {
        res.json(this.createErrorResponse(
          request.id || null,
          -32603,
          'Internal error',
          error instanceof Error ? error.message : 'Unknown error'
        ));
      }
    });

    // REST-style endpoints for convenience
    this.app.get('/api/block/:index', async (req: Request, res: Response) => {
      try {
        const index = parseInt(req.params.index);
        const block = await this.validator.getBlock(index);

        if (!block) {
          res.status(404).json({ error: 'Block not found' });
          return;
        }

        res.json(block.toJSON());
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/block/latest', async (_req: Request, res: Response) => {
      try {
        const block = await this.validator.getLatestBlock();
        res.json(block.toJSON());
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/account/:address/balance', async (req: Request, res: Response) => {
      try {
        const balance = await this.validator.getBalance(req.params.address);
        res.json({ address: req.params.address, balance: balance.toString() });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/account/:address/nonce', async (req: Request, res: Response) => {
      try {
        const nonce = await this.validator.getNonce(req.params.address);
        res.json({ address: req.params.address, nonce });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/transaction', async (req: Request, res: Response) => {
      try {
        const tx = Transaction.fromJSON(req.body);
        const added = await this.validator.addTransaction(tx);

        if (added) {
          res.json({ success: true, hash: tx.hash });
        } else {
          res.status(400).json({ error: 'Transaction rejected' });
        }
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/stats', async (_req: Request, res: Response) => {
      try {
        const stats = await this.validator.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  /**
   * Handle JSON-RPC request
   */
  private async handleRPCRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { method, params, id } = request;

    try {
      let result: any;

      switch (method) {
        case 'getBlockHeight':
          result = await this.getBlockHeight();
          break;

        case 'getBlock':
          result = await this.getBlock(params.index);
          break;

        case 'getLatestBlock':
          result = await this.getLatestBlock();
          break;

        case 'getBalance':
          result = await this.getBalance(params.address);
          break;

        case 'getNonce':
          result = await this.getNonce(params.address);
          break;

        case 'getTransactionPoolSize':
          result = this.getTransactionPoolSize();
          break;

        case 'sendTransaction':
          result = await this.sendTransaction(params);
          break;

        case 'getValidatorStats':
          result = await this.getValidatorStats();
          break;

        case 'getBatch':
          result = this.getBatch(params.batchId);
          break;

        case 'getFinalizedBatches':
          result = this.getFinalizedBatches();
          break;

        case 'getPendingBatches':
          result = this.getPendingBatches();
          break;

        default:
          return this.createErrorResponse(id || null, -32601, 'Method not found');
      }

      return this.createSuccessResponse(id || null, result);
    } catch (error) {
      return this.createErrorResponse(
        id || null,
        -32603,
        'Internal error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * RPC Methods
   */

  private async getBlockHeight(): Promise<number> {
    const block = await this.validator.getLatestBlock();
    return block.index;
  }

  private async getBlock(index: number): Promise<any> {
    const block = await this.validator.getBlock(index);
    return block ? block.toJSON() : null;
  }

  private async getLatestBlock(): Promise<any> {
    const block = await this.validator.getLatestBlock();
    return block.toJSON();
  }

  private async getBalance(address: string): Promise<string> {
    const balance = await this.validator.getBalance(address);
    return balance.toString();
  }

  private async getNonce(address: string): Promise<number> {
    return this.validator.getNonce(address);
  }

  private getTransactionPoolSize(): number {
    return this.validator.getTransactionPool().size();
  }

  private async sendTransaction(params: any): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const tx = Transaction.fromJSON(params);
      const added = await this.validator.addTransaction(tx);

      if (added) {
        return { success: true, hash: tx.hash };
      } else {
        return { success: false, error: 'Transaction rejected' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getValidatorStats(): Promise<any> {
    return this.validator.getStats();
  }

  private getBatch(batchId: string): any {
    const batch = this.validator.getBatch(batchId);
    return batch ? {
      id: batch.id,
      batchNumber: batch.batchNumber,
      timestamp: batch.timestamp,
      transactionCount: batch.transactions.length,
      merkleRoot: batch.merkleRoot
    } : null;
  }

  private getFinalizedBatches(): any[] {
    const batches = this.validator.getFinalizedBatches();
    return batches.map(batch => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      timestamp: batch.timestamp,
      transactionCount: batch.transactions.length,
      merkleRoot: batch.merkleRoot
    }));
  }

  private getPendingBatches(): any[] {
    const batches = this.validator.getPendingBatches();
    return batches.map(batch => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      timestamp: batch.timestamp,
      transactionCount: batch.transactions.length,
      merkleRoot: batch.merkleRoot
    }));
  }

  /**
   * Helper methods for creating JSON-RPC responses
   */

  private createSuccessResponse(id: string | number | null, result: any): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      result,
      id
    };
  }

  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data
      },
      id
    };
  }

  /**
   * Start the RPC server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      const host = this.config.host || 'localhost';
      const port = this.config.port;

      this.server = this.app.listen(port, host, () => {
        console.log(`RPC Server listening on http://${host}:${port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the RPC server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app instance
   * Useful for testing
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }
}
