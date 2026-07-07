import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockItem } from '../App';
import { renderWithProviders } from '../test/renderWithProviders';
import StockList from './StockList';

vi.mock('axios');

const mockedAxios = vi.mocked(axios);

const adminItems: StockItem[] = [
  {
    id: 1,
    name: 'Low Stock Widget',
    designationCode: 'LSW-001',
    refNumber: 'REF-LOW-1',
    quantity: 2,
    pricePerUnit: 12.34,
    retailPrice: 4,
    producerId: 10,
    producerName: 'Clivia Supply',
    producerRegion: 'North',
    description: 'Low stock item',
    category: 'Hardware',
    imageUrl: null,
    lowStockThreshold: 2,
    updatedAt: '2026-07-07T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Healthy Widget',
    designationCode: 'HW-002',
    refNumber: 'REF-OK-2',
    quantity: 8,
    pricePerUnit: 20,
    retailPrice: 10,
    producerId: 11,
    producerName: 'Clivia Supply',
    producerRegion: 'South',
    description: 'Healthy stock item',
    category: 'Office',
    imageUrl: null,
    lowStockThreshold: 3,
    updatedAt: '2026-07-07T00:00:00.000Z',
  },
];

const staffItems: StockItem[] = adminItems.map(({ pricePerUnit, retailPrice, ...item }) => item);

const renderStockList = (role: 'admin' | 'staff', stocks: StockItem[] = adminItems) => {
  const onUpdate = vi.fn();

  const view = renderWithProviders(<StockList stocks={stocks} onUpdate={onUpdate} />, {
    authValue: {
      user: {
        id: role === 'admin' ? 1 : 2,
        username: `${role}-user`,
        role,
      },
    },
  });

  return { ...view, onUpdate };
};

describe('StockList', () => {
  beforeEach(() => {
    mockedAxios.patch.mockReset();
    mockedAxios.delete.mockReset();
  });

  it('shows admin price columns and formatted price values for admin users', () => {
    renderStockList('admin', adminItems);
    const lowStockRow = screen.getByText('Low Stock Widget').closest('tr') as HTMLElement;

    expect(screen.getByText('Unit Price')).toBeInTheDocument();
    expect(screen.getByText('Total Price')).toBeInTheDocument();
    expect(within(lowStockRow).getByTitle('Sell')).toHaveTextContent('$12.34');
  });

  it('hides all price columns and values for staff users', () => {
    renderStockList('staff', staffItems);

    expect(screen.queryByText('Unit Price')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Price')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Sell')).not.toBeInTheDocument();
  });

  it('shows delete controls for admin users and hides them from staff users', () => {
    const adminView = renderStockList('admin', adminItems);

    expect(screen.getAllByTitle('Delete Item')).toHaveLength(adminItems.length);

    adminView.unmount();
    renderStockList('staff', staffItems);

    expect(screen.queryByTitle('Delete Item')).not.toBeInTheDocument();
  });

  it('marks low-stock rows differently from normal rows', () => {
    renderStockList('admin', adminItems);

    const lowStockCell = screen.getByText('Low Stock Widget');
    const healthyCell = screen.getByText('Healthy Widget');
    const lowStockRow = lowStockCell.closest('tr');
    const healthyRow = healthyCell.closest('tr');

    expect(lowStockRow).toHaveClass('bg-yellow-50/50');
    expect(healthyRow).not.toHaveClass('bg-yellow-50/50');
    expect(within(lowStockRow as HTMLElement).getByText('Low Stock')).toBeInTheDocument();
    expect(within(healthyRow as HTMLElement).getByText('Optimal')).toBeInTheDocument();
  });

  it('sends the quantity update patch request and calls onUpdate when saving a new quantity', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderStockList('staff', staffItems);

    mockedAxios.patch.mockResolvedValueOnce({ data: {} });

    await user.click(screen.getAllByTitle('Update Quantity')[0]);

    const quantityInput = screen.getByRole('spinbutton');
    await user.clear(quantityInput);
    await user.type(quantityInput, '5');
    await user.click(screen.getByTitle('Save'));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith('/api/stocks/1/quantity', { quantity: 5 });
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
