/**
 * Simplified Raft Consensus for Prism Blockchain
 *
 * Implements leader election and block replication with majority voting
 * Designed for 3-validator setup
 */

import { EventEmitter } from 'events';
import { Block } from '../core/blockchain/Block.js';
import { Blockchain } from '../core/blockchain/Blockchain.js';

/**
 * Raft node states
 */
export type RaftState = 'follower' | 'candidate' | 'leader';

/**
 * Legacy NodeState export for backward compatibility
 */
export type NodeState = RaftState;

/**
 * Raft message type
 */
export interface RaftMessage {
  type: 'requestVote' | 'requestVoteResponse' | 'appendEntries' | 'appendEntriesResponse';
  term: number;
  from: string;
  data?: any;
}

/**
 * Vote request message
 */
export interface VoteRequest {
  term: number;
  candidateId: string;
  lastLogIndex: number;
  lastLogTerm: number;
}

/**
 * Vote response message
 */
export interface VoteResponse {
  term: number;
  voteGranted: boolean;
  voterId: string;
}

/**
 * Block replication message
 */
export interface BlockReplication {
  term: number;
  leaderId: string;
  block: Block;
  prevBlockHash: string;
}

/**
 * Block acknowledgment message
 */
export interface BlockAck {
  term: number;
  followerId: string;
  blockHash: string;
  success: boolean;
}

/**
 * Raft Consensus Configuration
 */
export interface RaftConsensusConfig {
  nodeId: string;
  peers: string[];
  blockchain: Blockchain;
  electionTimeoutMin?: number;  // Default: 150ms
  electionTimeoutMax?: number;  // Default: 300ms
  heartbeatInterval?: number;   // Default: 50ms
  blockInterval?: number;       // Default: 100ms
}

/**
 * Simplified Raft Consensus
 *
 * Implements leader election and block replication for distributed consensus
 *
 * Features:
 * - Leader election with randomized timeouts (150-300ms)
 * - Majority voting (>50%)
 * - Block replication from leader to followers
 * - Automatic failover on leader timeout
 *
 * @extends EventEmitter
 * @fires RaftConsensus#state-changed
 * @fires RaftConsensus#leader-elected
 * @fires RaftConsensus#block-proposed
 * @fires RaftConsensus#block-committed
 */
export class RaftConsensus extends EventEmitter {
  private nodeId: string;
  private peers: string[];
  private state: RaftState;
  private currentTerm: number;
  private votedFor: string | null;
  private log: Block[];
  private commitIndex: number;
  private blockchain: Blockchain;

  // Timeouts
  private electionTimeoutMin: number;
  private electionTimeoutMax: number;
  private heartbeatInterval: number;
  private blockInterval: number;

  // Timers
  private electionTimer: NodeJS.Timeout | null;
  private heartbeatTimer: NodeJS.Timeout | null;
  private blockProposalTimer: NodeJS.Timeout | null;

  // Election tracking
  private votesReceived: Set<string>;
  private votesNeeded: number;

  // Block replication tracking
  private pendingBlock: Block | null;
  private blockAcks: Set<string>;

  // Running state
  private running: boolean;

  /**
   * Create a new RaftConsensus instance
   * @param config Raft configuration
   */
  constructor(config: RaftConsensusConfig);
  constructor(nodeId: string, peers: string[], blockchain: Blockchain);
  constructor(
    configOrNodeId: RaftConsensusConfig | string,
    peers?: string[],
    blockchain?: Blockchain
  ) {
    super();

    // Handle both constructor signatures
    if (typeof configOrNodeId === 'string') {
      // Legacy constructor: (nodeId, peers, blockchain)
      this.nodeId = configOrNodeId;
      this.peers = peers!;
      this.blockchain = blockchain!;
      this.electionTimeoutMin = 150;
      this.electionTimeoutMax = 300;
      this.heartbeatInterval = 50;
      this.blockInterval = 100;
    } else {
      // New constructor: (config)
      const config = configOrNodeId;
      this.nodeId = config.nodeId;
      this.peers = config.peers;
      this.blockchain = config.blockchain;
      this.electionTimeoutMin = config.electionTimeoutMin ?? 150;
      this.electionTimeoutMax = config.electionTimeoutMax ?? 300;
      this.heartbeatInterval = config.heartbeatInterval ?? 50;
      this.blockInterval = config.blockInterval ?? 100;
    }

    // Raft state
    this.state = 'follower';
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.commitIndex = -1;

    // Timers
    this.electionTimer = null;
    this.heartbeatTimer = null;
    this.blockProposalTimer = null;

    // Election tracking
    this.votesReceived = new Set();
    this.votesNeeded = Math.floor(this.peers.length / 2) + 1; // Majority

    // Block replication
    this.pendingBlock = null;
    this.blockAcks = new Set();

    this.running = false;
  }

  /**
   * Start the Raft consensus
   * Begins as follower and starts election timer
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.becomeFollower();

    this.emit('started', {
      nodeId: this.nodeId,
      peers: this.peers,
      timestamp: Date.now()
    });
  }

  /**
   * Stop the Raft consensus
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Clear all timers
    this.clearElectionTimer();
    this.clearHeartbeatTimer();
    this.clearBlockProposalTimer();

    this.emit('stopped', {
      nodeId: this.nodeId,
      timestamp: Date.now()
    });
  }

  /**
   * Transition to follower state
   * @param term Optional term to update to
   */
  becomeFollower(term?: number): void {
    if (term !== undefined && term > this.currentTerm) {
      this.currentTerm = term;
      this.votedFor = null;
    }

    const previousState = this.state;
    this.state = 'follower';

    // Clear leader-specific timers
    this.clearHeartbeatTimer();
    this.clearBlockProposalTimer();

    // Reset election tracking
    this.votesReceived.clear();

    // Start election timeout
    this.resetElectionTimer();

    if (previousState !== 'follower') {
      this.emit('state-changed', {
        nodeId: this.nodeId,
        previousState,
        newState: 'follower',
        term: this.currentTerm,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Transition to candidate state and start election
   */
  becomeCandidate(): void {
    const previousState = this.state;
    this.state = 'candidate';
    this.currentTerm++;
    this.votedFor = this.nodeId;
    this.votesReceived.clear();
    this.votesReceived.add(this.nodeId); // Vote for self

    this.emit('state-changed', {
      nodeId: this.nodeId,
      previousState,
      newState: 'candidate',
      term: this.currentTerm,
      timestamp: Date.now()
    });

    // Start election
    this.startElection();
  }

  /**
   * Transition to leader state
   */
  becomeLeader(): void {
    const previousState = this.state;
    this.state = 'leader';

    // Clear election timer
    this.clearElectionTimer();

    // Start heartbeat
    this.startHeartbeat();

    // Start block proposal
    this.startBlockProposal();

    this.emit('state-changed', {
      nodeId: this.nodeId,
      previousState,
      newState: 'leader',
      term: this.currentTerm,
      timestamp: Date.now()
    });

    this.emit('leader-elected', {
      leaderId: this.nodeId,
      term: this.currentTerm,
      timestamp: Date.now()
    });
  }

  /**
   * Start leader election
   * Request votes from all peers
   */
  startElection(): void {
    // Reset election timer
    this.resetElectionTimer();

    // Request votes from peers
    this.requestVotes();

    // Check if we already have majority (in case of single node or self-vote)
    if (this.votesReceived.size >= this.votesNeeded) {
      this.becomeLeader();
    }
  }

  /**
   * Request votes from all peers
   */
  requestVotes(): void {
    const lastLogIndex = this.log.length - 1;
    const lastLogTerm = lastLogIndex >= 0 ? this.log[lastLogIndex].index : 0;

    const voteRequest: VoteRequest = {
      term: this.currentTerm,
      candidateId: this.nodeId,
      lastLogIndex,
      lastLogTerm
    };

    /**
     * Vote request event
     * Network layer should send this to peers
     * @event RaftConsensus#vote-request
     */
    this.emit('vote-request', {
      request: voteRequest,
      peers: this.peers,
      timestamp: Date.now()
    });
  }

  /**
   * Receive a vote request from another node
   * @param request Vote request
   * @returns Vote response
   */
  onVoteRequest(request: VoteRequest): VoteResponse {
    let voteGranted = false;

    // If request term is greater, update and become follower
    if (request.term > this.currentTerm) {
      this.becomeFollower(request.term);
    }

    // Grant vote if:
    // 1. Haven't voted in this term, or already voted for this candidate
    // 2. Candidate's log is at least as up-to-date as ours
    if (
      request.term === this.currentTerm &&
      (this.votedFor === null || this.votedFor === request.candidateId)
    ) {
      voteGranted = true;
      this.votedFor = request.candidateId;
      this.resetElectionTimer();
    }

    const response: VoteResponse = {
      term: this.currentTerm,
      voteGranted,
      voterId: this.nodeId
    };

    return response;
  }

  /**
   * Receive a vote response from a peer
   * @param response Vote response
   */
  onVoteResponse(response: VoteResponse): void {
    // Ignore if not candidate
    if (this.state !== 'candidate') {
      return;
    }

    // If response term is greater, become follower
    if (response.term > this.currentTerm) {
      this.becomeFollower(response.term);
      return;
    }

    // If response is for current term and vote granted
    if (response.term === this.currentTerm && response.voteGranted) {
      this.votesReceived.add(response.voterId);

      // Check if we have majority
      if (this.votesReceived.size >= this.votesNeeded) {
        this.becomeLeader();
      }
    }
  }

  /**
   * Propose a new block (leader only)
   * @param block Block to propose
   * @returns True if proposal started
   */
  async proposeBlock(block: Block): Promise<boolean> {
    if (this.state !== 'leader') {
      return false;
    }

    // Can only propose one block at a time
    if (this.pendingBlock !== null) {
      return false;
    }

    this.pendingBlock = block;
    this.blockAcks.clear();
    this.blockAcks.add(this.nodeId); // ACK from self

    // Add to local log
    this.log.push(block);

    this.emit('block-proposed', {
      leaderId: this.nodeId,
      block: block,
      blockHash: block.hash,
      term: this.currentTerm,
      timestamp: Date.now()
    });

    // Replicate to followers
    this.replicateToFollowers(block);

    return true;
  }

  /**
   * Replicate block to all followers
   * @param block Block to replicate
   */
  replicateToFollowers(block: Block): void {
    const prevBlock = this.log[this.log.length - 2];
    const prevBlockHash = prevBlock ? prevBlock.hash : '0';

    const replication: BlockReplication = {
      term: this.currentTerm,
      leaderId: this.nodeId,
      block: block,
      prevBlockHash: prevBlockHash
    };

    /**
     * Block replication event
     * Network layer should send this to all followers
     * @event RaftConsensus#block-replication
     */
    this.emit('block-replication', {
      replication,
      peers: this.peers,
      timestamp: Date.now()
    });
  }

  /**
   * Receive a block from the leader
   * @param replication Block replication message
   * @returns Block acknowledgment
   */
  async onBlockReceived(replication: BlockReplication): Promise<BlockAck> {
    // If leader's term is greater, become follower
    if (replication.term > this.currentTerm) {
      this.becomeFollower(replication.term);
    }

    // Reset election timer (heartbeat received)
    this.resetElectionTimer();

    let success = false;

    // Only accept blocks from current leader
    if (replication.term === this.currentTerm && this.state === 'follower') {
      // Validate block
      const isValid = await this.blockchain.validateBlock(replication.block);

      if (isValid) {
        // Add to local log
        this.log.push(replication.block);

        // Add to blockchain
        await this.blockchain.addBlock(replication.block);

        success = true;
        this.commitIndex = this.log.length - 1;
      }
    }

    const ack: BlockAck = {
      term: this.currentTerm,
      followerId: this.nodeId,
      blockHash: replication.block.hash,
      success
    };

    return ack;
  }

  /**
   * Receive a block acknowledgment from a follower
   * @param ack Block acknowledgment
   */
  async onBlockAck(ack: BlockAck): Promise<void> {
    if (this.state !== 'leader' || this.pendingBlock === null) {
      return;
    }

    // Ignore if not for current term
    if (ack.term !== this.currentTerm) {
      return;
    }

    // Ignore if not for pending block
    if (ack.blockHash !== this.pendingBlock.hash) {
      return;
    }

    // Add ACK
    if (ack.success) {
      this.blockAcks.add(ack.followerId);

      // Check if majority reached
      if (this.checkMajority(this.blockAcks.size)) {
        // Commit block
        await this.commitBlock(this.pendingBlock);

        // Clear pending block
        this.pendingBlock = null;
        this.blockAcks.clear();
      }
    }
  }

  /**
   * Commit a block to the blockchain
   * @param block Block to commit
   */
  private async commitBlock(block: Block): Promise<void> {
    this.commitIndex = this.log.length - 1;

    // Block is already in blockchain from proposeBlock
    // Just emit the commit event

    this.emit('block-committed', {
      leaderId: this.nodeId,
      block: block,
      blockHash: block.hash,
      blockIndex: block.index,
      acks: this.blockAcks.size,
      term: this.currentTerm,
      timestamp: Date.now()
    });
  }

  /**
   * Check if count represents a majority
   * @param count Number of acknowledgments
   * @returns True if majority (>50%)
   */
  checkMajority(count: number): boolean {
    const totalNodes = this.peers.length + 1; // peers + self
    return count > totalNodes / 2;
  }

  /**
   * Start heartbeat timer (leader only)
   * Sends empty block replications to maintain leadership
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer();

    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'leader') {
        // Send heartbeat (empty replication)
        this.emit('heartbeat', {
          leaderId: this.nodeId,
          term: this.currentTerm,
          peers: this.peers,
          timestamp: Date.now()
        });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Start block proposal timer (leader only)
   * Creates new blocks at regular intervals
   */
  private startBlockProposal(): void {
    this.clearBlockProposalTimer();

    this.blockProposalTimer = setInterval(async () => {
      if (this.state === 'leader' && this.pendingBlock === null) {
        // Let the network layer handle block creation
        // Just emit an event that it's time to propose
        this.emit('ready-to-propose', {
          leaderId: this.nodeId,
          term: this.currentTerm,
          timestamp: Date.now()
        });
      }
    }, this.blockInterval);
  }

  /**
   * Reset election timer with random timeout
   */
  private resetElectionTimer(): void {
    this.clearElectionTimer();

    const timeout = this.getRandomElectionTimeout();

    this.electionTimer = setTimeout(() => {
      // Only start election if follower or candidate
      if (this.state === 'follower' || this.state === 'candidate') {
        this.becomeCandidate();
      }
    }, timeout);
  }

  /**
   * Get random election timeout
   * @returns Random timeout between min and max
   */
  private getRandomElectionTimeout(): number {
    return (
      this.electionTimeoutMin +
      Math.random() * (this.electionTimeoutMax - this.electionTimeoutMin)
    );
  }

  /**
   * Clear election timer
   */
  private clearElectionTimer(): void {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clear block proposal timer
   */
  private clearBlockProposalTimer(): void {
    if (this.blockProposalTimer) {
      clearInterval(this.blockProposalTimer);
      this.blockProposalTimer = null;
    }
  }

  /**
   * Get current state
   */
  getState(): RaftState {
    return this.state;
  }

  /**
   * Get current term
   */
  getCurrentTerm(): number {
    return this.currentTerm;
  }

  /**
   * Get node ID
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Get peers
   */
  getPeers(): string[] {
    return [...this.peers];
  }

  /**
   * Check if node is leader
   */
  isLeader(): boolean {
    return this.state === 'leader';
  }

  /**
   * Check if node is follower
   */
  isFollower(): boolean {
    return this.state === 'follower';
  }

  /**
   * Check if node is candidate
   */
  isCandidate(): boolean {
    return this.state === 'candidate';
  }

  /**
   * Get commit index
   */
  getCommitIndex(): number {
    return this.commitIndex;
  }

  /**
   * Get log length
   */
  getLogLength(): number {
    return this.log.length;
  }

  /**
   * Get consensus statistics
   */
  getStats(): {
    nodeId: string;
    state: RaftState;
    term: number;
    commitIndex: number;
    logLength: number;
    peers: number;
    votesReceived: number;
    isRunning: boolean;
  } {
    return {
      nodeId: this.nodeId,
      state: this.state,
      term: this.currentTerm,
      commitIndex: this.commitIndex,
      logLength: this.log.length,
      peers: this.peers.length,
      votesReceived: this.votesReceived.size,
      isRunning: this.running
    };
  }

  /**
   * Get leader ID
   * @returns Leader node ID or null if no leader
   */
  getLeaderId(): string | null {
    return this.state === 'leader' ? this.nodeId : null;
  }

  /**
   * Register callback for when node becomes leader
   * @param callback Callback function
   */
  onLeader(callback: () => void): void {
    this.on('leader-elected', callback);
  }

  /**
   * Register callback for when node becomes follower
   * @param callback Callback function
   */
  onFollower(callback: () => void): void {
    this.on('state-changed', (data) => {
      if (data.newState === 'follower') {
        callback();
      }
    });
  }

  /**
   * Register callback for when block is committed
   * @param callback Callback function
   */
  onBlock(callback: (block: Block) => void): void {
    this.on('block-committed', (data) => {
      callback(data.block);
    });
  }

  /**
   * Handle incoming Raft message
   * @param message Raft message
   */
  handleMessage(message: RaftMessage): void {
    if (message.type === 'requestVote') {
      const voteRequest = {
        term: message.term,
        candidateId: message.from,
        lastLogIndex: message.data?.lastLogIndex || 0,
        lastLogTerm: message.data?.lastLogTerm || 0
      };
      const response = this.onVoteRequest(voteRequest);
      // Emit response (network layer should send it)
      this.emit('vote-response', {
        to: message.from,
        response
      });
    } else if (message.type === 'appendEntries') {
      const replication = {
        term: message.term,
        leaderId: message.from,
        block: message.data?.block,
        prevBlockHash: message.data?.prevBlockHash || '0'
      };
      this.onBlockReceived(replication).then(ack => {
        // Emit ACK (network layer should send it)
        this.emit('block-ack', {
          to: message.from,
          ack
        });
      });
    }
  }
}

/**
 * Event types for TypeScript
 */
export interface RaftConsensusEvents {
  'started': (data: { nodeId: string; peers: string[]; timestamp: number }) => void;
  'stopped': (data: { nodeId: string; timestamp: number }) => void;
  'state-changed': (data: {
    nodeId: string;
    previousState: RaftState;
    newState: RaftState;
    term: number;
    timestamp: number;
  }) => void;
  'leader-elected': (data: { leaderId: string; term: number; timestamp: number }) => void;
  'vote-request': (data: { request: VoteRequest; peers: string[]; timestamp: number }) => void;
  'block-proposed': (data: {
    leaderId: string;
    block: Block;
    blockHash: string;
    term: number;
    timestamp: number;
  }) => void;
  'block-replication': (data: {
    replication: BlockReplication;
    peers: string[];
    timestamp: number;
  }) => void;
  'block-committed': (data: {
    leaderId: string;
    block: Block;
    blockHash: string;
    blockIndex: number;
    acks: number;
    term: number;
    timestamp: number;
  }) => void;
  'heartbeat': (data: {
    leaderId: string;
    term: number;
    peers: string[];
    timestamp: number;
  }) => void;
  'ready-to-propose': (data: { leaderId: string; term: number; timestamp: number }) => void;
  'vote-response': (data: { to: string; response: VoteResponse }) => void;
  'block-ack': (data: { to: string; ack: BlockAck }) => void;
}

/**
 * Typed event emitter for RaftConsensus
 */
export declare interface RaftConsensus {
  on<U extends keyof RaftConsensusEvents>(
    event: U,
    listener: RaftConsensusEvents[U]
  ): this;

  emit<U extends keyof RaftConsensusEvents>(
    event: U,
    ...args: Parameters<RaftConsensusEvents[U]>
  ): boolean;
}
