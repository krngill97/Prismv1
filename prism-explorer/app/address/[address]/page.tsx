'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Coins,
  ArrowLeftRight,
  Hash,
  Copy,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPRISM, formatNumber, truncateHash } from '@/lib/utils';

export default function AddressPage() {
  const params = useParams();
  const address = params.address as string;
  const [account, setAccount] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    sent: 0,
    received: 0,
    totalSent: BigInt(0),
    totalReceived: BigInt(0),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchAddressData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [accountData, balanceData, blockchain] = await Promise.all([
        api.getAccount(address),
        api.getBalance(address),
        api.getBlockchain(),
      ]);

      setAccount(accountData);
      setBalance(balanceData);

      // Get transactions for this address
      const txs = blockchain.flatMap((block: any) =>
        (block.transactions || []).filter(
          (tx: any) => tx.from === address || tx.to === address
        ).map((tx: any) => ({
          ...tx,
          blockNumber: block.number,
        }))
      );

      // Sort by timestamp descending
      txs.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setTransactions(txs);

      // Calculate stats
      const sentTxs = txs.filter((tx: any) => tx.from === address);
      const receivedTxs = txs.filter((tx: any) => tx.to === address);

      const totalSent = sentTxs.reduce(
        (sum: bigint, tx: any) => sum + BigInt(tx.amount) + BigInt(tx.fee || 0),
        BigInt(0)
      );

      const totalReceived = receivedTxs.reduce(
        (sum: bigint, tx: any) => sum + BigInt(tx.amount),
        BigInt(0)
      );

      setStats({
        totalTransactions: txs.length,
        sent: sentTxs.length,
        received: receivedTxs.length,
        totalSent,
        totalReceived,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load address data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchAddressData();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchAddressData, 5000);
    return () => clearInterval(interval);
  }, [fetchAddressData]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black/20 border-t-black mb-4" />
          <div className="text-black/70">Loading address...</div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/10">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <Link href="/" className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-black">PRISM Explorer</div>
            </Link>
          </div>
        </nav>

        <div className="pt-32 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <div className="text-2xl font-bold mb-2">Address Not Found</div>
              <div className="text-black/70 mb-6">{error}</div>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-black/90 transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const netFlow = stats.totalReceived - stats.totalSent;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-black">PRISM Explorer</div>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-black/70 hover:text-black transition-colors">
                Home
              </Link>
              <Link href="/blocks" className="text-black/70 hover:text-black transition-colors">
                Blocks
              </Link>
              <Link href="/transactions" className="text-black/70 hover:text-black transition-colors">
                Transactions
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-black/70 hover:text-black mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Explorer</span>
          </Link>

          {/* Address Header */}
          <div className="mb-12">
            <div className="flex items-center space-x-4 mb-4">
              <User className="w-10 h-10 text-black/70" />
              <h1 className="text-5xl font-bold">Address Details</h1>
            </div>
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <div className="font-mono text-black/70 break-all">{address}</div>
              <button
                onClick={copyAddress}
                className="px-4 py-2 bg-black/5 hover:bg-black/10 rounded-lg transition-colors flex items-center space-x-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Balance Card */}
          <div className="glass-card p-12 mb-8 text-center bg-gradient-to-br from-blue-50 to-green-50">
            <div className="text-black/50 text-sm uppercase tracking-wide mb-3">Current Balance</div>
            <div className="text-6xl font-bold mb-4">{formatPRISM(balance)}</div>
            {account.nonce !== undefined && (
              <div className="text-black/50">Account Nonce: {account.nonce}</div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Transactions */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-black/50">Total Transactions</div>
                  <div className="text-3xl font-bold">{formatNumber(stats.totalTransactions)}</div>
                </div>
              </div>
            </div>

            {/* Sent */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-red-600 rotate-45" />
                </div>
                <div>
                  <div className="text-sm text-black/50">Sent</div>
                  <div className="text-3xl font-bold">{formatNumber(stats.sent)}</div>
                </div>
              </div>
              <div className="text-sm text-black/50 mt-2">
                Total: {formatPRISM(stats.totalSent)}
              </div>
            </div>

            {/* Received */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-green-600 -rotate-45" />
                </div>
                <div>
                  <div className="text-sm text-black/50">Received</div>
                  <div className="text-3xl font-bold">{formatNumber(stats.received)}</div>
                </div>
              </div>
              <div className="text-sm text-black/50 mt-2">
                Total: {formatPRISM(stats.totalReceived)}
              </div>
            </div>

            {/* Net Flow */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className={`p-3 rounded-lg ${netFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Coins className={`w-6 h-6 ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <div className="text-sm text-black/50">Net Flow</div>
                  <div className={`text-3xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netFlow >= 0 ? '+' : ''}{formatPRISM(netFlow)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="glass-card p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Account Information</h2>
            <div className="space-y-6">
              {/* Address */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <Hash className="w-5 h-5" />
                  <span>Address</span>
                </div>
                <div className="font-mono text-sm break-all max-w-md text-right">
                  {address}
                </div>
              </div>

              {/* Balance */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <Coins className="w-5 h-5" />
                  <span>Balance</span>
                </div>
                <div className="text-2xl font-bold">{formatPRISM(balance)}</div>
              </div>

              {/* Nonce */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <Hash className="w-5 h-5" />
                  <span>Nonce</span>
                </div>
                <div className="font-mono">{account.nonce}</div>
              </div>

              {/* Total Sent */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <TrendingUp className="w-5 h-5" />
                  <span>Total Sent</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatPRISM(stats.totalSent)}</div>
                  <div className="text-sm text-black/50">{stats.sent} transactions</div>
                </div>
              </div>

              {/* Total Received */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 text-black/70">
                  <TrendingDown className="w-5 h-5" />
                  <span>Total Received</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatPRISM(stats.totalReceived)}</div>
                  <div className="text-sm text-black/50">{stats.received} transactions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold mb-6">
              Transaction History ({formatNumber(transactions.length)})
            </h2>

            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx: any, index: number) => {
                  const isSent = tx.from === address;
                  const isReceived = tx.to === address;

                  return (
                    <Link
                      key={index}
                      href={`/tx/${tx.hash}`}
                      className="block p-6 bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {isSent ? (
                            <div className="p-2 bg-red-100 rounded-lg">
                              <ArrowRight className="w-5 h-5 text-red-600" />
                            </div>
                          ) : (
                            <div className="p-2 bg-green-100 rounded-lg">
                              <ArrowRight className="w-5 h-5 text-green-600 rotate-180" />
                            </div>
                          )}
                          <div>
                            <div className="font-mono text-sm text-black/70">
                              {truncateHash(tx.hash)}
                            </div>
                            <div className="text-sm text-black/50">
                              {isSent ? 'Sent to' : 'Received from'}{' '}
                              <span className="font-mono">{truncateHash(isSent ? tx.to : tx.from)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                            {isSent ? '-' : '+'}{formatPRISM(tx.amount)}
                          </div>
                          <div className="text-sm text-black/50">
                            {new Date(tx.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          {tx.blockNumber !== undefined && (
                            <div className="text-black/50">
                              Block #{formatNumber(tx.blockNumber)}
                            </div>
                          )}
                          {tx.fee && (
                            <div className="text-black/50">
                              Fee: {formatPRISM(tx.fee)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Confirmed</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-black/50">
                No transactions found for this address
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-8 bg-black text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-2xl font-bold mb-2">PRISM</div>
          <div className="text-white/50">Light-speed blockchain explorer</div>
        </div>
      </footer>
    </div>
  );
}
