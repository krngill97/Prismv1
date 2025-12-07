import React from 'react';
import { Github, Twitter, Activity } from 'lucide-react';
import GlassCard from './GlassCard';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 mb-8">
      <div className="container mx-auto px-4">
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl prism-gradient flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gradient-full">PRISM Explorer</h3>
                  <p className="text-xs text-black/50">Blockchain Transparency</p>
                </div>
              </div>
              <p className="text-sm text-black/60 max-w-md">
                A high-performance blockchain explorer for the PRISM network. Built with Next.js 14 and
                glassmorphism design principles.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-black mb-3">Explorer</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-sm text-black/60 hover:text-black transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/blocks" className="text-sm text-black/60 hover:text-black transition-colors">
                    Blocks
                  </a>
                </li>
                <li>
                  <a
                    href="/transactions"
                    className="text-sm text-black/60 hover:text-black transition-colors"
                  >
                    Transactions
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-black mb-3">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-black/60 hover:text-black transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-black/60 hover:text-black transition-colors"
                  >
                    API Reference
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-black/60 hover:text-black transition-colors"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-6 border-t border-black/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-black/50">
              © {currentYear} PRISM Explorer. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/60 hover:bg-white transition-all"
              >
                <Github className="w-5 h-5 text-black/60" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/60 hover:bg-white transition-all"
              >
                <Twitter className="w-5 h-5 text-black/60" />
              </a>
            </div>
          </div>
        </GlassCard>
      </div>
    </footer>
  );
}
