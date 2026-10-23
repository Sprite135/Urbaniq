import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout, type User } from '../features/auth/authSlice';

type AuthRefreshResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

const baseQuery = fetchBaseQuery({
  credentials: 'include',
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    // Break circular dependency by not importing RootState
    const state = getState() as { auth: { token: string | null } };
    const token = state.auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

let refreshInFlight: Promise<boolean> | null = null;
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const originalToken = (api.getState() as { auth: { token: string | null } }).auth.token;
  let result = await baseQuery(args, api, extraOptions);
  const path = typeof args === 'string' ? args : args.url;
  if (result.error?.status === 401 && originalToken && !path.startsWith('/Auth/')) {
    if ((api.getState() as { auth: { token: string | null } }).auth.token !== originalToken) return baseQuery(args, api, extraOptions);
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const refreshed = await baseQuery({ url: '/Auth/refresh-token', method: 'POST', body: {} }, api, extraOptions);
        if ((api.getState() as { auth: { token: string | null } }).auth.token !== originalToken) return false;
        if (refreshed.data) { api.dispatch(setCredentials(refreshed.data as AuthRefreshResponse)); return true; }
        api.dispatch(logout()); return false;
      })().finally(() => { refreshInFlight = null; });
    }
    if (await refreshInFlight) result = await baseQuery(args, api, extraOptions);
  }
  return result;
};

export async function endBrowserSession() {
  try { await fetch((import.meta.env.VITE_API_BASE_URL ?? '/api/v1') + '/Auth/revoke-token', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}'
  }); } catch { /* Local logout remains available without a connection. */ }
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Order', 'Category', 'Cart', 'User', 'Address', 'Wishlist', 'Coupon', 'Review', 'Operations'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
