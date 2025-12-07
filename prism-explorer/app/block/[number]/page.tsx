import React from 'react';
import Link from 'next/link';
import { Box, Clock, Hash, User, ArrowLeft, ArrowRight } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import TransactionList from '@/components/TransactionList';
import { api } from '@/lib/api';
import { formatDate, formatNumber, truncateHash } from '@/lib/utils';

interface PageProps {
  params: {
    number: string;
  };
}

async function getBlock(number: number) {
  try {
    return await api.getBlock(number);
  } catch (error) {
    console.error('Error fetching block:', error);
    return null;
  }
}

export default async function BlockDetailPage({ params }: PageProps) {
  const blockNumber = parseInt(params.number);
  const block = await getBlock(blockNumber);

  if (!block) {
    return (
      <div className="space-y-8">
        <GlassCard>
          <div className="text-center py-12">
            <p className="text-2xl font-bold text-black/70">Block Not Found</p>
            <p className="text-black/50 mt-2">Block #{blockNumber} does not exist</p>
            <Link
              href="/blocks"
              className="inline-block mt-6 glass-button"
            >
              Back to Blocks
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <GlassCard variant="prism">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl prism-gradient">
              <Box className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-full">
                Block #{formatNumber(block.number)}
              </h1>
              <p className="text-black/60 mt-1">{formatDate(block.timestamp)}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {block.number > 0 && (
              <Link
                href={`/block/${block.number - 1}`}
                className="glass-button p-3"
                title="Previous block"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <Link
              href={`/block/${block.number + 1}`}
              className="glass-button p-3"
              title="Next block"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* Block Details */}
      <GlassCard>
        <h2 className="text-2xl font-bold text-black mb-6">Block Details</h2>
        <div className="space-y-4">
          {/* Block Hash */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Hash className="w-4 h-4" />
              <span className="font-medium">Block Hash</span>
            </div>
            <p className="font-mono text-sm break-all">{block.hash}</p>
          </div>

          {/* Previous Hash */}
          {block.previousHash && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
              <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
                <Hash className="w-4 h-4" />
                <span className="font-medium">Previous Hash</span>
              </div>
              <Link
                href={`/block/${block.number - 1}`}
                className="font-mono text-sm break-all hover:text-prism-blue transition-colors"
              >
                {block.previousHash}
              </Link>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Timestamp</span>
            </div>
            <p className="text-sm">
              {formatDate(block.timestamp)} ({block.timestamp})
            </p>
          </div>

          {/* Validator */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <User className="w-4 h-4" />
              <span className="font-medium">Validator</span>
            </div>
            <Link
              href={`/address/${block.validator}`}
              className="font-mono text-sm hover:text-prism-blue transition-colors"
            >
              {block.validator}
            </Link>
          </div>

          {/* Transaction Count */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Box className="w-4 h-4" />
              <span className="font-medium">Transactions</span>
            </div>
            <p className="text-sm font-semibold">
              {block.transactions?.length || 0} transactions in this block
            </p>
          </div>

          {/* Merkle Root */}
          {block.merkleRoot && (
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
                <Hash className="w-4 h-4" />
                <span className="font-medium">Merkle Root</span>
              </div>
              <p className="font-mono text-sm break-all">{block.merkleRoot}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Transactions */}
      {block.transactions && block.transactions.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold text-black mb-4">
            Transactions ({block.transactions.length})
          </h2>
          <TransactionList transactions={block.transactions} />
        </div>
      ) : (
        <GlassCard>
          <p className="text-center text-black/50 py-8">No transactions in this block</p>
        </GlassCard>
      )}
    </div>
  );
}

// Enable dynamic rendering for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
