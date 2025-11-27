
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { api } from '../services/firestore';
import { UserAccount } from '../types';

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
    // If auth isn't initialized (missing keys), stop here.
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await api.getCurrentUser(firebaseUser.uid);
          setCurrentUser(userData);
        } catch (err) {
          console.error("Failed to fetch user profile", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    refreshUser,
    isAdmin: currentUser?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
