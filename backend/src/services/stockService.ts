/**
 * Stock Service Module
 * 
 * This module contains the business logic for managing stock items.
 * it handles data retrieval, creation, updates, and the low-stock alerting logic.
 * 
 * Connected to:
 * - src/db.ts: Uses the database module to interact with the SQL database.
 * - src/routes/stockRoutes.ts: Provides methods that the routes call to handle HTTP requests.
 */

import { getDb } from '../db.js';

/**
 * Interface representing a Stock Item in the database.
 */
export interface StockItem {
  id: number;
  name: string;
  designation_code: string;
  ref_number: string;
  quantity: number;
  price_per_unit: number; // Sell Price
  retail_price: number;   // Purchase Price
  producer_id: number | null;
  description: string;
  category: string;
  image_url: string | null;
  low_stock_threshold: number;
  updated_at: string;
}

export interface Producer {
  id: number;
  name: string;
  phone_number: string;
  address: string;
  email: string;
  region: string;
}

export interface StockWithProducer extends StockItem {
  producer_name: string | null;
  producer_region: string | null;
}

export interface StockUpdateInput {
  name?: string;
  designation_code?: string;
  ref_number?: string;
  quantity?: number;
  price_per_unit?: number;
  retail_price?: number;
  producer_id?: number | null;
  description?: string;
  category?: string;
  image_url?: string | null;
  low_stock_threshold?: number;
}

export class StockService {
  private static httpError(message: string, status: number) {
    const err: any = new Error(message);
    err.status = status;
    return err;
  }

  /**
   * Retrieves all stock items with producer details, optionally filtered by category.
   */
  static async getAllStocks(category?: string): Promise<any[]> {
    const db = await getDb();
    const baseQuery = `
      SELECT s.*, p.name as producer_name, p.region as producer_region 
      FROM stocks s
      LEFT JOIN producers p ON s.producer_id = p.id
    `;
    if (category) {
      return db.all(baseQuery + ' WHERE s.category = ?', [category]);
    }
    return db.all(baseQuery);
  }

  static async getStockWithProducerById(id: number): Promise<StockWithProducer | undefined> {
    const db = await getDb();
    return db.get<StockWithProducer>(
      `SELECT s.*, p.name as producer_name, p.region as producer_region
       FROM stocks s
       LEFT JOIN producers p ON s.producer_id = p.id
       WHERE s.id = ?`,
      [id]
    );
  }

  /**
   * Retrieves distinct categories from stocks.
   */
  static async getCategories(): Promise<string[]> {
    const db = await getDb();
    const rows = await db.all<{ category: string }>(
      'SELECT DISTINCT category FROM stocks WHERE category IS NOT NULL ORDER BY category'
    );
    return rows.map(row => row.category);
  }

  /**
   * Retrieves a single stock item by its ID.
   */
  static async getStockById(id: number): Promise<StockItem | undefined> {
    const db = await getDb();
    return db.get<StockItem>('SELECT * FROM stocks WHERE id = ?', [id]);
  }

  /**
   * Adds a new stock item with expanded details.
   */
  static async addStock(
    name: string,
    quantity: number,
    designation_code: string = '',
    ref_number: string = '',
    price_per_unit: number = 0,
    retail_price: number = 0,
    producer_id: number | null = null,
    description: string = '',
    category: string = 'Uncategorised',
    image_url: string | null = null,
    threshold: number = 5
  ): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO stocks (name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, category, image_url, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, category, image_url, threshold]
    );
    return result.lastID!;
  }

  // Producer Management
  static async addProducer(p: Omit<Producer, 'id'>): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO producers (name, phone_number, address, email, region) VALUES (?, ?, ?, ?, ?)',
      [p.name, p.phone_number, p.address, p.email, p.region]
    );
    return result.lastID!;
  }

  static async getAllProducers(): Promise<Producer[]> {
    const db = await getDb();
    return db.all('SELECT * FROM producers ORDER BY name');
  }

  static async getProducerById(id: number): Promise<Producer | undefined> {
    const db = await getDb();
    return db.get<Producer>('SELECT * FROM producers WHERE id = ?', [id]);
  }

  static async updateProducer(id: number, p: Partial<Producer>): Promise<Producer> {
    const db = await getDb();
    const result = await db.run(
      'UPDATE producers SET name = COALESCE(?, name), phone_number = COALESCE(?, phone_number), address = COALESCE(?, address), email = COALESCE(?, email), region = COALESCE(?, region) WHERE id = ?',
      [p.name, p.phone_number, p.address, p.email, p.region, id]
    );

    if (!result.changes) {
      throw this.httpError('Producer not found', 404);
    }

    const updatedProducer = await this.getProducerById(id);
    if (!updatedProducer) {
      throw this.httpError('Producer not found', 404);
    }

    return updatedProducer;
  }

  static async deleteProducer(id: number): Promise<void> {
    const db = await getDb();
    const referencingStock = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM stocks WHERE producer_id = ?',
      [id]
    );

    if ((referencingStock?.count ?? 0) > 0) {
      throw this.httpError('Producer is referenced by existing products', 409);
    }

    const result = await db.run('DELETE FROM producers WHERE id = ?', [id]);
    if (!result.changes) {
      throw this.httpError('Producer not found', 404);
    }
  }

  /**
   * Updates the quantity of an existing stock item.
   * Also triggers a low-stock alert if the new quantity is at or below the threshold.
   */
  static async updateStockQuantity(id: number, quantity: number): Promise<void> {
    const db = await getDb();
    const result = await db.run(
      'UPDATE stocks SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, id]
    );
    if (!result.changes) {
      throw this.httpError('Stock item not found', 404);
    }
    
    // Check for low stock after update
    const item = await this.getStockById(id);
    if (item && item.quantity <= item.low_stock_threshold) {
      this.sendLowStockAlert(item);
    }
  }

  static async updateStock(id: number, updates: StockUpdateInput): Promise<StockWithProducer> {
    const db = await getDb();
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
      throw this.httpError('No fields to update', 400);
    }

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const result = await db.run(
      `UPDATE stocks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...entries.map(([, value]) => value), id]
    );

    if (!result.changes) {
      throw this.httpError('Stock item not found', 404);
    }

    const updatedItem = await this.getStockWithProducerById(id);
    if (!updatedItem) {
      throw this.httpError('Stock item not found', 404);
    }

    if (updatedItem.quantity <= updatedItem.low_stock_threshold) {
      this.sendLowStockAlert(updatedItem);
    }

    return updatedItem;
  }

  /**
   * Deletes a stock item from the database.
   * @param id The ID of the item to delete
   */
  static async deleteStock(id: number): Promise<void> {
    const db = await getDb();
    const result = await db.run('DELETE FROM stocks WHERE id = ?', [id]);
    if (!result.changes) {
      throw this.httpError('Stock item not found', 404);
    }
  }

  /**
   * Updates a stock item's image URL
   * @param id Stock item ID
   * @param imageUrl Cloudinary secure URL
   */
  static async updateStockImage(id: number, imageUrl: string | null): Promise<StockItem> {
    const db = await getDb();
    const result = await db.run(
      'UPDATE stocks SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [imageUrl, id]
    );
    if (!result.changes) {
      throw this.httpError('Stock item not found', 404);
    }
    const updatedItem = await this.getStockById(id);
    if (!updatedItem) {
      throw this.httpError('Stock item not found', 404);
    }
    return updatedItem;
  }

  /**
   * Retrieves all items that are currently at or below their low-stock threshold, with producer details.
   */
  static async getLowStockItems(): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT s.*, p.name as producer_name, p.region as producer_region
      FROM stocks s
      LEFT JOIN producers p ON s.producer_id = p.id
      WHERE s.quantity <= s.low_stock_threshold
    `);
  }

  /**
   * Sends an alert for low stock. 
   * Currently logs to the console, but could be extended to send emails/notifications.
   */
  private static sendLowStockAlert(item: StockItem) {
    // In a real app, this could send an email, Slack notification, or SMS.
    // For this example, we'll log it to the console.
    console.warn(`[ALERT] Low stock for item: ${item.name}. Current quantity: ${item.quantity}, Threshold: ${item.low_stock_threshold}`);
  }
}
