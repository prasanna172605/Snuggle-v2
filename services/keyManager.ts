/**
 * Key Manager
 * High-level key lifecycle management for E2EE
 * Handles key generation, storage (IndexedDB), sync (Firestore), and derivation caching
 */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import {
    generateKeyPair,
    exportPublicKey,
    exportPrivateKey,
    importPrivateKey,
    importPublicKey,
    deriveSharedKey,
    encryptPrivateKeyForBackup,
    decryptPrivateKeyFromBackup,
    generateSafetyNumber,
} from './encryptionService';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// ─── Constants ──────────────────────────────────────────────────────

const IDB_PRIVATE_KEY = 'snuggle_e2ee_private_key';
const IDB_PUBLIC_KEY = 'snuggle_e2ee_public_key';

// ─── In-Memory Caches ──────────────────────────────────────────────

/** Cache derived shared keys: Map<remoteUserId, AES-GCM CryptoKey> */
const sharedKeyCache = new Map<string, CryptoKey>();

/** Cache remote public keys: Map<remoteUserId, CryptoKey> */
const publicKeyCache = new Map<string, CryptoKey>();

/** Local key pair (loaded from IndexedDB on init) */
let localKeyPair: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;

// ─── Initialization ─────────────────────────────────────────────────

/**
 * Initialize E2EE keys for the current user
 * - Loads existing key pair from IndexedDB, OR
 * - Generates a new key pair and uploads the public key to Firestore
 */
export async function initializeKeys(userId: string): Promise<void> {
    try {
        // Try loading existing keys from IndexedDB
        const storedPrivateJwk = await idbGet(IDB_PRIVATE_KEY);
        const storedPublicJwk = await idbGet(IDB_PUBLIC_KEY);

        if (storedPrivateJwk && storedPublicJwk) {
            const privateKey = await importPrivateKey(storedPrivateJwk);
            const publicKey = await importPublicKey(storedPublicJwk);
            localKeyPair = { publicKey, privateKey };
            console.log('[E2EE] Loaded existing key pair from IndexedDB');
            
            // Ensure public key is synced to Firestore
            await syncPublicKeyToFirestore(userId, storedPublicJwk);
            return;
        }

        // No existing keys — generate new pair
        console.log('[E2EE] Generating new key pair...');
        const keyPair = await generateKeyPair();
        localKeyPair = { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };

        // Export and store in IndexedDB
        const publicJwk = await exportPublicKey(keyPair.publicKey);
        const privateJwk = await exportPrivateKey(keyPair.privateKey);

        await idbSet(IDB_PRIVATE_KEY, privateJwk);
        await idbSet(IDB_PUBLIC_KEY, publicJwk);

        // Upload public key to Firestore
        await syncPublicKeyToFirestore(userId, publicJwk);

        console.log('[E2EE] New key pair generated and stored');
    } catch (error) {
        console.error('[E2EE] Key initialization failed:', error);
        throw error;
    }
}

/**
 * Sync public key to Firestore user document
 */
async function syncPublicKeyToFirestore(userId: string, publicJwk: JsonWebKey): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            e2eePublicKey: publicJwk,
            e2eeKeyUpdatedAt: Date.now(),
        });
        console.log('[E2EE] Public key synced to Firestore');
    } catch (error) {
        console.error('[E2EE] Failed to sync public key:', error);
    }
}

// ─── Key Retrieval ──────────────────────────────────────────────────

/**
 * Get the local key pair (must call initializeKeys first)
 */
export function getLocalKeyPair(): { publicKey: CryptoKey; privateKey: CryptoKey } | null {
    return localKeyPair;
}

/**
 * Fetch a remote user's public key from Firestore (with caching)
 */
export async function getRemotePublicKey(remoteUserId: string): Promise<CryptoKey | null> {
    // Check cache first
    const cached = publicKeyCache.get(remoteUserId);
    if (cached) return cached;

    try {
        const userRef = doc(db, 'users', remoteUserId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.warn('[E2EE] Remote user not found:', remoteUserId);
            return null;
        }

        const userData = userSnap.data();
        if (!userData.e2eePublicKey) {
            console.warn('[E2EE] Remote user has no E2EE public key:', remoteUserId);
            return null;
        }

        const publicKey = await importPublicKey(userData.e2eePublicKey);
        publicKeyCache.set(remoteUserId, publicKey);
        return publicKey;
    } catch (error) {
        console.error('[E2EE] Failed to fetch remote public key:', error);
        return null;
    }
}

// ─── Shared Key Derivation ──────────────────────────────────────────

/**
 * Get (or derive and cache) the shared AES-256 key with a remote user
 * This is the main function used by message encrypt/decrypt
 */
export async function getSharedKey(remoteUserId: string): Promise<CryptoKey | null> {
    // Check cache
    const cached = sharedKeyCache.get(remoteUserId);
    if (cached) return cached;

    if (!localKeyPair) {
        console.warn('[E2EE] Local key pair not initialized');
        return null;
    }

    const remotePublicKey = await getRemotePublicKey(remoteUserId);
    if (!remotePublicKey) return null;

    try {
        const sharedKey = await deriveSharedKey(localKeyPair.privateKey, remotePublicKey);
        sharedKeyCache.set(remoteUserId, sharedKey);
        console.log('[E2EE] Derived shared key with user:', remoteUserId);
        return sharedKey;
    } catch (error) {
        console.error('[E2EE] Failed to derive shared key:', error);
        return null;
    }
}

// ─── Key Rotation ───────────────────────────────────────────────────

/**
 * Rotate keys — generates a new key pair
 * Invalidates all cached shared keys (they'll be re-derived on next use)
 */
export async function rotateKeys(userId: string): Promise<void> {
    console.log('[E2EE] Rotating keys...');

    // Clear caches
    sharedKeyCache.clear();
    publicKeyCache.clear();

    // Generate new key pair
    const keyPair = await generateKeyPair();
    localKeyPair = { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };

    const publicJwk = await exportPublicKey(keyPair.publicKey);
    const privateJwk = await exportPrivateKey(keyPair.privateKey);

    // Store in IndexedDB
    await idbSet(IDB_PRIVATE_KEY, privateJwk);
    await idbSet(IDB_PUBLIC_KEY, publicJwk);

    // Sync to Firestore
    await syncPublicKeyToFirestore(userId, publicJwk);

    console.log('[E2EE] Key rotation complete');
}

// ─── Key Backup ─────────────────────────────────────────────────────

/**
 * Create an encrypted backup of the private key (stored in Firestore)
 * @param passphrase User-chosen passphrase to encrypt the backup
 */
export async function createKeyBackup(userId: string, passphrase: string): Promise<void> {
    if (!localKeyPair) throw new Error('No key pair to backup');

    const privateJwk = await exportPrivateKey(localKeyPair.privateKey);
    const backup = await encryptPrivateKeyForBackup(privateJwk, passphrase);

    // Store encrypted backup in Firestore
    const backupRef = doc(db, 'e2eeBackups', userId);
    await setDoc(backupRef, {
        encryptedKey: backup.encryptedKey,
        salt: backup.salt,
        iv: backup.iv,
        createdAt: Date.now(),
    });

    console.log('[E2EE] Key backup created in Firestore');
}

/**
 * Restore private key from cloud backup
 * @param passphrase The passphrase used during backup
 */
export async function restoreKeyBackup(userId: string, passphrase: string): Promise<void> {
    const backupRef = doc(db, 'e2eeBackups', userId);
    const backupSnap = await getDoc(backupRef);

    if (!backupSnap.exists()) {
        throw new Error('No key backup found');
    }

    const backupData = backupSnap.data();
    const privateJwk = await decryptPrivateKeyFromBackup(
        backupData.encryptedKey,
        backupData.salt,
        backupData.iv,
        passphrase
    );

    const privateKey = await importPrivateKey(privateJwk);

    // We need to re-derive the public key — regenerate the pair from scratch
    // Actually, we can derive the public key from the JWK since it contains both components
    const publicJwk = { ...privateJwk };
    delete publicJwk.d; // Remove private component to get public JWK
    const publicKey = await importPublicKey(publicJwk);

    localKeyPair = { publicKey, privateKey };

    // Store in IndexedDB
    await idbSet(IDB_PRIVATE_KEY, privateJwk);
    await idbSet(IDB_PUBLIC_KEY, publicJwk);

    // Sync public key to Firestore
    await syncPublicKeyToFirestore(userId, publicJwk);

    // Clear shared key cache (need re-derivation with new keys)
    sharedKeyCache.clear();
    publicKeyCache.clear();

    console.log('[E2EE] Key restored from backup');
}

// ─── Safety Number ──────────────────────────────────────────────────

/**
 * Get the safety number for verification with a remote user
 */
export async function getSafetyNumber(remoteUserId: string): Promise<string | null> {
    if (!localKeyPair) return null;

    const remotePublicKey = await getRemotePublicKey(remoteUserId);
    if (!remotePublicKey) return null;

    return generateSafetyNumber(localKeyPair.publicKey, remotePublicKey);
}

// ─── Cleanup ────────────────────────────────────────────────────────

/**
 * Clear all E2EE data (used on logout)
 */
export async function clearE2EEData(): Promise<void> {
    localKeyPair = null;
    sharedKeyCache.clear();
    publicKeyCache.clear();
    await idbDel(IDB_PRIVATE_KEY);
    await idbDel(IDB_PUBLIC_KEY);
    console.log('[E2EE] All local E2EE data cleared');
}

/**
 * Check if E2EE is initialized and ready
 */
export function isE2EEReady(): boolean {
    return localKeyPair !== null;
}
