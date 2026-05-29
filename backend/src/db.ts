/**
 * Database Module
 * 
 * This module is responsible for initializing and providing access to the SQLite database.
 * It uses Turso/libSQL via the '@libsql/client' package to handle database operations.
 * 
 * Connected to:
 * - src/index.ts: Called during server startup to initialize the database.
 * - src/services/stockService.ts: Used by the service to perform CRUD operations on stocks.
 */

import { createClient, type Client, type ResultSet } from '@libsql/client';

type StatementArgs = any[];

export interface Db {
  exec: (sql: string) => Promise<void>;
  run: (sql: string, args?: StatementArgs) => Promise<{ lastID: number | undefined; changes: number }>;
  get: <T>(sql: string, args?: StatementArgs) => Promise<T | undefined>;
  all: <T>(sql: string, args?: StatementArgs) => Promise<T[]>;
  transaction: <T>(fn: (tx: Db) => Promise<T>) => Promise<T>;
}

let client: Client | null = null;
let db: Db | null = null;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

const resultToRun = (result: ResultSet) => ({
  lastID: toNumber((result as any).lastInsertRowid),
  changes: toNumber((result as any).rowsAffected) ?? 0
});

const createDbWrapper = (executor: { execute: Client['execute'] }): Db => ({
  exec: async (sql: string) => {
    await executor.execute(sql);
  },
  run: async (sql: string, args: StatementArgs = []) => {
    const result = await executor.execute({ sql, args: args as any });
    return resultToRun(result);
  },
  get: async <T>(sql: string, args: StatementArgs = []) => {
    const result = await executor.execute({ sql, args: args as any });
    return (result.rows[0] as T | undefined) ?? undefined;
  },
  all: async <T>(sql: string, args: StatementArgs = []) => {
    const result = await executor.execute({ sql, args: args as any });
    return result.rows as unknown as T[];
  },
  transaction: async <T>(fn: (tx: Db) => Promise<T>) => {
    if (!client) {
      throw new Error('Database client not initialized');
    }
    const tx: any = await client.transaction('write');
    const txDb = createDbWrapper(tx as { execute: Client['execute'] });
    try {
      const value = await fn(txDb);
      await tx.commit();
      return value;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
});

/**
 * Initializes and returns the database connection.
 * If the database file doesn't exist, it creates it and sets up the 'stocks' table.
 */
export async function getDb(): Promise<Db> {
  if (db) return db;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables');
  }

  client = createClient({ url, authToken });
  db = createDbWrapper(client);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS producers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone_number TEXT,
      address TEXT,
      email TEXT,
      region TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone_number TEXT,
      address TEXT,
      email TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      designation_code TEXT,
      ref_number TEXT,
      quantity INTEGER DEFAULT 0,
      price_per_unit REAL DEFAULT 0,
      retail_price REAL DEFAULT 0,
      producer_id INTEGER,
      description TEXT,
      low_stock_threshold INTEGER DEFAULT 5,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producer_id) REFERENCES producers(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      location TEXT,
      bill_price REAL,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      shipment_date DATETIME,
      status TEXT DEFAULT 'Pending',
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      stock_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (stock_id) REFERENCES stocks(id)
    )
  `);

  // Migration logic to ensure existing 'stocks' table is updated if necessary
  const tableInfo = await db.all<{ name: string }>("PRAGMA table_info(stocks)");
  const columnNames = tableInfo.map(c => c.name);
  
  if (!columnNames.includes('retail_price')) {
    await db.exec("ALTER TABLE stocks ADD COLUMN retail_price REAL DEFAULT 0");
  }
  if (!columnNames.includes('producer_id')) {
    await db.exec("ALTER TABLE stocks ADD COLUMN producer_id INTEGER REFERENCES producers(id)");
  }

  return db;
}
