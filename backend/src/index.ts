/**
 * Main Entry Point
 * 
 * This file initializes the Express application, sets up middleware,
 * mounts routes, and starts the server. It also ensures the database
 * is initialized before the server begins listening for requests.
 * 
 * Connected to:
 * - src/db.ts: Calls getDb() to initialize the SQLite database.
 * - src/routes/stockRoutes.ts: Mounts stock-related API endpoints.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stockRoutes from './routes/stockRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { getDb } from './db.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);

/**
 * Starts the application server.
 */
async function startServer() {
  try {
    // Initialize Database
    await getDb();
    console.log('Database initialized');

    // Start listening for requests
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
