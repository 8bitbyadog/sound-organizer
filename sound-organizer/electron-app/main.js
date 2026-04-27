const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');
const http = require('http');

// Initialize the settings store
const store = new Store();

// Keep a global reference of the window object
let mainWindow;
let pythonProcess = null;
let pythonServerReady = false;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
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
    
    // Check if server is running
    if (data.toString().includes('Running on')) {
      pythonServerReady = true;
      console.log('Python server is ready');
    }
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    pythonProcess = null;
    pythonServerReady = false;
  });
  
  // Wait for server to be ready
  waitForServerReady();
}

// Check if the Python server is ready
function waitForServerReady() {
  const checkInterval = setInterval(() => {
    if (pythonServerReady) {
      clearInterval(checkInterval);
      return;
    }
    
    // Try to connect to the server
    const req = http.request({
      host: '127.0.0.1',
      port: 5000,
      path: '/health',
      method: 'GET'
    }, (res) => {
      if (res.statusCode === 200) {
        pythonServerReady = true;
        console.log('Python server is ready');
        clearInterval(checkInterval);
      }
    });
    
    req.on('error', (err) => {
      console.log('Server not ready yet:', err.message);
    });
    
    req.end();
  }, 1000);
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

// Analyze audio file
ipcMain.handle('analyze-audio', async (event, filePath, options) => {
  if (!pythonServerReady) {
    throw new Error('Python server is not ready');
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      file_path: filePath,
      options: options
    });
    
    const req = http.request({
      host: '127.0.0.1',
      port: 5000,
      path: '/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const results = JSON.parse(responseData);
            resolve(results);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`Server returned status code ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.write(data);
    req.end();
  });
});

// Rename file
ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  return new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
});

// Batch process files
ipcMain.handle('batch-process', async (event, files, options) => {
  const results = [];
  
  for (const file of files) {
    try {
      const analysisResult = await ipcMain.handle('analyze-audio', event, file.path, options);
      
      if (options.rename && options.pattern) {
        const newName = generateFileName(file, options.pattern, analysisResult);
        const dirPath = path.dirname(file.path);
        const newPath = path.join(dirPath, newName);
        
        await ipcMain.handle('rename-file', event, file.path, newPath);
        
        results.push({
          path: newPath,
          name: newName,
          metadata: analysisResult,
          success: true
        });
      } else {
        results.push({
          path: file.path,
          name: file.name,
          metadata: analysisResult,
          success: true
        });
      }
    } catch (error) {
      results.push({
        path: file.path,
        name: file.name,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
});

// Generate file name based on pattern and metadata
function generateFileName(file, pattern, metadata) {
  const ext = path.extname(file.path);
  const name = path.basename(file.path, ext);
  
  let newName = pattern
    .replace('[Category]', metadata.instrument || 'unknown')
    .replace('[Instrument]', metadata.instrument || 'unknown')
    .replace('[Key]', metadata.key || 'unknown')
    .replace('[BPM]', metadata.bpm || 'unknown')
    .replace('[Name]', name)
    .replace('[Date]', new Date().toISOString().split('T')[0]);
  
  return newName + ext;
}

// Export tag database
ipcMain.handle('export-tag-database', async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Tag Database',
    defaultPath: 'sound-organizer-tags.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    return new Promise((resolve, reject) => {
      fs.writeFile(result.filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  return false;
});

// Import tag database
ipcMain.handle('import-tag-database', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Tag Database',
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ],
    properties: ['openFile']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return new Promise((resolve, reject) => {
      fs.readFile(result.filePaths[0], 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (parseError) {
            reject(new Error('Invalid JSON file'));
          }
        }
      });
    });
  }
  
  return null;
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