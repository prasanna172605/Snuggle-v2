
import express from 'express';
import AppError from '../utils/AppError.js';
import admin from '../config/firebase.js';

import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// POST /api/v1/auth/signup
router.post('/signup', async (req, res, next) => {
    try {
        const { email, password, username, fullName } = req.body;

        if (!email || !password || !username || !fullName) {
            return next(new AppError('Please provide all details', 400));
        }

        const db = admin.firestore();
        const usernameQuery = await db.collection('users').where('username', '==', username).get();
        if (!usernameQuery.empty) {
            return next(new AppError('Username already taken', 400));
        }

        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: username,
            emailVerified: false,
            disabled: false
        });

        // Generate Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const newUser = {
            id: userRecord.uid,
            uid: userRecord.uid,
            username: username,
            displayName: username,
            fullName: fullName,
            email: email,
            role: 'user',
            isActive: true,
            emailVerified: false,
            verificationToken,
            verificationExpires,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}`,
            bio: 'Comfortable & Cozy',
            followers: [],
            following: []
        };

        await db.collection('users').doc(userRecord.uid).set(newUser);

        // MOCK EMAIL SENDING
        const link = `http://localhost:5173/verify-email/${verificationToken}`; // Frontend URL
        console.log('------------------------------------------------');
        console.log(`[Email Service] To: ${email}`);
        console.log(`[Email Service] Subject: Verify your email`);
        console.log(`[Email Service] Body: Please verify your email by clicking: ${link}`);
        console.log(`[Email Service] Token expires in 24 hours.`);
        console.log('------------------------------------------------');

        res.status(201).json({
            status: 'success',
            message: 'Account created! Please check your email to verify your account.',
            data: {
                user: {
                    id: userRecord.uid,
                    email: email,
                    username: username
                }
            }
        });

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            return next(new AppError('Email already in use', 400));
        }
        if (error.code === 'auth/invalid-password') {
            return next(new AppError('Password is too weak', 400));
        }
        next(error);
    }
});

// POST /api/v1/auth/verify-email/:token
router.post('/verify-email/:token', async (req, res, next) => {
    try {
        const token = req.params.token;
        const db = admin.firestore();

        // Find user by token
        const snapshot = await db.collection('users').where('verificationToken', '==', token).limit(1).get();

        if (snapshot.empty) {
            return next(new AppError('Invalid or expired verification token', 400));
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Check Expiry
        if (userData.verificationExpires < Date.now()) {
            return next(new AppError('Verification token has expired', 400));
        }

        // Mark as Verified
        await userDoc.ref.update({
            emailVerified: true,
            verificationToken: admin.firestore.FieldValue.delete(),
            verificationExpires: admin.firestore.FieldValue.delete()
        });

        // Also update Firebase Auth
        await admin.auth().updateUser(userData.uid, {
            emailVerified: true
        });

        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully!'
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return next(new AppError('Email is required', 400));

        const db = admin.firestore();
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return next(new AppError('User not found', 404));
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        if (userData.emailVerified) {
            return next(new AppError('Email is already verified', 400));
        }

        // Rate Limit (e.g. check duplicate requests or last sent time) - optional simplified for now

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

        await userDoc.ref.update({
            verificationToken,
            verificationExpires
        });

        const link = `http://localhost:5173/verify-email/${verificationToken}`;
        console.log('------------------------------------------------');
        console.log(`[Email Service] RESENT To: ${email}`);
        console.log(`[Email Service] Link: ${link}`);
        console.log('------------------------------------------------');

        res.status(200).json({
            status: 'success',
            message: 'Verification email resent'
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/2fa/setup
router.post('/2fa/setup', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError('No token', 401));
        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const secret = speakeasy.generateSecret({ length: 20, name: `Snuggle (${decoded.email})` });

        // Save temporary secret to user (or separate coll) 
        // We'll store it in user doc but mark as NOT enabled yet
        const db = admin.firestore();
        await db.collection('users').doc(uid).update({
            twoFactorTempSecret: secret.base32,
            twoFactorTempSecretHex: secret.hex // checking if needed, base32 is std
        });

        // Generate QR
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.status(200).json({
            status: 'success',
            data: {
                secret: secret.base32,
                qrCode: qrCodeUrl
            }
        });
    } catch (e) { next(e); }
});

// POST /api/v1/auth/2fa/verify-setup
router.post('/2fa/verify-setup', async (req, res, next) => {
    try {
        const { code } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader) return next(new AppError('No token', 401));
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        if (!userData.twoFactorTempSecret) return next(new AppError('Setup not initiated', 400));

        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorTempSecret,
            encoding: 'base32',
            token: code
        });

        if (verified) {
            // Generate Backup Codes
            const backupCodes = Array.from({ length: 5 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());

            await db.collection('users').doc(uid).update({
                twoFactorEnabled: true,
                twoFactorSecret: userData.twoFactorTempSecret,
                twoFactorBackupCodes: backupCodes,
                twoFactorTempSecret: admin.firestore.FieldValue.delete(),
                twoFactorTempSecretHex: admin.firestore.FieldValue.delete()
            });

            res.status(200).json({
                status: 'success',
                message: '2FA Enabled',
                data: { backupCodes }
            });
        } else {
            return next(new AppError('Invalid code', 400));
        }
    } catch (e) { next(e); }
});

// POST /api/v1/auth/2fa/disable
router.post('/2fa/disable', async (req, res, next) => {
    try {
        const { code } = req.body; // Can require generic password re-auth too
        const authHeader = req.headers.authorization;
        if (!authHeader) return next(new AppError('No token', 401));
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        if (!userData.twoFactorEnabled) return next(new AppError('2FA not enabled', 400));

        // Verify code
        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: code
        });

        if (verified) {
            await db.collection('users').doc(uid).update({
                twoFactorEnabled: false,
                twoFactorSecret: admin.firestore.FieldValue.delete(),
                twoFactorBackupCodes: admin.firestore.FieldValue.delete()
            });
            res.status(200).json({ status: 'success', message: '2FA Disabled' });
        } else {
            return next(new AppError('Invalid code', 400));
        }
    } catch (e) { next(e); }
});

// POST /api/v1/auth/2fa/verify-login
router.post('/2fa/verify-login', async (req, res, next) => {
    try {
        const { code } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader) return next(new AppError('No token', 401));
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        if (!userData.twoFactorEnabled) return next(new AppError('2FA not enabled', 400));

        let valid = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1 // allow some drift
        });

        // Check Backup Codes if TOTP failed
        if (!valid && userData.twoFactorBackupCodes) {
            if (userData.twoFactorBackupCodes.includes(code)) {
                valid = true;
                // Remove used backup code
                const newCodes = userData.twoFactorBackupCodes.filter(c => c !== code);
                await db.collection('users').doc(uid).update({
                    twoFactorBackupCodes: newCodes
                });
            }
        }

        if (valid) {
            // NOW we return the login data
            await db.collection('users').doc(uid).update({
                lastLogin: Date.now(),
                isOnline: true
            });

            res.status(200).json({
                status: 'success',
                message: 'Logged in successfully',
                data: { user: userData }
            });
        } else {
            return next(new AppError('Invalid 2FA code', 400));
        }

    } catch (e) { next(e); }
});

// POST /api/v1/auth/login
// Expects: Authorization: Bearer <idToken>
router.post('/login', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError('No token provided', 401));
        }

        const idToken = authHeader.split('Bearer ')[1];

        // 1. Verify Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // 2. Check Email Verification (Optional enforcement)
        if (!decodedToken.email_verified) {
            // warning logic
        }

        // 3. Get User from Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return next(new AppError('User not found in database', 404));
        }

        const userData = userDoc.data();

        // CHECK 2FA
        if (userData.twoFactorEnabled) {
            return res.status(200).json({
                status: '2fa_required',
                message: 'Two-factor authentication required',
                // We don't send user data yet
            });
        }

        // 4. Update Last Login
        await db.collection('users').doc(uid).update({
            lastLogin: Date.now(),
            isOnline: true
        });

        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully',
            token: idToken, // Echo back or issue a session cookie
            data: {
                user: userData
            }
        });

    } catch (error) {
        if (error.code === 'auth/id-token-expired') {
            return next(new AppError('Token expired', 401));
        }
        next(new AppError('Invalid credentials or token', 401));
    }
});

// POST /api/v1/auth/refresh
router.post('/refresh', (req, res, next) => {
    res.status(200).json({
        status: 'success',
        token: 'new_mock_jwt_token_' + Date.now()
    });
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res, next) => {
    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    });
});

export default router;
