import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { pullRemoteData, pushAllLocalData, startSync, stopSync } from '../services/sync';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        setSyncing(true);
        try {
          const hadRemoteData = await pullRemoteData(firebaseUser.uid);
          if (!hadRemoteData) {
            await pushAllLocalData(firebaseUser.uid);
          }
        } catch (e) {
          console.warn('Initial sync failed', e);
        } finally {
          startSync(firebaseUser.uid);
          setSyncing(false);
        }
      } else {
        stopSync();
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setAuthError(e?.message || 'Sign-in failed');
      throw e;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, syncing, authError, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
