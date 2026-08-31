import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout, type User } from '../features/auth/authSlice';

type AuthRefreshResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

const baseQuery = fetchBaseQuery({
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

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const state = api.getState() as { auth: { refreshToken: string | null } };
    const refreshToken = state.auth.refreshToken;
    
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/Auth/refresh-token',
          method: 'POST',
          body: { refreshToken }
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Assume backend returns { accessToken, refreshToken, user, ... }
        api.dispatch(setCredentials(refreshResult.data as AuthRefreshResponse));
        // Retry the initial query
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Order', 'Category', 'Cart', 'User', 'Address', 'Wishlist'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
