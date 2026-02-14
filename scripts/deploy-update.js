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

// 3. Update version.json
console.log('📝 Updating version.json...');
const versionData = {
    version: version,
    note: `Update v${version} - ${new Date().toLocaleTimeString()}`,
    url: `https://snuggle-73465.web.app/${zipFileName}` // It will be at root of deployment
};

// Write to dist folder so it overrides the one in public during deployment
fs.writeFileSync(path.join(DIST_FOLDER, VERSION_FILE), JSON.stringify(versionData, null, 2));

console.log('✅ Update bundle created!');
console.log(`👉 Zip: ${zipPath}`);
console.log(`👉 Version: ${version}`);
console.log('Run "firebase deploy --only hosting" to publish.');
