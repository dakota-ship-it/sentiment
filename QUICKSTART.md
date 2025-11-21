# Fathom Integration - Quick Start

Get your Fathom auto-transcript integration running in 10 minutes.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Fathom API credentials (✅ you already have these)
- Gemini API key (for auto-analysis)

## Deploy in 3 Steps

### 1. Authenticate with Firebase

```bash
firebase login
```

### 2. Run Deployment Script

```bash
./deploy-fathom-integration.sh
```

This script will:
- Set your Fathom credentials (already configured)
- Prompt for your Gemini API key
- Build and deploy Cloud Functions
- Deploy Firestore security rules

### 3. Update Fathom Webhook URL

Your webhook URL will be displayed after deployment:

```
https://us-central1-adclass-sentiment-bot.cloudfunctions.net/fathomWebhook
```

Go to [Fathom Settings → API Access → Edit Webhook](https://app.fathom.video/settings/api) and update the **Destination URL** to this.

## Configure Your First Client

1. Open your sentiment analysis dashboard
2. Hover over a client card
3. Click the **⚙** icon (Fathom Integration)
4. Add participant emails, e.g.:
   ```
   john@clientcompany.com
   sarah@clientcompany.com
   ```
5. Set pod leader email and Slack webhook (optional)
6. Save settings

## Test It

1. Record a short test meeting in Fathom
2. Make sure one of the participant emails you configured is in the meeting
3. Wait ~2 minutes after meeting ends
4. Check logs:
   ```bash
   firebase functions:log
   ```
5. Verify transcript in Firestore:
   - Firebase Console → Firestore → `transcript_queues`

## That's It!

After 3 meetings with a client, analysis will auto-trigger and notify your pod leader.

---

**Having issues?** See [FATHOM_INTEGRATION_SETUP.md](./FATHOM_INTEGRATION_SETUP.md) for detailed troubleshooting.

**Security Note:** Never commit API keys or secrets to version control. Store credentials in environment variables or use Firebase's secret management.
