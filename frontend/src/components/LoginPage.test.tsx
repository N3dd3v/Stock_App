import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { User } from '../AuthContext';
import { renderWithProviders } from '../test/renderWithProviders';
import LoginPage from './LoginPage';

vi.mock('axios');

const mockedAxios = vi.mocked(axios);

const RESPONSE_USER: User = {
  id: 2,
  username: 'staff-user',
  role: 'staff',
};

const renderLoginPage = (login = vi.fn()) => {
  const view = renderWithProviders(<LoginPage />, {
    authValue: {
      login,
      user: null,
    },
  });

  const usernameInput = view.container.querySelector('input[type="text"]') as HTMLInputElement;
  const passwordInput = view.container.querySelector('input[type="password"]') as HTMLInputElement;
  const submitButton = screen.getByRole('button', { name: /sign in/i });

  return { ...view, login, usernameInput, passwordInput, submitButton };
};

describe('LoginPage', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
  });

  it('submits trimmed credentials and calls auth login on success', async () => {
    const user = userEvent.setup();
    const { login, usernameInput, passwordInput, submitButton } = renderLoginPage();

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        token: 'test-token',
        user: RESPONSE_USER,
      },
    });

    await user.type(usernameInput, '  staff-user  ');
    await user.type(passwordInput, 'secret123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', {
        username: 'staff-user',
        password: 'secret123',
      });
    });

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test-token', RESPONSE_USER);
    });
  });

  it('shows the invalid-credentials message for a 401 response and does not call login', async () => {
    const user = userEvent.setup();
    const { login, usernameInput, passwordInput, submitButton } = renderLoginPage();

    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 401 },
    });

    await user.type(usernameInput, 'staff-user');
    await user.type(passwordInput, 'wrong-password');
    await user.click(submitButton);

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is pending and re-enables it after success', async () => {
    const user = userEvent.setup();
    const { usernameInput, passwordInput, submitButton } = renderLoginPage();

    let resolveRequest: ((value: { data: { token: string; user: User } }) => void) | undefined;
    mockedAxios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    await user.type(usernameInput, 'staff-user');
    await user.type(passwordInput, 'secret123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Signing in...');
    });

    resolveRequest?.({
      data: {
        token: 'pending-token',
        user: RESPONSE_USER,
      },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveTextContent('Sign In');
    });
  });

  it('does not call axios when submitted with empty required fields', async () => {
    const user = userEvent.setup();
    const { submitButton } = renderLoginPage();

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});
