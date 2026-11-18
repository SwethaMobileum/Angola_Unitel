import React from 'react';
import { SegmentCode, BlockCode } from '../types';
import { DEFAULT_SEGMENTS, DEFAULT_WEIGHTS } from '../data/seedData';
import { BlockTag } from './BlockTag';

interface HeatmapProps {
  selectedSegment?: SegmentCode;
  onSelectSegment?: (code: SegmentCode) => void;
  className?: string;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  selectedSegment,
  onSelectSegment,
  className = '',
}) => {
  const blocks: BlockCode[] = ['P', 'T', 'W', 'B', 'X'];

  // Helper to get block points for a segment
  const getPoints = (segmentCode: SegmentCode, blockCode: BlockCode) => {
    const entry = DEFAULT_WEIGHTS.find(
      (w) => w.segment_code === segmentCode && w.block_code === blockCode
    );
    return {
      points: entry?.points || 0,
      role: entry?.role || 'not_available',
    };
  };

  // Color intensity style for points
  const getCellStyle = (points: number) => {
    if (points === 0) {
      return {
        bg: 'bg-slate-50 text-slate-400 font-normal',
        border: 'border-slate-100',
      };
    }
    if (points <= 12) {
      return {
        bg: 'bg-blue-50/70 text-navy font-semibold',
        border: 'border-blue-100',
      };
    }
    if (points <= 25) {
      return {
        bg: 'bg-teal-100 text-teal-900 font-semibold',
        border: 'border-teal-200',
      };
    }
    if (points <= 40) {
      return {
        bg: 'bg-orange/20 text-orange-dark font-bold',
        border: 'border-orange/30',
      };
    }
    if (points <= 55) {
      return {
        bg: 'bg-orange/70 text-white font-bold',
        border: 'border-orange/80',
      };
    }
    // > 55
    return {
      bg: 'bg-orange text-white font-extrabold',
      border: 'border-orange-dark',
    };
  };

  return (
    <div className={`overflow-x-auto w-full rounded-lg border border-slate-border shadow-sm bg-white ${className}`}>
      <table className="min-w-full divide-y divide-slate-border text-sm min-w-[650px]">
        <thead className="bg-slate-50 text-navy font-semibold">
          <tr>
            <th className="py-3 px-4 text-left">Segment</th>
            {blocks.map((code) => (
              <th key={code} className="py-3 px-3 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <BlockTag code={code} showName={false} className="text-[11px]" />
                  <span className="text-[11px] font-normal text-slate-muted">{code}</span>
                </div>
              </th>
            ))}
            <th className="py-3 px-3 text-center bg-slate-100/70 text-navy">
              <span className="block font-bold">Base Sum</span>
              <span className="text-[10px] text-slate-muted font-normal">(Target 94)</span>
            </th>
            <th className="py-3 px-3 text-center bg-emerald-50/60 text-emerald-800">
              <span className="block font-bold">Asset Bonus</span>
              <span className="text-[10px] text-emerald-600 font-normal">(Up to +6)</span>
            </th>
            <th className="py-3 px-4 text-center bg-navy text-white font-bold">
              <span>Total Max</span>
              <span className="block text-[10px] text-slate-300 font-normal">(100 pts)</span>
            </th>
            <th className="py-3 px-4 text-left">Primary (Main) Channel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-border">
          {DEFAULT_SEGMENTS.filter((s) => s.is_active ?? true).map((segment) => {
            const isSelected = selectedSegment === segment.code;

            // Find main block
            let maxBlock: BlockCode = 'T';
            let maxPoints = -1;
            blocks.forEach((b) => {
              const p = getPoints(segment.code, b).points;
              if (p > maxPoints) {
                maxPoints = p;
                maxBlock = b;
              }
            });

            const baseSum = blocks.reduce((sum, b) => sum + getPoints(segment.code, b).points, 0);

            return (
              <tr
                key={segment.code}
                onClick={() => onSelectSegment?.(segment.code)}
                className={`transition-colors cursor-pointer hover:bg-slate-50/80 ${
                  isSelected ? 'bg-orange-soft/40 ring-1 ring-orange' : ''
                }`}
              >
                {/* Segment Name & Code */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-md text-xs font-bold font-mono flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: segment.color }}
                    >
                      {segment.code}
                    </span>
                    <div>
                      <div className="font-semibold text-navy hover:text-orange transition-colors">
                        {segment.name}
                      </div>
                      <div className="text-[11px] text-slate-muted line-clamp-1 max-w-xs">
                        {segment.share_note}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Block Points Heatmap Cells */}
                {blocks.map((b) => {
                  const { points, role } = getPoints(segment.code, b);
                  const style = getCellStyle(points);
                  const isMain = role === 'main';

                  return (
                    <td key={b} className="py-2 px-2 text-center">
                      <div
                        className={`inline-flex flex-col items-center justify-center w-11 h-9 rounded border transition-transform hover:scale-105 ${style.bg} ${style.border}`}
                        title={`${segment.code} - Block ${b}: ${points} pts (${role})`}
                      >
                        <span className="font-mono text-xs">{points}</span>
                        {isMain && (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-1 rounded bg-black/20 text-white leading-none">
                            Main
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Base Sum Invariant (94) */}
                <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold bg-slate-100/50">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      baseSum === 94
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800 font-extrabold'
                    }`}
                  >
                    {baseSum} pts
                  </span>
                </td>

                {/* Asset Bonus */}
                <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-semibold text-emerald-700 bg-emerald-50/30">
                  +6 pts
                </td>

                {/* Total Points */}
                <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold text-navy bg-slate-50">
                  100 pts
                </td>

                {/* Primary Channel */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <BlockTag code={maxBlock} showName={true} className="text-xs py-0.5" />
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      ({maxPoints} pts)
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
