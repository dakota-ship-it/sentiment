# Fathom Auto-Transcript Integration Setup Guide

This guide will help you set up automatic transcript processing from Fathom meetings, enabling hands-free sentiment analysis for your pod leaders.

## Overview

The integration works as follows:

1. **Fathom** records and transcribes your client meetings
2. **Webhook fires** when meeting ends → sends transcript to your Cloud Function
3. **System matches** transcript to client using configured rules
4. **Transcript is queued** and rotated (oldest → middle → recent)
5. **Auto-analysis triggers** when 3 transcripts are available
6. **Pod leader is notified** via email/Slack with results

---

## Prerequisites

- Firebase project with Firestore and Cloud Functions enabled
- Fathom account with API access
- Node.js 18+ installed locally
- Firebase CLI installed (`npm install -g firebase-tools`)

---

## Step 1: Set Up Fathom API Access

### 1.1 Generate Fathom API Key

1. Log in to [Fathom](https://app.fathom.video)
2. Go to **Settings** → **API Access**
3. Click **Generate API Key**
4. **Save this key** - you'll need it later

### 1.2 Create Webhook in Fathom

1. In Fathom Settings → API Access
2. Click **Add Webhook**
3. Enter these settings:
   - **Destination URL**: `https://us-central1-<your-project-id>.cloudfunctions.net/fathomWebhook`
     - Replace `<your-project-id>` with your Firebase project ID
   - **Trigger on**: ✅ Your meetings and ✅ Shared meetings
   - **Include in payload**: ✅ Transcript, ✅ Summary, ✅ Action Items
4. Click **Save**
5. **Copy the Webhook Secret** that appears

---

## Step 2: Configure Firebase Cloud Functions

### 2.1 Set Environment Variables

Run these commands from your project root:

```bash
# Set Fathom credentials
firebase functions:config:set fathom.api_key="YOUR_FATHOM_API_KEY"
firebase functions:config:set fathom.webhook_secret="YOUR_FATHOM_WEBHOOK_SECRET"

# Set Gemini API key (for auto-analysis)
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

Replace the placeholder values with your actual keys.

### 2.2 Deploy Firestore Rules

Deploy the updated Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

### 2.3 Build and Deploy Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies (if not already done)
npm install

# Build TypeScript
npm run build

# Go back to project root
cd ..

# Deploy functions
firebase deploy --only functions
```

**Note**: The first deployment may take 5-10 minutes.

---

## Step 3: Configure Client-Meeting Mappings

For each client you want to auto-process:

1. Go to **Client Dashboard**
2. Hover over a client card
3. Click the **⚙ gear icon** (Fathom Integration)
4. Configure mapping rules:

### Option A: Match by Participant Email (Recommended)

Add the email addresses of client attendees who regularly join meetings:

```
client.contact@company.com
another.contact@company.com
```

When Fathom sees a meeting with these participants, it auto-matches to this client.

### Option B: Match by Meeting Title Pattern

Use a regex pattern to match meeting titles:

```
Weekly.*ClientName
ClientName.*(Sync|Check-in)
```

### Option C: Enable AI Auto-Detection (Experimental)

Check "Enable AI auto-detection" to let the system use meeting content to suggest client matches.

### 3.1 Set Notification Preferences

In the same settings modal:

1. **Pod Leader Email**: Email address to notify
2. **Slack Webhook URL** (optional): For Slack notifications
   - Create one at https://api.slack.com/messaging/webhooks
3. **Notification toggles**:
   - ✅ Notify on new transcript
   - ✅ Notify on auto-analysis complete

---

## Step 4: Test the Integration

### 4.1 Test with a Short Meeting

1. Record a **2-minute test meeting** in Fathom
2. Ensure a client contact email (from your mapping) is in the meeting
3. Wait for the meeting to end and process (~2-3 minutes)

### 4.2 Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Firestore Database**
3. Check these collections:
   - `transcript_queues/{clientId}` - Should show the new transcript
   - `client_mappings/{clientId}` - Your mapping config
   - `notification_preferences/{clientId}` - Notification settings

### 4.3 Check Cloud Function Logs

```bash
firebase functions:log
```

Look for log entries like:
- `Processing webhook for meeting: <meeting-id>`
- `Matched meeting to client: <client-id>`
- `Added transcript to queue for client <client-id>`

---

## Step 5: How Auto-Analysis Works

### Transcript Rotation

The system maintains a queue of 3 transcripts per client:

1. **First meeting** → Stored as "recent"
2. **Second meeting** → Previous "recent" becomes "oldest", new one is "recent"
3. **Third meeting** → Rotation kicks in:
   - Oldest is dropped
   - Middle → Oldest
   - Recent → Middle
   - New → Recent

### Analysis Trigger

When the queue has **3 transcripts**:

1. System automatically calls Gemini API
2. Runs full sentiment analysis
3. Saves result to `analyses` collection
4. Sends notification to pod leader

### Manual Analysis

You can also manually trigger analysis for a client:

1. Go to Client Dashboard
2. Click **Begin New Sentiment Analysis**
3. Select the client
4. System auto-fills previous transcripts (if available)

---

## Troubleshooting

### Webhook Not Firing

**Check**: Fathom webhook configuration

```bash
# Test webhook with curl
curl -X POST https://us-central1-<your-project-id>.cloudfunctions.net/fathomWebhook \
  -H "Content-Type: application/json" \
  -H "webhook-signature: v1,test" \
  -d '{
    "event_type": "meeting.completed",
    "meeting": {
      "id": "test-123",
      "title": "Test Meeting"
    }
  }'
```

Expected response: `200 OK` or `401 Unauthorized` (signature verification failed)

### Transcripts Not Auto-Matching

**Check**: Client mapping configuration

1. Verify participant emails are exact matches
2. Test regex patterns at [regex101.com](https://regex101.com)
3. Check function logs for mapping attempts

### Analysis Not Triggering

**Check**:

1. Gemini API key is set: `firebase functions:config:get gemini.api_key`
2. Queue has 3 transcripts: Check Firestore `transcript_queues` collection
3. `autoAnalysisEnabled` is `true` in the queue document

### No Notifications

**Check**:

1. Notification preferences are set for the client
2. Email/Slack webhook URL is correct
3. Function logs for notification errors

---

## Advanced Configuration

### Scheduled Backup Sync

A scheduled function runs daily at midnight to catch any missed webhooks:

```typescript
// Configured in functions/src/index.ts
export const scheduledFathomSync = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    // Fetches meetings from last 24 hours
  });
```

### Custom Notification Templates

Edit `/functions/src/notificationService.ts` to customize Slack message format.

### Change Analysis Threshold

To require more or fewer transcripts before auto-analysis:

Edit `functions/src/dbService.ts`, line ~127:

```typescript
async isQueueReadyForAnalysis(clientId: string): Promise<boolean> {
  const queue = await this.getTranscriptQueue(clientId);
  return queue !== null &&
         queue.transcripts.length >= 3 && // Change this number
         queue.autoAnalysisEnabled;
}
```

---

## Architecture Reference

```
┌─────────────────────────────────────────────────────────────┐
│                     FATHOM INTEGRATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Fathom Meeting Ends                                       │
│      ↓                                                      │
│  Webhook → Cloud Function (fathomWebhook)                  │
│      ↓                                                      │
│  Verify Signature (security)                               │
│      ↓                                                      │
│  Find Client Mapping (email/title/ID)                      │
│      ↓                                                      │
│  Add to Transcript Queue (Firestore)                       │
│      ↓                                                      │
│  Rotate Transcripts (oldest → middle → recent)             │
│      ↓                                                      │
│  Check if 3 transcripts available                          │
│      ↓                                                      │
│  [YES] → Trigger Auto-Analysis                             │
│      ↓                                                      │
│  Gemini API Analysis                                       │
│      ↓                                                      │
│  Save to Firestore (analyses)                              │
│      ↓                                                      │
│  Send Notifications (Slack/Email)                          │
│      ↓                                                      │
│  Pod Leader receives alert                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Notes

- **Webhook signatures** are verified using HMAC SHA-256
- **Firestore rules** restrict access to `@adclass.*` email domains
- **API keys** are stored in Firebase Functions config (encrypted)
- **Never commit** `.env` files or API keys to git

---

## Cost Estimates

### Firebase Cloud Functions

- **Free tier**: 2M invocations/month
- **Typical usage**: ~100 meetings/month = ~100 invocations
- **Expected cost**: $0/month (within free tier)

### Gemini API

- **Gemini 2.5 Flash**: ~$0.10 per 1M tokens
- **Typical analysis**: ~10,000 tokens (3 transcripts + analysis)
- **Per analysis**: ~$0.001
- **100 analyses/month**: ~$0.10/month

### Firestore

- **Document reads**: 50K free/day
- **Document writes**: 20K free/day
- **Expected cost**: $0-$1/month

**Total estimated cost**: **$1-2/month**

---

## Support

For issues or questions:

1. Check function logs: `firebase functions:log`
2. Review Firestore collections in Firebase Console
3. Test webhook endpoint with curl
4. Verify environment variables: `firebase functions:config:get`

---

## What's Next?

- **Monitor** the first few auto-analyses to verify accuracy
- **Adjust** client mappings as needed
- **Train** pod leaders on the notification system
- **Customize** Slack notification templates if using Slack
- **Set up** additional clients for auto-processing

Enjoy hands-free sentiment analysis! 🎉
