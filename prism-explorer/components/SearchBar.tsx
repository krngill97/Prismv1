'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isValidAddress, isValidHash } from '@/lib/utils';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    // Check if it's a block number
    const blockNumber = parseInt(query);
    if (!isNaN(blockNumber) && blockNumber >= 0) {
      router.push(`/block/${blockNumber}`);
      return;
    }

    // Check if it's an address
    if (isValidAddress(query)) {
      router.push(`/address/${query}`);
      return;
    }

    // Check if it's a transaction hash
    if (isValidHash(query)) {
      router.push(`/tx/${query}`);
      return;
    }

    setError('Invalid search query. Please enter a block number, address, or transaction hash.');
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Address / Txn Hash / Block Number"
          className="glass-input w-full pr-12 font-mono text-sm"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/80 hover:bg-white transition-all"
        >
          <Search className="w-5 h-5 text-black/60" />
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </form>
  );
}
