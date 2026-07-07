import { getDb, resetDbForTests, type Db } from '../db';
import { StockService } from './stockService';

describe('StockService', () => {
  let db: Db;

  beforeAll(() => {
    process.env.TURSO_DATABASE_URL = ':memory:';
    delete process.env.TURSO_AUTH_TOKEN;
  });

  beforeEach(async () => {
    await resetDbForTests();
    db = await getDb();
  });

  afterAll(async () => {
    await resetDbForTests();
  });

  it('addStock inserts a row, returns its id, and defaults category to Uncategorised when omitted', async () => {
    const id = await StockService.addStock('Widget', 3);
    const row = await db.get<{
      id: number;
      name: string;
      quantity: number;
      designation_code: string;
      ref_number: string;
      price_per_unit: number;
      retail_price: number;
      producer_id: number | null;
      description: string;
      category: string;
      image_url: string | null;
      low_stock_threshold: number;
      updated_at: string;
    }>('SELECT * FROM stocks WHERE id = ?', [id]);

    expect(id).toBeGreaterThan(0);
    expect(row).toBeDefined();
    expect(row).toMatchObject({
      id,
      name: 'Widget',
      quantity: 3,
      designation_code: '',
      ref_number: '',
      price_per_unit: 0,
      retail_price: 0,
      producer_id: null,
      description: '',
      category: 'Uncategorised',
      image_url: null,
      low_stock_threshold: 5,
    });
    expect(typeof row?.updated_at).toBe('string');
  });

  it('includes an item when quantity is equal to its low-stock threshold', async () => {
    const equalId = await StockService.addStock(
      'Equal Boundary Item',
      5,
      '',
      '',
      0,
      0,
      null,
      '',
      'Boundary',
      null,
      5
    );

    const lowStockItems = await StockService.getLowStockItems();
    const ids = lowStockItems.map(item => item.id);

    // The service uses quantity <= low_stock_threshold, so equality is included.
    expect(ids).toContain(equalId);
  });

  it('excludes items above threshold and includes items below threshold', async () => {
    const belowId = await StockService.addStock(
      'Below Threshold Item',
      2,
      '',
      '',
      0,
      0,
      null,
      '',
      'Hardware',
      null,
      3
    );
    const aboveId = await StockService.addStock(
      'Above Threshold Item',
      10,
      '',
      '',
      0,
      0,
      null,
      '',
      'Hardware',
      null,
      3
    );

    const lowStockItems = await StockService.getLowStockItems();
    const ids = lowStockItems.map(item => item.id);

    expect(ids).toContain(belowId);
    expect(ids).not.toContain(aboveId);
  });

  it('returns distinct categories with no duplicates', async () => {
    await StockService.addStock('Hammer', 4, '', '', 0, 0, null, '', 'Hardware');
    await StockService.addStock('Nails', 8, '', '', 0, 0, null, '', 'Hardware');
    await StockService.addStock('Antivirus', 2, '', '', 0, 0, null, '', 'Software');

    const categories = await StockService.getCategories();

    expect(categories).toEqual(['Hardware', 'Software']);
    expect(categories).toHaveLength(2);
  });

  it('updateStockQuantity changes only the quantity and leaves name and prices untouched', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const id = await StockService.addStock(
      'Stable Item',
      4,
      'STB-001',
      'REF-STB',
      19.99,
      12.5,
      null,
      'Keep these fields unchanged',
      'Tools',
      null,
      1
    );

    await StockService.updateStockQuantity(id, 9);

    const row = await db.get<{
      quantity: number;
      name: string;
      price_per_unit: number;
      retail_price: number;
    }>(
      'SELECT quantity, name, price_per_unit, retail_price FROM stocks WHERE id = ?',
      [id]
    );

    expect(row).toEqual({
      quantity: 9,
      name: 'Stable Item',
      price_per_unit: 19.99,
      retail_price: 12.5,
    });

    warnSpy.mockRestore();
  });

  it('rejects missing name because the db client refuses undefined arguments', async () => {
    await expect(
      StockService.addStock(undefined as unknown as string, 1)
    ).rejects.toThrow(/undefined cannot be passed as argument to the database/i);

    const count = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM stocks');
    expect(count?.count).toBe(0);
  });
});
