# Prism Blockchain

A high-performance TypeScript blockchain implementation featuring micro-batch processing (10ms batches, 100 batches/second), probabilistic instant finality (20% threshold), and complete validator infrastructure.

## Features

- **Ultra-Fast Micro-Batching**: Create transaction batches every 10ms for 100 batches/second throughput
- **Instant Finality**: Probabilistic finality with 20% validator threshold in 10ms window
- **Complete Validator Node**: Integrated blockchain, batch builder, and finality tracker
- **HTTP/JSON-RPC API**: Full REST and JSON-RPC endpoints for blockchain interaction
- **CLI Tools**: Command-line interface for account management and transactions
- **Transaction Pool**: Priority-based mempool with automatic expiration
- **Account System**: BigInt balance support, nonce tracking, and smart contract storage
- **Merkle Trees**: Binary Merkle tree implementation with proof generation
- **Ed25519 Signatures**: Secure cryptographic signatures using @noble/ed25519
- **LevelDB Storage**: Persistent blockchain data storage

## Architecture

```
prism-blockchain/
├── src/
│   ├── core/                    # Core blockchain components
│   │   ├── transaction/         # Transaction with Ed25519 signing
│   │   ├── account/            # Account state management
│   │   ├── blockchain/         # Block and blockchain with LevelDB
│   │   └── pool/               # Priority-based transaction pool
│   ├── consensus/              # Consensus mechanisms
│   │   ├── MicroBatchBuilder.ts         # 10ms batch creation
│   │   └── ProbabilisticFinalityTracker.ts  # Instant finality detection
│   ├── validator/              # Validator node
│   │   └── Validator.ts        # Integrated validator
│   ├── rpc/                    # RPC server
│   │   └── RPCServer.ts        # HTTP/JSON-RPC API
│   ├── cli/                    # Command-line interface
│   │   └── PrismCLI.ts         # CLI tools
│   └── utils/                  # Utilities
│       └── crypto.ts           # Cryptographic functions
├── examples/                   # Example scripts
│   ├── crypto-example.ts
│   ├── micro-batch-builder-example.ts
│   ├── probabilistic-finality-tracker-example.ts
│   ├── validator-example.ts
│   ├── rpc-server-example.ts
│   └── cli-example.ts
└── tests/                      # Test suites
    ├── transaction.test.ts
    ├── account.test.ts
    ├── blockchain.test.ts
    ├── pool.test.ts
    └── validator.test.ts
```

## Installation

```bash
npm install
```

## Quick Start

### 1. Run a Validator with RPC Server

```bash
# Terminal 1: Start validator with RPC server
npx ts-node examples/rpc-server-example.ts
```

The validator will start on `http://localhost:3000` with:
- REST API endpoints
- JSON-RPC endpoint
- Automatic batch creation every 10ms
- Instant finality detection

### 2. Use the CLI

```bash
# Terminal 2: Use CLI to interact with blockchain
npx ts-node examples/cli-example.ts
```

## Examples

### Run All Examples

```bash
# Crypto utilities example
npx ts-node examples/crypto-example.ts

# Micro-batch builder example
npx ts-node examples/micro-batch-builder-example.ts

# Probabilistic finality tracker example
npx ts-node examples/probabilistic-finality-tracker-example.ts

# Validator node example
npx ts-node examples/validator-example.ts

# RPC server example
npx ts-node examples/rpc-server-example.ts

# CLI example
npx ts-node examples/cli-example.ts
```

## API Documentation

### REST Endpoints

#### Health Check
```bash
GET /health
```

#### Blockchain Queries
```bash
# Get latest block
GET /api/block/latest

# Get block by index
GET /api/block/:index

# Get account balance
GET /api/account/:address/balance

# Get account nonce
GET /api/account/:address/nonce

# Get validator statistics
GET /api/stats
```

#### Transaction Submission
```bash
POST /api/transaction
Content-Type: application/json

{
  "from": "sender_public_key",
  "to": "recipient_public_key",
  "amount": "100",
  "nonce": 0,
  "timestamp": 1234567890,
  "fee": "10",
  "signature": "transaction_signature"
}
```

### JSON-RPC Methods

```bash
POST /rpc
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "METHOD_NAME",
  "params": { ... },
  "id": 1
}
```

**Available Methods:**
- `getBlockHeight` - Get current block height
- `getBlock` - Get block by index (params: `{index: number}`)
- `getLatestBlock` - Get latest block
- `getBalance` - Get account balance (params: `{address: string}`)
- `getNonce` - Get account nonce (params: `{address: string}`)
- `getTransactionPoolSize` - Get transaction pool size
- `sendTransaction` - Submit transaction (params: transaction JSON)
- `getValidatorStats` - Get validator statistics
- `getBatch` - Get batch by ID (params: `{batchId: string}`)
- `getFinalizedBatches` - Get all finalized batches
- `getPendingBatches` - Get all pending batches

### Example API Calls

```bash
# Get latest block
curl http://localhost:3000/api/block/latest

# Get balance
curl http://localhost:3000/api/account/YOUR_PUBLIC_KEY/balance

# Get stats
curl http://localhost:3000/api/stats

# JSON-RPC: Get block height
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getBlockHeight","id":1}'

# JSON-RPC: Get balance
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getBalance","params":{"address":"YOUR_ADDRESS"},"id":2}'
```

## CLI Usage

### Account Management

```typescript
import { PrismCLI } from './src/cli/PrismCLI';

const cli = new PrismCLI({ rpcUrl: 'http://localhost:3000' });

// Generate account
const keys = await cli.generateAccount('alice');

// List accounts
const accounts = cli.listAccounts();

// Load account
const keys = cli.loadAccount('alice');

// Export account
const data = cli.exportAccount('alice');

// Import account
cli.importAccount(data);

// Delete account
cli.deleteAccount('alice');
```

### Transaction Operations

```typescript
// Create transaction
const tx = await cli.createTransaction(
  'alice',              // from account name
  bobPublicKey,         // to public key
  BigInt(100),         // amount
  BigInt(10),          // fee
  0                    // nonce
);

// Send transaction
const hash = await cli.sendTransaction(tx);

// Get balance
const balance = await cli.getBalance(address);

// Get nonce
const nonce = await cli.getNonce(address);
```

### Blockchain Queries

```typescript
// Get latest block
const block = await cli.getLatestBlock();

// Get specific block
const block = await cli.getBlock(0);

// Get validator stats
const stats = await cli.getStats();

// RPC call
const result = await cli.rpcCall('getBlockHeight');
```

## Consensus Details

### Micro-Batching

- **Batch Interval**: 10ms (configurable)
- **Max Batch Size**: 1000 transactions (configurable)
- **Throughput**: Up to 100 batches/second
- **Features**:
  - EventEmitter for batch notifications
  - Merkle root calculation per batch
  - Automatic batch finalization
  - Sequential batch numbering

### Probabilistic Instant Finality

- **Threshold**: 20% of validators (configurable)
- **Timeout Window**: 10ms (configurable)
- **Confidence Calculation**: `(ACKs / Total Validators) × 100`
- **Reversal Probability**: `e^(-10 × confidence/100)`
- **Features**:
  - Instant finality detection on threshold reached
  - EventEmitter for finality notifications
  - Exponential decay probability model
  - Batch-level finality tracking

**Example Probabilities:**
- 20% confidence → ~13.5% reversal probability
- 50% confidence → ~0.67% reversal probability
- 67% confidence → ~0.013% reversal probability

## Technology Stack

- **TypeScript**: Type-safe development with ES2022
- **Express**: REST API server
- **CORS**: Cross-origin resource sharing
- **LevelDB**: Persistent key-value storage
- **@noble/ed25519**: Ed25519 signatures
- **@noble/hashes**: SHA256 hashing
- **Jest**: Testing framework

## Performance Characteristics

- **Batch Creation**: 10ms interval = 100 batches/second
- **Instant Finality**: 20% threshold with 10ms detection window
- **Transaction Pool**: Priority-based with O(log n) insertion
- **Merkle Trees**: O(log n) proof generation
- **Block Validation**: O(n) transaction verification
- **Database**: LevelDB with indexed key-value storage

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Run in Development Mode

```bash
npm run dev
```

### Project Structure

- `src/core/` - Core blockchain logic (Transaction, Account, Block, Blockchain)
- `src/consensus/` - Consensus mechanisms (MicroBatchBuilder, ProbabilisticFinalityTracker)
- `src/validator/` - Validator node integration
- `src/rpc/` - HTTP/JSON-RPC API server
- `src/cli/` - Command-line interface
- `src/utils/` - Cryptographic utilities
- `examples/` - Example scripts and demonstrations
- `tests/` - Test suites

## Genesis Block

- **Initial Supply**: 1 billion PRISM tokens
- **Genesis Address**: `0x0000000000000000000000000000000000000000000000000000000000000000`
- **Block 0**: Created automatically on blockchain initialization

## Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run specific test file
npm test transaction.test.ts
npm test validator.test.ts
```

Test coverage includes:
- Transaction signing and verification
- Account state management
- Block validation and Merkle trees
- Blockchain operations and persistence
- Transaction pool priority sorting
- Validator integration
- Batch creation and finality

## Configuration

### Validator Configuration

```typescript
{
  validatorId: string;           // Validator identifier
  validatorKeys: KeyPair;        // Ed25519 key pair
  dbPath: string;                // LevelDB path
  totalValidators?: number;      // Default: 1
  batchInterval?: number;        // Default: 10ms
  maxBatchSize?: number;         // Default: 1000
  instantThreshold?: number;     // Default: 0.20 (20%)
  poolMaxSize?: number;          // Default: 100000
  poolExpirationTime?: number;   // Default: 60000ms
}
```

### RPC Server Configuration

```typescript
{
  port: number;                  // Server port
  host?: string;                 // Server host (default: localhost)
  corsOrigin?: string;           // CORS origin (default: *)
}
```

### CLI Configuration

```typescript
{
  rpcUrl?: string;               // RPC server URL (default: http://localhost:3000)
  keystorePath?: string;         // Keystore directory (default: .prism-keystore)
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.
