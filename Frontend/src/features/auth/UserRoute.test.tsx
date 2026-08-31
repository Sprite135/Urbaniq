import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import UserRoute from './UserRoute';
import { renderWithProviders } from '@/test/test-utils';

describe('UserRoute', () => {
  it('redirects guests to the login page with return path', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/orders" element={<UserRoute />}>
          <Route index element={<div>Orders Page</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ['/orders'] } }
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects admin users to admin dashboard', () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin" element={<div>Admin Page</div>} />
        <Route path="/orders" element={<UserRoute />}>
          <Route index element={<div>Orders Page</div>} />
        </Route>
      </Routes>,
      {
        routerProps: { initialEntries: ['/orders'] },
        preloadedState: {
          auth: {
            user: {
              userId: 'admin-1',
              email: 'admin@test.com',
              name: 'Admin',
              role: 'Admin',
            },
            token: 'admin-token',
            refreshToken: 'admin-refresh-token',
            isAuthenticated: true,
          },
        },
      }
    );

    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('renders protected content for authenticated customers', () => {
    renderWithProviders(
      <Routes>
        <Route path="/orders" element={<UserRoute />}>
          <Route index element={<div>Orders Page</div>} />
        </Route>
      </Routes>,
      {
        routerProps: { initialEntries: ['/orders'] },
        preloadedState: {
          auth: {
            user: {
              userId: 'user-1',
              email: 'jane@test.com',
              name: 'Jane',
              role: 'User',
            },
            token: 'user-token',
            refreshToken: 'user-refresh-token',
            isAuthenticated: true,
          },
        },
      }
    );

    expect(screen.getByText('Orders Page')).toBeInTheDocument();
  });
});
