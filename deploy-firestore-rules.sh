#!/bin/bash

# Deploy Firestore Security Rules
# This script deploys the updated Firestore security rules

set -e

echo "🔒 Deploying Firestore Security Rules"
echo "======================================"
echo ""

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "❌ firebase.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Check if rules file exists
if [ ! -f "firestore_rules.txt" ]; then
    echo "❌ firestore_rules.txt not found."
    exit 1
fi

echo "📋 Current rules file: firestore_rules.txt"
echo ""
echo "Rules summary:"
echo "  - All authenticated users can read/write"
echo "  - Collections: clients, analyses, transcript_queues,"
echo "    client_mappings, notification_preferences"
echo ""

# Deploy
echo "🚀 Deploying to Firebase..."
firebase deploy --only firestore:rules

echo ""
echo "======================================"
echo "✅ Firestore rules deployed successfully!"
echo "======================================"
echo ""
echo "🔐 Security: Only authenticated users can access the database"
echo ""
echo "💡 Tip: If you want to restrict to @adclass emails only,"
echo "   uncomment the isAdClassUser function in firestore_rules.txt"
echo ""
