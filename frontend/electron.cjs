// electron.js
const { app, BrowserWindow, Menu, nativeImage, globalShortcut, dialog } = require('electron');
const path = require('path');
const prompt = require('electron-prompt');
const { spawn } = require('child_process');
const fs = require('fs');

const base32         = require('hi-base32');
const crypto         = require('crypto');
const { machineIdSync } = require('node-machine-id');

// Locațiile unde păstrăm tokenul (3 copii)
const TOKEN_PATHS = [
  path.join(app.getPath('userData'), 'license.dat'),
  path.join(process.env.APPDATA,       'PairadoxAI', 'license.dat'),
  path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'PairadoxAI', 'license.dat')
];

// Cheia publică (Ed25519 raw, 32 B) e inclusă în resources/public
const PUB_KEY = fs.readFileSync(
  app.isPackaged
    ? path.join(process.resourcesPath, 'public', 'key.pub')
    : path.join(__dirname, 'public',    'key.pub')
);

// Load icon path
const iconPath = app.isPackaged
  // Când rulezi exe-ul instalat ->  ...\resources\public\icon.ico
  ? path.join(process.resourcesPath, 'public', 'icon.ico')
  // npm run electron:dev         ->  ...\frontend\public\icon.ico
  : path.join(__dirname, 'public', 'icon.ico');

// Set app icon and app id for Windows taskbar
if (process.platform === 'win32') {
  // Set the app user model id to match the one in the package.json
  app.setAppUserModelId("com.pairadox.ai");

  // Set the app icon for the taskbar
  app.setName("Pairadox.AI");
  if (fs.existsSync(iconPath)) {
    try {
      // Set application icon
      const icon = nativeImage.createFromPath(iconPath);
    } catch (e) {
      console.error("Error setting app icon:", e);
    }
  }
}

async function main () {
  await ensureLicense();   // 1️⃣ cere / validează cheia
  createWindow();          // 2️⃣ deschide UI
  startPythonServer();     // 3️⃣ pornește backend-ul
}

app.whenReady().then(main);

let mainWindow;
let pyProc = null;

function killBackend() {
  if (pyProc && !pyProc.killed) {
    try { process.platform === "win32" ? spawn("taskkill", ["/pid", pyProc.pid, "/f", "/t"]) : pyProc.kill("SIGTERM"); }
    catch (_) {}
    pyProc = null;
  }
}

app.on("before-quit", killBackend);
app.on("window-all-closed", () => {
  killBackend();
  if (process.platform !== "darwin") app.quit();
});

function readTokenCopies() {
  return TOKEN_PATHS
    .filter(p => fs.existsSync(p))
    .map(p => fs.readFileSync(p, 'utf8').trim());
}

function writeTokenCopies(tok) {
  TOKEN_PATHS.forEach(p => {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, tok, 'utf8');
  });
}

// cele 3 copii trebuie să arate la fel; returnează „majoritatea”
function mostCommon(arr) {
  const freq = {};
  arr.forEach(x => freq[x] = (freq[x] || 0) + 1);
  return Object.keys(freq).sort((a,b)=>freq[b]-freq[a])[0];
}

function verifyKey(raw) {
  if (!raw.startsWith('PAIRADOX-')) throw 'Format incorect';
  const b32 = raw.slice(9).replace(/[^A-Z2-7]/gi,'');
  const buf = Buffer.from(base32.decode.asBytes(b32));

  const sigLen = 64;                 // Ed25519 (64 bytes sig)
  const payload = buf.slice(0, -sigLen);
  const sig     = buf.slice(-sigLen);

  // cheia publică raw → creată ca obiect CryptoKey
  const keyObj = crypto.createPublicKey({
      key:  Buffer.concat([
              Buffer.from('302a300506032b6570032100','hex'), // header SPKI Ed25519
              PUB_KEY
            ]),
      format: 'der',
      type:   'spki'
    });
  const ok = crypto.verify(null, payload, keyObj, sig);
  if (!ok) throw 'Semnătură invalidă';

  const data = JSON.parse(payload.toString());
  const now  = Math.floor(Date.now()/1000);

  if (data.exp && now > data.exp)        throw 'Licență expirată';
  if (data.hw) {
    const hwId = crypto.createHash('sha256')
                 .update(machineIdSync({original:true})).digest('hex');
    if (hwId !== data.hw)               throw 'Licență pentru alt PC';
  }
  return data;      // validă!
}

async function ensureLicense() {
  // 1️⃣  avem deja un token?
  const copies = readTokenCopies();
  if (copies.length) {
    const token = mostCommon(copies);
    try {
      verifyKey(token);               // anulăm daca expirat
      writeTokenCopies(token);        // sincronizează copii
      return;                         // OK!
    } catch (e) { /* continuăm spre dialog */ }
  }

  // 2️⃣  cerem cheie de la utilizator
  while (true) {
        const key = await prompt({
          title: 'Activare Pairadox.AI',
          label: 'Cheia începe cu PAIRADOX-',
          inputAttrs: { type:'text' },
          type: 'input'
        });
       if (key === null) app.quit();     // pentru InputBox
    try {
      verifyKey(key.trim());
      writeTokenCopies(key.trim());
      break;                                // succes
    } catch (e) {
      dialog.showErrorBox('Cheie invalidă', e.toString());
    }
  }
}

// Start Python backend
function startPythonServer() {
  // Check if running from packed app or development
  const appPath = app.getAppPath();
  const isPacked = app.isPackaged;

  let scriptPath;
  if (isPacked) {
    // In packaged app, Python files are in resources/app.asar/backend
    scriptPath = path.join(process.resourcesPath, 'backend');
  } else {
    // In development, use relative path
    scriptPath = path.join(appPath, '..', 'backend');
  }

  // Create data directory if it doesn't exist
  const userDataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(userDataDir, { recursive: true });

  // Select correct Python executable based on platform and packaging
  let pythonExecutable;
  if (isPacked) {
    // In packaged app, Python is bundled with the app
    pythonExecutable = process.platform === 'win32' ? 'python/python.exe' : 'python/bin/python';
    pythonExecutable = path.join(process.resourcesPath, pythonExecutable);
  } else {
    // In development, use system Python
    pythonExecutable = process.platform === 'win32'
        ? path.join(__dirname, 'python-env', 'python.exe')
        : path.join(__dirname, 'python-env', 'bin', 'python3');

  }

  const scriptFile = path.join(scriptPath, 'main.py');

  // Arguments for uvicorn
  const args = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'];

  // Options for spawn
  const options = {
    cwd: scriptPath,
    stdio: 'pipe'
  };

  if (!fs.existsSync(pythonExecutable)) {
    console.error('Python exe NOT found at:', pythonExecutable);
  }
  if (!fs.existsSync(path.join(scriptPath, 'main.py'))) {
    console.error('main.py NOT found at:', path.join(scriptPath, 'main.py'));
  }

  console.log('Starting Python server with:', pythonExecutable, args.join(' '));

  const env = {
    ...process.env,
    PYTHONHOME: isPacked
        ? path.join(process.resourcesPath, 'python')
        : path.join(__dirname, 'python-env'),
    PYTHONPATH: isPacked
        ? path.join(process.resourcesPath, 'python', 'Lib')
        : path.join(__dirname, 'python-env', 'Lib'),
    DATA_DIR: userDataDir
  };

  pyProc = spawn(pythonExecutable, args, {
    cwd: scriptPath,
    env,
    stdio: 'pipe'
  });

  // Log stdout and stderr from Python process
  pyProc.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data}`);
  });

  pyProc.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });

  pyProc.on('error', (err) => {
    console.error('Failed to start Python process:', err);
  });

  pyProc.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    pyProc = null;
  });
}

function createWindow() {
  // Create icon from the path
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Keep the frame but hide the menu
    frame: true,
    // Use default titlebar
    titleBarStyle: 'default',
    titleBarOverlay: false,
  });

  // Remove the menu bar completely
  Menu.setApplicationMenu(null);

  globalShortcut.register('F12', () =>
         mainWindow.webContents.openDevTools({ mode: 'detach' }));
     globalShortcut.register('CommandOrControl+Shift+I', () =>
         mainWindow.webContents.openDevTools({ mode: 'detach' }));

  // Wait a bit for the server to start before loading the frontend
  setTimeout(() => {
    // In production, serve built React
    mainWindow.loadFile(
      path.join(__dirname, 'dist', 'index.html'),
      { hash: '/' }
    );

    mainWindow.on('closed', () => {
      mainWindow = null;
      // Kill Python process when window is closed
      if (pyProc) {
        pyProc.kill();
        pyProc = null;
      }
    });

    // Only open DevTools in development
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }, 1000);
}

app.on('window-all-closed', () => {
  // Kill Python process when app is closed
  if (pyProc) {
    pyProc.kill();
    pyProc = null;
  }

  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
