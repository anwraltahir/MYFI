import React, { useState } from 'react';
import { translations, Language } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  lang: Language;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ lang }) => {
  const t = translations[lang].auth;
  const { signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      setError(t.signInError);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-extrabold text-slate-800">{t.signInTitle}</h1>
          <p className="text-sm text-slate-500">{t.signInSubtitle}</p>
        </div>

        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-xs transition active:scale-98 disabled:opacity-60"
        >
          {isSigningIn ? (
            <span>{t.signingIn}</span>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.084 5.571l6.19 5.238C41.98 35.205 44 30.028 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              <span>{t.signInButton}</span>
            </>
          )}
        </button>

        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    </div>
  );
};
