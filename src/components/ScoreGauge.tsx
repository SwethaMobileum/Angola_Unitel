import { useEffect, useRef, useState } from 'react';
import type { ConfidenceLevel, ScoreBandName } from '../scoring';
import { BandBadge, ConfidenceBadge } from './Badges';

interface ScoreGaugeProps {
  score: number;
  band: ScoreBandName;
  confidence: ConfidenceLevel;
  uncappedScore?: number;
}

export function ScoreGauge({ score, band, confidence, uncappedScore }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(score);
  const prevRef = useRef(score);

  useEffect(() => {
    const start = prevRef.current;
    const end = score;
    if (start === end) {
      setDisplayScore(end);
      return;
    }
    const durationMs = 450;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [score]);

  const ratio = Math.max(0, Math.min(1, (score - 300) / 600));
  const radius = 84;
  const arcLength = Math.PI * radius;
  const dashOffset = arcLength * (1 - ratio);

  const arcColor =
    band === 'Excellent'
      ? 'var(--orange-700)'
      : band === 'Good'
        ? 'var(--orange-500)'
        : band === 'Fair'
          ? 'var(--orange-400)'
          : 'var(--orange-300)';

  return (
    <div className="gauge-card">
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange-700)' }}>
        Proxy credit score (demo)
      </div>
      <svg className="gauge-svg" viewBox="0 0 220 130" aria-label={`Proxy credit score ${score}`}>
        <path
          d="M 26 112 A 84 84 0 0 1 194 112"
          fill="none"
          stroke="var(--orange-100)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          className="gauge-arc-progress"
          d="M 26 112 A 84 84 0 0 1 194 112"
          fill="none"
          stroke={arcColor}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
        />
        <text x="110" y="92" textAnchor="middle" className="gauge-score-text">
          {displayScore}
        </text>
        <text x="110" y="114" textAnchor="middle" className="gauge-caption">
          Scale 300 – 900
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <BandBadge band={band} />
        <ConfidenceBadge confidence={confidence} />
      </div>
      {uncappedScore !== undefined && uncappedScore > score && (
        <div style={{ fontSize: 12, color: 'var(--orange-700)', fontWeight: 600 }}>
          Uncapped model score: {uncappedScore} (hard cap active)
        </div>
      )}
    </div>
  );
}

