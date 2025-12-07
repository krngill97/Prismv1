'use client';

import React, { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import BlockList from '@/components/BlockList';
import GlassCard from '@/components/GlassCard';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9001';

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBlocks() {
      try {
        const response = await fetch(`${RPC_URL}/blocks`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setBlocks(Array.isArray(data) ? data.reverse() : []);
        }
      } catch (error) {
        console.error('Error loading blocks:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBlocks();
    const interval = setInterval(loadBlocks, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="text-center py-12 px-8">
          <div className="animate-spin w-12 h-12 border-4 border-prism-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Loading Blocks...</p>
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
            <Box className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-full">Blocks</h1>
            <p className="text-black/60 mt-1">
              Browse all blocks in the PRISM blockchain
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="text-center">
            <p className="text-sm text-black/50 mb-1">Total Blocks</p>
            <p className="text-3xl font-bold">{blocks.length.toLocaleString()}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-sm text-black/50 mb-1">Latest Block</p>
            <p className="text-3xl font-bold">
              {blocks.length > 0 ? blocks[0].number.toLocaleString() : 0}
            </p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-sm text-black/50 mb-1">Avg Block Time</p>
            <p className="text-3xl font-bold">~10s</p>
          </div>
        </GlassCard>
      </div>

      {/* Blocks List */}
      <div>
        <h2 className="text-2xl font-bold text-black mb-4">All Blocks</h2>
        {blocks.length > 0 ? (
          <BlockList blocks={blocks} showPagination={blocks.length > 20} />
        ) : (
          <GlassCard>
            <p className="text-center text-black/50 py-8">No blocks found. Start the validator first.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
