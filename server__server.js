// Production Express Server for Magizh Shopping + B5 Coin
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './server__db.js';
import { apiRouter } from './server__api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Magizh Shopping & B5 Coin Ecosystem Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: 'connected',
    version: '1.0.0',
  });
});

// Mount API router
app.use('/api', apiRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Start Server
async function start() {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Magizh Server] Backend listening on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[Magizh Server] Failed to start server:', err);
    process.exit(1);
  }
}

// Only start when invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}

export default app;
