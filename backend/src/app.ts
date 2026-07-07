/**
 * Express App Factory
 *
 * Builds the configured Express application without starting the server.
 * This allows runtime entrypoints and tests to share the same app setup.
 */

import express from 'express';
import cors from 'cors';
import stockRoutes from './routes/stockRoutes.js';
import authRoutes from './routes/authRoutes.js';

export function createApp() {
  const app = express();

  const allowedOrigins = ['https://stockappdemo.netlify.app', 'http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
    }),
  );
  app.use(express.json()); // Parse JSON request bodies

  app.use('/api/auth', authRoutes);
  app.use('/api/stocks', stockRoutes);

  return app;
}
