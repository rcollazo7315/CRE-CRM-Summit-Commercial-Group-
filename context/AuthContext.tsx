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
      console.warn("Database connection pending or offline.");
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
    }, (error) => {
      console.error("Auth State Listener Error:", error);
      setLoading(false);
    });

    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn("Auth check timed out, proceeding.");
        return false;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

