import React, { useState } from 'react';
import { SegmentCode } from '../types';
import { DEFAULT_QUESTIONS, DEFAULT_SEGMENTS } from '../data/seedData';
import { ArrowRight, CheckCircle2, XCircle, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';

interface FlowChartProps {
  walletEnabled?: boolean;
  onSelectSegment?: (code: SegmentCode) => void;
  className?: string;
}

export const FlowChart: React.FC<FlowChartProps> = ({
  walletEnabled = true,
  onSelectSegment,
  className = '',
}) => {
  // Current interactive question index and answers
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [localWalletEnabled, setLocalWalletEnabled] = useState(walletEnabled);

  // Filter questions if wallet is disabled (Questions 6 and 7 skipped)
  const activeQuestions = DEFAULT_QUESTIONS.map((q) => ({
    ...q,
    isSkipped: !localWalletEnabled && q.requires_wallet,
  }));

  // Determine current winning segment based on answers
  let resolvedSegment: SegmentCode | null = null;
  let winningQuestionId: number | null = null;

  for (const q of activeQuestions) {
    if (q.isSkipped) continue;
    if (answers[q.id] === true) {
      resolvedSegment = q.yes_segment;
      winningQuestionId = q.id;
      break;
    }
  }

  // If all non-skipped questions answered NO
  const allAnsweredNo = activeQuestions
    .filter((q) => !q.isSkipped)
    .every((q) => answers[q.id] === false);

  if (allAnsweredNo) {
    resolvedSegment = 'S1';
  }

  const handleAnswer = (questionId: number, isYes: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: isYes,
    }));
  };

  const handleReset = () => {
    setAnswers({});
  };

  const loadPreset = (preset: 'S1' | 'S3' | 'S7') => {
    if (preset === 'S1') {
      // All NO
      const newAnswers: Record<number, boolean> = {};
      activeQuestions.forEach((q) => {
        if (!q.isSkipped) newAnswers[q.id] = false;
      });
      setAnswers(newAnswers);
    } else if (preset === 'S7') {
      // Q1 NO, Q2 YES
      setAnswers({ 1: false, 2: true });
    } else if (preset === 'S3') {
      // Q1-Q5 NO, Q6 YES
      setAnswers({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: true });
    }
  };

  const winningSegmentMeta = DEFAULT_SEGMENTS.find((s) => s.code === resolvedSegment);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Interactive Controls & Persona Bar */}
      <div className="card-base p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Sparkles className="w-4 h-4 text-orange" />
            Test Personas:
          </span>
          <button
            onClick={() => loadPreset('S1')}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:border-orange hover:text-orange transition-colors shadow-xs"
          >
            João (S1 Cash-Only)
          </button>
          <button
            onClick={() => loadPreset('S3')}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:border-orange hover:text-orange transition-colors shadow-xs"
          >
            Esperança (S3 Wallet App)
          </button>
          <button
            onClick={() => loadPreset('S7')}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:border-orange hover:text-orange transition-colors shadow-xs"
          >
            Dr. Paulo (S7 Salaried)
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-navy hover:bg-slate-200/60 transition-colors ml-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Wallet Flag Toggle Simulator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Wallet Scoring:</span>
          <button
            onClick={() => setLocalWalletEnabled(!localWalletEnabled)}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              localWalletEnabled
                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                : 'bg-slate-200 text-slate-600 border border-slate-300'
            }`}
          >
            {localWalletEnabled ? 'Enabled (Q6 & Q7 active)' : 'Disabled (Q6 & Q7 skipped)'}
          </button>
        </div>
      </div>

      {/* Decision Result Banner (when resolved) */}
      {resolvedSegment && winningSegmentMeta && (
        <div
          className="p-4 rounded-xl border-2 transition-all flex flex-wrap items-center justify-between gap-4 animate-in fade-in"
          style={{ borderColor: winningSegmentMeta.color, backgroundColor: `${winningSegmentMeta.color}10` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-xl text-lg font-mono font-extrabold flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: winningSegmentMeta.color }}
            >
              {winningSegmentMeta.code}
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Segment Identified ({winningQuestionId ? `Triggered at Q${winningQuestionId}` : 'Fallback S1'})
              </div>
              <h4 className="text-base font-extrabold text-navy">{winningSegmentMeta.name}</h4>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl">{winningSegmentMeta.story}</p>
            </div>
          </div>

          <button
            onClick={() => onSelectSegment?.(resolvedSegment!)}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm"
          >
            <span>View Segment Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Decision Flowchart Steps */}
      <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
        {activeQuestions.map((q) => {
          const isAnsweredYes = answers[q.id] === true;
          const isAnsweredNo = answers[q.id] === false;
          const isWinner = winningQuestionId === q.id;
          const isSkipped = q.isSkipped;

          const targetSegment = DEFAULT_SEGMENTS.find((s) => s.code === q.yes_segment);

          return (
            <div
              key={q.id}
              className={`relative pl-12 transition-all ${
                isWinner ? 'scale-[1.01]' : ''
              }`}
            >
              {/* Question Number Node */}
              <div
                className={`absolute left-3.5 top-3.5 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors border-2 shadow-xs ${
                  isSkipped
                    ? 'bg-slate-200 text-slate-400 border-slate-300'
                    : isWinner
                    ? 'bg-orange text-white border-orange-dark ring-2 ring-orange/30'
                    : isAnsweredNo
                    ? 'bg-slate-100 text-slate-500 border-slate-300'
                    : 'bg-white text-navy border-slate-400'
                }`}
              >
                {q.position}
              </div>

              {/* Card Container */}
              <div
                className={`card-base p-4 border rounded-xl transition-all ${
                  isSkipped
                    ? 'bg-slate-100/60 border-slate-200 opacity-60'
                    : isWinner
                    ? 'bg-white border-orange shadow-md ring-1 ring-orange'
                    : isAnsweredNo
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-white border-slate-border hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        Rule #{q.position}
                      </span>
                      {q.requires_wallet && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                          Wallet Channel
                        </span>
                      )}
                      {isSkipped && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Skipped (Wallet scoring disabled)
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${isSkipped ? 'text-slate-400 line-through' : 'text-navy'}`}>
                      {q.text}
                    </p>
                  </div>

                  {/* Actions / Routing */}
                  <div className="flex items-center gap-3">
                    {/* Destination Pill if YES */}
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-emerald-700 font-bold uppercase text-[10px]">IF YES:</span>
                      <span
                        className="px-2.5 py-1 rounded text-xs font-bold font-mono text-white shadow-xs"
                        style={{ backgroundColor: targetSegment?.color || '#1F3A5F' }}
                      >
                        &rarr; {q.yes_segment} ({targetSegment?.name.split(',')[0]})
                      </span>
                    </div>

                    {/* Interactive Buttons */}
                    {!isSkipped && (
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                        <button
                          onClick={() => handleAnswer(q.id, true)}
                          className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all ${
                            isAnsweredYes
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          YES
                        </button>
                        <button
                          onClick={() => handleAnswer(q.id, false)}
                          className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all ${
                            isAnsweredNo
                              ? 'bg-slate-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          NO
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Fallback Node: S1 */}
        <div className="relative pl-12 pt-2">
          <div className="absolute left-3.5 top-5 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold font-mono shadow-sm">
            &infin;
          </div>
          <div
            className={`card-base p-4 border rounded-xl transition-all ${
              allAnsweredNo
                ? 'bg-amber-50/50 border-amber-500 shadow-md ring-1 ring-amber-500'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500">
                  Fallback Default (All Questions Answered NO)
                </span>
                <h4 className="text-sm font-bold text-navy mt-0.5">
                  &rarr; S1: Button phone, cash-only
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Prepaid customer transacting purely in cash scratch cards, with no wallet, bank, or payroll footprint.
                </p>
              </div>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-bold text-white bg-[#8A6D3B]">
                S1 (Starter Cap)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
