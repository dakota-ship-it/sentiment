import React from 'react';
import { AnalysisResult, CriticalMoment, ActionItem } from '../types';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  onReset: () => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, onReset }) => {
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-brand-green border-brand-green/30 bg-brand-green/10';
      case 'Medium': return 'text-brand-orange border-brand-orange/30 bg-brand-orange/10';
      case 'High': return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
      case 'Immediate': return 'text-red-500 border-red-500/30 bg-red-500/10';
      default: return 'text-brand-muted';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-brand-muted pb-6">
        <div>
          <div className="text-2xl font-bold tracking-tighter font-sans text-white flex items-center gap-1 mb-2">
            ADCLASS <span className="text-brand-cyan">.</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Relationship Diagnosis</h1>
          <p className="text-brand-muted font-mono text-sm">SENTIMENT AI ANALYSIS</p>
        </div>
        <button onClick={onReset} className="mt-4 md:mt-0 text-sm text-brand-cyan hover:text-white underline transition-colors">
          Analyze Another Client
        </button>
      </div>

      {/* Top-Level Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Churn Risk */}
        <div className={`p-6 rounded-xl border backdrop-blur-sm ${getRiskColor(result.bottomLine.churnRisk)} flex flex-col justify-between`}>
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">Churn Risk</span>
          <div className="text-3xl font-bold mt-2">{result.bottomLine.churnRisk}</div>
        </div>

        {/* Confidence Score */}
        <div className="p-6 rounded-xl border border-brand-muted bg-brand-surface backdrop-blur-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Client Confidence</span>
          <div className="flex items-end mt-2">
            <span className={`text-4xl font-bold ${result.bottomLine.clientConfidence < 5 ? 'text-red-400' : result.bottomLine.clientConfidence < 8 ? 'text-brand-orange' : 'text-brand-green'}`}>
              {result.bottomLine.clientConfidence}
            </span>
            <span className="text-xl text-brand-muted mb-1">/10</span>
          </div>
        </div>

        {/* Trajectory Status */}
        <div className="md:col-span-2 p-6 rounded-xl border border-brand-muted bg-brand-surface backdrop-blur-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Trajectory Overview</span>
          <div className="text-xl text-white mt-2 font-medium">
             {result.bottomLine.trajectory}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
             {Object.entries(result.trajectoryAnalysis).map(([key, val]) => (
               <span key={key} className="px-3 py-1 rounded-full bg-brand-dark text-xs text-brand-white whitespace-nowrap border border-brand-muted">
                 {key.replace(/([A-Z])/g, ' $1').trim()}: <span className="text-brand-cyan font-bold">{val}</span>
               </span>
             ))}
          </div>
        </div>
      </div>

      {/* The "Real Talk" Section */}
      <div className="bg-brand-surface/50 border border-brand-muted rounded-xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-cyan"></div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          What's Really Going On
        </h3>
        <p className="text-xl text-slate-200 font-light leading-relaxed italic">
          "{result.bottomLine.whatsReallyGoingOn}"
        </p>
        <div className="mt-6 pt-6 border-t border-brand-muted/50">
          <p className="text-sm text-brand-muted uppercase font-bold tracking-wider mb-2">The Real Breakup Reason (If ignored)</p>
          <p className="text-brand-orange font-medium">{result.bottomLine.realReasonIfChurn}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Critical Moments & Signals */}
        <div className="space-y-8">
          
          {/* Critical Moments */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Critical Moments</h3>
            <div className="space-y-4">
              {result.criticalMoments.map((moment, idx) => (
                <CriticalMomentCard key={idx} moment={moment} />
              ))}
            </div>
          </div>

          {/* Subtle Signals */}
          <div>
             <h3 className="text-xl font-bold text-white mb-4">Detected Signals</h3>
             <div className="bg-brand-surface rounded-xl border border-brand-muted p-6">
                <SignalGroup title="Language Patterns" items={result.subtleSignals.languagePatterns} color="text-blue-300" />
                <SignalGroup title="Energy Flags" items={result.subtleSignals.energyFlags} color="text-brand-orange" />
                <SignalGroup title="Trust Erosion" items={result.subtleSignals.trustErosion} color="text-red-300" />
                <SignalGroup title="Financial Anxiety" items={result.subtleSignals.financialAnxiety} color="text-brand-green" />
                <SignalGroup title="What Disappeared" items={result.subtleSignals.disappeared} color="text-brand-muted" />
             </div>
          </div>
        </div>

        {/* Right Column: Action Plan */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Action Plan</h3>
          <div className="space-y-4">
            {result.actionPlan.map((action, idx) => (
              <ActionCard key={idx} action={action} index={idx} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper Components for Dashboard

const CriticalMomentCard: React.FC<{moment: CriticalMoment}> = ({ moment }) => (
  <div className="bg-brand-surface rounded-lg border border-brand-muted p-5 hover:border-brand-muted/80 transition-colors">
    <div className="flex gap-3 mb-3">
       <div className="min-w-[3px] bg-brand-orange rounded-full opacity-70"></div>
       <blockquote className="text-slate-300 italic font-serif text-lg">"{moment.quote}"</blockquote>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
      <div>
        <span className="block text-xs text-brand-muted uppercase tracking-wider mb-1">Surface Read</span>
        <span className="text-slate-400">{moment.surfaceRead}</span>
      </div>
      <div>
        <span className="block text-xs text-brand-cyan/80 uppercase tracking-wider mb-1 font-bold">Deep Meaning</span>
        <span className="text-brand-cyan font-medium">{moment.deepMeaning}</span>
      </div>
    </div>
    <div className="mt-4 pt-3 border-t border-brand-muted/50">
      <span className="text-xs text-brand-orange uppercase tracking-wider mr-2">Implication:</span>
      <span className="text-slate-400 text-sm">{moment.implication}</span>
    </div>
  </div>
);

const SignalGroup: React.FC<{title: string, items: string[], color: string}> = ({ title, items, color }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-6 last:mb-0">
      <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${color} opacity-90`}>{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-brand-muted mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ActionCard: React.FC<{action: ActionItem, index: number}> = ({ action, index }) => (
  <div className="bg-gradient-to-r from-brand-surface to-brand-dark border border-brand-muted rounded-xl p-6 relative group">
    <div className="absolute top-4 right-4 text-6xl font-bold text-brand-muted/20 -z-10 group-hover:text-brand-cyan/10 transition-colors">
      {index + 1}
    </div>
    <h4 className="text-lg font-bold text-brand-cyan mb-2">{action.action}</h4>
    
    <div className="mb-4">
       <p className="text-sm text-slate-300">{action.why}</p>
    </div>

    <div className="bg-brand-dark rounded-lg p-4 border border-brand-muted/50">
      <span className="block text-xs text-brand-muted uppercase tracking-wider mb-2">How to say it / Do it</span>
      <p className="text-brand-white font-mono text-sm leading-relaxed">{action.how}</p>
    </div>
  </div>
);

export default AnalysisDashboard;
