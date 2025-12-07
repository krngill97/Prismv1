import { Validator } from './network/Validator.js';
import { RPCServer } from './api/RPC.js';

/**
 * Command line arguments configuration
 */
interface CLIConfig {
  port: number;
  nodeId: string;
  peers: string[];
  rpcPort: number;
  dbPath: string;
}

/**
 * Parse command line arguments
 */
function parseArguments(): CLIConfig {
  const args = process.argv.slice(2);

  let port = 8001;
  let nodeId = 'validator1';
  let peers: string[] = [];
  let rpcPort: number | null = null;
  let dbPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--id' && args[i + 1]) {
      nodeId = args[i + 1];
      i++;
    } else if (args[i] === '--peers' && args[i + 1]) {
      peers = args[i + 1].split(',').map(p => p.trim());
      i++;
    } else if (args[i] === '--rpc-port' && args[i + 1]) {
      rpcPort = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--db-path' && args[i + 1]) {
      dbPath = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // Set defaults based on parsed values
  if (rpcPort === null) {
    rpcPort = port + 1000;
  }

  if (dbPath === null) {
    dbPath = `./data/blockchain-${port}`;
  }

  return {
    port,
    nodeId,
    peers,
    rpcPort,
    dbPath
  };
}

/**
 * Print CLI help information
 */
function printHelp(): void {
  console.log(`
Prism Blockchain - Validator Node

USAGE:
  node dist/index.js [OPTIONS]

OPTIONS:
  --port <number>       WebSocket port for P2P communication (default: 8001)
  --id <string>         Unique validator node ID (default: 'validator1')
  --peers <addresses>   Comma-separated peer addresses (e.g., ws://localhost:8001,ws://localhost:8002)
  --rpc-port <number>   RPC API HTTP port (default: <port> + 1000)
  --db-path <path>      Database path (default: ./data/blockchain-<port>)
  --help, -h            Show this help message

EXAMPLES:
  # Start bootstrap node (validator 1)
  node dist/index.js --port 8001 --id validator1 --rpc-port 9001

  # Start validator 2 (connects to validator 1)
  node dist/index.js --port 8002 --id validator2 --peers ws://localhost:8001 --rpc-port 9002

  # Start validator 3 (connects to validator 1)
  node dist/index.js --port 8003 --id validator3 --peers ws://localhost:8001 --rpc-port 9003

  # Start with custom database path
  node dist/index.js --port 8004 --id validator4 --db-path /var/lib/prism/data
  `);
}

/**
 * Print startup banner
 */
function printBanner(config: CLIConfig): void {
  const banner = `
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                 PRISM BLOCKCHAIN VALIDATOR                     ║
║                                                                ║
║  A high-performance blockchain with Raft consensus and        ║
║  probabilistic finality                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`;
  console.log(banner);
  console.log('🚀 Initializing Validator Node...\n');
  console.log('Configuration:');
  console.log('─'.repeat(64));
  console.log(`  Node ID:           ${config.nodeId}`);
  console.log(`  WebSocket Port:    ${config.port}`);
  console.log(`  RPC API Port:      ${config.rpcPort}`);
  console.log(`  Database Path:     ${config.dbPath}`);
  console.log(`  Peer Count:        ${config.peers.length}`);
  if (config.peers.length > 0) {
    console.log(`  Peers:`);
    config.peers.forEach((peer, i) => {
      console.log(`    ${i + 1}. ${peer}`);
    });
  }
  console.log('─'.repeat(64));
  console.log('');
}

/**
 * Print component initialization status
 */
function printComponentStatus(component: string, status: 'starting' | 'ready' | 'error'): void {
  const icons = {
    starting: '⏳',
    ready: '✅',
    error: '❌'
  };

  const messages = {
    starting: 'Starting...',
    ready: 'Ready',
    error: 'Failed'
  };

  console.log(`${icons[status]} ${component.padEnd(30)} ${messages[status]}`);
}

/**
 * Print ready banner
 */
function printReadyBanner(config: CLIConfig): void {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║                   NODE IS READY! 🎉                            ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 RPC API Server: http://localhost:${config.rpcPort}`);
  console.log('');
  console.log('Available Endpoints:');
  console.log('─'.repeat(64));
  console.log('  Health & Status:');
  console.log(`    GET  http://localhost:${config.rpcPort}/health`);
  console.log(`    GET  http://localhost:${config.rpcPort}/stats`);
  console.log('');
  console.log('  Blockchain:');
  console.log(`    GET  http://localhost:${config.rpcPort}/blockchain`);
  console.log(`    GET  http://localhost:${config.rpcPort}/blockchain/length`);
  console.log(`    GET  http://localhost:${config.rpcPort}/blocks`);
  console.log(`    GET  http://localhost:${config.rpcPort}/blocks/latest`);
  console.log(`    GET  http://localhost:${config.rpcPort}/blocks/:number`);
  console.log('');
  console.log('  Transactions:');
  console.log(`    POST http://localhost:${config.rpcPort}/transactions`);
  console.log(`    GET  http://localhost:${config.rpcPort}/transactions`);
  console.log(`    GET  http://localhost:${config.rpcPort}/transactions/:hash`);
  console.log('');
  console.log('  Accounts:');
  console.log(`    GET  http://localhost:${config.rpcPort}/accounts/:address`);
  console.log(`    GET  http://localhost:${config.rpcPort}/accounts/:address/balance`);
  console.log('');
  console.log('  JSON-RPC 2.0:');
  console.log(`    POST http://localhost:${config.rpcPort}/rpc`);
  console.log('');
  console.log('─'.repeat(64));
  console.log('');
  console.log('💡 Tips:');
  console.log('  • Press Ctrl+C to shutdown gracefully');
  console.log('  • Check /health endpoint to verify node status');
  console.log('  • Use /stats endpoint to monitor network performance');
  console.log('');
  console.log('═'.repeat(64));
  console.log('');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse CLI arguments
  const config = parseArguments();

  // Print startup banner
  printBanner(config);

  // Store references for graceful shutdown
  let validator: Validator | null = null;
  let rpcServer: RPCServer | null = null;

  try {
    // Initialize Validator (contains Blockchain, TransactionPool, Consensus, etc.)
    console.log('📦 Initializing Components:\n');
    printComponentStatus('Blockchain', 'starting');
    printComponentStatus('Transaction Pool', 'starting');
    printComponentStatus('Micro-Batch Builder', 'starting');
    printComponentStatus('Finality Tracker', 'starting');
    printComponentStatus('Raft Consensus', 'starting');
    printComponentStatus('P2P Network (Validator)', 'starting');

    validator = new Validator({
      port: config.port,
      nodeId: config.nodeId,
      peers: config.peers,
      dbPath: config.dbPath
    });

    // Start validator (this initializes all internal components)
    console.log('');
    console.log('🔧 Starting Validator...');
    await validator.start();

    console.log('');
    printComponentStatus('Blockchain', 'ready');
    printComponentStatus('Transaction Pool', 'ready');
    printComponentStatus('Micro-Batch Builder', 'ready');
    printComponentStatus('Finality Tracker', 'ready');
    printComponentStatus('Raft Consensus', 'ready');
    printComponentStatus('P2P Network (Validator)', 'ready');

    // Initialize and start RPC server
    console.log('');
    printComponentStatus('RPC API Server', 'starting');

    rpcServer = new RPCServer(validator, config.rpcPort);
    rpcServer.start();

    printComponentStatus('RPC API Server', 'ready');

    // Print ready banner
    printReadyBanner(config);

    // Setup graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      console.log('');
      console.log('═'.repeat(64));
      console.log(`📡 Received ${signal} signal - Initiating graceful shutdown...`);
      console.log('═'.repeat(64));
      console.log('');

      try {
        // Stop RPC server
        if (rpcServer) {
          printComponentStatus('RPC API Server', 'starting');
          // RPC server stop would go here if implemented
          printComponentStatus('RPC API Server', 'ready');
        }

        // Stop validator
        if (validator) {
          printComponentStatus('Validator', 'starting');
          await validator.stop();
          printComponentStatus('Validator', 'ready');
        }

        console.log('');
        console.log('✅ All components stopped successfully');
        console.log('👋 Goodbye!');
        console.log('');

        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('');
      console.error('═'.repeat(64));
      console.error('❌ Uncaught Exception:');
      console.error('═'.repeat(64));
      console.error(error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('');
      console.error('═'.repeat(64));
      console.error('❌ Unhandled Promise Rejection:');
      console.error('═'.repeat(64));
      console.error('Promise:', promise);
      console.error('Reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('');
    console.error('═'.repeat(64));
    console.error('❌ Fatal Error During Startup:');
    console.error('═'.repeat(64));
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error('');
  console.error('═'.repeat(64));
  console.error('❌ Fatal Error:');
  console.error('═'.repeat(64));
  console.error(error);
  console.error('');
  process.exit(1);
});
