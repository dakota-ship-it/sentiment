import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FathomService } from './fathomService';
import { DatabaseService } from './dbService';
import { GeminiService } from './geminiService';
import { NotificationService } from './notificationService';
import { FathomWebhookPayload, TranscriptEntry } from './types';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Webhook endpoint for Fathom meeting completions
 *
 * This function receives webhook events from Fathom when meetings end,
 * automatically processes transcripts, and triggers analysis when ready.
 *
 * URL: https://us-central1-<project-id>.cloudfunctions.net/fathomWebhook
 */
export const fathomWebhook = functions.https.onRequest(async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Get environment variables
    const fathomApiKey = functions.config().fathom?.api_key;
    const fathomWebhookSecret = functions.config().fathom?.webhook_secret;
    const geminiApiKey = functions.config().gemini?.api_key;

    if (!fathomApiKey || !fathomWebhookSecret) {
      console.error('Fathom credentials not configured');
      res.status(500).send('Server configuration error');
      return;
    }

    // Initialize services
    const fathomService = new FathomService(fathomApiKey, fathomWebhookSecret);
    const dbService = new DatabaseService(db);

    // Verify webhook signature
    const signature = req.headers['webhook-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!fathomService.verifyWebhook(rawBody, signature)) {
      console.error('Webhook verification failed');
      res.status(401).send('Unauthorized');
      return;
    }

    // Parse webhook payload
    const payload: FathomWebhookPayload = req.body;
    const meeting = payload.meeting;

    console.log(`Processing webhook for meeting: ${meeting.id} - ${meeting.title}`);

    // Find client mapping
    const clientId = await findClientForMeeting(dbService, meeting);

    if (!clientId) {
      console.log(`No client mapping found for meeting ${meeting.id}`);
      res.status(200).send('No client mapping found - skipping');
      return;
    }

    console.log(`Matched meeting to client: ${clientId}`);

    // Extract transcript (from webhook payload or fetch separately)
    let transcript = meeting.transcript;

    if (!transcript && meeting.id) {
      // If transcript not in webhook, fetch it separately
      console.log('Fetching transcript separately...');
      transcript = await fathomService.getTranscript(meeting.id);
    }

    if (!transcript) {
      console.error('No transcript available');
      res.status(200).send('No transcript available - skipping');
      return;
    }

    // Create transcript entry
    const transcriptEntry: TranscriptEntry = {
      fathomMeetingId: meeting.id,
      transcript: transcript,
      meetingDate: meeting.created_at || meeting.scheduled_start_time || new Date().toISOString(),
      meetingTitle: meeting.title || meeting.meeting_title || 'Untitled Meeting',
      addedAt: Date.now(),
      sequence: 'recent', // Will be updated by addTranscriptToQueue
    };

    // Add to transcript queue
    await dbService.addTranscriptToQueue(clientId, transcriptEntry);
    console.log(`Added transcript to queue for client ${clientId}`);

    // Check if ready for auto-analysis
    const readyForAnalysis = await dbService.isQueueReadyForAnalysis(clientId);

    if (readyForAnalysis && geminiApiKey) {
      console.log('Queue ready for analysis - triggering auto-analysis');

      // Trigger analysis asynchronously (don't wait for it to complete)
      processAutoAnalysis(clientId, geminiApiKey, dbService).catch(error => {
        console.error('Auto-analysis failed:', error);
      });
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Find client ID for a given meeting
 */
async function findClientForMeeting(
  dbService: DatabaseService,
  meeting: any
): Promise<string | null> {
  // Strategy 1: Check by participant emails
  const participants = meeting.participants || [];
  for (const email of participants) {
    const clientId = await dbService.findClientByParticipant(email);
    if (clientId) {
      return clientId;
    }
  }

  // Strategy 2: Check by meeting title pattern
  const title = meeting.title || meeting.meeting_title || '';
  if (title) {
    const clientId = await dbService.findClientByTitlePattern(title);
    if (clientId) {
      return clientId;
    }
  }

  // Strategy 3: Check by specific Fathom meeting IDs (if configured)
  const allMappings = await dbService.getAllClientMappings();
  for (const mapping of allMappings) {
    if (mapping.fathomMeetingIds?.includes(meeting.id)) {
      return mapping.clientId;
    }
  }

  return null;
}

/**
 * Process auto-analysis for a client
 */
async function processAutoAnalysis(
  clientId: string,
  geminiApiKey: string,
  dbService: DatabaseService
): Promise<void> {
  try {
    console.log(`Starting auto-analysis for client ${clientId}`);

    // Get transcript queue
    const queue = await dbService.getTranscriptQueue(clientId);
    if (!queue || queue.transcripts.length < 3) {
      console.log('Not enough transcripts for analysis');
      return;
    }

    // Get client profile
    const client = await dbService.getClient(clientId);
    if (!client) {
      console.error('Client not found');
      return;
    }

    // Build transcript data
    const transcriptData = {
      oldest: queue.transcripts.find(t => t.sequence === 'oldest')?.transcript || '',
      middle: queue.transcripts.find(t => t.sequence === 'middle')?.transcript || '',
      recent: queue.transcripts.find(t => t.sequence === 'recent')?.transcript || '',
      context: 'Auto-generated analysis from Fathom webhook',
      clientProfile: {
        name: client.name,
        monthlySpend: client.monthlySpend || '',
        duration: client.duration || '',
        notes: client.notes || '',
      },
    };

    // Run Gemini analysis
    const geminiService = new GeminiService(geminiApiKey);
    const analysisResult = await geminiService.analyzeRelationship(transcriptData);

    console.log('Analysis completed successfully');

    // Save analysis to database
    await dbService.saveAnalysis(
      clientId,
      client.ownerId,
      analysisResult,
      transcriptData
    );

    // Mark queue as processed
    await dbService.markQueueProcessed(clientId);

    console.log('Analysis saved to database');

    // Send notifications
    const notificationPrefs = await dbService.getNotificationPreferences(clientId);
    if (notificationPrefs) {
      const notificationService = new NotificationService();
      await notificationService.notifyPodLeader(notificationPrefs, {
        clientName: client.name,
        churnRisk: analysisResult.bottomLine.churnRisk,
        trajectory: analysisResult.bottomLine.trajectory,
        dashboardUrl: `https://your-app-url.com/client/${clientId}`, // Update with actual URL
      });

      console.log('Notifications sent');
    }
  } catch (error) {
    console.error('Auto-analysis processing error:', error);
    throw error;
  }
}

/**
 * Manual trigger for analysis (can be called from admin UI)
 *
 * Usage: Call this function to manually trigger analysis for a client
 */
export const triggerManualAnalysis = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { clientId } = data;

  if (!clientId) {
    throw new functions.https.HttpsError('invalid-argument', 'clientId is required');
  }

  const geminiApiKey = functions.config().gemini?.api_key;
  if (!geminiApiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Gemini API not configured');
  }

  const dbService = new DatabaseService(db);

  try {
    await processAutoAnalysis(clientId, geminiApiKey, dbService);
    return { success: true, message: 'Analysis completed successfully' };
  } catch (error) {
    console.error('Manual analysis failed:', error);
    throw new functions.https.HttpsError('internal', 'Analysis failed');
  }
});

/**
 * Scheduled function to poll for new Fathom meetings (backup to webhooks)
 * Runs daily at midnight
 */
export const scheduledFathomSync = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    console.log('Starting scheduled Fathom sync');

    const fathomApiKey = functions.config().fathom?.api_key;
    if (!fathomApiKey) {
      console.error('Fathom API key not configured');
      return;
    }

    const fathomService = new FathomService(fathomApiKey, '');
    const dbService = new DatabaseService(db);

    // Get meetings from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const meetings = await fathomService.listMeetings({
      createdAfter: yesterday.toISOString(),
      includeTranscript: true,
    });

    console.log(`Found ${meetings.length} meetings from last 24 hours`);

    for (const meeting of meetings) {
      const clientId = await findClientForMeeting(dbService, meeting);

      if (clientId && meeting.transcript) {
        const transcriptEntry: TranscriptEntry = {
          fathomMeetingId: meeting.id,
          transcript: meeting.transcript,
          meetingDate: meeting.created_at || meeting.scheduled_start_time || new Date().toISOString(),
          meetingTitle: meeting.title || 'Untitled Meeting',
          addedAt: Date.now(),
          sequence: 'recent',
        };

        await dbService.addTranscriptToQueue(clientId, transcriptEntry);
        console.log(`Synced meeting ${meeting.id} for client ${clientId}`);
      }
    }

    console.log('Scheduled sync completed');
  });
