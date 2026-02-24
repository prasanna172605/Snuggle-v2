import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

// Configuration
const DIST_FOLDER = 'dist';
const VERSION_FILE = 'version.json';

// Read package.json to get version
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = require(packageJsonPath);
const version = packageJson.version;

console.log(`🚀 Preparing update for version ${version}...`);

// 1. Build the project
console.log('📦 Building project...');
try {
    execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
    console.error('❌ Build failed.');
    process.exit(1);
}

// 2. Prepare APK for download (Zipped to bypass Firebase Hosting restrictions)
console.log('🤖 Preparing APK for download (Zipping)...');
const apkSource = path.join(process.cwd(), 'android', 'app', 'release', 'app-release.apk');
const debugApkSource = path.join(process.cwd(), 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkZipDest = path.join(DIST_FOLDER, 'snuggle-app.zip');

let apkFileToZip = null;
if (fs.existsSync(apkSource)) {
    apkFileToZip = apkSource;
    console.log('✅ Release APK found.');
} else if (fs.existsSync(debugApkSource)) {
    apkFileToZip = debugApkSource;
    console.log('⚠️ Release APK not found, using Debug APK instead.');
}

if (apkFileToZip) {
    const apkZip = new AdmZip();
    apkZip.addLocalFile(apkFileToZip);
    apkZip.writeZip(apkZipDest);
    console.log('✅ APK zipped successfully.');
} else {
    console.warn('❌ No APK found to zip.');
}

// 3. Zip the dist folder for OTA (excluding large binaries)
console.log('🤐 Zipping assets for OTA update...');
const otaZip = new AdmZip();
const zipFileName = `v${version}.zip`;
const zipPath = path.join(DIST_FOLDER, zipFileName);

// Add everything in dist EXCEPT the zips themselves
const files = fs.readdirSync(DIST_FOLDER);
files.forEach(file => {
    if (!file.endsWith('.zip')) {
        const fullPath = path.join(DIST_FOLDER, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            otaZip.addLocalFolder(fullPath, file);
        } else {
            otaZip.addLocalFile(fullPath);
        }
    }
});
otaZip.writeZip(zipPath);
console.log('✅ OTA bundle created.');

// 4. Update version.json
console.log('📝 Updating version.json...');
const versionData = {
    version: version,
    note: `Update v${version} - ${new Date().toLocaleTimeString()}`,
    url: `https://snuggle-73465.web.app/${zipFileName}`, // OTA bundle
    apkUrl: `https://snuggle-73465.web.app/snuggle-app.zip` // APK zip download link
};

// Write to dist folder
fs.writeFileSync(path.join(DIST_FOLDER, VERSION_FILE), JSON.stringify(versionData, null, 2));

console.log('✅ Update bundle created!');
console.log(`👉 OTA Zip: ${zipPath}`);
console.log(`👉 APK Zip: ${apkZipDest}`);
console.log(`👉 Version: ${version}`);
console.log('Run "firebase deploy --only hosting" to publish.');
