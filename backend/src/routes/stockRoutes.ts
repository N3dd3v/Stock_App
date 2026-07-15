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
import { StockService, type StockUpdateInput, type StockWithProducer } from '../services/stockService.js';
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

const isNullableOptionalString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === 'string';

const toStockResponse = (item: StockWithProducer) => ({
  id: item.id,
  name: item.name,
  designationCode: item.designation_code,
  refNumber: item.ref_number,
  quantity: item.quantity,
  pricePerUnit: item.price_per_unit,
  retailPrice: item.retail_price,
  producerId: item.producer_id,
  producerName: item.producer_name,
  producerRegion: item.producer_region,
  description: item.description,
  category: item.category,
  imageUrl: item.image_url,
  lowStockThreshold: item.low_stock_threshold,
  updatedAt: item.updated_at,
});

const validateQuantityOnlyUpdate = (body: unknown): { quantity: number } | { error: string; status: number } => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid update payload', status: 400 };
  }

  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.length === 0) {
    return { error: 'Quantity is required', status: 400 };
  }

  // Staff updates reject any field other than quantity so RBAC is enforced server-side.
  if (keys.some((key) => key !== 'quantity')) {
    return { error: 'Forbidden', status: 403 };
  }

  const { quantity } = body as { quantity?: unknown };
  if (quantity === undefined) {
    return { error: 'Quantity is required', status: 400 };
  }
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
    return { error: 'Quantity must be a valid number', status: 400 };
  }

  return { quantity };
};

const validateAdminStockUpdate = (body: unknown): StockUpdateInput | { error: string; status: number } => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid update payload', status: 400 };
  }

  const payload = body as Record<string, unknown>;
  const allowedKeys = new Set([
    'name',
    'designation_code',
    'ref_number',
    'quantity',
    'price_per_unit',
    'retail_price',
    'producer_id',
    'description',
    'category',
    'image_url',
    'threshold',
    'low_stock_threshold',
  ]);
  const submittedKeys = Object.keys(payload);

  if (submittedKeys.length === 0) {
    return { error: 'No fields to update', status: 400 };
  }

  if (submittedKeys.some((key) => !allowedKeys.has(key))) {
    return { error: 'Invalid update fields', status: 400 };
  }

  if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
    return { error: 'name must be a non-empty string', status: 400 };
  }

  if (
    !isOptionalString(payload.designation_code) ||
    !isOptionalString(payload.ref_number) ||
    !isOptionalString(payload.description) ||
    !isOptionalString(payload.category) ||
    !isNullableOptionalString(payload.image_url)
  ) {
    return { error: 'Invalid text fields', status: 400 };
  }

  if (
    (payload.quantity !== undefined &&
      (typeof payload.quantity !== 'number' || !Number.isFinite(payload.quantity) || payload.quantity < 0)) ||
    (payload.price_per_unit !== undefined &&
      (typeof payload.price_per_unit !== 'number' || !Number.isFinite(payload.price_per_unit) || payload.price_per_unit < 0)) ||
    (payload.retail_price !== undefined &&
      (typeof payload.retail_price !== 'number' || !Number.isFinite(payload.retail_price) || payload.retail_price < 0))
  ) {
    return { error: 'Quantity and prices must be valid non-negative numbers', status: 400 };
  }

  const lowStockThreshold = payload.low_stock_threshold ?? payload.threshold;
  if (
    lowStockThreshold !== undefined &&
    (typeof lowStockThreshold !== 'number' || !Number.isFinite(lowStockThreshold) || lowStockThreshold < 0)
  ) {
    return { error: 'low_stock_threshold must be a valid non-negative number', status: 400 };
  }

  if (
    payload.producer_id !== undefined &&
    payload.producer_id !== null &&
    parsePositiveInt(payload.producer_id) === null
  ) {
    return { error: 'producer_id must be a valid id', status: 400 };
  }

  return {
    name: payload.name as string | undefined,
    designation_code: payload.designation_code as string | undefined,
    ref_number: payload.ref_number as string | undefined,
    quantity: payload.quantity as number | undefined,
    price_per_unit: payload.price_per_unit as number | undefined,
    retail_price: payload.retail_price as number | undefined,
    producer_id:
      payload.producer_id === undefined
        ? undefined
        : payload.producer_id === null
          ? null
          : parsePositiveInt(payload.producer_id),
    description: payload.description as string | undefined,
    category: payload.category as string | undefined,
    image_url: payload.image_url as string | null | undefined,
    low_stock_threshold: lowStockThreshold as number | undefined,
  };
};

const stripPrices = (item: any) => {
  const { price_per_unit, retail_price, ...rest } = item;
  return rest;
};

const toProducerResponse = (producer: {
  id: number;
  name: string;
  phone_number: string;
  address: string;
  email: string;
  region: string;
}) => ({
  id: producer.id,
  name: producer.name,
  phone_number: producer.phone_number,
  address: producer.address,
  email: producer.email,
  region: producer.region,
});

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

// Supplier routes use the existing "producers" model in this codebase.
// Staff may read the list because producer details are already visible in staff-facing stock views.
router.get('/producers', requireAuth, async (req: Request, res: Response) => {
  try {
    const producers = await StockService.getAllProducers();
    res.json(producers.map(toProducerResponse));
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
    res.status(201).json(toProducerResponse({ id, ...payload }));
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

    const updatedProducer = await StockService.updateProducer(id, { name, phone_number, address, email, region });
    res.json(toProducerResponse(updatedProducer));
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
 * PATCH /api/stocks/:id
 * Admins can update any editable stock field.
 * Staff users are restricted to quantity-only updates and receive 403 if they submit any other fields.
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid stock id' });
    }

    if (req.user?.role === 'staff') {
      const validated = validateQuantityOnlyUpdate(req.body);
      if ('error' in validated) {
        return res.status(validated.status).json({ error: validated.error });
      }

      await StockService.updateStockQuantity(id, validated.quantity);
      const updatedStock = await StockService.getStockWithProducerById(id);
      if (!updatedStock) {
        return res.status(404).json({ error: 'Stock item not found' });
      }

      return res.json(toStockResponse(updatedStock));
    }

    const validated = validateAdminStockUpdate(req.body);
    if ('error' in validated) {
      return res.status(validated.status).json({ error: validated.error });
    }

    const updatedStock = await StockService.updateStock(id, validated);
    return res.json(toStockResponse(updatedStock));
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
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid stock id' });
    }

    const validated = validateQuantityOnlyUpdate(req.body);
    if ('error' in validated) {
      return res.status(validated.status).json({ error: validated.error });
    }

    await StockService.updateStockQuantity(id, validated.quantity);
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
