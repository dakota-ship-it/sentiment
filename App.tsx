import React, { useState } from 'react';
import { TranscriptData, AnalysisStep, AnalysisResult, ClientProfile } from './types';
import { analyzeRelationship } from './services/geminiService';
import ProgressBar from './components/ProgressBar';
import InputStep from './components/InputStep';
import AnalysisDashboard from './components/AnalysisDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { ClientForm } from './components/ClientForm';
import Auth from './components/Auth';
import { auth } from './services/firebase';
import { dbService } from './services/dbService';
import { onAuthStateChanged, User } from 'firebase/auth';

type ViewState = 'DASHBOARD' | 'CLIENT_FORM' | 'ANALYSIS';

const App: React.FC = () => {
  // Global State
  const [view, setView] = useState<ViewState>('DASHBOARD');

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Client Management State
  const [editingClient, setEditingClient] = useState<ClientProfile | undefined>(undefined);

  // Analysis State
  const [step, setStep] = useState<AnalysisStep>(AnalysisStep.Intro);
  const [data, setData] = useState<TranscriptData>({
    oldest: '',
    middle: '',
    recent: '',
    context: ''
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const updateData = (field: keyof TranscriptData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientSelect = (client: ClientProfile) => {
    setData({
      oldest: '',
      middle: '',
      recent: '',
      context: '', // We can leave this empty as clientProfile is attached
      clientProfile: client
    });
    setView('ANALYSIS');
    setStep(AnalysisStep.OldestTranscript); // Skip Intro
  };

  const handleNext = async () => {
    if (step === AnalysisStep.Context) {
      // Start Analysis
      setStep(AnalysisStep.Analyzing);
      try {
        const analysis = await analyzeRelationship(data);
        setResult(analysis);

        // Save to DB if we have a client and user
        if (data.clientProfile && auth.currentUser) {
          dbService.saveAnalysis(
            auth.currentUser.uid,
            data.clientProfile.id,
            analysis,
            data
          ).catch(err => console.error("Failed to save analysis history", err));
        }

        setStep(AnalysisStep.Results);
      } catch (err) {
        setError("Failed to analyze the transcripts. Please ensure your API Key is valid and try again.");
        setStep(AnalysisStep.Context); // Go back to allow retry
      }
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === AnalysisStep.OldestTranscript) {
      setView('DASHBOARD');
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setData({ oldest: '', middle: '', recent: '', context: '' });
    setResult(null);
    setError(null);
    // If we have a selected client, go back to start of analysis, else dashboard
    if (view === 'ANALYSIS' && data.clientProfile) {
      setStep(AnalysisStep.OldestTranscript);
    } else {
      setStep(AnalysisStep.Intro);
    }
  };

  const handleReturnToDashboard = () => {
    handleReset();
    setView('DASHBOARD');
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-white font-sans selection:bg-brand-cyan selection:text-brand-dark">

      {/* Background Accents */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-brand-surface/50 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">

        <main className="flex-grow flex flex-col w-full">

          {/* VIEW: DASHBOARD */}
          {view === 'DASHBOARD' && (
            <ClientDashboard
              onSelectClient={handleClientSelect}
              onAddClient={() => { setEditingClient(undefined); setView('CLIENT_FORM'); }}
              onEditClient={(client) => { setEditingClient(client); setView('CLIENT_FORM'); }}
            />
          )}

          {/* VIEW: CLIENT FORM */}
          {view === 'CLIENT_FORM' && (
            <ClientForm
              initialData={editingClient}
              onSave={() => setView('DASHBOARD')}
              onCancel={() => setView('DASHBOARD')}
            />
          )}

          {/* VIEW: ANALYSIS WIZARD */}
          {view === 'ANALYSIS' && (
            <div className="flex flex-col items-center w-full">
              {step !== AnalysisStep.Results && (
                <div className="text-center mb-8 w-full relative">
                  <button onClick={handleReturnToDashboard} className="absolute left-0 top-0 text-brand-muted hover:text-brand-white text-sm flex items-center gap-1 transition-colors">
                    ← Dashboard
                  </button>
                  {data.clientProfile && (
                    <div className="inline-block px-4 py-1 bg-brand-surface rounded-full border border-brand-muted text-xs font-medium text-brand-cyan mb-4">
                      Analyzing: {data.clientProfile.name}
                    </div>
                  )}
                  <ProgressBar step={step} />
                </div>
              )}

              {/* TRANSCRIPT INPUT STEPS */}
              {step === AnalysisStep.OldestTranscript && (
                <InputStep
                  title="The Baseline (Oldest)"
                  description="Paste the transcript from 3 meetings ago. This establishes the baseline for their energy and engagement."
                  placeholder="Paste transcript text here..."
                  value={data.oldest}
                  onChange={(val) => updateData('oldest', val)}
                  onNext={handleNext}
                  onBack={handleBack} // Goes to dashboard
                  isFirst // Hides standard back button styling in component, but we handle logic
                />
              )}

              {step === AnalysisStep.MiddleTranscript && (
                <InputStep
                  title="The Midpoint"
                  description="Paste the transcript from 2 meetings ago. We'll look for the first signs of drift or change."
                  placeholder="Paste transcript text here..."
                  value={data.middle}
                  onChange={(val) => updateData('middle', val)}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {step === AnalysisStep.RecentTranscript && (
                <InputStep
                  title="The Current State"
                  description="Paste the most recent meeting transcript. This reveals where they are right now."
                  placeholder="Paste transcript text here..."
                  value={data.recent}
                  onChange={(val) => updateData('recent', val)}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {/* CONTEXT STEP */}
              {step === AnalysisStep.Context && (
                <InputStep
                  title="Additional Context"
                  description={`Add any specific concerns for THIS specific analysis cycle.`}
                  placeholder="e.g. They mentioned a budget review coming up next week..."
                  value={data.context}
                  onChange={(val) => updateData('context', val)}
                  onNext={handleNext}
                  onBack={handleBack}
                  isLast
                  prefilledContext={data.clientProfile ? (
                    <div className="space-y-1">
                      <div className="flex gap-4 mb-2">
                        <div><span className="text-brand-muted">Avg. Spend:</span> {data.clientProfile.monthlySpend}</div>
                        <div><span className="text-brand-muted">Duration:</span> {data.clientProfile.duration}</div>
                      </div>
                      <div>
                        <span className="text-brand-muted block mb-1">Strategic Notes:</span>
                        <p className="bg-brand-dark p-2 rounded text-brand-muted italic border border-brand-muted/30">
                          "{data.clientProfile.notes || 'No strategic notes saved.'}"
                        </p>
                      </div>
                    </div>
                  ) : null}
                />
              )}

              {/* LOADING STEP */}
              {step === AnalysisStep.Analyzing && (
                <div className="text-center animate-pulse mt-20">
                  <div className="w-16 h-16 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <h2 className="text-2xl font-bold text-white mb-2">Analyzing Trajectory...</h2>
                  <p className="text-brand-muted">Comparing language patterns and emotional signals across transcripts for {data.clientProfile?.name}.</p>
                </div>
              )}

              {/* RESULTS STEP */}
              {step === AnalysisStep.Results && result && (
                <div className="w-full">
                  <AnalysisDashboard result={result} data={data} onReset={handleReturnToDashboard} />
                </div>
              )}

              {/* ERROR STATE */}
              {error && (
                <div className="max-w-md mx-auto bg-red-900/20 border border-red-500/50 p-6 rounded-xl text-center mt-8">
                  <h3 className="text-red-400 font-bold mb-2">Analysis Error</h3>
                  <p className="text-slate-300 mb-4">{error}</p>
                  <button onClick={() => setStep(AnalysisStep.Context)} className="text-white underline">Try Again</button>
                </div>
              )}
            </div>
          )}

        </main>

        <footer className="py-6 text-center text-brand-muted text-xs font-mono opacity-60">
          POWERED BY GOOGLE GEMINI
        </footer>
      </div>
    </div>
  );
};

export default App;
