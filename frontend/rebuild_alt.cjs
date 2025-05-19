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

// Create a completely new build directory
const buildDir = path.join(__dirname, '..', 'pairadox-build');
if (fs.existsSync(buildDir)) {
  console.log('Cleaning build directory...');
  try {
    fs.rmSync(buildDir, { recursive: true, force: true });
    console.log('Build directory cleaned');
  } catch (error) {
    console.error('Error cleaning build directory:', error.message);
  }
}

// Create the new directory
fs.mkdirSync(buildDir, { recursive: true });

// Copy all necessary files to the new directory
console.log('Copying files to build directory...');
const filesToCopy = [
  'package.json',
  'package-lock.json',
  'electron.cjs',
  'vite.config.js',
  'index.html',
  'setup-python-env.cjs',
  'eslint.config.js',
  '.gitignore'
];

for (const file of filesToCopy) {
  if (fs.existsSync(path.join(__dirname, file))) {
    fs.copyFileSync(path.join(__dirname, file), path.join(buildDir, file));
  }
}

// Copy directories
const dirsToCopy = ['src', 'public'];
for (const dir of dirsToCopy) {
  const sourceDir = path.join(__dirname, dir);
  const targetDir = path.join(buildDir, dir);

  if (fs.existsSync(sourceDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    copyDirectory(sourceDir, targetDir);
  }
}

function copyDirectory(source, target) {
  const files = fs.readdirSync(source);

  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// Create backend directory in new build dir
const backendSourceDir = path.join(__dirname, '..', 'backend');
const backendTargetDir = path.join(buildDir, 'backend');
fs.mkdirSync(backendTargetDir, { recursive: true });
copyDirectory(backendSourceDir, backendTargetDir);

// Change to the build directory
process.chdir(buildDir);
console.log('Changed working directory to:', buildDir);

// Install dependencies
console.log('Installing dependencies...');
runCommand('npm install');

// Setup Python environment
console.log('Setting up Python environment...');
runCommand('node setup-python-env.cjs');

// Build the frontend
console.log('Building frontend...');
runCommand('npm run build');

// Build the electron app
console.log('Building electron app...');
runCommand('npx electron-builder --win');

console.log('Build process completed. Check for the installer in:', path.join(buildDir, 'release'));
