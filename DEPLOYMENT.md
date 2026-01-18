# Firebase Backend for Snuggle - Deployment Guide

## Prerequisites

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

## Deployment Steps

### 1. Deploy Firestore Rules
```bash
cd D:\snuggle
firebase deploy --only firestore:rules
```

### 2. Deploy Storage Rules
```bash
firebase deploy --only storage:rules
```

### 3. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### 4. Deploy Hosting (Frontend)
```bash
npm run build
firebase deploy --only hosting
```

## Local Development with Emulators

### Start Emulators
```bash
firebase emulators:start
```

This will start:
- Firestore Emulator: `localhost:8080`
- Auth Emulator: `localhost:9099`
- Storage Emulator: `localhost:9199`
- Hosting Emulator: `localhost:5000`
- Emulator UI: `localhost:4000`

### Use Emulators in Development
Update your `firebase.ts` to connect to emulators in development:

```typescript
if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

## Environment Variables

Create `.env` file (if not exists):
```
VITE_FIREBASE_API_KEY=AIzaSyCccZYjpK8uhRmjzUPrgu3eloASikNpmJc
VITE_FIREBASE_AUTH_DOMAIN=snuggle-73465.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=snuggle-73465
VITE_FIREBASE_STORAGE_BUCKET=snuggle-73465.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=873162893612
VITE_FIREBASE_APP_ID=1:873162893612:web:70bdb26473c304a6ca2489
```

## Testing

1. **Run the app locally**:
   ```bash
   npm run dev
   ```

2. **Test features**:
   - User registration & login
   - Create posts
   - Send messages
   - Upload stories
   - Follow users
   - Receive notifications

## Useful Commands

- **View logs**: `firebase functions:log`
- **View project info**: `firebase projects:list`
- **Check deployment status**: `firebase deploy --debug`
