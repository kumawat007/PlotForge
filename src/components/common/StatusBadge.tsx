'use client';

import React from 'react';

export type StatusVariant = 'safe' | 'hazard' | 'simulating' | 'idle' | 'warn';

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = '',
}) => {
  const config = {
    safe: {
      color: '#059669',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      defaultLabel: 'SAFE // 0 COLLISIONS',
    },
    hazard: {
      color: '#DC2626',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      defaultLabel: 'HAZARD // COLLISION DETECTED',
    },
    simulating: {
      color: '#EA580C',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      defaultLabel: 'SIMULATING // ACTIVE PATH',
    },
    warn: {
      color: '#D97706',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      defaultLabel: 'WARN // LIMIT NEARBY',
    },
    idle: {
      color: '#64748B',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
      text: 'text-slate-600',
      defaultLabel: 'IDLE // STANDBY',
    },
  }[status];

  const textLabel = label || config.defaultLabel;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border ${config.bg} ${config.border} font-mono text-[10px] tracking-wider uppercase font-semibold tabular-nums select-none ${className}`}
    >
      <span
        className="w-[6px] h-[6px] rounded-full shrink-0 animate-status-led"
        style={{
          backgroundColor: config.color,
          boxShadow: `0 0 6px ${config.color}`,
        }}
      />
      <span className={config.text}>{textLabel}</span>
    </div>
  );
};
