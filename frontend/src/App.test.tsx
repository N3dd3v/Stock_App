import { screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from './AuthContext';
import App from './App';
import { renderWithProviders } from './test/renderWithProviders';

vi.mock('axios');

const mockedAxios = vi.mocked(axios);

describe('App', () => {
  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: [] });
  });

  it('shows the login page when no user is authenticated', () => {
    renderWithProviders(<App />);

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('does not show the login page for a staff user', async () => {
    const staffUser: User = {
      id: 1,
      username: 'staff-user',
      role: 'staff',
    };

    renderWithProviders(<App />, {
      authValue: { user: staffUser },
    });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    expect(await screen.findByText(/inventory overview/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });
});
