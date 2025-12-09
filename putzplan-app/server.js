import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 5175; // Backend auf 5175, Frontend auf 5174
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'putzplan-data.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'putzplan-settings.json');

// WAHA API Configuration
const WAHA_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiKey: '96ee37b1f3424e819e7a20dcfe0f6fee',
  dockerComposeFile: path.join(__dirname, '..', 'docker-compose.yml')
};

// Middleware
app.use(express.json({ limit: '10mb' }));

// WAHA API Management Functions

/**
 * Prüft ob WAHA API erreichbar ist
 */
async function checkWahaStatus() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/sessions',
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ WAHA API ist erreichbar');
        resolve(true);
      } else {
        console.log('❌ WAHA API antwortet nicht korrekt:', res.statusCode);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log('❌ WAHA API ist nicht erreichbar:', error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ WAHA API Timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Startet WAHA API via Docker Compose
 */
async function startWahaAPI() {
  try {
    console.log('🚀 Starte WAHA API via Docker Compose...');
    
    // Change to parent directory where docker-compose.yml is located
    const parentDir = path.join(__dirname, '..');
    
    const { stdout, stderr } = await execAsync('docker-compose up -d waha', {
      cwd: parentDir,
      timeout: 30000 // 30 second timeout
    });
    
    if (stderr && !stderr.includes('Creating') && !stderr.includes('Starting')) {
      console.warn('⚠️ Docker Compose Warnung:', stderr);
    }
    
    console.log('✅ WAHA Docker Container gestartet');
    console.log('Docker Output:', stdout);
    
    // Wait a bit for the service to start
    console.log('⏳ Warte 10 Sekunden bis WAHA hochgefahren ist...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Starten von WAHA:', error.message);
    
    // Fallback: Check if Docker is available
    try {
      await execAsync('docker --version');
      console.log('💡 Docker ist verfügbar. Bitte manuell starten: docker-compose up -d waha');
    } catch (dockerError) {
      console.log('❌ Docker ist nicht verfügbar. WAHA muss manuell gestartet werden.');
    }
    
    return false;
  }
}

/**
 * Stellt sicher dass WAHA API läuft (prüfen + starten falls nötig)
 */
async function ensureWahaRunning() {
  console.log('🔍 Prüfe WAHA Status...');
  
  const isRunning = await checkWahaStatus();
  if (isRunning) {
    console.log('✅ WAHA läuft bereits');
    return true;
  }
  
  console.log('🚀 WAHA läuft nicht, versuche zu starten...');
  try {
    const started = await startWahaAPI();
    
    if (started) {
      // Verify it's actually running
      const isRunningNow = await checkWahaStatus();
      if (isRunningNow) {
        console.log('✅ WAHA erfolgreich gestartet');
        return true;
      } else {
        console.log('❌ WAHA Start fehlgeschlagen - nicht erreichbar');
        return false;
      }
    }
  } catch (error) {
    console.log('⚠️ WAHA konnte nicht gestartet werden:', error.message);
    console.log('💡 Server läuft weiter ohne WhatsApp Integration');
    return false;
  }
  
  return false;
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    console.log(`📁 Checking data directory: ${DATA_DIR}`);
    await fs.access(DATA_DIR);
    console.log(`✅ Data directory exists`);
  } catch {
    console.log(`📁 Creating data directory: ${DATA_DIR}`);
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`✅ Data directory created`);
  }
}

// Initialize data files if they don't exist
async function initializeDataFiles() {
  console.log(`📄 Checking data files...`);
  try {
    await fs.access(DATA_FILE);
    console.log(`✅ Data file exists: ${DATA_FILE}`);
  } catch {
    console.log(`📄 Creating initial data file: ${DATA_FILE}`);
    const initialData = {
      version: '1.0',
      state: {
        currentUser: null,
        currentWG: null,
        wgs: {},
        users: {},
        tasks: {},
        executions: {},
        ratings: {},
        notifications: {},
        monthlyStats: {},
        taskSuggestions: [],
        isLoading: false,
        lastSyncAt: undefined,
        absences: {},
        temporaryResidents: {},
        postExecutionRatings: {},
        currentPeriod: undefined,
        debugMode: false
      },
      savedAt: new Date().toISOString()
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    console.log(`✅ Initial data file created`);
  }

  try {
    await fs.access(SETTINGS_FILE);
    console.log(`✅ Settings file exists: ${SETTINGS_FILE}`);
  } catch {
    console.log(`📄 Creating initial settings file: ${SETTINGS_FILE}`);
    const initialSettings = {
      theme: 'auto',
      notifications: true,
      language: 'de',
      dashboardWidth: 'normal'
    };
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(initialSettings, null, 2));
    console.log(`✅ Initial settings file created`);
  }
}

// API Routes

// WAHA API Management Routes
app.get('/api/waha/status', async (req, res) => {
  try {
    const isRunning = await checkWahaStatus();
    res.json({ running: isRunning, message: isRunning ? 'WAHA ist verfügbar' : 'WAHA ist nicht erreichbar' });
  } catch (error) {
    res.status(500).json({ running: false, error: error.message });
  }
});

app.post('/api/waha/start', async (req, res) => {
  try {
    const started = await ensureWahaRunning();
    if (started) {
      res.json({ success: true, message: 'WAHA erfolgreich gestartet' });
    } else {
      res.status(500).json({ success: false, message: 'WAHA konnte nicht gestartet werden' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/waha/ensure', async (req, res) => {
  try {
    const running = await ensureWahaRunning();
    res.json({ 
      success: running, 
      message: running ? 'WAHA läuft' : 'WAHA konnte nicht gestartet werden' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get app data
app.get('/api/data', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Save app data
app.post('/api/data', async (req, res) => {
  try {
    const dataToSave = {
      version: '1.0',
      state: req.body,
      savedAt: new Date().toISOString()
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(dataToSave, null, 2));
    res.json({ success: true, savedAt: dataToSave.savedAt });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await fs.readFile(SETTINGS_FILE, 'utf8');
    res.json(JSON.parse(settings));
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Save settings
app.post('/api/settings', async (req, res) => {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Spezifische statische Asset-Behandlung mit korrekten MIME-Types
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.mjs')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Andere statische Dateien (ohne /assets prefix)
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.mjs')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Serve React app nur für HTML-Requests (nicht für Assets)
app.get('*', (req, res, next) => {
  // Prüfe ob es eine Asset-Anfrage ist
  if (req.path.startsWith('/assets/') || 
      req.path.endsWith('.js') || 
      req.path.endsWith('.css') || 
      req.path.endsWith('.map') ||
      req.path.endsWith('.svg') ||
      req.path.endsWith('.ico')) {
    // Diese werden bereits von den static middlewares oben behandelt
    return res.status(404).send('Asset not found');
  }
  
  // Nur für HTML-Seiten: Serve React app
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
async function startServer() {
  try {
    await ensureDataDir();
    await initializeDataFiles();
    
    // Auto-start WAHA API (graceful failure if Docker not available)
    console.log('🔄 WAHA Status wird überprüft...');
    try {
      const wahaRunning = await checkWahaStatus();
      if (wahaRunning) {
        console.log('✅ WAHA läuft bereits');
      } else {
        console.log('⚠️ WAHA nicht verfügbar, aber Server läuft weiter');
      }
    } catch (error) {
      console.log('⚠️ WAHA Check fehlgeschlagen, Server läuft weiter ohne WhatsApp');
    }
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Putzplan Server running on http://0.0.0.0:${PORT}`);
      console.log(`📁 Data stored in: ${DATA_DIR}`);
      console.log(`🌐 Access from network: http://[PI-IP]:${PORT}`);
      console.log(`🔗 WAHA API: ${WAHA_CONFIG.baseUrl}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n📴 Shutting down server...');
      server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(console.error);