import React from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Clock,
  Hash,
  User,
  CheckCircle,
  XCircle,
  Clock3,
  Box,
  Coins,
} from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { api } from '@/lib/api';
import { formatDate, formatPRISM, truncateHash } from '@/lib/utils';

interface PageProps {
  params: {
    hash: string;
  };
}

async function getTransaction(hash: string) {
  try {
    return await api.getTransaction(hash);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const tx = await getTransaction(params.hash);

  if (!tx) {
    return (
      <div className="space-y-8">
        <GlassCard>
          <div className="text-center py-12">
            <p className="text-2xl font-bold text-black/70">Transaction Not Found</p>
            <p className="text-black/50 mt-2 font-mono text-sm">{params.hash}</p>
            <Link href="/transactions" className="inline-block mt-6 glass-button">
              Back to Transactions
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-6 h-6" />,
          text: 'Confirmed',
          color: 'text-green-600',
          bg: 'bg-green-100/80',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-6 h-6" />,
          text: 'Failed',
          color: 'text-red-600',
          bg: 'bg-red-100/80',
        };
      default:
        return {
          icon: <Clock3 className="w-6 h-6" />,
          text: 'Pending',
          color: 'text-yellow-600',
          bg: 'bg-yellow-100/80',
        };
    }
  };

  const statusDisplay = getStatusDisplay(tx.status);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <GlassCard variant="prism">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl prism-gradient">
              <ArrowLeftRight className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gradient-full">Transaction Details</h1>
              <p className="text-black/60 mt-1 font-mono text-sm break-all">
                {truncateHash(tx.hash, 16, 16)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusDisplay.bg}`}>
            <span className={statusDisplay.color}>{statusDisplay.icon}</span>
            <span className={`font-semibold ${statusDisplay.color}`}>{statusDisplay.text}</span>
          </div>
        </div>
      </GlassCard>

      {/* Transaction Details */}
      <GlassCard>
        <h2 className="text-2xl font-bold text-black mb-6">Transaction Information</h2>
        <div className="space-y-4">
          {/* Transaction Hash */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Hash className="w-4 h-4" />
              <span className="font-medium">Transaction Hash</span>
            </div>
            <p className="font-mono text-sm break-all">{tx.hash}</p>
          </div>

          {/* Status */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={statusDisplay.color}>{statusDisplay.icon}</span>
              <span className={`font-semibold ${statusDisplay.color}`}>{statusDisplay.text}</span>
            </div>
          </div>

          {/* Block */}
          {tx.blockNumber !== undefined && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
              <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
                <Box className="w-4 h-4" />
                <span className="font-medium">Block</span>
              </div>
              <Link
                href={`/block/${tx.blockNumber}`}
                className="text-sm hover:text-prism-blue transition-colors font-semibold"
              >
                #{tx.blockNumber}
              </Link>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Timestamp</span>
            </div>
            <p className="text-sm">{formatDate(tx.timestamp)}</p>
          </div>

          {/* From */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <User className="w-4 h-4" />
              <span className="font-medium">From</span>
            </div>
            <Link
              href={`/address/${tx.from}`}
              className="font-mono text-sm hover:text-prism-blue transition-colors break-all"
            >
              {tx.from}
            </Link>
          </div>

          {/* To */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <User className="w-4 h-4" />
              <span className="font-medium">To</span>
            </div>
            <Link
              href={`/address/${tx.to}`}
              className="font-mono text-sm hover:text-prism-blue transition-colors break-all"
            >
              {tx.to}
            </Link>
          </div>

          {/* Amount */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Coins className="w-4 h-4" />
              <span className="font-medium">Amount</span>
            </div>
            <p className="text-lg font-bold text-prism-green">{formatPRISM(tx.amount)}</p>
          </div>

          {/* Fee */}
          {tx.fee && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
              <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
                <Coins className="w-4 h-4" />
                <span className="font-medium">Transaction Fee</span>
              </div>
              <p className="text-sm">{formatPRISM(tx.fee)}</p>
            </div>
          )}

          {/* Nonce */}
          {tx.nonce !== undefined && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
              <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
                <Hash className="w-4 h-4" />
                <span className="font-medium">Nonce</span>
              </div>
              <p className="text-sm font-mono">{tx.nonce}</p>
            </div>
          )}

          {/* Signature */}
          {tx.signature && (
            <div className="flex flex-col md:flex-row md:items-start gap-2">
              <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
                <Hash className="w-4 h-4" />
                <span className="font-medium">Signature</span>
              </div>
              <p className="font-mono text-xs break-all bg-black/5 p-3 rounded-lg">{tx.signature}</p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// Enable dynamic rendering for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
