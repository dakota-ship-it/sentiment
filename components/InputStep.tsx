import React, { useEffect, useRef } from 'react';

interface InputStepProps {
  title: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  prefilledContext?: React.ReactNode;
}

const InputStep: React.FC<InputStepProps> = ({ 
  title, 
  description, 
  placeholder, 
  value, 
  onChange, 
  onNext, 
  onBack,
  isFirst = false,
  isLast = false,
  prefilledContext
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <h2 className="text-2xl font-bold text-white mb-2 font-sans">{title}</h2>
      <p className="text-brand-muted mb-6 font-light">{description}</p>
      
      {prefilledContext && (
        <div className="mb-4 bg-brand-surface border border-brand-cyan/30 rounded-lg p-4 text-sm">
          <h4 className="text-brand-cyan text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-cyan rounded-full"></div>
            Included from Client Profile
          </h4>
          <div className="text-slate-300">
            {prefilledContext}
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          className="w-full h-64 bg-brand-surface border border-brand-muted rounded-lg p-4 text-sm text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent outline-none resize-none font-mono shadow-inner transition-all placeholder-brand-muted/50"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute bottom-4 right-4 text-xs text-brand-muted pointer-events-none">
          {value.length > 0 ? `${value.length} chars` : 'Paste content'}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        {!isFirst ? (
          <button 
            onClick={onBack}
            className="px-6 py-2 rounded-md text-brand-muted hover:text-white hover:bg-brand-surface transition-colors"
          >
            Back
          </button>
        ) : <div></div>}
        
        <button 
          onClick={onNext}
          disabled={value.trim().length === 0 && !isLast}
          className={`px-8 py-2 rounded-md font-semibold transition-all transform active:scale-95 shadow-lg
            ${value.trim().length > 0 || (isLast && value.length >= 0)
              ? 'bg-brand-cyan hover:bg-brand-cyan/80 text-brand-dark shadow-brand-cyan/20' 
              : 'bg-brand-surface text-brand-muted cursor-not-allowed border border-brand-muted'}`}
        >
          {isLast ? 'Analyze Relationship' : 'Next Step'}
        </button>
      </div>
    </div>
  );
};

export default InputStep;
