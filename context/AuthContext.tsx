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
    if (!isFirebaseInitialized() || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await api.getCurrentUser(firebaseUser.uid);
          setCurrentUser(userData);
        } catch (err) {
          console.error("Profile Load Failed:", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, refreshUser, isAdmin: currentUser?.role === 'admin' }}>
      {!loading ? children : (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
          <div className="w-12 h-12 border-4 border-summit-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-white font-medium animate-pulse tracking-widest text-xs uppercase">Connecting to Summit Cloud...</div>
        </div>
      )}
    </AuthContext.Provider>
  );
};