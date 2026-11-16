import React, { useState } from 'react';
import { Segment, BlockCode } from '../types';
import { DEFAULT_WEIGHTS, DEFAULT_PARAMETERS, DEFAULT_SEGMENT_PARAMETERS } from '../data/seedData';
import { BlockBar } from './BlockBar';
import { BlockTag } from './BlockTag';
import { ChevronDown, ChevronUp, ShieldCheck, DollarSign, Eye } from 'lucide-react';

interface SegmentCardProps {
  segment: Segment;
  initiallyExpanded?: boolean;
  className?: string;
}

export const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  initiallyExpanded = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  // Get weights for this segment
  const weights = DEFAULT_WEIGHTS.filter((w) => w.segment_code === segment.code);
  const pointsByBlock: Partial<Record<BlockCode, number>> = {};
  weights.forEach((w) => {
    pointsByBlock[w.block_code] = w.points;
  });

  // Get parameters mapped for this segment
  const paramKeys = DEFAULT_SEGMENT_PARAMETERS[segment.code] || [];
  const assignedParams = DEFAULT_PARAMETERS.filter((p) => paramKeys.includes(p.key));

  // Determine primary (main) block
  const mainWeight = weights.reduce(
    (prev, curr) => (curr.points > prev.points ? curr : prev),
    weights[0]
  );

  return (
    <div
      className={`card-base transition-all hover:shadow-md border border-slate-border bg-white rounded-xl overflow-hidden ${className}`}
    >
      {/* Top Banner with Color Accent */}
      <div className="h-1.5 w-full" style={{ backgroundColor: segment.color }} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="w-10 h-10 rounded-lg text-sm font-extrabold font-mono flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: segment.color }}
            >
              {segment.code}
            </span>
            <div>
              <h3 className="text-base font-bold text-navy leading-tight">{segment.name}</h3>
              <p className="text-xs text-slate-muted mt-0.5">{segment.share_note}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-xs font-semibold text-slate-500">Primary Channel</span>
            {mainWeight && (
              <div className="flex items-center gap-1">
                <BlockTag code={mainWeight.block_code} showName={true} className="text-xs" />
                <span className="text-xs font-mono font-bold text-navy">({mainWeight.points} pts)</span>
              </div>
            )}
          </div>
        </div>

        {/* Story */}
        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
          {segment.story}
        </p>

        {/* Behavioral Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-md bg-slate-50/70 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-navy">
              <DollarSign className="w-3.5 h-3.5 text-orange" />
              <span>How Money Moves</span>
            </div>
            <p className="text-slate-600 pl-5 text-[11px] leading-relaxed">
              {segment.how_money_moves}
            </p>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50/70 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-navy">
              <Eye className="w-3.5 h-3.5 text-teal-600" />
              <span>Data Visible</span>
            </div>
            <p className="text-slate-600 pl-5 text-[11px] leading-relaxed">
              {segment.data_visible}
            </p>
          </div>
        </div>

        {/* Limit & Thin-File Guidance */}
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Credit Limit & Policy: </span>
            <span className="text-amber-800">{segment.limit_rule}</span>
          </div>
        </div>

        {/* Block Points Stacked Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs font-semibold text-navy">
            <span>Base Points Distribution</span>
            <span className="font-mono text-emerald-700 font-bold">Sum: 94 pts</span>
          </div>
          <BlockBar points={pointsByBlock} maxPoints={94} showLabels={true} />
        </div>

        {/* Expandable Parameters Drawer */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full py-1 text-xs font-semibold text-slate-muted hover:text-navy transition-colors"
          >
            <span>
              Configured Parameters ({assignedParams.length} parameters linked)
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
              {['P', 'T', 'W', 'B', 'X'].map((blockCode) => {
                const blockParams = assignedParams.filter((p) => p.block_code === blockCode);
                const blockPoints = pointsByBlock[blockCode as BlockCode] || 0;
                if (blockParams.length === 0 && blockPoints === 0) return null;

                return (
                  <div key={blockCode} className="p-2.5 rounded-md border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <BlockTag code={blockCode as BlockCode} showName={true} className="text-[11px]" />
                      <span className="text-[11px] font-mono font-bold text-navy">
                        {blockPoints > 0 ? `${blockPoints} base points` : 'Not scored (0 pts)'}
                      </span>
                    </div>

                    {blockParams.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        {blockParams.map((p) => (
                          <div
                            key={p.key}
                            className="p-1.5 rounded bg-white border border-slate-200/70 flex items-center justify-between"
                          >
                            <span className="text-slate-700 font-medium truncate" title={p.help}>
                              {p.label}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase px-1 py-0.5 rounded bg-slate-100 ml-1 shrink-0">
                              {p.input}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No active parameters mapped for this block (channel not applicable for this segment).
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
