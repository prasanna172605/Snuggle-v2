/**
 * End-to-End Encryption Service
 * Uses Web Crypto API: ECDH P-256 key exchange + AES-256-GCM symmetric encryption
 */

// ─── Key Generation ─────────────────────────────────────────────────

const ECDH_PARAMS: EcKeyGenParams = {
    name: 'ECDH',
    namedCurve: 'P-256',
};

const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit for AES-GCM

/**
 * Generate an ECDH key pair for key exchange
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
        ECDH_PARAMS,
        true, // extractable (for export/backup)
        ['deriveKey', 'deriveBits']
    );
}

// ─── Key Export / Import ────────────────────────────────────────────

/**
 * Export a public key as JWK for storage in Firestore
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey('jwk', publicKey);
}

/**
 * Import a public key from JWK (fetched from Firestore)
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'jwk',
        jwk,
        ECDH_PARAMS,
        true,
        [] // public keys don't need usages for ECDH
    );
}

/**
 * Export a private key as JWK (for backup)
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey('jwk', privateKey);
}

/**
 * Import a private key from JWK (for restore)
 */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'jwk',
        jwk,
        ECDH_PARAMS,
        true,
        ['deriveKey', 'deriveBits']
    );
}

// ─── Key Derivation ─────────────────────────────────────────────────

/**
 * Derive a shared AES-256-GCM key from local private key + remote public key
 * This is the ECDH shared secret derivation
 */
export async function deriveSharedKey(
    privateKey: CryptoKey,
    remotePublicKey: CryptoKey
): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
        {
            name: 'ECDH',
            public: remotePublicKey,
        },
        privateKey,
        {
            name: 'AES-GCM',
            length: AES_KEY_LENGTH,
        },
        false, // non-extractable — stays in memory only
        ['encrypt', 'decrypt']
    );
}

// ─── Encryption / Decryption ────────────────────────────────────────

/**
 * Encrypt plaintext using AES-256-GCM with a random IV
 * @returns { ciphertext: base64, iv: base64 }
 */
export async function encrypt(
    plaintext: string,
    sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random 12-byte IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedKey,
        data
    );

    return {
        ciphertext: arrayBufferToBase64(encrypted),
        iv: uint8ToArrayBuffer(iv),
    };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export async function decrypt(
    ciphertext: string,
    iv: string,
    sharedKey: CryptoKey
): Promise<string> {
    const encryptedData = base64ToArrayBuffer(ciphertext);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
        sharedKey,
        encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

// ─── Key Backup (Passphrase-based) ─────────────────────────────────

/**
 * Derive an AES key from a user passphrase using PBKDF2
 * Used to encrypt private key backups
 */
async function deriveKeyFromPassphrase(
    passphrase: string,
    salt: ArrayBuffer
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 600000, // OWASP recommended minimum
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a private key JWK with a passphrase for cloud backup
 */
export async function encryptPrivateKeyForBackup(
    privateKeyJwk: JsonWebKey,
    passphrase: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const wrappingKey = await deriveKeyFromPassphrase(passphrase, toArrayBuffer(salt));

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(privateKeyJwk));

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        wrappingKey,
        data
    );

    return {
        encryptedKey: arrayBufferToBase64(encrypted),
        salt: uint8ToArrayBuffer(salt),
        iv: uint8ToArrayBuffer(iv),
    };
}

/**
 * Decrypt a private key from cloud backup using passphrase
 */
export async function decryptPrivateKeyFromBackup(
    encryptedKey: string,
    salt: string,
    iv: string,
    passphrase: string
): Promise<JsonWebKey> {
    const saltBuffer = base64ToArrayBuffer(salt);
    const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
    const wrappingKey = await deriveKeyFromPassphrase(passphrase, saltBuffer);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        wrappingKey,
        base64ToArrayBuffer(encryptedKey)
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
}

// ─── Safety Number (Call Verification) ──────────────────────────────

/**
 * Generate a human-readable safety number from two public keys
 * Both sides compute the same number when using each other's keys
 */
export async function generateSafetyNumber(
    localPublicKey: CryptoKey,
    remotePublicKey: CryptoKey
): Promise<string> {
    const localRaw = await crypto.subtle.exportKey('raw', localPublicKey);
    const remoteRaw = await crypto.subtle.exportKey('raw', remotePublicKey);

    // Sort keys deterministically so both sides get the same result
    const localArr = new Uint8Array(localRaw);
    const remoteArr = new Uint8Array(remoteRaw);

    let combined: Uint8Array;
    if (compareArrays(localArr, remoteArr) < 0) {
        combined = concatArrays(localArr, remoteArr);
    } else {
        combined = concatArrays(remoteArr, localArr);
    }

    // SHA-256 hash of combined keys
    const hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(combined));
    const hashArray = new Uint8Array(hash);

    // Convert to human-readable groups of 5 digits (like Signal)
    const digits: string[] = [];
    for (let i = 0; i < 6; i++) {
        const num = (hashArray[i * 4] << 24 | hashArray[i * 4 + 1] << 16 |
            hashArray[i * 4 + 2] << 8 | hashArray[i * 4 + 3]) >>> 0;
        digits.push(String(num % 100000).padStart(5, '0'));
    }

    return digits.join(' ');
}

// ─── Utility Functions ──────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
}

function uint8ToArrayBuffer(arr: Uint8Array): string {
    return arrayBufferToBase64(toArrayBuffer(arr));
}

/** Convert Uint8Array to a clean ArrayBuffer (avoids TypeScript SharedArrayBuffer issues) */
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
    const buf = new ArrayBuffer(arr.byteLength);
    new Uint8Array(buf).set(arr);
    return buf;
}

function compareArrays(a: Uint8Array, b: Uint8Array): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
}

function concatArrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
}
