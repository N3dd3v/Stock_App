/**
 * Stock Routes Module
 * 
 * This module defines the Express API routes for stock management.
 * It maps HTTP requests to the appropriate methods in the StockService.
 * 
 * Connected to:
 * - src/index.ts: Mounted under the '/api/stocks' path.
 * - src/services/stockService.ts: Calls the service to perform operations.
 */

import { Router, Request, Response } from 'express';
import { StockService } from '../services/stockService.js';

const router = Router();

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const isOptionalNumber = (value: unknown): value is number | undefined =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value));

const parsePositiveInt = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const parsePositiveNumber = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const allowedOrderStatuses = new Set(['Pending', 'Shipped', 'Delivered', 'Cancelled']);

/**
 * GET /api/stocks
 * Returns a list of all stock items.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const stocks = await StockService.getAllStocks();
    res.json(stocks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stocks
 * Creates a new stock item.
 * Body: { name: string, quantity: number, designation_code?: string, ref_number?: string, price_per_unit?: number, retail_price?: number, producer_id?: number, description?: string, threshold?: number }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, threshold } = req.body;
    if (!isNonEmptyString(name) || quantity === undefined) {
      return res.status(400).json({ error: 'Name and quantity are required' });
    }
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a valid number' });
    }
    if (!isOptionalString(designation_code) || !isOptionalString(ref_number) || !isOptionalString(description)) {
      return res.status(400).json({ error: 'Invalid text fields' });
    }
    if (!isOptionalNumber(price_per_unit) || !isOptionalNumber(retail_price) || !isOptionalNumber(threshold)) {
      return res.status(400).json({ error: 'Invalid numeric fields' });
    }
    if (producer_id !== undefined && producer_id !== null && parsePositiveInt(producer_id) === null) {
      return res.status(400).json({ error: 'producer_id must be a valid id' });
    }
    const id = await StockService.addStock(name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, threshold);
    res.status(201).json({ id, name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, threshold });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// New entity routes
router.get('/producers', async (req: Request, res: Response) => {
  try {
    const producers = await StockService.getAllProducers();
    res.json(producers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/producers', async (req: Request, res: Response) => {
  try {
    const { name, phone_number, address, email, region } = req.body ?? {};
    if (!isNonEmptyString(name) || !isNonEmptyString(region)) {
      return res.status(400).json({ error: 'name and region are required' });
    }
    if (!isOptionalString(phone_number) || !isOptionalString(address) || !isOptionalString(email)) {
      return res.status(400).json({ error: 'Invalid producer fields' });
    }
    const payload = {
      name,
      phone_number: phone_number ?? '',
      address: address ?? '',
      email: email ?? '',
      region
    };
    const id = await StockService.addProducer(payload);
    res.status(201).json({ id, ...payload });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/producers/:id', async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid producer id' });

    const { name, phone_number, address, email, region } = req.body ?? {};
    if (
      name === undefined &&
      phone_number === undefined &&
      address === undefined &&
      email === undefined &&
      region === undefined
    ) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    if (
      (name !== undefined && !isNonEmptyString(name)) ||
      !isOptionalString(phone_number) ||
      !isOptionalString(address) ||
      !isOptionalString(email) ||
      (region !== undefined && !isNonEmptyString(region))
    ) {
      return res.status(400).json({ error: 'Invalid producer fields' });
    }

    await StockService.updateProducer(id, { name, phone_number, address, email, region });
    res.json({ message: 'Producer updated' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

router.delete('/producers/:id', async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid producer id' });
    await StockService.deleteProducer(id);
    res.json({ message: 'Producer deleted' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/clients', async (req: Request, res: Response) => {
  try {
    const clients = await StockService.getAllClients();
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clients', async (req: Request, res: Response) => {
  try {
    const { name, phone_number, address, email } = req.body ?? {};
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!isOptionalString(phone_number) || !isOptionalString(address) || !isOptionalString(email)) {
      return res.status(400).json({ error: 'Invalid client fields' });
    }

    const payload = {
      name,
      phone_number: phone_number ?? '',
      address: address ?? '',
      email: email ?? ''
    };
    const id = await StockService.addClient(payload);
    res.status(201).json({ id, ...payload });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid client id' });

    const { name, phone_number, address, email } = req.body ?? {};
    if (name === undefined && phone_number === undefined && address === undefined && email === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    if ((name !== undefined && !isNonEmptyString(name)) || !isOptionalString(phone_number) || !isOptionalString(address) || !isOptionalString(email)) {
      return res.status(400).json({ error: 'Invalid client fields' });
    }

    await StockService.updateClient(id, { name, phone_number, address, email });
    res.json({ message: 'Client updated' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

router.delete('/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid client id' });
    await StockService.deleteClient(id);
    res.json({ message: 'Client deleted' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});


router.get('/orders', async (req: Request, res: Response) => {
  try {
    const orders = await StockService.getAllOrders();
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const { client_id, location, bill_price, shipment_date, status, items } = req.body ?? {};
    const clientId = parsePositiveInt(client_id);
    if (!clientId) return res.status(400).json({ error: 'client_id is required' });
    if (!isNonEmptyString(location)) return res.status(400).json({ error: 'location is required' });
    if (typeof bill_price !== 'number' || !Number.isFinite(bill_price) || bill_price < 0) {
      return res.status(400).json({ error: 'bill_price must be a valid number' });
    }
    if (shipment_date !== undefined && shipment_date !== null && !isNonEmptyString(shipment_date)) {
      return res.status(400).json({ error: 'shipment_date must be a valid date string' });
    }
    if (status !== undefined && status !== null && (!isNonEmptyString(status) || !allowedOrderStatuses.has(status))) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items are required' });
    }
    for (const item of items) {
      const stockId = parsePositiveInt(item?.stock_id);
      const qty = parsePositiveInt(item?.quantity);
      const unitPrice = parsePositiveNumber(item?.unit_price);
      if (!stockId || !qty || unitPrice === null) {
        return res.status(400).json({ error: 'Invalid items: stock_id, quantity, and unit_price are required' });
      }
    }

    const id = await StockService.createOrder({
      client_id: clientId,
      location,
      bill_price,
      shipment_date: shipment_date ?? null,
      status: status ?? 'Pending',
      items
    });
    res.status(201).json({ id, client_id: clientId, location, bill_price, shipment_date: shipment_date ?? null, status: status ?? 'Pending', items });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order id' });
    const { status } = req.body ?? {};
    if (!isNonEmptyString(status) || !allowedOrderStatuses.has(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    await StockService.updateOrderStatus(id, status);
    res.json({ message: 'Order status updated' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});


/**
 * PATCH /api/stocks/:id/quantity
 * Updates the quantity of a specific item.
 * Body: { quantity: number }
 */
router.patch('/:id/quantity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    await StockService.updateStockQuantity(Number(id), quantity);
    res.json({ message: 'Stock updated' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * GET /api/stocks/low-stock
 * Returns a list of items that are running low on stock.
 */
router.get('/low-stock', async (req: Request, res: Response) => {
  try {
    const lowStockItems = await StockService.getLowStockItems();
    res.json(lowStockItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/stocks/:id
 * Deletes a specific stock item.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await StockService.deleteStock(Number(id));
    res.json({ message: 'Stock item deleted' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

export default router;
