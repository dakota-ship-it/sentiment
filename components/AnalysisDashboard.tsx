import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, CriticalMoment, ActionItem, TranscriptData, ChatMessage, MeetingActionItem, CommunicationStyle, SarcasmInstance } from '../types';
import { askFollowUpQuestion } from '../services/geminiService';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  data: TranscriptData;
  onReset: () => void;
  onNewAnalysis?: () => void;
  onRerunWithFeedback?: (feedback: { inaccuracies?: string; additionalContext?: string; focusAreas?: string[] }) => void;
  onAddTranscripts?: (transcripts: string[]) => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, data, onReset, onNewAnalysis, onRerunWithFeedback, onAddTranscripts }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Feedback form state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackInaccuracies, setFeedbackInaccuracies] = useState('');
  const [feedbackContext, setFeedbackContext] = useState('');

  // Additional transcripts state
  const [showAddTranscripts, setShowAddTranscripts] = useState(false);
  const [additionalTranscript, setAdditionalTranscript] = useState('');

  const handleRerunWithFeedback = () => {
    if (onRerunWithFeedback && (feedbackInaccuracies.trim() || feedbackContext.trim())) {
      onRerunWithFeedback({
        inaccuracies: feedbackInaccuracies.trim() || undefined,
        additionalContext: feedbackContext.trim() || undefined,
      });
      setShowFeedbackForm(false);
      setFeedbackInaccuracies('');
      setFeedbackContext('');
    }
  };

  const handleAddTranscript = () => {
    if (onAddTranscripts && additionalTranscript.trim()) {
      onAddTranscripts([additionalTranscript.trim()]);
      setShowAddTranscripts(false);
      setAdditionalTranscript('');
    }
  };

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
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          {onAddTranscripts && (
            <button
              onClick={() => setShowAddTranscripts(!showAddTranscripts)}
              className="text-sm px-4 py-2 bg-brand-surface border border-brand-green text-brand-green hover:bg-brand-green hover:text-brand-dark rounded-lg transition-all font-medium"
            >
              Add Transcripts
            </button>
          )}
          {onRerunWithFeedback && (
            <button
              onClick={() => setShowFeedbackForm(!showFeedbackForm)}
              className="text-sm px-4 py-2 bg-brand-surface border border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-brand-dark rounded-lg transition-all font-medium"
            >
              Re-run with Feedback
            </button>
          )}
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

      {/* Feedback Form */}
      {showFeedbackForm && (
        <div className="mb-8 bg-brand-surface border border-brand-orange/30 rounded-xl p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-brand-orange mb-4">Re-run Analysis with Feedback</h3>
          <p className="text-sm text-brand-muted mb-4">Provide corrections or additional context to improve the analysis accuracy.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">What was inaccurate?</label>
              <textarea
                value={feedbackInaccuracies}
                onChange={(e) => setFeedbackInaccuracies(e.target.value)}
                className="w-full h-24 bg-brand-dark border border-brand-muted rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-orange"
                placeholder="e.g., The client wasn't actually frustrated, they were just busy that day..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Additional Context</label>
              <textarea
                value={feedbackContext}
                onChange={(e) => setFeedbackContext(e.target.value)}
                className="w-full h-24 bg-brand-dark border border-brand-muted rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-orange"
                placeholder="e.g., The client just got promoted and is now handling a bigger team..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRerunWithFeedback}
                disabled={!feedbackInaccuracies.trim() && !feedbackContext.trim()}
                className="px-6 py-2 bg-brand-orange text-brand-dark font-bold rounded-lg hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Re-run Analysis
              </button>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="px-6 py-2 text-brand-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transcripts Form */}
      {showAddTranscripts && (
        <div className="mb-8 bg-brand-surface border border-brand-green/30 rounded-xl p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-brand-green mb-4">Add Additional Transcript</h3>
          <p className="text-sm text-brand-muted mb-4">Add more transcripts for deeper analysis context.</p>
          <div className="space-y-4">
            <textarea
              value={additionalTranscript}
              onChange={(e) => setAdditionalTranscript(e.target.value)}
              className="w-full h-48 bg-brand-dark border border-brand-muted rounded-lg p-3 text-white text-sm font-mono focus:outline-none focus:border-brand-green"
              placeholder="Paste additional transcript here..."
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddTranscript}
                disabled={!additionalTranscript.trim()}
                className="px-6 py-2 bg-brand-green text-brand-dark font-bold rounded-lg hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add & Re-analyze
              </button>
              <button
                onClick={() => setShowAddTranscripts(false)}
                className="px-6 py-2 text-brand-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

          {/* Sarcasm & Passive-Aggressive Detection */}
          {result.sarcasmInstances && result.sarcasmInstances.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">!</span> Sarcasm & Passive-Aggressive Signals
              </h3>
              <div className="space-y-3">
                {result.sarcasmInstances.map((instance, idx) => (
                  <SarcasmCard key={idx} instance={instance} />
                ))}
              </div>
            </div>
          )}

          {/* Communication Styles */}
          {result.communicationStyles && result.communicationStyles.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Communication Styles</h3>
              <div className="space-y-3">
                {result.communicationStyles.map((style, idx) => (
                  <CommunicationStyleCard key={idx} style={style} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Action Plan & Meeting Action Items */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Action Plan</h3>
            <div className="space-y-4">
              {result.actionPlan.map((action, idx) => (
                <ActionCard key={idx} action={action} index={idx} />
              ))}
            </div>
          </div>

          {/* Meeting Action Items */}
          {result.meetingActionItems && result.meetingActionItems.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Meeting Action Items
              </h3>
              <div className="space-y-3">
                {result.meetingActionItems.map((item, idx) => (
                  <MeetingActionItemCard key={idx} item={item} />
                ))}
              </div>
            </div>
          )}
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

const SarcasmCard: React.FC<{ instance: SarcasmInstance }> = ({ instance }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'text-yellow-300 border-yellow-300/30 bg-yellow-300/10';
      case 'moderate': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      case 'severe': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-brand-muted';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sarcasm': return 'Sarcasm';
      case 'passive-aggressive': return 'Passive-Aggressive';
      case 'backhanded-compliment': return 'Backhanded Compliment';
      case 'dismissive': return 'Dismissive';
      default: return type;
    }
  };

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <blockquote className="text-slate-300 italic text-sm flex-grow">"{instance.quote}"</blockquote>
        <div className="flex gap-2 flex-shrink-0">
          <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(instance.severity)}`}>
            {instance.severity}
          </span>
          <span className="px-2 py-1 rounded bg-brand-dark text-xs text-brand-muted border border-brand-muted">
            {instance.source}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-yellow-400 font-bold">{getTypeLabel(instance.type)}</span>
      </div>
      <p className="text-sm text-brand-cyan">{instance.underlyingMeaning}</p>
    </div>
  );
};

const CommunicationStyleCard: React.FC<{ style: CommunicationStyle }> = ({ style }) => {
  const getStyleColor = (s: string) => {
    switch (s) {
      case 'direct': return 'text-brand-green border-brand-green/30 bg-brand-green/10';
      case 'collaborative': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'passive': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'defensive': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      case 'disengaged': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-brand-muted';
    }
  };

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-white">{style.participant}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStyleColor(style.style)}`}>
          {style.style}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex flex-wrap gap-2">
          {style.traits.map((trait, idx) => (
            <span key={idx} className="px-2 py-1 bg-brand-dark rounded text-xs text-brand-muted border border-brand-muted/50">
              {trait}
            </span>
          ))}
        </div>
      </div>
      <div className="pt-3 border-t border-brand-muted/50">
        <span className="text-xs text-brand-muted uppercase tracking-wider">Evolution:</span>
        <p className="text-sm text-slate-300 mt-1">{style.evolution}</p>
      </div>
    </div>
  );
};

const MeetingActionItemCard: React.FC<{ item: MeetingActionItem }> = ({ item }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'in-progress': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      default: return 'text-brand-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '○';
      case 'in-progress': return '◐';
      default: return '•';
    }
  };

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted p-4">
      <div className="flex items-start gap-3">
        <span className={`text-lg ${getStatusColor(item.status)}`}>{getStatusIcon(item.status)}</span>
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-medium text-sm">{item.item}</p>
            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(item.status)}`}>
              {item.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-brand-muted">Owner:</span>
            <span className={`text-xs font-bold ${item.owner === 'agency' ? 'text-brand-cyan' : 'text-brand-orange'}`}>
              {item.owner}
            </span>
          </div>
          {item.notes && (
            <p className="text-xs text-slate-400 mt-2 italic">{item.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
