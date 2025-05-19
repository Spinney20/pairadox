// dev.cjs - Script pentru a rula aplicația în mod de dezvoltare cu setări speciale pentru icon
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verifică existența icon-ului
const iconPath = path.join(__dirname, 'public', 'icon.ico');
if (!fs.existsSync(iconPath)) {
  console.error(`Icon not found at path: ${iconPath}`);
  process.exit(1);
}

// Setează variabile de mediu pentru a forța Electron să folosească icon-ul
process.env.ELECTRON_FORCE_WINDOW_MENU_BAR = 'true';
process.env.ELECTRON_APP_ICON = iconPath;

// Rulează Electron cu iconPath ca argument explicit
const args = [
  '--icon=' + iconPath,
  '--app-user-model-id=com.pairadox.ai',
  'electron.cjs'
];

console.log('Starting Electron with icon:', iconPath);
const electron = spawn('electron', args, {
  stdio: 'inherit',
  shell: true
});

electron.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});
