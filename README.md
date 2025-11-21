# Sentiment Analysis AI - Client Relationship Intelligence

A React + TypeScript application for analyzing client sentiment from meeting transcripts using Google Gemini AI, integrated with Firebase and Fathom video recording service.

## Features

- **AI-Powered Sentiment Analysis**: Analyze client meeting transcripts to detect churn risk and relationship health
- **Fathom Integration**: Automatic transcript processing from Fathom meetings
- **Client Dashboard**: Track all clients with visual sentiment indicators
- **Secure Architecture**: API keys kept server-side via Firebase Cloud Functions
- **Real-time Updates**: Automatic notifications when analysis completes

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase Cloud Functions (Node.js 20)
- **Database**: Cloud Firestore
- **AI**: Google Gemini 2.0
- **Integrations**: Fathom API

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project with Firestore and Cloud Functions enabled
- Google Gemini API key
- Fathom API credentials (optional, for auto-integration)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sentiment
```

2. Install dependencies:
```bash
npm install
cd functions && npm install && cd ..
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. Configure Firebase Functions secrets:
```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
firebase functions:config:set fathom.api_key="YOUR_FATHOM_API_KEY"  # Optional
firebase functions:config:set fathom.webhook_secret="YOUR_WEBHOOK_SECRET"  # Optional
```

5. Deploy Firestore rules and Cloud Functions:
```bash
firebase deploy
```

6. Start the development server:
```bash
npm run dev
```

## Security Improvements

This codebase includes several security enhancements:

- ✅ API keys moved to environment variables
- ✅ Gemini API calls moved to backend Cloud Functions
- ✅ Proper TypeScript type safety (removed `any` types)
- ✅ Input validation (email addresses, etc.)
- ✅ Environment-based logging (production vs development)
- ✅ Toast notifications instead of browser alerts

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run type-check
```

### Building for Production

```bash
npm run build
```

## Architecture

```
┌─────────────┐
│   Frontend  │  (React + TypeScript)
│   (Browser) │
└──────┬──────┘
       │
       ├─── Firebase Auth (Google Sign-in)
       ├─── Firestore (Client data, analyses)
       └─── Cloud Functions ──> Gemini API
                │
                └─── Fathom Webhook
```

### Key Files

- `/services/geminiService.ts` - Frontend service calling backend API
- `/functions/src/index.ts` - Cloud Functions (analysis, webhooks)
- `/services/dbService.ts` - Firestore database operations
- `/utils/logger.ts` - Environment-based logging utility
- `/utils/toast.ts` - Toast notification system

## Deployment

See [QUICKSTART.md](./QUICKSTART.md) for quick deployment guide.

## Contributing

1. Enable strict TypeScript checking (already enabled)
2. Use the logger utility instead of console.log
3. Use toast notifications instead of alert()
4. Write tests for new features
5. Keep API keys in environment variables

## License

Proprietary - ADCLASS
