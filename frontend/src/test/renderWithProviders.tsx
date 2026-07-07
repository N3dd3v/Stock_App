import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { AuthContext, type AuthContextType } from '../AuthContext';
import { LanguageProvider } from '../LanguageContext';

const noopLogin: AuthContextType['login'] = () => undefined;
const noopLogout: AuthContextType['logout'] = () => undefined;

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<AuthContextType>;
}

const buildAuthValue = (authValue?: Partial<AuthContextType>): AuthContextType => ({
  user: authValue?.user ?? null,
  login: authValue?.login ?? noopLogin,
  logout: authValue?.logout ?? noopLogout,
});

export const renderWithProviders = (
  ui: ReactElement,
  { authValue, ...renderOptions }: RenderWithProvidersOptions = {},
) => {
  const resolvedAuthValue = buildAuthValue(authValue);

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthContext.Provider value={resolvedAuthValue}>
      <LanguageProvider>{children}</LanguageProvider>
    </AuthContext.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
