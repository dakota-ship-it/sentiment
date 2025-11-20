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

export interface AnalysisResult {
  trajectoryAnalysis: {
    engagement: "Increasing" | "Stable" | "Declining";
    meetingLength: "Shorter" | "Stable" | "Longer";
    energy: "Rising" | "Falling" | "Flat";
    futureTalk: "More" | "Less" | "Same";
  };
  subtleSignals: {
    strengtheningIndicators: string[];
    concerningPatterns: string[];
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
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
