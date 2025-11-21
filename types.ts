export interface User {
  email: string;
  name: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  pod?: string;
  monthlySpend: string;
  duration: string;
  notes: string;
  createdAt: number;
}

export interface TranscriptData {
  oldest: string;
  middle: string;
  recent: string;
  context: string;
  clientProfile?: ClientProfile;
  // Additional transcripts for deeper analysis
  additionalTranscripts?: string[];
  // Feedback from pod leaders for re-runs
  feedback?: {
    inaccuracies?: string;
    additionalContext?: string;
    focusAreas?: string[];
  };
}

export enum AnalysisStep {
  Intro = 0,
  OldestTranscript = 1,
  MiddleTranscript = 2,
  RecentTranscript = 3,
  Context = 4,
  Analyzing = 5,
  Results = 6,
}

// Structure for the Gemini Analysis Response
export interface CriticalMoment {
  quote: string;
  surfaceRead: string;
  deepMeaning: string;
  implication: string;
}

export interface ActionItem {
  action: string;
  why: string;
  how: string;
}

// Action items extracted from meeting transcripts (commitments, follow-ups, promises)
export interface MeetingActionItem {
  item: string;
  owner: string; // Who is responsible (agency or client)
  source: 'oldest' | 'middle' | 'recent';
  status: 'completed' | 'pending' | 'unclear' | 'dropped';
  notes: string;
}

// Communication style analysis for key participants
export interface CommunicationStyle {
  participant: string;
  style: 'direct' | 'passive' | 'collaborative' | 'defensive' | 'disengaged';
  traits: string[];
  evolution: string; // How their style changed across transcripts
}

// Sarcasm/passive-aggressive detection
export interface SarcasmInstance {
  quote: string;
  source: 'oldest' | 'middle' | 'recent';
  type: 'sarcasm' | 'passive-aggressive' | 'backhanded-compliment' | 'dismissive';
  underlyingMeaning: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface AnalysisResult {
  trajectoryAnalysis: {
    engagement: "Increasing" | "Stable" | "Declining";
    meetingLength: "Shorter" | "Stable" | "Longer";
    energy: "Rising" | "Falling" | "Flat";
    futureTalk: "More" | "Less" | "Same";
  };
  subtleSignals: {
    languagePatterns: string[];
    energyFlags: string[];
    trustErosion: string[];
    financialAnxiety: string[];
    disappeared: string[];
  };
  criticalMoments: CriticalMoment[];
  bottomLine: {
    trajectory: "Strengthening" | "Stable" | "Declining" | "Critical";
    churnRisk: "Low" | "Medium" | "High" | "Immediate";
    clientConfidence: number; // 1-10
    whatsReallyGoingOn: string;
    realReasonIfChurn: string;
  };
  actionPlan: ActionItem[];
  // New features
  meetingActionItems: MeetingActionItem[];
  communicationStyles: CommunicationStyle[];
  sarcasmInstances: SarcasmInstance[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
