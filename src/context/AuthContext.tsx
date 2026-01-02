
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
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  refreshUser: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (auth?.currentUser) {
      try {
        const userData = await api.getCurrentUser(auth.currentUser.uid);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Auth Refresh Failed:", error);
      }
    }
  };

  useEffect(() => {
    console.log("[AuthProvider] Starting initialization...");
    
    // If Firebase is not ready, we can't authenticate. 
    // We stop loading so App can decide to show SetupPage.
    if (!isFirebaseInitialized() || !auth) {
      console.warn("[AuthProvider] Firebase not initialized - waiting for configuration.");
      setLoading(false);
      return;
    }

    console.log("[AuthProvider] Setting up onAuthStateChanged listener");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AuthProvider] Auth state changed. User:", firebaseUser?.uid);
      if (firebaseUser) {
        try {
          const userData = await api.getCurrentUser(firebaseUser.uid);
          setCurrentUser(userData);
        } catch (err) {
          console.error("[AuthProvider] Profile Load Failed:", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("[AuthProvider] Auth State Listener Error:", error);
      setLoading(false);
    });

    // Fallback safety timer in case onAuthStateChanged hangs (e.g. network issues)
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("[AuthProvider] Auth initialization timed out - forcing load completion.");
          return false;
        }
        return prev;
      });
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const value = {
    currentUser,
    loading,
    refreshUser,
    isAdmin: currentUser?.role === 'admin',
  };

  // Logic Change: Always render children. The consumer (App.tsx) decides what to display based on `loading`.
  // This prevents the "infinite spinner" if a child component crashes or if loading logic gets stuck.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
