import { stripPrices } from './stockRoutes';

describe('stripPrices', () => {
  it('removes price fields and preserves the remaining stock data', () => {
    const stockItem = {
      id: 1,
      name: 'Widget',
      quantity: 3,
      category: 'Hardware',
      low_stock_threshold: 5,
      price_per_unit: 19.99,
      retail_price: 12.5,
    };

    expect(stripPrices(stockItem)).toEqual({
      id: 1,
      name: 'Widget',
      quantity: 3,
      category: 'Hardware',
      low_stock_threshold: 5,
    });
  });

  it('returns a new object without mutating the original item', () => {
    const stockItem = {
      id: 2,
      name: 'Immutable Widget',
      quantity: 8,
      price_per_unit: 29.99,
      retail_price: 20.5,
    };

    const stripped = stripPrices(stockItem);

    expect(stripped).not.toBe(stockItem);
    expect(stockItem).toHaveProperty('price_per_unit', 29.99);
    expect(stockItem).toHaveProperty('retail_price', 20.5);
    expect(stripped).not.toHaveProperty('price_per_unit');
    expect(stripped).not.toHaveProperty('retail_price');
  });
});
