// Fathom API Types
export interface FathomMeeting {
  id: string;
  title: string;
  meeting_title?: string;
  url: string;
  share_url: string;
  created_at: string;
  scheduled_start_time?: string;
  participants?: string[];
  transcript?: string;
  summary?: string;
  action_items?: string[];
}

export interface FathomWebhookPayload {
  meeting: FathomMeeting;
  event_type: 'meeting.completed';
  timestamp: string;
}

// Client mapping configuration
export interface ClientMeetingMapping {
  clientId: string;
  // Mapping strategies
  participantEmails?: string[];  // Match by participant email
  titlePattern?: string;         // Regex pattern for meeting title
  fathomMeetingIds?: string[];   // Specific Fathom meeting IDs
  autoDetect?: boolean;          // Use AI to auto-detect
}

// Transcript tracking for sequencing
export interface TranscriptEntry {
  fathomMeetingId: string;
  transcript: string;
  meetingDate: string;
  meetingTitle: string;
  addedAt: number;  // Timestamp when added to our system
  sequence: 'oldest' | 'middle' | 'recent';
}

// Client transcript queue
export interface ClientTranscriptQueue {
  clientId: string;
  transcripts: TranscriptEntry[];
  lastProcessed?: number;  // Timestamp of last analysis
  autoAnalysisEnabled: boolean;
}

// Notification preferences
export interface NotificationPreferences {
  clientId: string;
  podLeaderEmail: string;
  notifyOnNewTranscript?: boolean;
  notifyOnAutoAnalysis?: boolean;
  slackWebhookUrl?: string;
}

// Pod leader profile for personality-based blind spot analysis
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
