import React from 'react';
import { BlockCode } from '../types';
import { COPY } from '../copy/en';

interface BlockBarProps {
  points: Partial<Record<BlockCode, number>>;
  maxPoints?: number;
  showLabels?: boolean;
  className?: string;
}

export const BlockBar: React.FC<BlockBarProps> = ({
  points,
  maxPoints = 94,
  showLabels = false,
  className = '',
}) => {
  const blocks: BlockCode[] = ['P', 'T', 'W', 'B', 'X'];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Stacked bar */}
      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
        {blocks.map((code) => {
          const val = points[code] || 0;
          if (val <= 0) return null;
          const pct = (val / maxPoints) * 100;
          const color = COPY.blocks[code]?.color || '#5F6F80';

          return (
            <div
              key={code}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="h-full transition-all relative group"
              title={`${code} (${COPY.blocks[code]?.name}): ${val} pts (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Legend / Labels */}
      {showLabels && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-muted">
          {blocks.map((code) => {
            const val = points[code] || 0;
            if (val <= 0) return null;
            const color = COPY.blocks[code]?.color || '#5F6F80';

            return (
              <span key={code} className="inline-flex items-center gap-1 font-mono">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
                <span className="font-semibold text-navy">{code}:</span>
                <span>{val} pts</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
