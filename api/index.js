
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars BEFORE importing other modules that might use them
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin (Global)
import '../server/backend/config/firebase.js';

console.log('Environment check:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing');

// Explicitly handle legacy endpoints that were previously separate files
// but now moved to server/ folder
import loginHandler from '../server/auth/login.js';

const app = express();
const PORT = 3000;

// 1. Strict CORS Configuration
app.use(cors({
    origin: ['https://snuggle-73465.web.app', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());

// Legacy Route: /api/auth/login (Previously api/auth/login.js)
app.post('/api/auth/login', (req, res) => loginHandler(req, res));
// Note: If there were others like 2fa, add them here

// Middleware Import (local file)
import { verifyToken, requireRole } from '../server/backend/middleware/auth.js';
import AppError from '../server/backend/utils/AppError.js';
import catchAsync from '../server/backend/utils/catchAsync.js';
import { apiLimiter, authLimiter } from '../server/backend/middleware/rateLimiter.js';

// Route Imports
import authRouter from '../server/backend/routes/auth.js';
import userRouter from '../server/backend/routes/users.js';
import contentRouter from '../server/backend/routes/content.js';
import settingsRouter from '../server/backend/routes/settings.js';
import notificationRouter from '../server/backend/routes/notifications.js';
import mediaRouter from '../server/backend/routes/media.js';

// Global API Rate Limiter
app.use('/api/v1', apiLimiter);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

// Mount Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/media', mediaRouter);

// Lazy-loaded Push Handler
app.post('/api/send-push', verifyToken, catchAsync(async (req, res, next) => {
    console.log(`[Local Server] POST /api/send-push - Authenticated User: ${req.user.uid}`);
    const { default: pushHandler } = await import('../server/send-push.js');
    await pushHandler(req, res);
}));

// Handle 404
app.all(/(.*)/, (req, res, next) => {
    res.status(404).json({ status: 'fail', message: `Can't find ${req.originalUrl} on this server!` });
});

// 3. Global Error Handler (JSON Enforced)
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    import('fs').then(fs => {
        fs.appendFileSync('error.log', `${new Date().toISOString()} - ${err.stack || err.message}\n`);
    });

    // Ensure CORS headers are present even on error
    res.setHeader('Access-Control-Allow-Origin', 'https://snuggle-73465.web.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    res.status(statusCode).json({
        status: status,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
    });
}

export default app;
