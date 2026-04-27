const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');

// Initialize the settings store
const store = new Store();

// Keep a global reference of the window object
let mainWindow;
let pythonProcess = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
    }
  });
}

// Start the Python backend server
function startPythonBackend() {
  const pythonScriptPath = path.join(__dirname, '..', 'python-backend', 'server.py');
  
  // Check if we're in development or production
  const pythonExecutable = process.argv.includes('--dev') 
    ? path.join(__dirname, '..', 'python-backend', 'venv', 'bin', 'python')
    : path.join(process.resourcesPath, 'python-backend', 'venv', 'bin', 'python');
  
  // Start the Python process
  pythonProcess = spawn(pythonExecutable, [pythonScriptPath]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    pythonProcess = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  startPythonBackend();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (pythonProcess) {
      pythonProcess.kill();
    }
    app.quit();
  }
});

// IPC handlers for file operations
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-audio-files', async (event, directoryPath) => {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
  const files = [];
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        scanDirectory(itemPath);
      } else if (stats.isFile()) {
        const ext = path.extname(itemPath).toLowerCase();
        if (audioExtensions.includes(ext)) {
          files.push({
            path: itemPath,
            name: path.basename(itemPath),
            size: stats.size,
            extension: ext,
            directory: path.dirname(itemPath)
          });
        }
      }
    }
  }
  
  try {
    scanDirectory(directoryPath);
    return files;
  } catch (error) {
    console.error('Error scanning directory:', error);
    return [];
  }
});

// Save and load user settings
ipcMain.handle('save-settings', (event, settings) => {
  Object.entries(settings).forEach(([key, value]) => {
    store.set(key, value);
  });
  return true;
});

ipcMain.handle('load-settings', () => {
  return store.store;
}); 