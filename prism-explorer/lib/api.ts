// API client for PRISM blockchain RPC
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9001';

export async function rpcCall(method: string, params: any[] = []): Promise<any> {
  const response = await fetch(`${RPC_URL}/rpc`, {
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
    cache: 'no-store', // Disable caching for real-time data
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result;
}

// API methods
export const api = {
  getLatestBlock: () => rpcCall('getLatestBlock'),
  getBlock: (number: number) => rpcCall('getBlock', [number]),
  getTransaction: (hash: string) => rpcCall('getTransaction', [hash]),
  getAccount: (address: string) => rpcCall('getAccount', [address]),
  getBalance: (address: string) => rpcCall('getBalance', [address]),
  getBlockchain: () => rpcCall('getBlockchain'),
  getChainLength: () => rpcCall('getChainLength'),
  getStats: () => rpcCall('getNetworkStats'),
  getTransactionPool: () => rpcCall('getTransactionPool'),
};

// HTTP endpoints (fallback for non-RPC calls)
export async function httpGet(endpoint: string): Promise<any> {
  const response = await fetch(`${RPC_URL}${endpoint}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const httpApi = {
  getHealth: () => httpGet('/health'),
  getStats: () => httpGet('/stats'),
  getBlocks: () => httpGet('/blocks'),
  getLatestBlock: () => httpGet('/blocks/latest'),
  getBlock: (number: number) => httpGet(`/blocks/${number}`),
  getTransactions: () => httpGet('/transactions'),
  getTransaction: (hash: string) => httpGet(`/transactions/${hash}`),
  getAccount: (address: string) => httpGet(`/accounts/${address}`),
  getBalance: (address: string) => httpGet(`/accounts/${address}/balance`),
};
