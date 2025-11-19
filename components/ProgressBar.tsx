import React from 'react';
import { AnalysisStep } from '../types';

interface ProgressBarProps {
  step: AnalysisStep;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ step }) => {
  const steps = [
    { id: AnalysisStep.OldestTranscript, label: 'T-3' },
    { id: AnalysisStep.MiddleTranscript, label: 'T-2' },
    { id: AnalysisStep.RecentTranscript, label: 'Latest' },
    { id: AnalysisStep.Context, label: 'Context' },
  ];

  // Don't show progress on intro or results
  if (step === AnalysisStep.Intro || step >= AnalysisStep.Analyzing) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-brand-muted/30 -z-10 rounded-full"></div>
        
        {steps.map((s, idx) => {
          const isActive = step === s.id;
          const isCompleted = step > s.id;

          return (
            <div key={s.id} className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 
                  ${isActive ? 'bg-brand-cyan border-brand-cyan text-brand-dark scale-110 shadow-[0_0_15px_rgba(26,240,229,0.5)]' : 
                    isCompleted ? 'bg-brand-surface border-brand-cyan text-brand-cyan' : 'bg-brand-dark border-brand-muted text-brand-muted'}
                `}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span className={`mt-2 text-xs font-medium ${isActive || isCompleted ? 'text-brand-cyan' : 'text-brand-muted'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
