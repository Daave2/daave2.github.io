# Firebase Cloud Functions Setup Guide

## Prerequisites
- Node.js 18+ installed
- Firebase CLI installed globally: `npm install -g firebase-tools`

## Step 1: Login to Firebase
```bash
firebase login
```

## Step 2: Initialize Firebase in Your Project
From the `firebase-functions` directory:
```bash
cd firebase-functions
firebase init
```

Select:
- ✅ Functions (Configure a Cloud Functions directory)
- Select your Firebase project (or create one)
- JavaScript
- ESLint: No (for simplicity)
- Install dependencies: Yes

## Step 3: Configure Gist Credentials
Set your Gist ID and GitHub token in Firebase config:
```bash
firebase functions:config:set gist.id="95a61f781f9655c1abb90d6daff4a7c2" gist.token="YOUR_GITHUB_PAT"
```

## Step 4: Deploy Functions
```bash
firebase deploy --only functions
```

## Step 5: Verify Deployment
Check Firebase Console > Functions to see:
- `checkDueTasks` - Runs every 5 minutes
- `sendTestNotification` - HTTP endpoint for testing

## Testing
To test notifications manually:
1. Get your FCM token from browser console (look for `[FCM] Token received:`)
2. Visit: `https://YOUR-PROJECT.cloudfunctions.net/sendTestNotification?token=YOUR_FCM_TOKEN`

## Upgrading to Blaze Plan
Firebase Functions require the Blaze (pay-as-you-go) plan:
1. Go to Firebase Console
2. Click "Upgrade" on the bottom left
3. Select "Blaze"
4. Add billing (costs are typically $0 for low usage)

## Monitoring
View function logs:
```bash
firebase functions:log
```

Or in Firebase Console > Functions > Logs
