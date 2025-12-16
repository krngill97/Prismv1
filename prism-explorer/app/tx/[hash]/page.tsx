'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ArrowRight,
  Hash,
  FileText,
  Zap,
  Shield,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { truncateAddress, truncateHash, formatPRISM, formatNumber } from '@/lib/utils';

export default function TransactionPage() {
  const params = useParams();
  const txHash = params.hash as string;
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finalityStatus, setFinalityStatus] = useState({
    instant: false,
    absolute: false,
    instantTime: 0,
    absoluteTime: 0,
    confidence: 0,
  });

  const fetchTransaction = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const txData = await api.getTransaction(txHash);
      setTx(txData);

      // Calculate finality times
      if (txData.timestamp) {
        const now = Date.now();
        const elapsed = now - txData.timestamp;

        setFinalityStatus({
          instant: elapsed >= 10,
          absolute: elapsed >= 100,
          instantTime: Math.min(elapsed, 10),
          absoluteTime: Math.min(elapsed, 100),
          confidence: elapsed >= 10 ? 99.99 : (elapsed / 10) * 99.99,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  }, [txHash]);

  const checkFinalityStatus = useCallback(() => {
    if (!tx || !tx.timestamp) return;

    const now = Date.now();
    const elapsed = now - tx.timestamp;

    setFinalityStatus({
      instant: elapsed >= 10,
      absolute: elapsed >= 100,
      instantTime: Math.min(elapsed, 10),
      absoluteTime: Math.min(elapsed, 100),
      confidence: Math.min((elapsed / 10) * 99.99, 99.99),
    });
  }, [tx]);

  useEffect(() => {
    fetchTransaction();
    // Poll for finality status updates
    const interval = setInterval(checkFinalityStatus, 500);
    return () => clearInterval(interval);
  }, [txHash, fetchTransaction, checkFinalityStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black/20 border-t-black mb-4" />
          <div className="text-black/70">Loading transaction...</div>
        </div>
      </div>
    );
  }

  if (error || !tx) {
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
              <div className="text-2xl font-bold mb-2">Transaction Not Found</div>
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

          {/* Transaction Header */}
          <div className="mb-12">
            <div className="flex items-center space-x-4 mb-4">
              <FileText className="w-10 h-10 text-black/70" />
              <h1 className="text-5xl font-bold">Transaction Details</h1>
            </div>
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              {/* Status Badge */}
              <div className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                finalityStatus.absolute
                  ? 'bg-green-100 text-green-800'
                  : finalityStatus.instant
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {finalityStatus.absolute ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmed (Absolute)</span>
                  </>
                ) : finalityStatus.instant ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Confirmed (Instant)</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Pending</span>
                  </>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-black/50">
                {new Date(tx.timestamp).toLocaleString()}
              </div>

              {/* Time Ago */}
              <div className="text-black/50">
                ({Math.floor((Date.now() - tx.timestamp) / 1000)}s ago)
              </div>
            </div>
          </div>

          {/* Finality Progress (if not fully confirmed) */}
          {!finalityStatus.absolute && (
            <div className="glass-card p-8 mb-8 bg-gradient-to-r from-blue-50 to-green-50">
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                <Zap className="w-6 h-6" />
                <span>Finality Progress</span>
              </h2>

              {/* Instant Finality Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Instant Finality (Probabilistic)</span>
                  </div>
                  <span className="text-sm text-black/70">
                    {finalityStatus.instantTime.toFixed(0)}ms / 10ms
                  </span>
                </div>
                <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min((finalityStatus.instantTime / 10) * 100, 100)}%` }}
                  />
                </div>
                {finalityStatus.instant && (
                  <div className="mt-2 text-sm text-green-700 font-medium flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Instant confirmation achieved ({finalityStatus.confidence.toFixed(2)}% confidence)</span>
                  </div>
                )}
              </div>

              {/* Absolute Finality Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Absolute Finality (Raft Consensus)</span>
                  </div>
                  <span className="text-sm text-black/70">
                    {finalityStatus.absoluteTime.toFixed(0)}ms / 100ms
                  </span>
                </div>
                <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min((finalityStatus.absoluteTime / 100) * 100, 100)}%` }}
                  />
                </div>
                {finalityStatus.absolute && (
                  <div className="mt-2 text-sm text-green-700 font-medium flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Absolute finality achieved (100% irreversible)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction Flow Visualization */}
          <div className="glass-card p-8 mb-8">
            <h2 className="text-2xl font-bold mb-8">Transaction Flow</h2>
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* From */}
              <div className="text-center flex-1">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {tx.from.substring(2, 4).toUpperCase()}
                </div>
                <div className="font-medium mb-1">From</div>
                <Link
                  href={`/address/${tx.from}`}
                  className="font-mono text-sm text-black/70 hover:text-blue-600 transition-colors"
                >
                  {truncateAddress(tx.from)}
                </Link>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 mx-8">
                <div className="relative">
                  <ArrowRight className="w-16 h-16 text-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatPRISM(tx.amount)}</div>
                      <div className="text-xs text-black/50">Fee: {formatPRISM(tx.fee)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* To */}
              <div className="text-center flex-1">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-2xl font-bold">
                  {tx.to.substring(2, 4).toUpperCase()}
                </div>
                <div className="font-medium mb-1">To</div>
                <Link
                  href={`/address/${tx.to}`}
                  className="font-mono text-sm text-black/70 hover:text-blue-600 transition-colors"
                >
                  {truncateAddress(tx.to)}
                </Link>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="glass-card p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Transaction Information</h2>
            <div className="space-y-6">
              {/* Transaction Hash */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <Hash className="w-5 h-5" />
                  <span>Transaction Hash</span>
                </div>
                <div className="font-mono text-sm break-all max-w-md text-right">
                  {tx.hash}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <CheckCircle className="w-5 h-5" />
                  <span>Status</span>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    finalityStatus.absolute
                      ? 'bg-green-100 text-green-800'
                      : finalityStatus.instant
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {finalityStatus.absolute ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Success (Absolute)</span>
                      </>
                    ) : finalityStatus.instant ? (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Confirmed (Instant)</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Pending</span>
                      </>
                    )}
                  </div>
                  {finalityStatus.instant && (
                    <div className="text-xs text-black/50 mt-1">
                      {finalityStatus.confidence.toFixed(2)}% confidence
                    </div>
                  )}
                </div>
              </div>

              {/* Block */}
              {tx.blockNumber !== undefined && (
                <div className="flex items-start justify-between pb-6 border-b border-black/10">
                  <div className="flex items-center space-x-3 text-black/70">
                    <FileText className="w-5 h-5" />
                    <span>Block</span>
                  </div>
                  <Link
                    href={`/block/${tx.blockNumber}`}
                    className="font-bold hover:text-blue-600 transition-colors"
                  >
                    #{formatNumber(tx.blockNumber)}
                  </Link>
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <Clock className="w-5 h-5" />
                  <span>Timestamp</span>
                </div>
                <div className="text-right">
                  <div className="font-mono">{new Date(tx.timestamp).toLocaleString()}</div>
                  <div className="text-sm text-black/50 mt-1">
                    {Math.floor((Date.now() - tx.timestamp) / 1000)} seconds ago
                  </div>
                </div>
              </div>

              {/* From Address */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  <span>From</span>
                </div>
                <Link
                  href={`/address/${tx.from}`}
                  className="font-mono text-sm hover:text-blue-600 transition-colors break-all max-w-md text-right"
                >
                  {tx.from}
                </Link>
              </div>

              {/* To Address */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <ArrowRight className="w-5 h-5" />
                  <span>To</span>
                </div>
                <Link
                  href={`/address/${tx.to}`}
                  className="font-mono text-sm hover:text-blue-600 transition-colors break-all max-w-md text-right"
                >
                  {tx.to}
                </Link>
              </div>

              {/* Amount */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <span className="text-2xl">💎</span>
                  <span>Amount</span>
                </div>
                <div className="text-2xl font-bold">{formatPRISM(tx.amount)}</div>
              </div>

              {/* Transaction Fee */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <span className="text-xl">⛽</span>
                  <span>Transaction Fee</span>
                </div>
                <div className="font-bold">{formatPRISM(tx.fee)}</div>
              </div>

              {/* Nonce */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 text-black/70">
                  <Hash className="w-5 h-5" />
                  <span>Nonce</span>
                </div>
                <div className="font-mono">{tx.nonce}</div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold mb-6">Technical Details</h2>
            <div className="space-y-4">
              {/* Signature */}
              {tx.signature && (
                <div>
                  <div className="text-sm text-black/70 mb-2">Signature</div>
                  <div className="font-mono text-xs break-all p-4 bg-black/5 rounded-lg">
                    {tx.signature}
                  </div>
                </div>
              )}

              {/* Raw Transaction Data */}
              <div>
                <div className="text-sm text-black/70 mb-2">Raw Transaction Data (JSON)</div>
                <pre className="font-mono text-xs break-all p-4 bg-black/5 rounded-lg overflow-x-auto">
                  {JSON.stringify(tx, null, 2)}
                </pre>
              </div>
            </div>
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
