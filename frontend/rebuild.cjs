// rebuild.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to execute shell commands
function runCommand(command) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Clean release directory
const releaseDir = path.join(__dirname, 'release');
if (fs.existsSync(releaseDir)) {
  console.log('Cleaning release directory...');
  try {
    fs.rmSync(releaseDir, { recursive: true, force: true });
    console.log('Release directory cleaned');
  } catch (error) {
    console.error('Error cleaning release directory:', error.message);
  }
}

// Setup Python environment
console.log('Setting up Python environment...');
if (!runCommand('node setup-python-env.cjs')) {
  console.error('Failed to setup Python environment');
  process.exit(1);
}

// Build the frontend
console.log('Building frontend...');
if (!runCommand('npm run build')) {
  console.error('Failed to build frontend');
  process.exit(1);
}

// Build the electron app without code signing
console.log('Building electron app...');
runCommand('npx electron-builder --win --config.forceCodeSigning=false');

console.log('Build process completed');
