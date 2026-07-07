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

// Must be first import to load .env before other imports access process.env
import 'dotenv/config';
import { createApp } from './app.js';
import { getDb } from './db.js';

const app = createApp();
const PORT = process.env.PORT || 3000;

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
