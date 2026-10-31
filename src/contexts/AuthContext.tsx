import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { pullRemoteData, pushAllLocalData, startSync, stopSync } from '../services/sync';
import { storage } from '../services/storage';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  authError: string | null;
  isOwner: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The app's original owner, whose real financial data lives hardcoded in
// migratedData.ts / historicalReconciliation.ts. Any other signed-in
// account must never have that data seeded locally or synced into its own
// Firestore space (see storage.ensureInitialData's seedOwnerData param) —
// every other account starts completely empty.
const OWNER_EMAIL = 'anwraltahir@gmail.com';

function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Switch local storage to this account's own namespace before
      // anything else touches it (synchronously, same tick as setUser, so
      // it's in effect before AppContent's own data-loading effect runs).
      storage.setActiveUser(firebaseUser ? firebaseUser.uid : null);

      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        setSyncing(true);
        try {
          // Two-way reconcile on every load: pull remote changes in first
          // (and apply any deletions), then push this device's current
          // state up so local-only items actually reach the cloud too.
          // Bounded by a timeout so a slow/stuck network call can never
          // block the app from loading indefinitely — background sync
          // (started below) keeps reconciling afterward regardless.
          const timeout = (ms: number) =>
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error('sync timeout')), ms));
          await Promise.race([
            (async () => {
              await pullRemoteData(firebaseUser.uid);
              await pushAllLocalData(firebaseUser.uid);
            })(),
            timeout(15000),
          ]);
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
      setAuthError(e?.code || e?.message || 'Sign-in failed');
      throw e;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setAuthError(e?.code || e?.message || 'Sign-in failed');
      throw e;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setAuthError(e?.code || e?.message || 'Sign-up failed');
      throw e;
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e: any) {
      setAuthError(e?.code || e?.message || 'Reset failed');
      throw e;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncing,
        authError,
        isOwner: isOwnerEmail(user?.email),
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
