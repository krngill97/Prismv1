import React from 'react';
import Link from 'next/link';
import { Box, Clock, User } from 'lucide-react';
import GlassCard from './GlassCard';
import { truncateHash, timeAgo, formatNumber } from '@/lib/utils';

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  validator: string;
  transactions?: any[];
}

interface BlockListProps {
  blocks: Block[];
  showPagination?: boolean;
}

export default function BlockList({ blocks, showPagination = false }: BlockListProps) {
  if (blocks.length === 0) {
    return (
      <GlassCard>
        <p className="text-center text-black/50 py-8">No blocks found</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <Link href={`/block/${block.number}`} key={block.number}>
          <GlassCard className="hover:bg-white/70 cursor-pointer">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Block Number */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-prism-blue/10">
                  <Box className="w-5 h-5 text-prism-blue" />
                </div>
                <div>
                  <p className="text-sm text-black/50">Block</p>
                  <p className="font-bold text-lg">{formatNumber(block.number)}</p>
                </div>
              </div>

              {/* Block Hash */}
              <div>
                <p className="text-sm text-black/50 mb-1">Hash</p>
                <p className="font-mono text-sm font-medium">{truncateHash(block.hash)}</p>
              </div>

              {/* Validator */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-black/40" />
                <div>
                  <p className="text-sm text-black/50 mb-1">Validator</p>
                  <p className="font-mono text-sm">{truncateHash(block.validator, 8, 6)}</p>
                </div>
              </div>

              {/* Time & Transactions */}
              <div className="flex flex-col gap-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Clock className="w-4 h-4 text-black/40" />
                  <span className="text-sm text-black/60">{timeAgo(block.timestamp)}</span>
                </div>
                <div className="px-3 py-1 rounded-lg bg-white/80 text-sm font-medium inline-block ml-auto">
                  {block.transactions?.length || 0} txns
                </div>
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
