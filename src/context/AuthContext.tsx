
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
    // Safety valve: If Firebase isn't ready in 2 seconds, stop loading so user sees the Login screen (or error)
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Auth initialization timed out - forcing load.");
          return false;
        }
        return prev;
      });
    }, 2000);

    if (!isFirebaseInitialized() || !auth) {
      console.warn("Database connection pending or offline.");
      // We don't set loading false immediately to allow safetyTimer to handle the visual transition
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
      clearTimeout(safetyTimer);
    }, (error) => {
      console.error("Auth State Listener Error:", error);
      setLoading(false);
      clearTimeout(safetyTimer);
    });

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

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {loading && (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
          <p style={{ marginTop: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Verifying Credentials...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};
