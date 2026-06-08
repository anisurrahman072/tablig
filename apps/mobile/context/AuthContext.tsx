import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthToken } from '../lib/api';

type Account = {
  id: string;
  name: string;
  houseAddress?: string;
  masjid: string;
  mobile: string;
  isAdmin?: boolean;
};

type AuthContextType = {
  account: Account | null;
  token: string | null;
  loading: boolean;
  login: (mobile: string, pin: string) => Promise<void>;
  signup: (data: {
    name: string;
    houseAddress?: string;
    masjid: string;
    mobile: string;
    pin: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'tablig_token';
const ACCOUNT_KEY = 'tablig_account';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedAccount = await SecureStore.getItemAsync(ACCOUNT_KEY);
        if (storedToken && storedAccount) {
          setToken(storedToken);
          setAuthToken(storedToken);
          const parsed = JSON.parse(storedAccount) as Account;
          setAccount(parsed);
          try {
            const res = await api.get('/auth/me');
            const fresh = res.data.data as Account;
            setAccount(fresh);
            await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(fresh));
          } catch {
            // keep stored account if refresh fails
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistAuth = useCallback(async (newToken: string, newAccount: Account) => {
    setToken(newToken);
    setAccount(newAccount);
    setAuthToken(newToken);
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(newAccount));
  }, []);

  const login = useCallback(async (mobile: string, pin: string) => {
    const res = await api.post('/auth/login', { mobile, pin });
    await persistAuth(res.data.data.token, res.data.data.account);
  }, [persistAuth]);

  const signup = useCallback(async (data: {
    name: string;
    houseAddress?: string;
    masjid: string;
    mobile: string;
    pin: string;
  }) => {
    const res = await api.post('/auth/signup', data);
    await persistAuth(res.data.data.token, res.data.data.account);
  }, [persistAuth]);

  const logout = useCallback(async () => {
    setToken(null);
    setAccount(null);
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ACCOUNT_KEY);
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!token) return;
    const res = await api.get('/auth/me');
    const fresh = res.data.data as Account;
    setAccount(fresh);
    await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(fresh));
  }, [token]);

  const value = useMemo(
    () => ({ account, token, loading, login, signup, logout, refreshAccount }),
    [account, token, loading, login, signup, logout, refreshAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider প্রয়োজন');
  return ctx;
}
