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
import multer from 'multer';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { StockService } from '../services/stockService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP files are allowed.'));
    }
  },
});

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

const stripPrices = (item: any) => {
  const { price_per_unit, retail_price, ...rest } = item;
  return rest;
};

/**
 * GET /api/stocks
 * Returns a list of all stock items, optionally filtered by ?category=
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const stocks = await StockService.getAllStocks(category);
    if (req.user?.role === 'staff') {
      const strippedStocks = stocks.map(stripPrices);
      res.json(strippedStocks);
    } else {
      res.json(stocks);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stocks/categories
 * Returns distinct categories
 */
router.get('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const categories = await StockService.getCategories();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stocks/alerts/low-stock
 * Returns low stock items
 */
router.get('/alerts/low-stock', requireAuth, async (req: Request, res: Response) => {
  try {
    const lowStockItems = await StockService.getLowStockItems();
    if (req.user?.role === 'staff') {
      const strippedItems = lowStockItems.map(stripPrices);
      res.json(strippedItems);
    } else {
      res.json(lowStockItems);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stocks
 * Creates a new stock item.
 * Body: { name: string, quantity: number, designation_code?: string, ref_number?: string, price_per_unit?: number, retail_price?: number, producer_id?: number, description?: string, category?: string, threshold?: number }
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, category, image_url, threshold } = req.body;
    if (!isNonEmptyString(name) || quantity === undefined) {
      return res.status(400).json({ error: 'Name and quantity are required' });
    }
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a valid number' });
    }
    if (!isOptionalString(designation_code) || !isOptionalString(ref_number) || !isOptionalString(description) || !isOptionalString(category) || !isOptionalString(image_url)) {
      return res.status(400).json({ error: 'Invalid text fields' });
    }
    if (!isOptionalNumber(price_per_unit) || !isOptionalNumber(retail_price) || !isOptionalNumber(threshold)) {
      return res.status(400).json({ error: 'Invalid numeric fields' });
    }
    if (producer_id !== undefined && producer_id !== null && parsePositiveInt(producer_id) === null) {
      return res.status(400).json({ error: 'producer_id must be a valid id' });
    }
    const id = await StockService.addStock(name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, category, image_url, threshold);
    // Route is admin-only, no need to strip prices
    res.status(201).json({ id, name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, category, image_url, threshold });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stocks/:id/image
 * Uploads an image for a stock item and updates image_url
 * Admin only
 */
router.post(
  '/:id/image',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Invalid stock id' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      // Upload to Cloudinary
      const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {resource_type: 'image'},
          (error, result) => {
            if (error) return reject(error);
            if (result) resolve(result);
          }
        );
        uploadStream.end(req.file!.buffer);
      });

      const updatedStock = await StockService.updateStockImage(id, uploadResult.secure_url);
      res.json({ image_url: updatedStock.image_url });
    } catch (error: any) {
      const status = error?.status ?? 500;
      res.status(status).json({ error: error.message });
    }
  }
);

// Producer routes
router.get('/producers', requireAuth, async (req: Request, res: Response) => {
  try {
    const producers = await StockService.getAllProducers();
    res.json(producers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/producers', requireAuth, requireAdmin, async (req: Request, res: Response) => {
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

router.patch('/producers/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
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

router.delete('/producers/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
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

/**
 * PATCH /api/stocks/:id/quantity
 * Updates the quantity of a specific item.
 * Body: { quantity: number }
 */
router.patch('/:id/quantity', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a valid number' });
    }
    await StockService.updateStockQuantity(Number(id), quantity);
    res.json({ message: 'Stock updated' });
  } catch (error: any) {
    const status = error?.status ?? 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * DELETE /api/stocks/:id
 * Deletes a specific stock item.
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
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
