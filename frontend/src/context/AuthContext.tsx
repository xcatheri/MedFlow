import { createContext, useContext, type ReactNode } from 'react';
import * as api from '../api';
import { useLocalStorage } from '../lib/storage';

type AuthValue = {
  token: string | null;
  signIn: (email: string, password: string, isNew: boolean) => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useLocalStorage<string | null>('mf-token', null);

  async function signIn(email: string, password: string, isNew: boolean) {
    const res = isNew ? await api.register(email, password) : await api.login(email, password);
    setToken(res.token);
  }

  return (
    <Ctx.Provider value={{ token, signIn, signOut: () => setToken(null) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}