'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import TransactionList from '@/components/TransactionList';
import GlassCard from '@/components/GlassCard';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9001';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const response = await fetch(`${RPC_URL}/transactions`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setTransactions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
    const interval = setInterval(loadTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = transactions.filter(tx => tx.status === 'pending').length;
  const confirmedCount = transactions.filter(tx => tx.status === 'confirmed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="text-center py-12 px-8">
          <div className="animate-spin w-12 h-12 border-4 border-prism-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Loading Transactions...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <GlassCard variant="prism">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl prism-gradient">
            <ArrowLeftRight className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-full">Transactions</h1>
            <p className="text-black/60 mt-1">
              Browse all transactions on the PRISM network
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="text-center">
            <p className="text-sm text-black/50 mb-1">Total Transactions</p>
            <p className="text-3xl font-bold">{transactions.length.toLocaleString()}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-sm text-black/50 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {pendingCount.toLocaleString()}
            </p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-sm text-black/50 mb-1">Confirmed</p>
            <p className="text-3xl font-bold text-green-600">
              {confirmedCount.toLocaleString()}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Transactions List */}
      <div>
        <h2 className="text-2xl font-bold text-black mb-4">All Transactions</h2>
        {transactions.length > 0 ? (
          <TransactionList transactions={transactions} showPagination={transactions.length > 20} />
        ) : (
          <GlassCard>
            <p className="text-center text-black/50 py-12">
              No transactions found. Submit your first transaction to get started!
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
