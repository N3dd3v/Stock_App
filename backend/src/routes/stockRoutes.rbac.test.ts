import jwt from 'jsonwebtoken';
import request from 'supertest';

const TEST_SECRET = 'stock-rbac-test-secret';

describe('/api/stocks RBAC', () => {
  let app: ReturnType<typeof import('../app').createApp>;
  let db: Awaited<ReturnType<typeof import('../db').getDb>>;
  let resetDbForTests: typeof import('../db').resetDbForTests;
  let adminToken: string;
  let staffToken: string;
  let producerId: number;
  let lowItemId: number;
  let regularItemId: number;
  let createdStockId: number | null = null;

  beforeAll(async () => {
    process.env.TURSO_DATABASE_URL = ':memory:';
    process.env.JWT_SECRET = TEST_SECRET;
    delete process.env.TURSO_AUTH_TOKEN;

    const dbModule = await import('../db');
    resetDbForTests = dbModule.resetDbForTests;
    await resetDbForTests();
    db = await dbModule.getDb();

    const producerResult = await db.run(
      'INSERT INTO producers (name, phone_number, address, email, region) VALUES (?, ?, ?, ?, ?)',
      ['Seed Producer', '555-0100', 'Seed Street', 'seed@example.com', 'North']
    );
    producerId = producerResult.lastID!;

    const lowItemResult = await db.run(
      `INSERT INTO stocks
        (name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, category, image_url, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Low Item', 2, 'LOW-001', 'REF-LOW', 15.5, 10.25, producerId, 'Low stock item', 'Hardware', null, 5]
    );
    lowItemId = lowItemResult.lastID!;

    const regularItemResult = await db.run(
      `INSERT INTO stocks
        (name, quantity, designation_code, ref_number, price_per_unit, retail_price, producer_id, description, category, image_url, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Regular Item', 10, 'REG-001', 'REF-REG', 29.99, 20.5, producerId, 'Regular stock item', 'Software', null, 3]
    );
    regularItemId = regularItemResult.lastID!;

    adminToken = jwt.sign(
      { userId: 1, username: 'admin1', role: 'admin' },
      TEST_SECRET
    );
    staffToken = jwt.sign(
      { userId: 2, username: 'staff1', role: 'staff' },
      TEST_SECRET
    );

    const appModule = await import('../app');
    app = appModule.createApp();
  });

  afterAll(async () => {
    await resetDbForTests();
  });

  it('returns 401 for GET /api/stocks with no token', async () => {
    const response = await request(app).get('/api/stocks');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns stripped stock items for staff', async () => {
    const response = await request(app)
      .get('/api/stocks')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    for (const item of response.body) {
      expect(item).not.toHaveProperty('price_per_unit');
      expect(item).not.toHaveProperty('retail_price');
      expect(Object.keys(item)).not.toContain('price_per_unit');
      expect(Object.keys(item)).not.toContain('retail_price');
    }
  });

  it('returns full stock items for admin including seeded price fields', async () => {
    const response = await request(app)
      .get('/api/stocks')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const lowItem = response.body.find((item: any) => item.id === lowItemId);
    const regularItem = response.body.find((item: any) => item.id === regularItemId);

    expect(lowItem.price_per_unit).toBe(15.5);
    expect(lowItem.retail_price).toBe(10.25);
    expect(regularItem.price_per_unit).toBe(29.99);
    expect(regularItem.retail_price).toBe(20.5);
  });

  it('returns only the low-stock item for staff without price keys', async () => {
    const response = await request(app)
      .get('/api/stocks/alerts/low-stock')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(lowItemId);
    expect(response.body[0]).not.toHaveProperty('price_per_unit');
    expect(response.body[0]).not.toHaveProperty('retail_price');
    expect(Object.keys(response.body[0])).not.toContain('price_per_unit');
    expect(Object.keys(response.body[0])).not.toContain('retail_price');
  });

  it('rejects POST /api/stocks for staff and does not insert a row', async () => {
    const before = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM stocks');

    const response = await request(app)
      .post('/api/stocks')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Staff Insert Attempt',
        quantity: 4,
        designation_code: 'STAFF-001',
        ref_number: 'REF-STAFF',
        price_per_unit: 8.5,
        retail_price: 6,
        producer_id: producerId,
        description: 'Should not be created',
        category: 'Blocked',
        threshold: 2,
      });

    const after = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM stocks');

    expect(response.status).toBe(403);
    expect(before?.count).toBe(after?.count);
  });

  it('allows POST /api/stocks for admin and persists the row', async () => {
    const response = await request(app)
      .post('/api/stocks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Inserted Item',
        quantity: 7,
        designation_code: 'ADM-001',
        ref_number: 'REF-ADM',
        price_per_unit: 99.99,
        retail_price: 70,
        producer_id: producerId,
        description: 'Created by admin',
        category: 'Accessories',
        threshold: 4,
      });

    expect(response.status).toBe(201);
    createdStockId = response.body.id;

    const inserted = await db.get<{ name: string; category: string }>(
      'SELECT name, category FROM stocks WHERE id = ?',
      [createdStockId]
    );

    expect(inserted).toEqual({
      name: 'Admin Inserted Item',
      category: 'Accessories',
    });
  });

  it('allows PATCH /api/stocks/:id/quantity for staff and updates the db', async () => {
    const response = await request(app)
      .patch(`/api/stocks/${regularItemId}/quantity`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ quantity: 12 });

    const updated = await db.get<{ quantity: number }>(
      'SELECT quantity FROM stocks WHERE id = ?',
      [regularItemId]
    );

    expect(response.status).toBe(200);
    expect(updated?.quantity).toBe(12);
  });

  it('returns 400 for a negative quantity and leaves the db value unchanged', async () => {
    const before = await db.get<{ quantity: number }>(
      'SELECT quantity FROM stocks WHERE id = ?',
      [regularItemId]
    );

    const response = await request(app)
      .patch(`/api/stocks/${regularItemId}/quantity`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ quantity: -5 });

    const after = await db.get<{ quantity: number }>(
      'SELECT quantity FROM stocks WHERE id = ?',
      [regularItemId]
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Quantity must be a valid number' });
    expect(after?.quantity).toBe(before?.quantity);
  });

  it('rejects delete for staff, then allows delete for admin', async () => {
    expect(createdStockId).not.toBeNull();

    const staffResponse = await request(app)
      .delete(`/api/stocks/${createdStockId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    const stillThere = await db.get<{ id: number }>(
      'SELECT id FROM stocks WHERE id = ?',
      [createdStockId]
    );

    expect(staffResponse.status).toBe(403);
    expect(stillThere?.id).toBe(createdStockId);

    const adminResponse = await request(app)
      .delete(`/api/stocks/${createdStockId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const deleted = await db.get<{ id: number }>(
      'SELECT id FROM stocks WHERE id = ?',
      [createdStockId]
    );

    expect(adminResponse.status).toBe(200);
    expect(deleted).toBeUndefined();
  });

  it('rejects producer creation for staff and allows it for admin', async () => {
    const staffResponse = await request(app)
      .post('/api/stocks/producers')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Blocked Producer',
        phone_number: '555-0200',
        address: 'Blocked Street',
        email: 'blocked@example.com',
        region: 'South',
      });

    expect(staffResponse.status).toBe(403);

    const adminResponse = await request(app)
      .post('/api/stocks/producers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Allowed Producer',
        phone_number: '555-0300',
        address: 'Allowed Street',
        email: 'allowed@example.com',
        region: 'West',
      });

    expect(adminResponse.status).toBe(201);

    const inserted = await db.get<{ name: string }>(
      'SELECT name FROM producers WHERE id = ?',
      [adminResponse.body.id]
    );

    expect(inserted?.name).toBe('Allowed Producer');
  });

  it('filters GET /api/stocks by category', async () => {
    const response = await request(app)
      .get('/api/stocks?category=Hardware')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(lowItemId);
    expect(response.body[0].category).toBe('Hardware');
  });
});
