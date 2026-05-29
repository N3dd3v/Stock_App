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

export interface Client {
  id: number;
  name: string;
  phone_number: string;
  address: string;
  email: string;
}

export interface Order {
  id: number;
  client_id: number;
  location: string;
  bill_price: number;
  order_date: string;
  shipment_date: string;
  status: string;
}

export interface OrderItemInput {
  stock_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateOrderInput {
  client_id: number;
  location: string;
  bill_price: number;
  shipment_date: string | null;
  status: string;
  items: OrderItemInput[];
}

export class StockService {
  private static httpError(message: string, status: number) {
    const err: any = new Error(message);
    err.status = status;
    return err;
  }

  /**
   * Retrieves all stock items with producer details.
   */
  static async getAllStocks(): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT s.*, p.name as producer_name, p.region as producer_region 
      FROM stocks s
      LEFT JOIN producers p ON s.producer_id = p.id
    `);
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
    threshold: number = 5
  ): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO stocks (name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, threshold]
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
    return db.all('SELECT * FROM producers');
  }

  static async updateProducer(id: number, p: Partial<Producer>): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE producers SET name = COALESCE(?, name), phone_number = COALESCE(?, phone_number), address = COALESCE(?, address), email = COALESCE(?, email), region = COALESCE(?, region) WHERE id = ?',
      [p.name, p.phone_number, p.address, p.email, p.region, id]
    );
  }

  static async deleteProducer(id: number): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM producers WHERE id = ?', [id]);
  }

  // Client Management
  static async addClient(c: Omit<Client, 'id'>): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO clients (name, phone_number, address, email) VALUES (?, ?, ?, ?)',
      [c.name, c.phone_number, c.address, c.email]
    );
    return result.lastID!;
  }

  static async getAllClients(): Promise<Client[]> {
    const db = await getDb();
    return db.all('SELECT * FROM clients');
  }

  static async updateClient(id: number, c: Partial<Client>): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE clients SET name = COALESCE(?, name), phone_number = COALESCE(?, phone_number), address = COALESCE(?, address), email = COALESCE(?, email) WHERE id = ?',
      [c.name, c.phone_number, c.address, c.email, id]
    );
  }

  static async deleteClient(id: number): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM clients WHERE id = ?', [id]);
  }


  // Order Management
  static async createOrder(o: CreateOrderInput): Promise<number> {
    const db = await getDb();
    return db.transaction(async (tx) => {
      if (!o.items || !Array.isArray(o.items) || o.items.length === 0) {
        throw this.httpError('Order items are required', 400);
      }

      for (const item of o.items) {
        const stockId = Number(item?.stock_id);
        const qty = Number(item?.quantity);
        if (!Number.isFinite(stockId) || stockId <= 0) {
          throw this.httpError('Invalid stock_id in order items', 400);
        }
        if (!Number.isFinite(qty) || qty <= 0) {
          throw this.httpError('Invalid quantity in order items', 400);
        }

        const stock = await tx.get<{ quantity: number }>(
          'SELECT quantity FROM stocks WHERE id = ?',
          [stockId]
        );
        if (!stock) {
          throw this.httpError(`Stock item not found: ${stockId}`, 400);
        }
        if (stock.quantity < qty) {
          throw this.httpError(`Insufficient stock for item ${stockId}`, 400);
        }
      }

      const result = await tx.run(
        'INSERT INTO orders (client_id, location, bill_price, shipment_date, status) VALUES (?, ?, ?, ?, ?)',
        [o.client_id, o.location, o.bill_price, o.shipment_date, o.status]
      );
      const orderId = result.lastID!;

      for (const item of o.items) {
        const stockId = Number(item.stock_id);
        const qty = Number(item.quantity);
        const unitPrice = Number(item.unit_price);

        await tx.run(
          'INSERT INTO order_items (order_id, stock_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [orderId, stockId, qty, unitPrice]
        );

        const updateResult = await tx.run(
          'UPDATE stocks SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
          [qty, stockId, qty]
        );
        if (!updateResult.changes) {
          throw this.httpError(`Insufficient stock for item ${stockId}`, 400);
        }
      }

      return orderId;
    });
  }


  static async getAllOrders(): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT o.*, c.name as client_name 
      FROM orders o
      JOIN clients c ON o.client_id = c.id
    `);
  }

  static async updateOrderStatus(id: number, status: string): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
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
   * Retrieves all items that are currently at or below their low-stock threshold.
   */
  static async getLowStockItems(): Promise<StockItem[]> {
    const db = await getDb();
    return db.all<StockItem>(
      'SELECT * FROM stocks WHERE quantity <= low_stock_threshold'
    );
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
