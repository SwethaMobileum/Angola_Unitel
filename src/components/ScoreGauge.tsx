import React from 'react';
import { getScoreBandColors } from '../lib/scoring';

interface ScoreGaugeProps {
  score: number; // 300 .. 900
  bandLabel?: string;
  size?: number;
  className?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  bandLabel,
  size = 230,
  className = '',
}) => {
  // Clamp score between 300 and 900
  const clampedScore = Math.max(300, Math.min(900, score));

  // Percentage from 300 to 900
  const normalizedPct = (clampedScore - 300) / (900 - 300);

  // Semicircle arc parameters
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength - normalizedPct * arcLength;

  // Determine color based on score band (Change Request v3)
  // >= 700: Dark Green #157A4B
  // 600-699: Light Green #8BD3A8 with dark text #0F4A2C
  // < 600: Red #C8372D
  const bandColors = getScoreBandColors(clampedScore);
  const scoreTextColor = clampedScore >= 600 && clampedScore < 700 ? '#0F4A2C' : bandColors.bg;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size / 2 + strokeWidth + 8 }}>
        <svg
          width={size}
          height={size / 2 + strokeWidth}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
          className="overflow-visible"
        >
          {/* Background Track Arc */}
          <path
            d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active Colored Arc */}
          <path
            d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
            fill="none"
            stroke={bandColors.bg}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Inside Arc: Score Number & Status Badge with Clean Breathing Room */}
        <div className="absolute inset-x-0 top-6 flex flex-col items-center justify-start text-center pointer-events-none">
          <span className="text-3xl font-black font-mono tracking-tight" style={{ color: scoreTextColor }}>
            {clampedScore}
          </span>
          {bandLabel && (
            <span
              className="mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold shadow-xs"
              style={{ backgroundColor: bandColors.bg, color: bandColors.text }}
            >
              {bandLabel}
            </span>
          )}
        </div>
      </div>

      {/* Outside Arc: Dedicated Label & Min/Mid/Max Scale - ZERO OVERLAP */}
      <div className="w-full flex flex-col items-center gap-1 mt-1">
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
          Proxy Credit Score
        </span>
        <div className="w-full flex justify-between px-3 text-xs font-mono font-semibold text-slate-400">
          <span>300 (Min)</span>
          <span className="text-slate-300">600</span>
          <span>900 (Max)</span>
        </div>
      </div>
    </div>
  );
};
