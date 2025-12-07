'use client';

import React, { useEffect, useState } from 'react';
import { Box, ArrowLeftRight, Activity, Zap } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import StatCard from '@/components/StatCard';
import BlockList from '@/components/BlockList';
import TransactionList from '@/components/TransactionList';
import GlassCard from '@/components/GlassCard';
import { formatNumber } from '@/lib/utils';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9001';

async function fetchStats() {
  try {
    const response = await fetch(`${RPC_URL}/stats`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function fetchBlocks() {
  try {
    const response = await fetch(`${RPC_URL}/blocks`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    return Array.isArray(data) ? data.slice(0, 5) : [];
  } catch (error) {
    return [];
  }
}

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, blocksData] = await Promise.all([
          fetchStats(),
          fetchBlocks(),
        ]);

        setStats(statsData);
        setBlocks(blocksData);

        // Get transactions from blocks
        const txs = blocksData
          .flatMap((block: any) => block.transactions || [])
          .slice(0, 5);
        setTransactions(txs);
      } catch (err) {
        setError('Failed to load blockchain data. Make sure the PRISM validator is running.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="text-center py-12 px-8">
          <div className="animate-spin w-12 h-12 border-4 border-prism-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Loading PRISM Explorer...</p>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <GlassCard className="text-center py-12 px-8 border-2 border-red-200">
          <p className="text-2xl font-bold text-red-600 mb-4">⚠️ Connection Error</p>
          <p className="text-black/70 mb-6">{error}</p>
          <div className="bg-black/5 p-4 rounded-lg text-left text-sm font-mono">
            <p className="mb-2">To fix this:</p>
            <p className="text-prism-blue">1. Open a terminal</p>
            <p className="text-prism-blue">2. cd C:\Users\richp\Desktop\Prismv0.1\prism-blockchain</p>
            <p className="text-prism-blue">3. npm run validator1</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-gradient-full">PRISM</span> Blockchain Explorer
        </h1>
        <p className="text-lg text-black/60 mb-8 max-w-2xl mx-auto">
          Explore blocks, transactions, and addresses on the PRISM network with real-time updates
        </p>
        <SearchBar />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Blocks"
          value={formatNumber(stats?.chainLength || blocks.length || 0)}
          icon={Box}
          colorClass="text-prism-blue"
        />
        <StatCard
          title="Pending Transactions"
          value={formatNumber(stats?.pendingTransactions || 0)}
          icon={ArrowLeftRight}
          colorClass="text-prism-orange"
        />
        <StatCard
          title="Active Validators"
          value={stats?.validatorCount || 1}
          icon={Activity}
          colorClass="text-prism-green"
        />
        <StatCard
          title="Network Status"
          value="Live"
          icon={Zap}
          subtitle="Real-time updates"
          colorClass="text-prism-violet"
        />
      </div>

      {/* Recent Blocks & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Blocks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black">Latest Blocks</h2>
            <a
              href="/blocks"
              className="text-sm text-prism-blue hover:underline font-medium"
            >
              View all →
            </a>
          </div>
          {blocks.length > 0 ? (
            <BlockList blocks={blocks} />
          ) : (
            <GlassCard>
              <p className="text-center text-black/50 py-8">No blocks yet. Mining in progress...</p>
            </GlassCard>
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black">Latest Transactions</h2>
            <a
              href="/transactions"
              className="text-sm text-prism-blue hover:underline font-medium"
            >
              View all →
            </a>
          </div>
          {transactions.length > 0 ? (
            <TransactionList transactions={transactions} />
          ) : (
            <GlassCard>
              <p className="text-center text-black/50 py-8">No transactions yet. Submit your first transaction!</p>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Network Info */}
      <GlassCard variant="prism">
        <div className="text-center py-8">
          <h3 className="text-2xl font-bold text-gradient-full mb-3">
            Welcome to PRISM Explorer
          </h3>
          <p className="text-black/70 max-w-2xl mx-auto">
            PRISM is a high-performance blockchain with Raft consensus and probabilistic finality.
            Explore the network in real-time with our glassmorphism-powered explorer.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
