# Snuggle Architecture

## 🏗️ System Overview

Snuggle is a Firebase-native, real-time social messaging application with a React frontend and serverless Cloud Functions backend.

### Architecture Principles
- **Firebase-First** - Leverage Firebase services for all backend needs
- **Real-Time** - RTDB for instant data synchronization
- **Serverless** - Cloud Functions for backend logic
- **Mobile-First** - Responsive design prioritizing mobile UX
- **Offline-Capable** - Firebase offline persistence

---

## 🔥 Firebase Project Structure

### Projects
```
snuggle-dev        # Development (local emulator)
snuggle-staging    # Staging environment
snuggle-prod       # Production environment
```

### Services Used
- **Authentication** - User management, sessions
- **Realtime Database** - Primary data store
- **Cloud Functions** - Backend logic, triggers
- **Cloud Storage** - File uploads (images, videos)
- **Cloud Messaging** - Push notifications
- **Hosting** - Static site hosting

---

## 🔐 Authentication Flow

### Sign Up
1. User submits email/password
2. `createUserWithEmailAndPassword()` creates auth account
3. Cloud Function `onUserCreated()` creates user profile in RTDB
4. User redirected to home

### Login
1. User submits credentials
2. `signInWithEmailAndPassword()` authenticates
3. ID token stored in memory
4. `onAuthStateChanged` updates global auth state
5. Protected routes unlocked

### Session Management
- ID tokens auto-refresh (1 hour expiry)
- Tokens validated on every RTDB/Storage request
- Logout clears local state and calls `signOut()`

### Google Sign-In
1. Trigger Google OAuth popup
2. `signInWithPopup(googleProvider)`
3. If first login, prompt for username
4. Profile created via Cloud Function

---

## 📊 Realtime Database Data Model

### Structure
```
/
├── users/
│   └── {userId}/
│       ├── username
│       ├── email
│       ├── avatar
│       ├── createdAt
│       └── lastActive
├── chats/
│   └── {chatId}/
│       ├── participants/
│       │   ├── {userId1}: true
│       │   └── {userId2}: true
│       ├── lastMessage
│       ├── updatedAt
│       └── createdAt
├── messages/
│   └── {chatId}/
│       └── {messageId}/
│           ├── senderId
│           ├── text
│           ├── imageUrl
│           ├── timestamp
│           └── read
├── presence/
│   └── {userId}/
│       ├── online
│       ├── lastActive
│       └── currentRoom
├── typing/
│   └── {chatId}/
│       └── {userId}/
│           ├── typing: true
│           └── timestamp
├── posts/
│   └── {postId}/
│       ├── userId
│       ├── caption
│       ├── imageUrl
│       ├── likes
│       └── createdAt
├── activity/
│   └── {userId}/
│       └── {activityId}/
│           ├── actorId
│           ├── action
│           ├── entityType
│           └── createdAt
└── notifications/
    └── {userId}/
        └── {notificationId}/
            ├── type
            ├── message
            ├── read
            └── createdAt
```

### Design Decisions

**Denormalization**
- User data duplicated in messages/posts for read performance
- Trade-off: Faster reads, slower writes, eventual consistency

**Fan-Out on Write**
- Activity feed copied to each follower's feed
- Controlled via Cloud Functions
- Prevents slow reads, enables pagination

**Ephemeral Data**
- `typing/` - Auto-removed after 3 seconds
- `presence/` - Cleaned up via `onDisconnect()`

---

## ⚡ Real-Time Patterns

### 1. Presence Tracking

**Implementation:**
```typescript
// Set online on connect
await set(presenceRef, { online: true, lastActive: serverTimestamp() });

// Auto-cleanup on disconnect
await onDisconnect(presenceRef).update({ online: false });
```

**Use Cases:**
- Online indicator in chat list
- "User is typing" feature
- Active users in room

### 2. Typing Indicators

**Pattern:**
```typescript
// Start typing
await set(typingRef, { typing: true });

// Auto-remove after 3s
setTimeout(() => remove(typingRef), 3000);

// Remove on disconnect
await onDisconnect(typingRef).remove();
```

**Rules:**
- Ephemeral data only
- No persistence
- Throttled updates

### 3. Message Sync

**Pattern:**
```typescript
// Subscribe to new messages
onChildAdded(messagesRef, (snapshot) => {
  const message = snapshot.val();
  addMessageToUI(message);
});
```

**Features:**
- Real-time message delivery
- Offline queue (Firebase SDK)
- Automatic reconnect

### 4. Read Receipts

**Pattern:**
```typescript
// Mark as read when viewed
await update(messageRef, { read: true, readAt: serverTimestamp() });

// Subscribe to read status
onValue(messageRef, (snapshot) => {
  updateReadStatus(snapshot.val().read);
});
```

---

## ☁️ Cloud Functions

### Triggers & Responsibilities

**1. Authentication Triggers**
```typescript
onUserCreated(onCreate) → Create user profile in RTDB
onUserDeleted(onDelete) → Cleanup user data
```

**2. Activity Triggers**
```typescript
onPostCreated → Fan-out to followers' feeds
onCommentCreated → Notify post author
onFollowCreated → Notify followed user
```

**3. Notification Triggers**
```typescript
onMessageCreated → Send FCM push notification
```

**4. Scheduled Jobs**
```typescript
cleanupExpiredStories (daily) → Delete 24h+ old stories
cleanupOrphanedSessions (hourly) → Remove stale sessions
```

**5. Maintenance**
```typescript
backupDatabase (daily) → Export RTDB to GCS
```

### Error Handling Pattern
```typescript
try {
  // Function logic
} catch (error) {
  logger.error('Function failed', error, { context });
  // Don't throw - allow partial success
  return { success: false, error: error.message };
}
```

---

## 🔒 Security Model

### Defense Layers

**1. Firebase Security Rules**
- First line of defense
- Deny by default
- Validate on every read/write

**2. Cloud Functions**
- Server-side validation
- Rate limiting
- Abuse prevention

**3. Client-Side**
- Input sanitization (XSS)
- TypeScript type safety
- Error boundaries

### Example Rules
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "root.child('chats').child($chatId).child('participants').child(auth.uid).exists()",
        ".write": "root.child('chats').child($chatId).child('participants').child(auth.uid).exists()"
      }
    }
  }
}
```

---

## 📱 Client Architecture

### Component Structure
```
Pages → Services → Firebase
  ↓         ↓
Hooks ←  Context
```

### Data Flow
1. **Page** requests data via custom hook
2. **Hook** calls service layer
3. **Service** interacts with Firebase
4. Firebase triggers **listener**
5. Listener updates **context**
6. Context triggers **re-render**

### State Management
- **Global** - React Context (auth, theme)
- **Local** - useState for component state
- **Server** - Firebase RTDB as source of truth
- **Cache** - Service-level caching for performance

---

## 🚀 Performance Optimizations

### Frontend
- Code splitting (React.lazy)
- Image optimization (compression, lazy loading)
- Virtual scrolling (long lists)
- Debounced search
- Memoization (useMemo, useCallback)

### Firebase
- Indexed queries (`.indexOn`)
- Query limits (`limitToLast`)
- Pagination cursors
- Denormalized data
- Cached reads

### Network
- HTTP/2 (Firebase Hosting)
- Compression (gzip, brotli)
- CDN (Firebase)
- Offline persistence

---

## 📊 Monitoring & Observability

### Metrics Tracked
- **Errors** - Sentry error tracking
- **Performance** - Web Vitals (LCP, FID, CLS)
- **Analytics** - Firebase Analytics
- **Logs** - Cloud Functions logs

### Alerts
- Error rate > 5%
- P95 latency > 2s
- Function failures
- Security rule violations

---

## 🔄 Deployment Pipeline

### Environments
```
Local (dev) → Staging → Production
```

### CI/CD Flow
1. Commit to branch
2. GitHub Actions runs:
   - Lint
   - Tests
   - Security audit
3. Build app
4. Deploy to environment
5. Run smoke tests
6. Notify team

### Rollback
```bash
firebase hosting:rollback
```

---

## 📖 Additional Resources

- [Data Model Details](DATA_MODEL.md)
- [Cloud Functions API](CLOUD_FUNCTIONS.md)
- [Security Testing](SECURITY.md)
- [Performance Guide](PERFORMANCE.md)

---

**Last Updated:** 2026-01-17
