/**
 * Network Validator for Prism Blockchain
 *
 * Integrates all blockchain components with P2P networking:
 * - WebSocket server for peer connections
 * - Transaction pool management
 * - Micro-batch building
 * - Raft consensus
 * - Instant finality tracking
 */

import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { Block } from '../core/blockchain/Block.js';
import { Transaction } from '../core/transaction/Transaction.js';
import { Blockchain } from '../core/blockchain/Blockchain.js';
import { TransactionPool } from '../core/pool/TransactionPool.js';
import { RaftConsensus, NodeState } from '../consensus/RaftConsensus.js';
import { MicroBatchBuilder, MicroBatch } from '../consensus/MicroBatchBuilder.js';
import { ProbabilisticFinalityTracker } from '../consensus/ProbabilisticFinalityTracker.js';

/**
 * Validator configuration
 */
export interface ValidatorConfig {
  nodeId: string;
  port: number;
  peers: string[];
  dbPath?: string;
}

/**
 * P2P Message format
 */
export interface P2PMessage {
  type: 'transaction' | 'micro-batch' | 'block' | 'raft-message' | 'peer-discovery' | 'batch-ack';
  from: string;
  data: any;
  timestamp: number;
}

/**
 * Network Validator
 *
 * Main validator node that:
 * - Runs a WebSocket server for P2P connections
 * - Manages blockchain state and transaction pool
 * - Participates in Raft consensus
 * - Builds micro-batches and tracks instant finality
 * - Broadcasts and receives P2P messages
 *
 * @extends EventEmitter
 */
export class Validator extends EventEmitter {
  private config: ValidatorConfig;
  private server: WebSocketServer | null;
  private peerConnections: Map<string, WebSocket>;
  private blockchain: Blockchain;
  private txPool: TransactionPool;
  private batchBuilder: MicroBatchBuilder;
  private finalityTracker: ProbabilisticFinalityTracker;
  private consensus: RaftConsensus;
  private running: boolean;

  /**
   * Create a new Validator
   * @param config Validator configuration
   */
  constructor(config: ValidatorConfig) {
    super();

    this.config = config;
    this.server = null;
    this.peerConnections = new Map();
    this.running = false;

    // Initialize blockchain
    this.blockchain = new Blockchain({
      nodeId: config.nodeId,
      dbPath: config.dbPath || `./data/blockchain-${config.port}`
    });

    // Initialize transaction pool
    this.txPool = new TransactionPool({
      maxSize: 100000,
      expirationTime: 60000
    });

    // Initialize Raft consensus
    this.consensus = new RaftConsensus(
      config.nodeId,
      config.peers,
      this.blockchain
    );

    // Initialize batch builder
    this.batchBuilder = new MicroBatchBuilder(
      this.txPool,
      this.blockchain,
      {
        batchInterval: 10,
        maxBatchSize: 1000
      }
    );

    // Initialize finality tracker
    this.finalityTracker = new ProbabilisticFinalityTracker({
      totalValidators: config.peers.length + 1,
      instantThreshold: 0.20,
      timeoutWindow: 10
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for components
   */
  private setupEventHandlers(): void {
    // Handle batch creation from builder
    this.batchBuilder.on('batch-created', (batch: MicroBatch) => {
      this.handleBatchCreated(batch);
    });

    // Handle instant finality events
    this.finalityTracker.on('instant-finality', (event) => {
      console.log(`[${this.config.nodeId}] Instant finality achieved for batch ${event.batchId}`);
      this.emit('instant-finality', event);
    });

    // Handle consensus state changes
    this.consensus.onLeader(() => {
      console.log(`[${this.config.nodeId}] Became LEADER`);
      this.batchBuilder.start();
      this.emit('leader-elected', { nodeId: this.config.nodeId });
    });

    this.consensus.onFollower(() => {
      console.log(`[${this.config.nodeId}] Became FOLLOWER`);
      this.batchBuilder.stop();
      this.emit('follower', { nodeId: this.config.nodeId });
    });

    // Handle blocks from consensus
    this.consensus.on('block-committed', async (data) => {
      await this.handleConsensusBlock(data.block);
    });
  }

  /**
   * Start the validator
   * Initializes blockchain, starts WebSocket server, connects to peers
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log(`[${this.config.nodeId}] Already running`);
      return;
    }

    console.log(`[${this.config.nodeId}] Starting validator...`);

    // Initialize blockchain
    await this.blockchain.init();

    // Start WebSocket server
    await this.startWebSocketServer();

    // Connect to peers
    await this.connectToPeers();

    // Start consensus
    this.consensus.start();

    this.running = true;
    this.emit('started', { nodeId: this.config.nodeId, port: this.config.port });

    console.log(`[${this.config.nodeId}] Validator started successfully`);
  }

  /**
   * Stop the validator
   * Closes all connections and shuts down components
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    console.log(`[${this.config.nodeId}] Stopping validator...`);

    this.running = false;

    // Stop components
    this.consensus.stop();
    this.batchBuilder.stop();

    // Close peer connections
    for (const [peerId, ws] of this.peerConnections) {
      ws.close();
      console.log(`[${this.config.nodeId}] Disconnected from ${peerId}`);
    }
    this.peerConnections.clear();

    // Close WebSocket server
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      this.server = null;
    }

    // Close blockchain
    await this.blockchain.close();

    this.emit('stopped', { nodeId: this.config.nodeId });
    console.log(`[${this.config.nodeId}] Validator stopped`);
  }

  /**
   * Start WebSocket server for incoming connections
   */
  private async startWebSocketServer(): Promise<void> {
    this.server = new WebSocketServer({ port: this.config.port });

    this.server.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const peerId = req.url?.substring(1) || `peer-${Date.now()}`;
      console.log(`[${this.config.nodeId}] Peer connected: ${peerId}`);

      // Store connection
      this.peerConnections.set(peerId, ws);

      // Handle messages
      ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString(), peerId);
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`[${this.config.nodeId}] Peer disconnected: ${peerId}`);
        this.peerConnections.delete(peerId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[${this.config.nodeId}] WebSocket error from ${peerId}:`, error.message);
        this.peerConnections.delete(peerId);
      });

      // Send peer discovery
      this.sendToPeer(peerId, {
        type: 'peer-discovery',
        from: this.config.nodeId,
        data: { peers: Array.from(this.peerConnections.keys()) },
        timestamp: Date.now()
      });
    });

    this.server.on('error', (error) => {
      console.error(`[${this.config.nodeId}] Server error:`, error);
    });

    console.log(`[${this.config.nodeId}] WebSocket server listening on port ${this.config.port}`);
  }

  /**
   * Connect to all peer validators
   */
  async connectToPeers(): Promise<void> {
    const selfUrl = `ws://localhost:${this.config.port}`;

    for (const peerUrl of this.config.peers) {
      // Don't connect to self
      if (peerUrl === selfUrl || peerUrl.includes(`:${this.config.port}`)) {
        continue;
      }

      try {
        await this.connectToPeer(peerUrl);
      } catch (error) {
        console.error(`[${this.config.nodeId}] Failed to connect to ${peerUrl}:`, error);
      }
    }
  }

  /**
   * Connect to a specific peer
   * @param peerUrl Peer WebSocket URL
   */
  private async connectToPeer(peerUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${peerUrl}/${this.config.nodeId}`);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(`[${this.config.nodeId}] Connected to peer: ${peerUrl}`);
        this.peerConnections.set(peerUrl, ws);
        resolve();
      });

      ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString(), peerUrl);
      });

      ws.on('close', () => {
        console.log(`[${this.config.nodeId}] Disconnected from peer: ${peerUrl}`);
        this.peerConnections.delete(peerUrl);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`[${this.config.nodeId}] Error connecting to ${peerUrl}:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * Handle incoming P2P message
   * @param data Message data
   * @param peerId Sender peer ID
   */
  private async handleMessage(data: string, _peerId: string): Promise<void> {
    try {
      const message: P2PMessage = JSON.parse(data);

      // Log message
      console.log(`[${this.config.nodeId}] Received ${message.type} from ${message.from}`);

      switch (message.type) {
        case 'transaction':
          await this.handleTransactionMessage(message);
          break;

        case 'micro-batch':
          await this.handleMicroBatchMessage(message);
          break;

        case 'block':
          await this.handleBlockMessage(message);
          break;

        case 'raft-message':
          this.handleRaftMessage(message);
          break;

        case 'peer-discovery':
          this.handlePeerDiscovery(message);
          break;

        case 'batch-ack':
          this.handleBatchAck(message);
          break;

        default:
          console.warn(`[${this.config.nodeId}] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[${this.config.nodeId}] Error handling message:`, error);
    }
  }

  /**
   * Handle transaction message
   */
  private async handleTransactionMessage(message: P2PMessage): Promise<void> {
    try {
      const tx = Transaction.fromJSON(message.data);
      const added = await this.txPool.add(tx);

      if (added) {
        console.log(`[${this.config.nodeId}] Added transaction to pool: ${tx.hash.substring(0, 16)}...`);
        this.emit('transaction-received', { hash: tx.hash, from: message.from });
      }
    } catch (error) {
      console.error(`[${this.config.nodeId}] Error processing transaction:`, error);
    }
  }

  /**
   * Handle micro-batch message
   */
  private async handleMicroBatchMessage(message: P2PMessage): Promise<void> {
    try {
      const batch: MicroBatch = message.data;

      // Track for instant finality
      await this.finalityTracker.trackInstantFinality(batch);

      // Acknowledge batch
      this.finalityTracker.addBlockConfirmation(batch.id, this.config.nodeId);

      // Send ACK back
      this.sendToPeer(message.from, {
        type: 'batch-ack',
        from: this.config.nodeId,
        data: { batchId: batch.id },
        timestamp: Date.now()
      });

      console.log(`[${this.config.nodeId}] Received and ACKed batch ${batch.id}`);
      this.emit('batch-received', { batchId: batch.id, from: message.from });
    } catch (error) {
      console.error(`[${this.config.nodeId}] Error processing micro-batch:`, error);
    }
  }

  /**
   * Handle block message
   */
  private async handleBlockMessage(message: P2PMessage): Promise<void> {
    try {
      const block = Block.fromJSON(message.data);
      const added = await this.blockchain.addBlock(block);

      if (added) {
        console.log(`[${this.config.nodeId}] Added block #${block.index} to chain`);

        // Remove transactions from pool
        const txHashes = block.transactions.map(tx => tx.hash);
        this.txPool.removeMany(txHashes);

        this.emit('block-added', { index: block.index, hash: block.hash });
      }
    } catch (error) {
      console.error(`[${this.config.nodeId}] Error processing block:`, error);
    }
  }

  /**
   * Handle Raft consensus message
   */
  private handleRaftMessage(message: P2PMessage): void {
    try {
      this.consensus.handleMessage(message.data);
    } catch (error) {
      console.error(`[${this.config.nodeId}] Error processing Raft message:`, error);
    }
  }

  /**
   * Handle peer discovery message
   */
  private handlePeerDiscovery(message: P2PMessage): void {
    const peers: string[] = message.data.peers || [];
    console.log(`[${this.config.nodeId}] Discovered ${peers.length} peers from ${message.from}`);
    // Could implement dynamic peer discovery here
  }

  /**
   * Handle batch acknowledgment
   */
  private handleBatchAck(message: P2PMessage): void {
    const { batchId } = message.data;
    this.finalityTracker.addBlockConfirmation(batchId, message.from);
    console.log(`[${this.config.nodeId}] Received batch ACK for ${batchId} from ${message.from}`);
  }

  /**
   * Handle batch created event
   * Broadcasts batch to peers and tracks finality
   */
  private async handleBatchCreated(batch: MicroBatch): Promise<void> {
    console.log(`[${this.config.nodeId}] Created batch ${batch.id} with ${batch.transactions.length} txs`);

    // Track for instant finality
    await this.finalityTracker.trackInstantFinality(batch);

    // ACK our own batch
    this.finalityTracker.addBlockConfirmation(batch.id, this.config.nodeId);

    // Broadcast batch to peers
    this.broadcast({
      type: 'micro-batch',
      from: this.config.nodeId,
      data: batch,
      timestamp: Date.now()
    });

    this.emit('batch-created', { batchId: batch.id, txCount: batch.transactions.length });
  }

  /**
   * Handle block from consensus
   */
  private async handleConsensusBlock(block: Block): Promise<void> {
    const added = await this.blockchain.addBlock(block);

    if (added) {
      console.log(`[${this.config.nodeId}] Consensus block #${block.index} added to chain`);

      // Remove transactions from pool
      const txHashes = block.transactions.map(tx => tx.hash);
      this.txPool.removeMany(txHashes);

      // Broadcast block to peers
      this.broadcast({
        type: 'block',
        from: this.config.nodeId,
        data: block.toJSON(),
        timestamp: Date.now()
      });

      this.emit('block-committed', { index: block.index, hash: block.hash });
    }
  }

  /**
   * Broadcast message to all connected peers
   * @param message Message to broadcast
   */
  broadcast(message: P2PMessage): void {
    const payload = JSON.stringify(message);
    let sent = 0;

    for (const [peerId, ws] of this.peerConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
          sent++;
        } catch (error) {
          console.error(`[${this.config.nodeId}] Error broadcasting to ${peerId}:`, error);
        }
      }
    }

    if (sent > 0) {
      console.log(`[${this.config.nodeId}] Broadcast ${message.type} to ${sent} peers`);
    }
  }

  /**
   * Send message to specific peer
   * @param peerId Peer ID or URL
   * @param message Message to send
   */
  sendToPeer(peerId: string, message: P2PMessage): void {
    const ws = this.peerConnections.get(peerId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        console.log(`[${this.config.nodeId}] Sent ${message.type} to ${peerId}`);
      } catch (error) {
        console.error(`[${this.config.nodeId}] Error sending to ${peerId}:`, error);
      }
    } else {
      console.warn(`[${this.config.nodeId}] Cannot send to ${peerId}: not connected`);
    }
  }

  /**
   * Submit a transaction to the network
   * @param transaction Transaction to submit
   * @returns True if accepted
   */
  async submitTransaction(transaction: Transaction): Promise<boolean> {
    const added = await this.txPool.add(transaction);

    if (added) {
      console.log(`[${this.config.nodeId}] Transaction submitted: ${transaction.hash.substring(0, 16)}...`);

      // Broadcast to peers
      this.broadcast({
        type: 'transaction',
        from: this.config.nodeId,
        data: transaction.toJSON(),
        timestamp: Date.now()
      });

      this.emit('transaction-submitted', { hash: transaction.hash });
      return true;
    }

    return false;
  }

  /**
   * Get blockchain instance
   */
  getBlockchain(): Blockchain {
    return this.blockchain;
  }

  /**
   * Get transaction pool instance
   */
  getTransactionPool(): TransactionPool {
    return this.txPool;
  }

  /**
   * Get consensus state
   */
  getNodeState(): NodeState {
    return this.consensus.getState();
  }

  /**
   * Check if this node is the leader
   */
  isLeader(): boolean {
    return this.consensus.isLeader();
  }

  /**
   * Get the current leader ID
   */
  getLeaderId(): string | null {
    return this.consensus.getLeaderId();
  }

  /**
   * Get finality tracker instance
   */
  getFinalityTracker(): ProbabilisticFinalityTracker {
    return this.finalityTracker;
  }

  /**
   * Check if validator is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get validator ID
   */
  getValidatorId(): string {
    return this.config.nodeId;
  }

  /**
   * Get connected peer count
   */
  getPeerCount(): number {
    return this.peerConnections.size;
  }

  /**
   * Get validator statistics
   */
  async getStats() {
    const blockchainStats = this.blockchain.getStats();
    const finalityStats = this.finalityTracker.getStats();

    return {
      nodeId: this.config.nodeId,
      isRunning: this.running,
      isLeader: this.isLeader(),
      leaderId: this.getLeaderId(),
      state: this.getNodeState(),
      peers: {
        connected: this.getPeerCount(),
        configured: this.config.peers.length
      },
      blockchain: {
        height: blockchainStats.blocks,
        accounts: blockchainStats.accounts,
        totalSupply: blockchainStats.totalSupply.toString()
      },
      transactionPool: {
        pending: this.txPool.size()
      },
      finality: {
        trackedBatches: finalityStats.trackedBatches,
        finalizedBatches: finalityStats.finalizedBatches,
        finalityRate: finalityStats.finalityRate
      }
    };
  }
}

/**
 * Validator event types
 */
export interface ValidatorEvents {
  'started': (data: { nodeId: string; port: number }) => void;
  'stopped': (data: { nodeId: string }) => void;
  'leader-elected': (data: { nodeId: string }) => void;
  'follower': (data: { nodeId: string }) => void;
  'transaction-received': (data: { hash: string; from: string }) => void;
  'transaction-submitted': (data: { hash: string }) => void;
  'batch-created': (data: { batchId: string; txCount: number }) => void;
  'batch-received': (data: { batchId: string; from: string }) => void;
  'block-added': (data: { index: number; hash: string }) => void;
  'block-committed': (data: { index: number; hash: string }) => void;
  'instant-finality': (data: any) => void;
}

/**
 * Typed event emitter for Validator
 */
export declare interface Validator {
  on<U extends keyof ValidatorEvents>(
    event: U,
    listener: ValidatorEvents[U]
  ): this;

  emit<U extends keyof ValidatorEvents>(
    event: U,
    ...args: Parameters<ValidatorEvents[U]>
  ): boolean;
}
