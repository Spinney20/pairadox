// startup-checker.cjs
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { app } = require('electron');

/**
 * Performs pre-flight checks before starting the Python backend
 * @param {boolean} isPacked - Whether the app is in production mode
 * @returns {Promise<object>} - Result of checks
 */
async function performStartupChecks(isPacked) {
  const checks = {
    pythonExists: false,
    backendFilesExist: false,
    canStartBackend: false,
    errorDetails: null
  };

  try {
    // Determine paths based on environment
    const resourcesPath = isPacked ? process.resourcesPath : path.join(__dirname, '..');
    const pythonPath = isPacked
      ? path.join(resourcesPath, 'python', 'python.exe')
      : 'python';
    const backendPath = path.join(resourcesPath, 'backend');
    const mainPyPath = path.join(backendPath, 'main.py');

    // Check if Python is available
    if (isPacked) {
      checks.pythonExists = fs.existsSync(pythonPath);
      console.log(`Python executable exists: ${checks.pythonExists}`, pythonPath);

      // Alternative paths
      if (!checks.pythonExists) {
        const altPythonPath = path.join(resourcesPath, 'python-env', 'python.exe');
        if (fs.existsSync(altPythonPath)) {
          console.log(`Alternative Python found at: ${altPythonPath}`);
          checks.pythonExists = true;
        }
      }
    } else {
      // In development, check if Python is in PATH
      try {
        await new Promise((resolve, reject) => {
          exec('python --version', (err, stdout) => {
            if (err) reject(err);
            else resolve(stdout);
          });
        });
        checks.pythonExists = true;
      } catch (err) {
        console.error('Python not found in PATH:', err);
        checks.pythonExists = false;
      }
    }

    // Check if backend files exist
    checks.backendFilesExist = fs.existsSync(mainPyPath);
    console.log(`Backend main.py exists: ${checks.backendFilesExist}`, mainPyPath);

    if (fs.existsSync(backendPath)) {
      // List all files in backend directory for diagnostics
      console.log('Backend directory contents:');
      fs.readdirSync(backendPath).forEach(file => {
        console.log(`- ${file}`);
      });
    }

    // Check requirements.txt for diagnostics
    const reqPath = path.join(backendPath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      console.log('Requirements file exists:', reqPath);
      const requirements = fs.readFileSync(reqPath, 'utf8');
      console.log('Requirements contents:', requirements);
    } else {
      console.log('Requirements file not found:', reqPath);
    }

    // Check data directory
    const dataPath = path.join(backendPath, 'data');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
      console.log('Created data directory:', dataPath);
    } else {
      console.log('Data directory exists:', dataPath);
      // List data directory contents
      if (fs.readdirSync(dataPath).length > 0) {
        console.log('Data directory contents:');
        fs.readdirSync(dataPath).forEach(file => {
          console.log(`- ${file}`);
        });
      } else {
        console.log('Data directory is empty');
      }
    }

    checks.canStartBackend = checks.pythonExists && checks.backendFilesExist;
  } catch (error) {
    console.error('Error during startup checks:', error);
    checks.errorDetails = error.toString();
  }

  return checks;
}

/**
 * Checks if the backend server is responding
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<boolean>} - Whether the server is up
 */
async function isBackendUp(timeoutMs = 1000, maxRetries = 10) {
  return new Promise(resolve => {
    let retries = 0;
    const checkServer = () => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 8000,
        path: '/nomenclature-info',
        method: 'GET',
        timeout: timeoutMs
      }, res => {
        if (res.statusCode === 200) {
          console.log('Backend server is up!');
          resolve(true);
        } else {
          retry();
        }
      });

      req.on('error', err => {
        console.log(`Backend check attempt ${retries + 1}/${maxRetries} failed:`, err.message);
        retry();
      });

      req.on('timeout', () => {
        req.destroy();
        console.log(`Backend check attempt ${retries + 1}/${maxRetries} timed out`);
        retry();
      });

      req.end();

      function retry() {
        retries++;
        if (retries < maxRetries) {
          setTimeout(checkServer, 1000);
        } else {
          console.log('Backend is not responding after maximum retries');
          resolve(false);
        }
      }
    };

    checkServer();
  });
}

module.exports = {
  performStartupChecks,
  isBackendUp
};
