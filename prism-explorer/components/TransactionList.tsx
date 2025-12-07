import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import GlassCard from './GlassCard';
import { truncateHash, timeAgo, formatPRISM } from '@/lib/utils';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string | bigint;
  timestamp: number;
  status?: string;
  fee?: string | bigint;
}

interface TransactionListProps {
  transactions: Transaction[];
  showPagination?: boolean;
}

export default function TransactionList({
  transactions,
  showPagination = false,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <GlassCard>
        <p className="text-center text-black/50 py-8">No transactions found</p>
      </GlassCard>
    );
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock3 className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <Link href={`/tx/${tx.hash}`} key={tx.hash}>
          <GlassCard className="hover:bg-white/70 cursor-pointer">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
              {/* Status & Hash */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(tx.status)}
                  <span className="text-sm font-medium text-black/60">
                    {getStatusText(tx.status)}
                  </span>
                </div>
                <p className="text-sm text-black/50 mb-1">Hash</p>
                <p className="font-mono text-sm font-medium">{truncateHash(tx.hash)}</p>
              </div>

              {/* From -> To */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-black/50 mb-1">From</p>
                    <Link
                      href={`/address/${tx.from}`}
                      className="font-mono text-sm hover:text-prism-blue transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {truncateHash(tx.from, 8, 6)}
                    </Link>
                  </div>

                  <ArrowRight className="w-5 h-5 text-black/30 flex-shrink-0" />

                  <div className="flex-1">
                    <p className="text-xs text-black/50 mb-1">To</p>
                    <Link
                      href={`/address/${tx.to}`}
                      className="font-mono text-sm hover:text-prism-blue transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {truncateHash(tx.to, 8, 6)}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Amount & Time */}
              <div className="flex flex-col gap-2 lg:text-right">
                <div className="px-3 py-1 rounded-lg bg-white/80 font-mono text-sm font-semibold inline-block lg:ml-auto">
                  {formatPRISM(tx.amount)}
                </div>
                <div className="flex items-center gap-2 lg:justify-end">
                  <Clock className="w-4 h-4 text-black/40" />
                  <span className="text-sm text-black/60">{timeAgo(tx.timestamp)}</span>
                </div>
                {tx.fee && (
                  <span className="text-xs text-black/50">
                    Fee: {formatPRISM(tx.fee)}
                  </span>
                )}
              </div>
            </div>
          </GlassCard>
        </Link>
      ))}

      {showPagination && (
        <div className="flex justify-center gap-2 mt-6">
          <button className="glass-button px-6 py-2 text-sm">Previous</button>
          <button className="glass-button px-6 py-2 text-sm">Next</button>
        </div>
      )}
    </div>
  );
}
