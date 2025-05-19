const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create python-env directory if it doesn't exist
const pythonEnvDir = path.join(__dirname, 'python-env');
if (!fs.existsSync(pythonEnvDir)) {
  fs.mkdirSync(pythonEnvDir, { recursive: true });
}

// Determine platform
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

console.log('Setting up Python environment for packaging...');

try {
  // Install Python for the app
  if (isWin) {
    // For Windows, use embeddable Python
    console.log('Downloading Python embeddable package for Windows...');

    // Create temporary directory
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download Python embeddable package
    const pythonVersion = '3.10.11';
    const pythonUrl = `https://www.python.org/ftp/python/${pythonVersion}/python-${pythonVersion}-embed-amd64.zip`;
    const zipPath = path.join(tempDir, 'python.zip');

    console.log(`Downloading from ${pythonUrl}...`);
    execSync(`curl -L "${pythonUrl}" -o "${zipPath}"`);

    // Extract Python
    console.log('Extracting Python...');
    execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${pythonEnvDir}' -Force"`);

    // Download and install pip
    console.log('Installing pip...');
    const getPipUrl = 'https://bootstrap.pypa.io/get-pip.py';
    const getPipPath = path.join(tempDir, 'get-pip.py');

    execSync(`curl -L "${getPipUrl}" -o "${getPipPath}"`);

    // Modify python310._pth to enable site packages
    const pthFile = path.join(pythonEnvDir, 'python310._pth');
    let pthContent = fs.readFileSync(pthFile, 'utf8');
    pthContent = pthContent.replace('#import site', 'import site');
    fs.writeFileSync(pthFile, pthContent);

    // Install pip
    execSync(`"${path.join(pythonEnvDir, 'python.exe')}" "${getPipPath}"`);

    // Create a custom sitecustomize.py to ensure site-packages is in the path
    const sitecustomizePath = path.join(pythonEnvDir, 'sitecustomize.py');
    const sitecustomizeContent = `
import sys
import os
import site

# Add site-packages directories
python_path = os.path.dirname(os.path.abspath(__file__))
site_packages = os.path.join(python_path, 'Lib', 'site-packages')

# Ensure the site-packages directory exists
os.makedirs(site_packages, exist_ok=True)

# Add to path if not already there
if site_packages not in sys.path:
    sys.path.insert(0, site_packages)

# Also add the bundled backend path
backend_path = os.path.join(os.path.dirname(python_path), 'backend')
if os.path.exists(backend_path) and backend_path not in sys.path:
    sys.path.insert(0, backend_path)
`;
    fs.writeFileSync(sitecustomizePath, sitecustomizeContent);

    // Install dependencies using pip
    console.log('Installing Python dependencies...');
    const requirementsPath = path.join(__dirname, '..', 'backend', 'requirements.txt');

    // Make sure pip is properly configured first
    execSync(`"${path.join(pythonEnvDir, 'python.exe')}" -m pip install --upgrade pip`);

    // Install the dependencies with verbose output
    try {
      execSync(`"${path.join(pythonEnvDir, 'python.exe')}" -m pip install -r "${requirementsPath}" -v`,
        { stdio: 'inherit' });
    } catch (error) {
      console.error('Error installing dependencies:', error);
      // Try installing each dependency individually
      const requirements = fs.readFileSync(requirementsPath, 'utf8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'));

      for (const requirement of requirements) {
        if (requirement.trim()) {
          console.log(`Installing ${requirement} individually...`);
          try {
            execSync(`"${path.join(pythonEnvDir, 'python.exe')}" -m pip install ${requirement} -v`,
              { stdio: 'inherit' });
          } catch (individualError) {
            console.error(`Failed to install ${requirement}:`, individualError);
          }
        }
      }
    }

    // Copy all the backend files to the Python directory for easier imports
    const backendDir = path.join(__dirname, '..', 'backend');
    const pythonBackendDir = path.join(pythonEnvDir, 'backend');

    if (!fs.existsSync(pythonBackendDir)) {
      fs.mkdirSync(pythonBackendDir, { recursive: true });
    }

    // Copy main.py to make it directly importable
    fs.copyFileSync(
      path.join(backendDir, 'main.py'),
      path.join(pythonBackendDir, 'main.py')
    );

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });

  } else if (isMac) {
    // For Mac, use virtualenv
    console.log('Creating Python virtual environment for Mac...');

    // Check if Python 3 is installed
    try {
      execSync('python3 --version');
    } catch (error) {
      console.error('Python 3 is not installed. Please install Python 3 first.');
      process.exit(1);
    }

    // Create virtual environment
    execSync(`python3 -m venv "${pythonEnvDir}"`);

    // Install dependencies
    console.log('Installing Python dependencies...');
    const requirementsPath = path.join(__dirname, '..', 'backend', 'requirements.txt');
    execSync(`"${path.join(pythonEnvDir, 'bin', 'pip')}" install -r "${requirementsPath}"`);
  } else {
    console.error('Unsupported platform. Only Windows and macOS are supported.');
    process.exit(1);
  }

  console.log('Python environment setup complete!');
} catch (error) {
  console.error('Error setting up Python environment:', error);
  process.exit(1);
}
