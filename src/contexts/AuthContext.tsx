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

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// This is a single-user personal finance app seeded with the owner's real
// financial data. Any other account reaching AppContent would get that data
// handed to it locally and pushed into its own Firestore account — so no
// session for a non-owner email may ever be allowed to stand.
const OWNER_EMAIL = 'anwraltahir@gmail.com';

function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}

function notAuthorizedError(): Error & { code: string } {
  const err = new Error('auth/not-authorized') as Error & { code: string };
  err.code = 'auth/not-authorized';
  return err;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Never let a non-owner session stand, let alone reach local storage or
      // Firestore sync — this also covers accounts signed in before this
      // check existed, and sessions restored from a previous browser login.
      if (firebaseUser && !isOwnerEmail(firebaseUser.email)) {
        await signOut(auth);
        setAuthError(notAuthorizedError().code);
        setUser(null);
        setLoading(false);
        return;
      }

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
      const cred = await signInWithPopup(auth, googleProvider);
      if (!isOwnerEmail(cred.user.email)) {
        await signOut(auth);
        const err = notAuthorizedError();
        setAuthError(err.code);
        throw err;
      }
    } catch (e: any) {
      setAuthError(e?.code || e?.message || 'Sign-in failed');
      throw e;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    // Checked before calling Firebase at all — a stranger typing a random
    // email should never trigger a real auth attempt against this project.
    if (!isOwnerEmail(email)) {
      const err = notAuthorizedError();
      setAuthError(err.code);
      throw err;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setAuthError(e?.code || e?.message || 'Sign-in failed');
      throw e;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    if (!isOwnerEmail(email)) {
      const err = notAuthorizedError();
      setAuthError(err.code);
      throw err;
    }
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
