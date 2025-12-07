/**
 * RPC API Server for Prism Blockchain
 *
 * Provides both JSON-RPC 2.0 and RESTful HTTP APIs for:
 * - Transaction submission
 * - Blockchain queries
 * - Account management
 * - Network statistics
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Validator } from '../network/Validator.js';
import { Transaction } from '../core/transaction/Transaction.js';

/**
 * JSON-RPC 2.0 Request format
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any[];
  id?: string | number | null;
}

/**
 * JSON-RPC 2.0 Response format
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
 * JSON-RPC Error Codes
 */
enum RPCErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom error codes
  TRANSACTION_REJECTED = -32000,
  INSUFFICIENT_BALANCE = -32001,
  INVALID_ADDRESS = -32002,
  BLOCK_NOT_FOUND = -32003,
  TRANSACTION_NOT_FOUND = -32004
}

/**
 * RPC Server
 *
 * Provides JSON-RPC 2.0 and RESTful HTTP APIs for blockchain interaction
 *
 * Features:
 * - JSON-RPC 2.0 compliant interface
 * - RESTful HTTP endpoints
 * - CORS enabled for frontend access
 * - Comprehensive error handling
 * - Transaction submission and querying
 * - Blockchain state queries
 * - Network statistics
 */
export class RPCServer {
  private app: Express;
  private validator: Validator;
  private port: number;
  private server: any;

  /**
   * Create a new RPC Server
   * @param validator Validator instance to interact with
   * @param port HTTP port to listen on
   */
  constructor(validator: Validator, port: number) {
    this.validator = validator;
    this.port = port;
    this.app = express();
    this.server = null;

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS for frontend access
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next) => {
      console.log(`[RPC] ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup all routes (JSON-RPC and HTTP)
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', this.handleHealth.bind(this));

    // JSON-RPC 2.0 endpoint
    this.app.post('/rpc', this.handleJSONRPC.bind(this));

    // RESTful HTTP endpoints
    this.app.get('/stats', this.handleGetStats.bind(this));
    this.app.get('/blocks', this.handleGetBlocks.bind(this));
    this.app.get('/blocks/latest', this.handleGetLatestBlock.bind(this));
    this.app.get('/blocks/:number', this.handleGetBlock.bind(this));
    this.app.get('/transactions', this.handleGetTransactions.bind(this));
    this.app.get('/transactions/:hash', this.handleGetTransaction.bind(this));
    this.app.get('/accounts/:address', this.handleGetAccount.bind(this));
    this.app.get('/accounts/:address/balance', this.handleGetBalance.bind(this));
    this.app.post('/transactions', this.handleSubmitTransaction.bind(this));

    // Blockchain info
    this.app.get('/blockchain', this.handleGetBlockchain.bind(this));
    this.app.get('/blockchain/length', this.handleGetChainLength.bind(this));

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      });
    });
  }

  /**
   * Handle JSON-RPC 2.0 requests
   */
  private async handleJSONRPC(req: Request, res: Response): Promise<void> {
    try {
      const request = req.body as JSONRPCRequest;

      // Validate JSON-RPC format
      if (request.jsonrpc !== '2.0') {
        res.json(this.createErrorResponse(
          request.id || null,
          RPCErrorCode.INVALID_REQUEST,
          'Invalid JSON-RPC version'
        ));
        return;
      }

      if (!request.method) {
        res.json(this.createErrorResponse(
          request.id || null,
          RPCErrorCode.INVALID_REQUEST,
          'Missing method'
        ));
        return;
      }

      // Route to appropriate RPC method
      const response = await this.routeRPCMethod(request);
      res.json(response);
    } catch (error) {
      res.json(this.createErrorResponse(
        null,
        RPCErrorCode.PARSE_ERROR,
        'Invalid JSON',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }

  /**
   * Route JSON-RPC method to handler
   */
  private async routeRPCMethod(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { method, params, id } = request;

    try {
      let result: any;

      switch (method) {
        case 'sendTransaction':
          result = await this.rpcSendTransaction(params);
          break;

        case 'getBalance':
          result = await this.rpcGetBalance(params);
          break;

        case 'getTransaction':
          result = await this.rpcGetTransaction(params);
          break;

        case 'getBlock':
          result = await this.rpcGetBlock(params);
          break;

        case 'getLatestBlock':
          result = await this.rpcGetLatestBlock();
          break;

        case 'getBlockchain':
          result = await this.rpcGetBlockchain();
          break;

        case 'getChainLength':
          result = await this.rpcGetChainLength();
          break;

        case 'getAccount':
          result = await this.rpcGetAccount(params);
          break;

        case 'getTransactionPool':
          result = await this.rpcGetTransactionPool();
          break;

        case 'getNetworkStats':
          result = await this.rpcGetNetworkStats();
          break;

        default:
          return this.createErrorResponse(
            id || null,
            RPCErrorCode.METHOD_NOT_FOUND,
            `Method '${method}' not found`
          );
      }

      return this.createSuccessResponse(id || null, result);
    } catch (error) {
      return this.createErrorResponse(
        id || null,
        RPCErrorCode.INTERNAL_ERROR,
        'Internal error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * RPC Method: sendTransaction
   */
  private async rpcSendTransaction(params?: any[]): Promise<any> {
    if (!params || params.length === 0) {
      throw new Error('Missing transaction parameters');
    }

    const txData = params[0];
    const tx = new Transaction({
      from: txData.from,
      to: txData.to,
      amount: BigInt(txData.amount),
      nonce: txData.nonce,
      timestamp: Date.now(),
      fee: txData.fee ? BigInt(txData.fee) : BigInt(1000),
      signature: txData.signature
    });

    // Verify transaction
    if (txData.signature) {
      const isValid = await tx.verify();
      if (!isValid) {
        throw new Error('Invalid transaction signature');
      }
    }

    const submitted = await this.validator.submitTransaction(tx);

    if (!submitted) {
      throw new Error('Transaction rejected');
    }

    return {
      hash: tx.hash,
      status: 'pending',
      submittedAt: Date.now()
    };
  }

  /**
   * RPC Method: getBalance
   */
  private async rpcGetBalance(params?: any[]): Promise<any> {
    if (!params || params.length === 0) {
      throw new Error('Missing address parameter');
    }

    const address = params[0];
    const blockchain = this.validator.getBlockchain();
    const account = blockchain.getAccount(address);

    return {
      address,
      balance: account.balance.toString(),
      nonce: account.nonce
    };
  }

  /**
   * RPC Method: getTransaction
   */
  private async rpcGetTransaction(params?: any[]): Promise<any> {
    if (!params || params.length === 0) {
      throw new Error('Missing transaction hash parameter');
    }

    const hash = params[0];
    const txPool = this.validator.getTransactionPool();
    const allTxs = txPool.getAll();

    const tx = allTxs.find(t => t.hash === hash);
    if (!tx) {
      return null;
    }

    return {
      ...tx.toJSON(),
      status: 'pending',
      blockNumber: null
    };
  }

  /**
   * RPC Method: getBlock
   */
  private async rpcGetBlock(params?: any[]): Promise<any> {
    if (!params || params.length === 0) {
      throw new Error('Missing block number parameter');
    }

    const blockNumber = parseInt(params[0]);
    const blockchain = this.validator.getBlockchain();
    const block = blockchain.getBlock(blockNumber);

    if (!block) {
      return null;
    }

    return block.toJSON();
  }

  /**
   * RPC Method: getLatestBlock
   */
  private async rpcGetLatestBlock(): Promise<any> {
    const blockchain = this.validator.getBlockchain();
    const block = blockchain.getLatestBlock();
    return block.toJSON();
  }

  /**
   * RPC Method: getBlockchain
   */
  private async rpcGetBlockchain(): Promise<any> {
    const blockchain = this.validator.getBlockchain();
    const chain = blockchain.getChain();

    return {
      blocks: chain.map(block => block.toJSON()),
      length: chain.length
    };
  }

  /**
   * RPC Method: getChainLength
   */
  private async rpcGetChainLength(): Promise<any> {
    const blockchain = this.validator.getBlockchain();
    return {
      length: blockchain.getChainLength()
    };
  }

  /**
   * RPC Method: getAccount
   */
  private async rpcGetAccount(params?: any[]): Promise<any> {
    if (!params || params.length === 0) {
      throw new Error('Missing address parameter');
    }

    const address = params[0];
    const blockchain = this.validator.getBlockchain();
    const account = blockchain.getAccount(address);

    return {
      address: account.address,
      balance: account.balance.toString(),
      nonce: account.nonce
    };
  }

  /**
   * RPC Method: getTransactionPool
   */
  private async rpcGetTransactionPool(): Promise<any> {
    const txPool = this.validator.getTransactionPool();
    const transactions = txPool.getAll();

    return {
      transactions: transactions.map(tx => tx.toJSON()),
      count: transactions.length
    };
  }

  /**
   * RPC Method: getNetworkStats
   */
  private async rpcGetNetworkStats(): Promise<any> {
    return await this.validator.getStats();
  }

  /**
   * HTTP Handler: Health check
   */
  private async handleHealth(_req: Request, res: Response): Promise<void> {
    const stats = await this.validator.getStats();

    res.json({
      status: 'ok',
      nodeId: this.validator.getValidatorId(),
      isRunning: this.validator.isRunning(),
      isLeader: stats.isLeader,
      timestamp: Date.now()
    });
  }

  /**
   * HTTP Handler: Get statistics
   */
  private async handleGetStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.validator.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get recent blocks
   */
  private async handleGetBlocks(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const blockchain = this.validator.getBlockchain();
      const chain = blockchain.getChain();

      const recentBlocks = chain
        .slice(-limit)
        .reverse()
        .map(block => block.toJSON());

      res.json({
        blocks: recentBlocks,
        count: recentBlocks.length,
        total: chain.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get latest block
   */
  private async handleGetLatestBlock(_req: Request, res: Response): Promise<void> {
    try {
      const blockchain = this.validator.getBlockchain();
      const block = blockchain.getLatestBlock();
      res.json(block.toJSON());
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get block by number
   */
  private async handleGetBlock(req: Request, res: Response): Promise<void> {
    try {
      const blockNumber = parseInt(req.params.number);
      const blockchain = this.validator.getBlockchain();
      const block = blockchain.getBlock(blockNumber);

      if (!block) {
        res.status(404).json({
          error: 'Block Not Found',
          message: `Block #${blockNumber} does not exist`
        });
        return;
      }

      res.json(block.toJSON());
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get recent transactions
   */
  private async handleGetTransactions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const txPool = this.validator.getTransactionPool();
      const transactions = txPool.getAll().slice(0, limit);

      res.json({
        transactions: transactions.map(tx => tx.toJSON()),
        count: transactions.length,
        total: txPool.size()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get transaction by hash
   */
  private async handleGetTransaction(req: Request, res: Response): Promise<void> {
    try {
      const hash = req.params.hash;
      const txPool = this.validator.getTransactionPool();
      const allTxs = txPool.getAll();

      const tx = allTxs.find(t => t.hash === hash);

      if (!tx) {
        res.status(404).json({
          error: 'Transaction Not Found',
          message: `Transaction ${hash} not found in pool`
        });
        return;
      }

      res.json({
        ...tx.toJSON(),
        status: 'pending',
        blockNumber: null
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get account details
   */
  private async handleGetAccount(req: Request, res: Response): Promise<void> {
    try {
      const address = req.params.address;
      const blockchain = this.validator.getBlockchain();
      const account = blockchain.getAccount(address);

      res.json({
        address: account.address,
        balance: account.balance.toString(),
        nonce: account.nonce
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get account balance
   */
  private async handleGetBalance(req: Request, res: Response): Promise<void> {
    try {
      const address = req.params.address;
      const blockchain = this.validator.getBlockchain();
      const account = blockchain.getAccount(address);

      res.json({
        address,
        balance: account.balance.toString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Submit transaction
   */
  private async handleSubmitTransaction(req: Request, res: Response): Promise<void> {
    try {
      const txData = req.body;

      const tx = new Transaction({
        from: txData.from,
        to: txData.to,
        amount: BigInt(txData.amount),
        nonce: txData.nonce,
        timestamp: Date.now(),
        fee: txData.fee ? BigInt(txData.fee) : BigInt(1000),
        signature: txData.signature
      });

      // Verify signature if provided
      if (txData.signature) {
        const isValid = await tx.verify();
        if (!isValid) {
          res.status(400).json({
            error: 'Invalid Signature',
            message: 'Transaction signature verification failed'
          });
          return;
        }
      }

      const submitted = await this.validator.submitTransaction(tx);

      if (!submitted) {
        res.status(400).json({
          error: 'Transaction Rejected',
          message: 'The transaction was rejected by the validator'
        });
        return;
      }

      res.json({
        success: true,
        hash: tx.hash,
        status: 'pending',
        submittedAt: Date.now()
      });
    } catch (error) {
      res.status(400).json({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Invalid transaction data'
      });
    }
  }

  /**
   * HTTP Handler: Get blockchain
   */
  private async handleGetBlockchain(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const blockchain = this.validator.getBlockchain();
      const chain = blockchain.getChain();

      const blocks = chain.slice(-limit).map(block => block.toJSON());

      res.json({
        blocks,
        length: chain.length,
        showing: blocks.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * HTTP Handler: Get chain length
   */
  private async handleGetChainLength(_req: Request, res: Response): Promise<void> {
    try {
      const blockchain = this.validator.getBlockchain();
      res.json({
        length: blockchain.getChainLength()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create JSON-RPC success response
   */
  private createSuccessResponse(id: string | number | null, result: any): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      result,
      id
    };
  }

  /**
   * Create JSON-RPC error response
   */
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
  start(): void {
    this.server = this.app.listen(this.port, () => {
      console.log('='.repeat(60));
      console.log('RPC API Server Started');
      console.log('='.repeat(60));
      console.log(`HTTP Server: http://localhost:${this.port}`);
      console.log('');
      console.log('JSON-RPC 2.0 Endpoint:');
      console.log(`  POST http://localhost:${this.port}/rpc`);
      console.log('');
      console.log('HTTP Endpoints:');
      console.log(`  GET  http://localhost:${this.port}/health`);
      console.log(`  GET  http://localhost:${this.port}/stats`);
      console.log(`  GET  http://localhost:${this.port}/blocks`);
      console.log(`  GET  http://localhost:${this.port}/blocks/latest`);
      console.log(`  GET  http://localhost:${this.port}/blocks/:number`);
      console.log(`  GET  http://localhost:${this.port}/transactions`);
      console.log(`  GET  http://localhost:${this.port}/transactions/:hash`);
      console.log(`  GET  http://localhost:${this.port}/accounts/:address`);
      console.log(`  GET  http://localhost:${this.port}/accounts/:address/balance`);
      console.log(`  POST http://localhost:${this.port}/transactions`);
      console.log(`  GET  http://localhost:${this.port}/blockchain`);
      console.log(`  GET  http://localhost:${this.port}/blockchain/length`);
      console.log('='.repeat(60));
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

      this.server.close((error: Error | undefined) => {
        if (error) {
          reject(error);
        } else {
          console.log('RPC API Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }
}

/**
 * Export RPC class as default
 */
export default RPCServer;
