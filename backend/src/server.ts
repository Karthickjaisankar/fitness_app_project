import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.startsWith('/assets')) {
      console.log(`[${req.method}] ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRouter);

// Serve Frontend Static Assets
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Fallback for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log('=====================================================');
  console.log(`⚡ Fitness App Engine running on http://localhost:${PORT}`);
  console.log(`📡 Strava Webhook Endpoint: http://localhost:${PORT}/api/webhooks/strava`);
  console.log(`📱 HealthKit / Health Connect Sync: http://localhost:${PORT}/api/activities/healthkit-sync`);
  console.log(`🏃 Normalized Event Calendar API: http://localhost:${PORT}/api/events`);
  console.log(`💎 Reward Ledger API: http://localhost:${PORT}/api/ledger`);
  console.log('=====================================================');
});

export default app;
