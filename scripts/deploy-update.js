import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

// Configuration
const DIST_FOLDER = 'dist';
const PUBLIC_FOLDER = 'public';
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

// 2. Zip the dist folder
console.log('🤐 Zipping dist folder...');
const zip = new AdmZip();
zip.addLocalFolder(DIST_FOLDER);
const zipFileName = `v${version}.zip`;
const zipPath = path.join(DIST_FOLDER, zipFileName); // We put it in dist so it gets deployed
zip.writeZip(zipPath);

// 3. Copy APK to dist for download link
console.log('🤖 Copying APK for download...');
const apkSource = path.join(process.cwd(), 'android', 'app', 'release', 'app-release.apk');
const debugApkSource = path.join(process.cwd(), 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDest = path.join(DIST_FOLDER, 'snuggle.apk');

if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, apkDest);
    console.log('✅ Release APK copied.');
} else if (fs.existsSync(debugApkSource)) {
    fs.copyFileSync(debugApkSource, apkDest);
    console.log('⚠️ Release APK not found, copied Debug APK instead.');
} else {
    console.warn('❌ No APK found to copy.');
}

// 4. Update version.json
console.log('📝 Updating version.json...');
const versionData = {
    version: version,
    note: `Update v${version} - ${new Date().toLocaleTimeString()}`,
    url: `https://snuggle-73465.web.app/${zipFileName}`, // OTA bundle
    apkUrl: `https://snuggle-73465.web.app/snuggle.apk` // APK download link
};

// Write to dist folder so it overrides the one in public during deployment
fs.writeFileSync(path.join(DIST_FOLDER, VERSION_FILE), JSON.stringify(versionData, null, 2));

console.log('✅ Update bundle created!');
console.log(`👉 Zip: ${zipPath}`);
console.log(`👉 Version: ${version}`);
console.log('Run "firebase deploy --only hosting" to publish.');
