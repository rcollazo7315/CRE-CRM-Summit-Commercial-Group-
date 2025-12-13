
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseInitialized } from '../firebase/config';
import { api } from '../services/firestore';
import { UserAccount } from '../types';

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
    // 1. Check if Firebase failed to init or auth is missing
    if (!isFirebaseInitialized() || !auth) {
      console.error("Firebase not initialized in AuthContext");
      setError("Database connection failed. Please check configuration.");
      setLoading(false);
      return;
    }

    // 2. Set up listener
    let unsubscribe: (() => void) | undefined;
    
    try {
      unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Fetch full user profile from Firestore
            const userData = await api.getCurrentUser(firebaseUser.uid);
            setCurrentUser(userData);
          } catch (err: any) {
            console.error("Failed to fetch user profile", err);
            setError(err.message || "Failed to load user profile");
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
      console.error("Auth listener creation failed:", e);
      setError("Auth System Error: " + e.message);
      setLoading(false);
    }

    // 3. Safety Timeout: If Firebase takes too long, stop loading so user isn't stuck
    const safetyTimeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("Auth listener timed out - forcing loading to false");
          return false;
        }
        return currentLoading;
      });
    }, 5000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(safetyTimeout);
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
          <div className="text-slate-500 font-medium">Loading Summit Portal...</div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
