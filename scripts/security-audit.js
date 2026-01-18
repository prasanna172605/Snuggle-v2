#!/usr/bin/env node

/**
 * Security Audit Script
 * Runs comprehensive security checks
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔒 Running Security Audit for Snuggle...\n');

let hasErrors = false;

// 1. NPM Audit
console.log('📦 1. Checking npm dependencies...');
try {
    execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });
    console.log('✅ No vulnerabilities found\n');
} catch (error) {
    console.error('❌ Vulnerabilities detected');
    hasErrors = true;
}

// 2. Check for hardcoded secrets
console.log('🔑 2. Scanning for hardcoded secrets...');
const secretPatterns = [
    /api[_-]?key[\s]*[:=][\s]*['"][\w-]{20,}['"]/gi,
    /secret[\s]*[:=][\s]*['"][\w-]{20,}['"]/gi,
    /password[\s]*[:=][\s]*['"][^'"]{8,}['"]/gi,
    /firebase[_-]?api[_-]?key/gi,
];

let secretsFound = false;
const filesToScan = [
    'src/**/*.ts',
    'src/**/*.tsx',
    'functions/src/**/*.ts',
];

filesToScan.forEach(pattern => {
    try {
        const files = execSync(`git ls-files "${pattern}"`, { encoding: 'utf8' })
            .split('\n')
            .filter(Boolean);

        files.forEach(file => {
            if (!fs.existsSync(file)) return;

            const content = fs.readFileSync(file, 'utf8');
            secretPatterns.forEach(pattern => {
                if (pattern.test(content)) {
                    console.error(`❌ Potential secret found in ${file}`);
                    secretsFound = true;
                    hasErrors = true;
                }
            });
        });
    } catch (error) {
        // Pattern not found, skip
    }
});

if (!secretsFound) {
    console.log('✅ No hardcoded secrets detected\n');
}

// 3. Check Security Headers
console.log('🛡️  3. Checking firebase.json for security headers...');
const firebaseConfig = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const headers = firebaseConfig.hosting?.headers || [];

const requiredHeaders = [
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Content-Security-Policy',
];

let missingHeaders = [];
requiredHeaders.forEach(headerName => {
    const found = headers.some(h =>
        h.headers?.some(header => header.key === headerName)
    );
    if (!found) {
        missingHeaders.push(headerName);
    }
});

if (missingHeaders.length > 0) {
    console.error(`❌ Missing security headers: ${missingHeaders.join(', ')}`);
    hasErrors = true;
} else {
    console.log('✅ All required security headers present\n');
}

// 4. Check for console.log in production code
console.log('🐛 4. Checking for console.log in production code...');
try {
    const result = execSync('grep -r "console.log" src/ --exclude-dir=__tests__', { encoding: 'utf8' });
    if (result) {
        console.warn('⚠️  Found console.log statements (should be removed for production)');
        console.warn(result);
    }
} catch (error) {
    console.log('✅ No console.log found in production code\n');
}

// 5. Check environment files not committed
console.log('🔐 5. Checking .gitignore for environment files...');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const envPatterns = ['.env.local', '.env.production'];
const missingEnvPatterns = envPatterns.filter(pattern => !gitignore.includes(pattern));

if (missingEnvPatterns.length > 0) {
    console.error(`❌ .gitignore missing: ${missingEnvPatterns.join(', ')}`);
    hasErrors = true;
} else {
    console.log('✅ Environment files properly ignored\n');
}

// 6. Check Firebase Security Rules exist
console.log('🔥 6. Checking Firebase Security Rules...');
if (!fs.existsSync('database.rules.json')) {
    console.error('❌ database.rules.json not found');
    hasErrors = true;
} else if (!fs.existsSync('storage.rules')) {
    console.error('❌ storage.rules not found');
    hasErrors = true;
} else {
    console.log('✅ Firebase Security Rules present\n');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.error('❌ Security audit FAILED - Please fix issues above');
    process.exit(1);
} else {
    console.log('✅ Security audit PASSED');
    process.exit(0);
}
