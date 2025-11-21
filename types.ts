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

export interface PodLeaderProfile {
  id: string; // Firebase user ID
  name: string;
  email: string;
  pod?: string;
  // Personality framework summary (Enneagram, MBTI, DISC, etc.)
  personalitySummary?: string;
  createdAt: number;
  updatedAt: number;
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
  // Rolling history summary (compressed context from all previous analyses)
  historicalContext?: {
    cumulativeSummary: string;
    totalPreviousMeetings: number;
    trajectoryTrend: string; // e.g., "Generally declining over 6 months"
    keyHistoricalMoments: string[];
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
  confidence: 'Low' | 'Medium' | 'High';
  type?: string; // e.g. 'trust', 'strategy', 'financial', 'communication'
}

export interface ActionItem {
  action: string;
  why: string;
  how: string;
}

// Action items extracted from the most recent transcript only
export interface MeetingActionItem {
  item: string;
  owner: string; // Who is responsible (agency or client)
  status: 'pending' | 'in-progress';
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
    trustConcerns: string[];
    financialAnxiety: string[];
    positiveSignals: string[];
  };
  criticalMoments: CriticalMoment[];
  bottomLine: {
    trajectory: "Strengthening" | "Stable" | "Declining" | "Critical";
    churnRisk: "Low" | "Medium" | "High" | "Immediate";
    clientConfidence: number; // 1-10
    confidenceInAssessment: "Low" | "Medium" | "High";
    whatsReallyGoingOn: string;
    likelyUnderlyingDriverIfChurn: string;
  };
  actionPlan: ActionItem[];
  // New features
  meetingActionItems: MeetingActionItem[];
  communicationStyles: CommunicationStyle[];
  sarcasmInstances: SarcasmInstance[];
  // Personality-based blind spots for the pod leader
  blindSpotsForYourPersonality?: {
    overview: string;
    specificBlindSpots: string[];
    whatToWatchFor: string[];
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Rolling summary for handling unlimited transcript history efficiently
export interface ClientRelationshipHistory {
  clientId: string;
  // Compressed AI-generated summary of all previous analyses
  cumulativeSummary: string;
  // Key moments that should always be remembered (top 15 most significant)
  keyMoments: {
    date: string;
    quote: string;
    significance: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
  // Track action items across all time
  actionItemHistory: {
    item: string;
    dateIdentified: string;
    dateResolved?: string;
    status: 'completed' | 'pending' | 'dropped';
    owner: string;
  }[];
  // Trajectory over time for trend visualization
  trajectoryHistory: {
    date: string;
    trajectory: string;
    churnRisk: string;
    confidence: number;
  }[];
  // Communication style evolution
  participantProfiles: {
    name: string;
    currentStyle: string;
    styleHistory: { date: string; style: string }[];
    notes: string;
  }[];
  // Metadata
  totalMeetingsAnalyzed: number;
  firstAnalysisDate: string;
  lastAnalysisDate: string;
  lastUpdated: number;
}
