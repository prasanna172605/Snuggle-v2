# 🐾 Snuggle

A modern, real-time social messaging application built with Firebase and React.

## 🚀 Core Features

- **Real-time Messaging** - Instant chat with typing indicators and read receipts
- **Video Calls** - WebRTC-based peer-to-peer video calling
- **Stories** - 24-hour ephemeral content sharing
- **Activity Feed** - Social timeline with posts, likes, and comments
- **User Presence** - Online/offline status and last active tracking
- **Dark Mode** - System-respecting theme with manual toggle
- **Drag & Drop** - File uploads and sortable lists
- **Advanced Search** - Filtered, debounced search with recent queries
- **Chat Themes** - Per-chat customization with wallpapers
- **Accessibility** - WCAG 2.1 AA compliant with full keyboard navigation

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Client-side routing

### Backend (Firebase)
- **Firebase Auth** - Authentication
- **Firebase Realtime Database** - Real-time data sync
- **Firebase Cloud Functions** - Serverless backend
- **Firebase Storage** - File uploads
- **Firebase Hosting** - Static hosting
- **Firebase Cloud Messaging** - Push notifications

### Testing
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **Firebase Emulator** - Local development

### Code Quality
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **TypeScript** - Static type checking

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Git

## 🔧 Local Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/snuggle.git
cd snuggle
```

### 2. Install Dependencies
```bash
npm install
cd functions && npm install && cd ..
```

### 3. Configure Environment Variables

Create `.env.development`:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=snuggle-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=snuggle-dev
VITE_FIREBASE_STORAGE_BUCKET=snuggle-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Environment
VITE_APP_ENV=development
VITE_USE_EMULATORS=true

# Features
VITE_FEATURE_DARK_MODE=true
VITE_FEATURE_VIDEO_CALLS=true
VITE_FEATURE_STORIES=true

# Monitoring
VITE_SENTRY_DSN=your_sentry_dsn
VITE_ANALYTICS_ENABLED=false
```

**⚠️ Never commit `.env.production` to version control**

### 4. Start Firebase Emulator
```bash
firebase emulators:start
```

This starts:
- Auth Emulator (port 9099)
- Realtime Database (port 9000)
- Cloud Functions (port 5001)
- Storage (port 9199)

### 5. Start Development Server
```bash
npm run dev
```

App runs at `http://localhost:5173`

## 🧪 Running Tests

### Unit & Component Tests
```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### E2E Tests
```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed
```

### Security Tests
```bash
# Run security audit
node scripts/security-audit.js

# Test Firebase rules
npm test security.rules.test.ts
```

## 🚀 Deployment

### Environment Workflow
- **Development** - Local with emulators
- **Staging** - `snuggle-staging` Firebase project
- **Production** - `snuggle-prod` Firebase project

### Deploy to Staging
```bash
npm run deploy:staging
```

### Deploy to Production
```bash
npm run deploy:prod
```

### CI/CD Pipeline
Deployments are automated via GitHub Actions:
- **dev** branch → Auto-deploy to staging
- **main** branch → Auto-deploy to production

See `.github/workflows/ci-cd.yml` for pipeline details.

## 📁 Project Structure

```
snuggle/
├── src/
│   ├── components/       # React components
│   │   ├── common/       # Reusable components
│   │   ├── chat/         # Chat-specific components
│   │   └── feed/         # Feed components
│   ├── pages/            # Page components
│   ├── services/         # Business logic & Firebase
│   ├── hooks/            # Custom React hooks
│   ├── context/          # React Context providers
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript types
├── functions/            # Cloud Functions
│   └── src/
│       ├── index.ts      # Function exports
│       ├── pushNotifications.ts
│       ├── scheduledJobs.ts
│       └── activityJobs.ts
├── e2e/                  # Playwright E2E tests
├── __tests__/            # Jest tests
├── public/               # Static assets
├── .github/              # GitHub Actions workflows
├── firebase.json         # Firebase configuration
├── database.rules.json   # RTDB security rules
└── storage.rules         # Storage security rules
```

## 🔐 Security

- **Authentication** - Firebase Auth with email/password and Google Sign-In
- **Authorization** - Firebase Security Rules for RTDB and Storage
- **XSS Prevention** - Input sanitization on all user content
- **Rate Limiting** - Cloud Functions enforce rate limits
- **HTTPS** - Enforced via Firebase Hosting with HSTS
- **CSP** - Content Security Policy headers configured

See `docs/SECURITY.md` for security testing procedures.

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [Cloud Functions](docs/CLOUD_FUNCTIONS.md)
- [Security Testing](docs/SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## 🤝 Contributing

1. Create a feature branch from `dev`
2. Make changes with tests
3. Run linting: `npm run lint:fix`
4. Run tests: `npm test`
5. Submit PR to `dev` branch

All PRs require:
- ✅ Passing tests
- ✅ No linting errors
- ✅ Code review approval

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋 Support

- **Issues** - Report bugs via GitHub Issues
- **Discussions** - Use GitHub Discussions for questions

---

**Built with ❤️ using Firebase and React**
