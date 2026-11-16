import React from 'react';
import { BlockCode } from '../types';
import { COPY } from '../copy/en';

interface BlockTagProps {
  code: BlockCode;
  showName?: boolean;
  className?: string;
}

export const BlockTag: React.FC<BlockTagProps> = ({ code, showName = true, className = '' }) => {
  const block = COPY.blocks[code];
  if (!block) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-white tracking-wide shadow-sm ${className}`}
      style={{ backgroundColor: block.color }}
      title={`${block.code}: ${block.name}`}
    >
      <span className="font-mono">{block.code}</span>
      {showName && <span>{block.name}</span>}
    </span>
  );
};
