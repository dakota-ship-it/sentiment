import * as admin from 'firebase-admin';
import {
  ClientMeetingMapping,
  ClientTranscriptQueue,
  TranscriptEntry,
  NotificationPreferences,
} from './types';

// Firestore collection names
const COLLECTIONS = {
  CLIENTS: 'clients',
  ANALYSES: 'analyses',
  TRANSCRIPT_QUEUES: 'transcript_queues',
  CLIENT_MAPPINGS: 'client_mappings',
  NOTIFICATIONS: 'notification_preferences',
  POD_LEADERS: 'pod_leaders',
};

export class DatabaseService {
  private db: admin.firestore.Firestore;

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  // ============ Client Mapping Methods ============

  /**
   * Get client mapping configuration
   */
  async getClientMapping(clientId: string): Promise<ClientMeetingMapping | null> {
    const doc = await this.db
      .collection(COLLECTIONS.CLIENT_MAPPINGS)
      .doc(clientId)
      .get();

    return doc.exists ? (doc.data() as ClientMeetingMapping) : null;
  }

  /**
   * Set client mapping configuration
   */
  async setClientMapping(mapping: ClientMeetingMapping): Promise<void> {
    await this.db
      .collection(COLLECTIONS.CLIENT_MAPPINGS)
      .doc(mapping.clientId)
      .set(mapping);
  }

  /**
   * Find client by participant email
   */
  async findClientByParticipant(email: string): Promise<string | null> {
    const snapshot = await this.db
      .collection(COLLECTIONS.CLIENT_MAPPINGS)
      .where('participantEmails', 'array-contains', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data().clientId;
  }

  /**
   * Find client by meeting title pattern
   */
  async findClientByTitlePattern(meetingTitle: string): Promise<string | null> {
    const snapshot = await this.db
      .collection(COLLECTIONS.CLIENT_MAPPINGS)
      .get();

    for (const doc of snapshot.docs) {
      const mapping = doc.data() as ClientMeetingMapping;
      if (mapping.titlePattern) {
        const regex = new RegExp(mapping.titlePattern, 'i');
        if (regex.test(meetingTitle)) {
          return mapping.clientId;
        }
      }
    }

    return null;
  }

  /**
   * Get all client mappings
   */
  async getAllClientMappings(): Promise<ClientMeetingMapping[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.CLIENT_MAPPINGS)
      .get();

    return snapshot.docs.map(doc => doc.data() as ClientMeetingMapping);
  }

  // ============ Transcript Queue Methods ============

  /**
   * Get transcript queue for a client
   */
  async getTranscriptQueue(clientId: string): Promise<ClientTranscriptQueue | null> {
    const doc = await this.db
      .collection(COLLECTIONS.TRANSCRIPT_QUEUES)
      .doc(clientId)
      .get();

    if (!doc.exists) {
      return {
        clientId,
        transcripts: [],
        autoAnalysisEnabled: true,
      };
    }

    return doc.data() as ClientTranscriptQueue;
  }

  /**
   * Add transcript to client queue
   */
  async addTranscriptToQueue(
    clientId: string,
    transcript: TranscriptEntry
  ): Promise<void> {
    const queue = await this.getTranscriptQueue(clientId);

    if (!queue) {
      throw new Error(`No queue found for client ${clientId}`);
    }

    // Add new transcript
    queue.transcripts.push(transcript);

    // Sort by meeting date (oldest first)
    queue.transcripts.sort((a, b) =>
      new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime()
    );

    // Keep only the most recent 3 transcripts
    if (queue.transcripts.length > 3) {
      queue.transcripts = queue.transcripts.slice(-3);
    }

    // Update sequence labels
    if (queue.transcripts.length >= 3) {
      queue.transcripts[0].sequence = 'oldest';
      queue.transcripts[1].sequence = 'middle';
      queue.transcripts[2].sequence = 'recent';
    } else if (queue.transcripts.length === 2) {
      queue.transcripts[0].sequence = 'oldest';
      queue.transcripts[1].sequence = 'recent';
    } else if (queue.transcripts.length === 1) {
      queue.transcripts[0].sequence = 'recent';
    }

    await this.db
      .collection(COLLECTIONS.TRANSCRIPT_QUEUES)
      .doc(clientId)
      .set(queue);
  }

  /**
   * Check if queue has 3 transcripts and is ready for analysis
   */
  async isQueueReadyForAnalysis(clientId: string): Promise<boolean> {
    const queue = await this.getTranscriptQueue(clientId);
    return queue !== null &&
           queue.transcripts.length >= 3 &&
           queue.autoAnalysisEnabled;
  }

  /**
   * Mark queue as processed
   */
  async markQueueProcessed(clientId: string): Promise<void> {
    await this.db
      .collection(COLLECTIONS.TRANSCRIPT_QUEUES)
      .doc(clientId)
      .update({
        lastProcessed: Date.now(),
      });
  }

  /**
   * Get client by ID
   */
  async getClient(clientId: string): Promise<any> {
    const doc = await this.db
      .collection(COLLECTIONS.CLIENTS)
      .doc(clientId)
      .get();

    return doc.exists ? doc.data() : null;
  }

  /**
   * Save analysis result
   */
  async saveAnalysis(
    clientId: string,
    ownerId: string,
    result: any,
    transcriptData: any
  ): Promise<void> {
    await this.db.collection(COLLECTIONS.ANALYSES).add({
      clientId,
      ownerId,
      date: admin.firestore.Timestamp.now(),
      result,
      transcriptData,
    });
  }

  // ============ Notification Methods ============

  /**
   * Get notification preferences for a client
   */
  async getNotificationPreferences(
    clientId: string
  ): Promise<NotificationPreferences | null> {
    const doc = await this.db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .doc(clientId)
      .get();

    return doc.exists ? (doc.data() as NotificationPreferences) : null;
  }

  /**
   * Set notification preferences
   */
  async setNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<void> {
    await this.db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .doc(preferences.clientId)
      .set(preferences);
  }

  // ============ Pod Leader Profile Methods ============

  /**
   * Get pod leader profile by user ID
   */
  async getPodLeaderProfile(userId: string): Promise<any | null> {
    const doc = await this.db
      .collection(COLLECTIONS.POD_LEADERS)
      .doc(userId)
      .get();

    return doc.exists ? doc.data() : null;
  }

  /**
   * Get pod leader profile by email
   */
  async getPodLeaderProfileByEmail(email: string): Promise<any | null> {
    const snapshot = await this.db
      .collection(COLLECTIONS.POD_LEADERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  }

  /**
   * Save or update pod leader profile
   */
  async savePodLeaderProfile(profile: any): Promise<void> {
    await this.db
      .collection(COLLECTIONS.POD_LEADERS)
      .doc(profile.id)
      .set({
        ...profile,
        updatedAt: Date.now()
      });
  }
}
