import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'prism';
  hover?: boolean;
}

export default function GlassCard({
  children,
  className = '',
  variant = 'default',
  hover = true,
}: GlassCardProps) {
  const baseClass = 'glass-card p-6 ';

  const variantClasses = {
    default: '',
    dark: 'glass-card-dark',
    prism: 'prism-border bg-white/70',
  };

  const hoverClass = hover ? 'hover:scale-[1.02] hover:shadow-2xl' : '';

  return (
    <div className={`${baseClass} ${variantClasses[variant]} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
