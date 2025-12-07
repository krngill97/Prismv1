'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Box, ArrowLeftRight, Activity } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/blocks', label: 'Blocks', icon: Box },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="glass-card sticky top-4 z-50 mx-4 mb-8">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl prism-gradient flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient-full">PRISM</h1>
              <p className="text-xs text-black/50">Block Explorer</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-white/80 shadow-lg text-black font-semibold'
                      : 'bg-white/40 hover:bg-white/60 text-black/70 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Network Status */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100/80 border border-green-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">Live</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
