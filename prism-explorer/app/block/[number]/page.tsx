'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Clock,
  Hash,
  User,
  Layers,
  CheckCircle,
  FileText,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPRISM, formatNumber, truncateHash } from '@/lib/utils';

export default function BlockPage() {
  const params = useParams();
  const blockNumber = parseInt(params.number as string);
  const [block, setBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBlock = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const blockData = await api.getBlock(blockNumber);
      setBlock(blockData);
    } catch (err: any) {
      setError(err.message || 'Failed to load block');
    } finally {
      setLoading(false);
    }
  }, [blockNumber]);

  useEffect(() => {
    fetchBlock();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchBlock, 5000);
    return () => clearInterval(interval);
  }, [fetchBlock]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black/20 border-t-black mb-4" />
          <div className="text-black/70">Loading block...</div>
        </div>
      </div>
    );
  }

  if (error || !block) {
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
              <div className="text-2xl font-bold mb-2">Block Not Found</div>
              <div className="text-black/70 mb-6">{error || `Block #${blockNumber} does not exist`}</div>
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

  const transactions = block.transactions || [];

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

          {/* Block Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Box className="w-10 h-10 text-black/70" />
                <h1 className="text-5xl font-bold">Block #{formatNumber(block.number)}</h1>
              </div>

              {/* Block Navigation */}
              <div className="flex items-center space-x-2">
                {block.number > 0 ? (
                  <Link
                    href={`/block/${block.number - 1}`}
                    className="px-4 py-2 bg-black/5 hover:bg-black/10 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Link>
                ) : (
                  <div className="px-4 py-2 bg-black/5 text-black/30 rounded-lg flex items-center space-x-2 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </div>
                )}
                <Link
                  href={`/block/${block.number + 1}`}
                  className="px-4 py-2 bg-black/5 hover:bg-black/10 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Confirmed</span>
              </div>
              <div className="text-black/50">
                {new Date(block.timestamp).toLocaleString()}
              </div>
              <div className="text-black/50">
                ({Math.floor((Date.now() - block.timestamp) / 1000)}s ago)
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Transactions */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-black/50">Transactions</div>
                  <div className="text-3xl font-bold">{formatNumber(transactions.length)}</div>
                </div>
              </div>
            </div>

            {/* Validator */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-black/50">Validator</div>
                  <Link
                    href={`/address/${block.validator}`}
                    className="text-lg font-bold hover:text-blue-600 transition-colors truncate block"
                  >
                    {block.validator}
                  </Link>
                </div>
              </div>
            </div>

            {/* Block Time */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-black/50">Age</div>
                  <div className="text-lg font-bold">
                    {Math.floor((Date.now() - block.timestamp) / 1000)}s ago
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block Details */}
          <div className="glass-card p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Block Information</h2>
            <div className="space-y-6">
              {/* Block Number */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <Layers className="w-5 h-5" />
                  <span>Block Height</span>
                </div>
                <div className="font-mono text-2xl font-bold">
                  #{formatNumber(block.number)}
                </div>
              </div>

              {/* Block Hash */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <Hash className="w-5 h-5" />
                  <span>Block Hash</span>
                </div>
                <div className="font-mono text-sm break-all max-w-md text-right">
                  {block.hash}
                </div>
              </div>

              {/* Previous Hash */}
              {block.previousHash && (
                <div className="flex items-start justify-between pb-6 border-b border-black/10">
                  <div className="flex items-center space-x-3 text-black/70">
                    <Hash className="w-5 h-5" />
                    <span>Previous Hash</span>
                  </div>
                  <Link
                    href={`/block/${block.number - 1}`}
                    className="font-mono text-sm break-all max-w-md text-right hover:text-blue-600 transition-colors"
                  >
                    {block.previousHash}
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
                  <div className="font-mono">{new Date(block.timestamp).toLocaleString()}</div>
                  <div className="text-sm text-black/50 mt-1">
                    {Math.floor((Date.now() - block.timestamp) / 1000)} seconds ago
                  </div>
                </div>
              </div>

              {/* Validator */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <User className="w-5 h-5" />
                  <span>Validator</span>
                </div>
                <Link
                  href={`/address/${block.validator}`}
                  className="font-mono text-sm hover:text-blue-600 transition-colors break-all max-w-md text-right"
                >
                  {block.validator}
                </Link>
              </div>

              {/* Transaction Count */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="flex items-center space-x-3 text-black/70">
                  <FileText className="w-5 h-5" />
                  <span>Transactions</span>
                </div>
                <div className="font-bold">
                  {formatNumber(transactions.length)} {transactions.length === 1 ? 'transaction' : 'transactions'}
                </div>
              </div>

              {/* Merkle Root */}
              {block.merkleRoot && (
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 text-black/70">
                    <Hash className="w-5 h-5" />
                    <span>Merkle Root</span>
                  </div>
                  <div className="font-mono text-sm break-all max-w-md text-right">
                    {block.merkleRoot}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold mb-6">
              Transactions ({formatNumber(transactions.length)})
            </h2>

            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx: any, index: number) => (
                  <Link
                    key={index}
                    href={`/tx/${tx.hash}`}
                    className="block p-6 bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ArrowRight className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-mono text-sm text-black/70">
                            {truncateHash(tx.hash)}
                          </div>
                          <div className="text-sm text-black/50">
                            <span className="font-mono">{truncateHash(tx.from)}</span>
                            {' → '}
                            <span className="font-mono">{truncateHash(tx.to)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatPRISM(tx.amount)}
                        </div>
                        <div className="text-sm text-black/50">
                          Fee: {formatPRISM(tx.fee)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="text-black/50">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">Confirmed</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-black/50">
                No transactions in this block
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
