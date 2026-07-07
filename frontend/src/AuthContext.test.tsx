import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth, type User } from './AuthContext';
import { renderWithProviders } from './test/renderWithProviders';

const TEST_USER: User = {
  id: 1,
  username: 'admin-user',
  role: 'admin',
};

const createToken = (exp: number) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp }));

  return `${header}.${payload}.signature`;
};

const AuthProbe = () => {
  const { user, login, logout } = useAuth();

  return (
    <div>
      <span>{user ? user.username : 'no-user'}</span>
      <button type="button" onClick={() => login(createToken(Math.floor(Date.now() / 1000) + 3600), TEST_USER)}>
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  it('restores the user from localStorage when the token is unexpired', () => {
    localStorage.setItem('stock_app_token', createToken(Math.floor(Date.now() / 1000) + 3600));
    localStorage.setItem('stock_app_user', JSON.stringify(TEST_USER));

    renderWithProviders(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
      { authValue: undefined },
    );

    expect(screen.getByText(TEST_USER.username)).toBeInTheDocument();
  });

  it('drops expired sessions and removes both storage keys', () => {
    localStorage.setItem('stock_app_token', createToken(Math.floor(Date.now() / 1000) - 3600));
    localStorage.setItem('stock_app_user', JSON.stringify(TEST_USER));

    renderWithProviders(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
      { authValue: undefined },
    );

    expect(screen.getByText('no-user')).toBeInTheDocument();
    expect(localStorage.getItem('stock_app_token')).toBeNull();
    expect(localStorage.getItem('stock_app_user')).toBeNull();
  });

  it('handles malformed tokens without crashing', () => {
    localStorage.setItem('stock_app_token', `header.${btoa('not-json')}.signature`);
    localStorage.setItem('stock_app_user', JSON.stringify(TEST_USER));

    renderWithProviders(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
      { authValue: undefined },
    );

    expect(screen.getByText('no-user')).toBeInTheDocument();
  });

  it('login stores the session and logout clears it', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
      { authValue: undefined },
    );

    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => {
      expect(screen.getByText(TEST_USER.username)).toBeInTheDocument();
    });

    expect(localStorage.getItem('stock_app_token')).not.toBeNull();
    expect(localStorage.getItem('stock_app_user')).toBe(JSON.stringify(TEST_USER));

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => {
      expect(screen.getByText('no-user')).toBeInTheDocument();
    });

    expect(localStorage.getItem('stock_app_token')).toBeNull();
    expect(localStorage.getItem('stock_app_user')).toBeNull();
  });
});
