import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface User {
  userId: string;
  email: string;
  phoneNumber?: string;
  name: string;
  age?: number;
  role: string;
  isBlocked?: boolean;
  isPhoneNumberVerified?: boolean;
  isEmailVerified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = 'ecommerce.auth';

const loadAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    };
  }

  try {
    const rawState = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawState) {
      return {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
      };
    }

    const parsedState = JSON.parse(rawState) as Partial<AuthState>;
    return {
      user: parsedState.user ?? null,
      token: parsedState.token ?? null,
      refreshToken: null,
      isAuthenticated: Boolean(parsedState.token),
    };
  } catch {
    return {
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    };
  }
};

export const persistAuthState = (state: AuthState) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state.token || !state.user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user: state.user,
      token: state.token,
    })
  );
};

const initialState: AuthState = loadAuthState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.refreshToken = null;
      state.isAuthenticated = true;
      persistAuthState(state);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      persistAuthState(state);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
