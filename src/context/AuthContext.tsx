import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseInitialized } from '../firebase/config.ts';
import { api } from '../services/firestore.ts';
import { UserAccount } from '../types.ts';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserAccount | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  refreshUser: async () => {},
  isAdmin: false,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    if (auth && auth.currentUser) {
      try {
        const userData = await api.getCurrentUser(auth.currentUser.uid);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Error refreshing user:", error);
      }
    }
  };

  useEffect(() => {
    if (!isFirebaseInitialized() || !auth) {
      console.error("🔥 Firebase NOT initialized");
      setError("System unavailable");
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userData = await api.getCurrentUser(firebaseUser.uid);
            setCurrentUser(userData);
          } catch (err: any) {
            console.error("Failed to fetch user profile", err);
            setError("Failed to load user profile");
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Auth State Error:", err);
        setError(err.message);
        setLoading(false);
      });
    } catch (e: any) {
      console.error("Auth Init Error:", e);
      setError(e.message);
      setLoading(false);
    }

    const timeoutId = setTimeout(() => {
      setLoading((isLoading) => {
        if (isLoading) {
          console.warn("⚠️ Auth listener timed out. Forcing app load.");
          return false;
        }
        return isLoading;
      });
    }, 4000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const value = {
    currentUser,
    loading,
    refreshUser,
    isAdmin: currentUser?.role === 'admin',
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {loading && (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
          <div className="w-12 h-12 border-4 border-summit-900 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-slate-500 font-medium animate-pulse">Starting Summit Portal...</div>
        </div>
      )}
    </AuthContext.Provider>
  );
};