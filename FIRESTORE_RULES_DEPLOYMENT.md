# Deploying Firestore Security Rules

## The Problem

If you're seeing "Missing or insufficient permissions" errors when saving Fathom integration settings, it means the Firestore security rules haven't been deployed to Firebase yet.

## Quick Fix

Run this command from the project root:

```bash
./deploy-firestore-rules.sh
```

Or manually with Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Requirements

- Firebase CLI must be installed: `npm install -g firebase-tools`
- You must be logged in: `firebase login`
- You must have access to the `adclass-sentiment-bot` Firebase project

## What This Does

This deploys the security rules from `firestore_rules.txt` to Firebase Firestore, which:

- ✅ Allows all **authenticated users** to read/write to the database
- 🔒 Blocks **unauthenticated access** completely
- 📝 Applies to collections: `clients`, `analyses`, `transcript_queues`, `client_mappings`, `notification_preferences`

## Security Notes

The current rules allow any authenticated Google user to access the database. If you want to restrict access to only @adclass.com emails:

1. Open `firestore_rules.txt`
2. Uncomment the `isAdClassUser()` function
3. Replace `isAuthenticated()` with `isAdClassUser()` in all collection rules
4. Run `./deploy-firestore-rules.sh` again

## Troubleshooting

### "Command not found: firebase"

Install the Firebase CLI:

```bash
npm install -g firebase-tools
```

### "Permission denied"

Make sure you're logged in:

```bash
firebase login
```

### "User does not have permission to access project"

Ask your Firebase project admin to add you to the `adclass-sentiment-bot` project.

## Manual Deployment via Firebase Console

If you can't use the CLI:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `adclass-sentiment-bot` project
3. Go to **Firestore Database** → **Rules**
4. Copy the contents of `firestore_rules.txt`
5. Paste into the rules editor
6. Click **Publish**
