#!/bin/bash

# Fathom Integration Deployment Script
# Run this script from your project root after authenticating with Firebase

set -e

echo "🚀 Deploying Fathom Auto-Transcript Integration"
echo "================================================"
echo ""

# Check if logged in to Firebase
echo "Step 1: Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi
echo "✅ Firebase authentication verified"
echo ""

# Set active project
echo "Step 2: Setting active Firebase project..."
firebase use adclass-sentiment-bot
echo "✅ Project set to adclass-sentiment-bot"
echo ""

# Set Fathom credentials
echo "Step 3: Configuring Fathom credentials..."
firebase functions:config:set \
  fathom.api_key="S8bwt0LWVoO4Pqpq_zYVXA.JEUEzgbhSmDjnfk437GBqmY2hzDDi9my6ZUQrmN0uO8" \
  fathom.webhook_secret="whsec_LK1wNxXDqio7Xv7j2x1CmmOUF1+pgC4n"
echo "✅ Fathom credentials configured"
echo ""

# Check if Gemini API key is set
echo "Step 4: Checking Gemini API key..."
GEMINI_KEY=$(firebase functions:config:get gemini.api_key 2>/dev/null || echo "")
if [ -z "$GEMINI_KEY" ]; then
    echo "⚠️  Gemini API key not set. Please set it with:"
    echo "   firebase functions:config:set gemini.api_key=\"YOUR_GEMINI_API_KEY\""
    echo ""
    read -p "Enter your Gemini API key (or press Enter to skip): " USER_GEMINI_KEY
    if [ ! -z "$USER_GEMINI_KEY" ]; then
        firebase functions:config:set gemini.api_key="$USER_GEMINI_KEY"
        echo "✅ Gemini API key configured"
    else
        echo "⏭️  Skipping Gemini API key (you can set it later)"
    fi
else
    echo "✅ Gemini API key already configured"
fi
echo ""

# Build Cloud Functions
echo "Step 5: Building Cloud Functions..."
cd functions
npm install
npm run build
cd ..
echo "✅ Cloud Functions built successfully"
echo ""

# Deploy Firestore rules
echo "Step 6: Deploying Firestore security rules..."
firebase deploy --only firestore:rules
echo "✅ Firestore rules deployed"
echo ""

# Deploy Cloud Functions
echo "Step 7: Deploying Cloud Functions..."
firebase deploy --only functions
echo "✅ Cloud Functions deployed"
echo ""

# Get webhook URL
PROJECT_ID="adclass-sentiment-bot"
WEBHOOK_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/fathomWebhook"

echo "================================================"
echo "✨ Deployment Complete!"
echo "================================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update your Fathom webhook URL to:"
echo "   ${WEBHOOK_URL}"
echo ""
echo "2. Configure client mappings:"
echo "   - Open your app dashboard"
echo "   - Click the ⚙ icon on any client card"
echo "   - Add participant emails or meeting title patterns"
echo ""
echo "3. Test the integration:"
echo "   - Record a 2-minute test meeting in Fathom"
echo "   - Check Firebase Functions logs: firebase functions:log"
echo "   - Verify transcript appears in Firestore"
echo ""
echo "📖 Full setup guide: FATHOM_INTEGRATION_SETUP.md"
echo ""
