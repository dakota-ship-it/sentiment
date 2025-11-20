import * as crypto from 'crypto';
import { FathomMeeting } from './types';

const FATHOM_API_BASE = 'https://api.fathom.video/v1';

export class FathomService {
  private apiKey: string;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  /**
   * Verify webhook signature for security
   * Based on Fathom webhook documentation
   */
  verifyWebhook(
    requestBody: string,
    signature: string
  ): boolean {
    try {
      // Remove version prefix if present (e.g., "v1,<signature>")
      const signaturePart = signature.includes(',')
        ? signature.split(',')[1]
        : signature;

      // Compute HMAC SHA-256 hash
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(requestBody)
        .digest('base64');

      // Compare signatures
      return crypto.timingSafeEqual(
        Buffer.from(signaturePart),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Get a specific meeting by ID with transcript
   */
  async getMeeting(meetingId: string): Promise<FathomMeeting | null> {
    try {
      const response = await fetch(
        `${FATHOM_API_BASE}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch meeting ${meetingId}:`, response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching meeting:', error);
      return null;
    }
  }

  /**
   * Get transcript for a specific recording
   */
  async getTranscript(recordingId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${FATHOM_API_BASE}/recordings/${recordingId}/transcript`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch transcript for ${recordingId}:`, response.statusText);
        return null;
      }

      const data = await response.json();
      return data.transcript || null;
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return null;
    }
  }

  /**
   * List recent meetings with optional filters
   */
  async listMeetings(params?: {
    createdAfter?: string;
    createdBefore?: string;
    recordedBy?: string[];
    includeTranscript?: boolean;
  }): Promise<FathomMeeting[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.createdAfter) {
        queryParams.append('created_after', params.createdAfter);
      }
      if (params?.createdBefore) {
        queryParams.append('created_before', params.createdBefore);
      }
      if (params?.recordedBy) {
        params.recordedBy.forEach(email => {
          queryParams.append('recorded_by', email);
        });
      }
      if (params?.includeTranscript) {
        queryParams.append('include_transcript', 'true');
      }

      const url = `${FATHOM_API_BASE}/meetings?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to list meetings:', response.statusText);
        return [];
      }

      const data = await response.json();
      return data.meetings || [];
    } catch (error) {
      console.error('Error listing meetings:', error);
      return [];
    }
  }

  /**
   * Extract participant emails from meeting
   */
  extractParticipantEmails(meeting: FathomMeeting): string[] {
    return meeting.participants || [];
  }
}
