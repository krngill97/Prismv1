import React from 'react';
import { User, Coins, ArrowLeftRight, Hash, Copy } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import TransactionList from '@/components/TransactionList';
import { api } from '@/lib/api';
import { formatPRISM, formatNumber } from '@/lib/utils';
import Link from 'next/link';

interface PageProps {
  params: {
    address: string;
  };
}

async function getAddressData(address: string) {
  try {
    const [account, blockchain, balance] = await Promise.all([
      api.getAccount(address),
      api.getBlockchain(),
      api.getBalance(address),
    ]);

    // Get transactions for this address
    const transactions = blockchain.flatMap((block: any) =>
      (block.transactions || []).filter(
        (tx: any) => tx.from === address || tx.to === address
      )
    );

    // Calculate stats
    const sentTransactions = transactions.filter((tx: any) => tx.from === address);
    const receivedTransactions = transactions.filter((tx: any) => tx.to === address);

    const totalSent = sentTransactions.reduce(
      (sum: bigint, tx: any) => sum + BigInt(tx.amount),
      BigInt(0)
    );

    const totalReceived = receivedTransactions.reduce(
      (sum: bigint, tx: any) => sum + BigInt(tx.amount),
      BigInt(0)
    );

    return {
      account,
      balance,
      transactions: transactions.sort((a: any, b: any) => b.timestamp - a.timestamp),
      stats: {
        totalTransactions: transactions.length,
        sent: sentTransactions.length,
        received: receivedTransactions.length,
        totalSent,
        totalReceived,
      },
    };
  } catch (error) {
    console.error('Error fetching address data:', error);
    return null;
  }
}

export default async function AddressDetailPage({ params }: PageProps) {
  const data = await getAddressData(params.address);

  if (!data) {
    return (
      <div className="space-y-8">
        <GlassCard>
          <div className="text-center py-12">
            <p className="text-2xl font-bold text-black/70">Address Not Found</p>
            <p className="text-black/50 mt-2 font-mono text-sm break-all">{params.address}</p>
            <Link href="/" className="inline-block mt-6 glass-button">
              Back to Home
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const { account, balance, transactions, stats } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <GlassCard variant="prism">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl prism-gradient">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gradient-full mb-2">Address</h1>
            <div className="flex items-center gap-2">
              <p className="text-black/60 font-mono text-sm break-all">{params.address}</p>
              <button
                onClick={() => navigator.clipboard.writeText(params.address)}
                className="p-2 rounded-lg bg-white/60 hover:bg-white transition-all flex-shrink-0"
                title="Copy address"
              >
                <Copy className="w-4 h-4 text-black/60" />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Balance Card */}
      <GlassCard className="text-center py-8">
        <p className="text-sm text-black/50 mb-2">Balance</p>
        <p className="text-5xl font-bold text-gradient-full mb-4">{formatPRISM(balance)}</p>
        {account.nonce !== undefined && (
          <p className="text-sm text-black/50">Nonce: {account.nonce}</p>
        )}
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-prism-blue" />
            <div>
              <p className="text-sm text-black/50">Total Transactions</p>
              <p className="text-2xl font-bold">{formatNumber(stats.totalTransactions)}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-red-500 rotate-45" />
            <div>
              <p className="text-sm text-black/50">Sent</p>
              <p className="text-2xl font-bold">{formatNumber(stats.sent)}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-green-500 -rotate-45" />
            <div>
              <p className="text-sm text-black/50">Received</p>
              <p className="text-2xl font-bold">{formatNumber(stats.received)}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-prism-orange" />
            <div>
              <p className="text-sm text-black/50">Net Flow</p>
              <p className="text-lg font-bold">
                {formatPRISM(stats.totalReceived - stats.totalSent)}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Account Details */}
      <GlassCard>
        <h2 className="text-2xl font-bold text-black mb-6">Account Details</h2>
        <div className="space-y-4">
          {/* Address */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Hash className="w-4 h-4" />
              <span className="font-medium">Address</span>
            </div>
            <p className="font-mono text-sm break-all">{params.address}</p>
          </div>

          {/* Balance */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <Coins className="w-4 h-4" />
              <span className="font-medium">Balance</span>
            </div>
            <p className="text-lg font-bold">{formatPRISM(balance)}</p>
          </div>

          {/* Nonce */}
          {account.nonce !== undefined && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
              <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
                <Hash className="w-4 h-4" />
                <span className="font-medium">Nonce</span>
              </div>
              <p className="text-sm font-mono">{account.nonce}</p>
            </div>
          )}

          {/* Total Sent */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4 border-b border-black/10">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="font-medium">Total Sent</span>
            </div>
            <p className="text-sm">{formatPRISM(stats.totalSent)}</p>
          </div>

          {/* Total Received */}
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 text-black/50 min-w-[200px]">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="font-medium">Total Received</span>
            </div>
            <p className="text-sm">{formatPRISM(stats.totalReceived)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Transactions */}
      <div>
        <h2 className="text-2xl font-bold text-black mb-4">
          Transactions ({formatNumber(transactions.length)})
        </h2>
        {transactions.length > 0 ? (
          <TransactionList transactions={transactions} showPagination={transactions.length > 20} />
        ) : (
          <GlassCard>
            <p className="text-center text-black/50 py-8">No transactions found for this address</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

// Enable dynamic rendering for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
