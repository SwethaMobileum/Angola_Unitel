import React from 'react';
import { getScoreBandColors } from '../lib/scoring';

export type StatusVariant = 'success' | 'warn' | 'danger' | 'neutral' | 'navy';

interface StatusChipProps {
  label?: string;
  status?: string;
  variant?: StatusVariant;
  icon?: React.ReactNode;
  className?: string;
}

export interface ScoreChipProps {
  score: number;
  label?: string;
  className?: string;
}

export const ScoreChip: React.FC<ScoreChipProps> = ({ score, label, className = '' }) => {
  const colors = getScoreBandColors(score);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold shadow-xs ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <span>{score}</span>
      {label && <span className="font-sans font-medium text-[11px]">&bull; {label}</span>}
    </span>
  );
};

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  status,
  variant,
  icon,
  className = '',
}) => {
  let displayLabel = label || status || 'Unknown';
  let resolvedVariant: StatusVariant = variant || 'neutral';

  if (status) {
    switch (status.toLowerCase()) {
      case 'approved':
        displayLabel = 'Approved';
        resolvedVariant = 'success';
        break;
      case 'purchased':
        displayLabel = 'Purchased';
        resolvedVariant = 'success';
        break;
      case 'submitted':
      case 'pending':
        displayLabel = 'Submitted';
        resolvedVariant = 'warn';
        break;
      case 'rejected':
        displayLabel = 'Rejected';
        resolvedVariant = 'danger';
        break;
      case 'scored':
        displayLabel = 'Scored';
        resolvedVariant = 'navy';
        break;
      case 'draft':
        displayLabel = 'Draft';
        resolvedVariant = 'neutral';
        break;
      case 'saved':
        displayLabel = 'Saved';
        resolvedVariant = 'neutral';
        break;
      default:
        displayLabel = status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  const variantStyles: Record<StatusVariant, string> = {
    success: 'bg-[#EBF7EE] text-[#2E7D4F] border-[#A8DBB8]',
    warn: 'bg-[#FEF5E7] text-[#B26A00] border-[#FAD89E]',
    danger: 'bg-[#FDF2F2] text-[#B3261E] border-[#F8B4B4]',
    neutral: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
    navy: 'bg-[#EAEFF5] text-[#1F3A5F] border-[#B9CADA]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[resolvedVariant]} ${className}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
};
