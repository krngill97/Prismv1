import React from 'react';
import GlassCard from './GlassCard';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  colorClass = 'text-prism-blue',
}: StatCardProps) {
  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-black/60">{title}</p>
          <h3 className="text-3xl font-bold text-black">{value}</h3>
          {subtitle && <p className="text-xs text-black/50">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-white/80 ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-black/50">vs last hour</span>
        </div>
      )}
    </GlassCard>
  );
}
