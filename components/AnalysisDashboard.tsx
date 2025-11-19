import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, CriticalMoment, ActionItem, TranscriptData, ChatMessage } from '../types';
import { askFollowUpQuestion } from '../services/geminiService';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  data: TranscriptData;
  onReset: () => void;
  onNewAnalysis?: () => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, data, onReset, onNewAnalysis }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setChatHistory(prev => [...prev, userMsg]);
    setQuestion('');
    setIsChatLoading(true);

    try {
      const answer = await askFollowUpQuestion(data, result, [...chatHistory, userMsg], question);
      setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't get an answer right now." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const exportToMarkdown = () => {
    const clientName = data.clientProfile?.name || 'Client';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let markdown = `# Relationship Diagnosis: ${clientName}\n`;
    markdown += `*Analysis Date: ${date}*\n\n`;
    markdown += `---\n\n`;

    // Top-level metrics
    markdown += `## Summary\n\n`;
    markdown += `- **Churn Risk:** ${result.bottomLine.churnRisk}\n`;
    markdown += `- **Client Confidence:** ${result.bottomLine.clientConfidence}/10\n`;
    markdown += `- **Trajectory:** ${result.bottomLine.trajectory}\n\n`;

    // Trajectory Analysis
    markdown += `### Trajectory Indicators\n`;
    Object.entries(result.trajectoryAnalysis).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      markdown += `- **${label}:** ${value}\n`;
    });
    markdown += `\n`;

    // What's Really Going On
    markdown += `## What's Really Going On\n\n`;
    markdown += `> ${result.bottomLine.whatsReallyGoingOn}\n\n`;
    markdown += `**The Real Breakup Reason (If ignored):** ${result.bottomLine.realReasonIfChurn}\n\n`;

    // Critical Moments
    markdown += `## Critical Moments\n\n`;
    result.criticalMoments.forEach((moment, idx) => {
      markdown += `### ${idx + 1}. "${moment.quote}"\n\n`;
      markdown += `- **Surface Read:** ${moment.surfaceRead}\n`;
      markdown += `- **Deep Meaning:** ${moment.deepMeaning}\n`;
      markdown += `- **Implication:** ${moment.implication}\n\n`;
    });

    // Detected Signals
    markdown += `## Detected Signals\n\n`;

    if (result.subtleSignals.languagePatterns.length > 0) {
      markdown += `### Language Patterns\n`;
      result.subtleSignals.languagePatterns.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n`;
    }

    if (result.subtleSignals.energyFlags.length > 0) {
      markdown += `### Energy Flags\n`;
      result.subtleSignals.energyFlags.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n`;
    }

    if (result.subtleSignals.trustErosion.length > 0) {
      markdown += `### Trust Erosion\n`;
      result.subtleSignals.trustErosion.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n`;
    }

    if (result.subtleSignals.financialAnxiety.length > 0) {
      markdown += `### Financial Anxiety\n`;
      result.subtleSignals.financialAnxiety.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n`;
    }

    if (result.subtleSignals.disappeared.length > 0) {
      markdown += `### What Disappeared\n`;
      result.subtleSignals.disappeared.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n`;
    }

    // Action Plan
    markdown += `## Action Plan\n\n`;
    result.actionPlan.forEach((action, idx) => {
      markdown += `### ${idx + 1}. ${action.action}\n\n`;
      markdown += `**Why:** ${action.why}\n\n`;
      markdown += `**How to say it / Do it:**\n`;
      markdown += `> ${action.how}\n\n`;
    });

    return markdown;
  };

  const handleExport = async () => {
    try {
      const markdown = exportToMarkdown();
      await navigator.clipboard.writeText(markdown);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

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
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-brand-muted pb-6">
        <div>
          <div className="text-2xl font-bold tracking-tighter font-sans text-white flex items-center gap-1 mb-2">
            ADCLASS <span className="text-brand-cyan">.</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Relationship Diagnosis</h1>
          <p className="text-brand-muted font-mono text-sm">SENTIMENT AI ANALYSIS</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button
            onClick={handleExport}
            className="text-sm px-4 py-2 bg-brand-green border border-brand-green text-brand-dark hover:bg-brand-green/90 rounded-lg transition-all font-medium flex items-center gap-2"
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Export to Notion
              </>
            )}
          </button>
          {onNewAnalysis && data.clientProfile && (
            <button
              onClick={onNewAnalysis}
              className="text-sm px-4 py-2 bg-brand-surface border border-brand-cyan text-brand-cyan hover:bg-brand-cyan hover:text-brand-dark rounded-lg transition-all font-medium"
            >
              Run New Analysis
            </button>
          )}
          <button onClick={onReset} className="text-sm text-brand-cyan hover:text-white underline transition-colors">
            Analyze Another Client
          </button>
        </div>
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


      {/* Chat with Analyst Section */}
      <div className="mt-12 border-t border-brand-muted pt-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-brand-cyan">●</span> Ask the Analyst
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <p className="text-slate-300 mb-4">
              Need to dig deeper? Ask specific questions about the transcripts, tone, or specific moments.
            </p>
            <div className="bg-brand-surface/50 p-4 rounded-lg border border-brand-muted/50 text-sm text-brand-muted">
              <p className="font-bold mb-2 text-slate-400">Try asking:</p>
              <ul className="space-y-2 list-disc pl-4">
                <li>"What specific words show they are frustrated?"</li>
                <li>"Did they mention the budget in the first meeting?"</li>
                <li>"How should I bring up the renewal?"</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2 bg-brand-surface rounded-xl border border-brand-muted flex flex-col h-[500px]">
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-brand-muted mt-20 opacity-50">
                  <p>No messages yet. Start the conversation.</p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-xl ${msg.role === 'user'
                    ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 rounded-tr-none'
                    : 'bg-brand-dark text-slate-300 border border-brand-muted rounded-tl-none'
                    }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-brand-dark text-slate-300 border border-brand-muted rounded-tl-none p-4 rounded-xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-brand-muted rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-brand-muted rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-brand-muted rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleAskQuestion} className="p-4 border-t border-brand-muted bg-brand-dark/50 rounded-b-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="flex-grow bg-brand-dark border border-brand-muted rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan transition-colors"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !question.trim()}
                  className="bg-brand-cyan text-brand-dark font-bold px-6 py-3 rounded-lg hover:bg-brand-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div >
  );
};

// Helper Components for Dashboard

const CriticalMomentCard: React.FC<{ moment: CriticalMoment }> = ({ moment }) => (
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

const SignalGroup: React.FC<{ title: string, items: string[], color: string }> = ({ title, items, color }) => {
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

const ActionCard: React.FC<{ action: ActionItem, index: number }> = ({ action, index }) => (
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
