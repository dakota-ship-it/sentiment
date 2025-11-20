#!/bin/bash

# Simple Firebase Functions Deployment Script
# This script deploys the Fathom integration Cloud Functions

set -e

echo "🚀 Deploying Fathom Integration Cloud Functions"
echo "================================================"
echo ""

# Check if .env file exists in functions directory
if [ ! -f "functions/.env" ]; then
    echo "⚠️  Creating functions/.env file..."
    cat > functions/.env << 'ENVEOF'
FATHOM_API_KEY=S8bwt0LWVoO4Pqpq_zYVXA.JEUEzgbhSmDjnfk437GBqmY2hzDDi9my6ZUQrmN0uO8
FATHOM_WEBHOOK_SECRET=whsec_LK1wNxXDqio7Xv7j2x1CmmOUF1+pgC4n
ENVEOF
    echo "✅ Created functions/.env with Fathom credentials"
    echo ""
    echo "⚠️  You still need to add your Gemini API key to functions/.env"
    echo "   Add this line: GEMINI_API_KEY=your_api_key_here"
    echo ""
    read -p "Press Enter to continue after adding Gemini API key, or Ctrl+C to exit..."
fi

# Build functions
echo "Step 1: Building Cloud Functions..."
cd functions
npm install
npm run build
cd ..
echo "✅ Functions built successfully"
echo ""

# Deploy
echo "Step 2: Deploying to Firebase..."
firebase deploy --only functions
echo "✅ Functions deployed!"
echo ""

# Get webhook URL
PROJECT_ID="adclass-sentiment-bot"
WEBHOOK_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/fathomWebhook"

echo "================================================"
echo "✨ Deployment Complete!"
echo "================================================"
echo ""
echo "📋 Your Fathom webhook URL:"
echo "   ${WEBHOOK_URL}"
echo ""
echo "📖 Next steps:"
echo "   1. Update this URL in Fathom Settings → API Access"
echo "   2. Configure client mappings in your dashboard (⚙ icon)"
echo "   3. Test with a 2-minute meeting"
echo ""
