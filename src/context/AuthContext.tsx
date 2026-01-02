
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseInitialized } from '../firebase/config.ts';
import { api } from '../services/firestore.ts';
import { mockApi } from '../services/mockApi.ts';
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
    // Check if we are using Firebase or Mock
    if (auth?.currentUser) {
      try {
        const userData = await api.getCurrentUser(auth.currentUser.uid);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Auth Refresh Failed:", error);
      }
    } else {
        // Try mock session refresh
        const mockUser = await mockApi.getSession();
        if(mockUser) setCurrentUser(mockUser);
    }
  };

  useEffect(() => {
    // If Firebase is unavailable, try to load from Mock API immediately
    if (!isFirebaseInitialized() || !auth) {
      console.warn("Database connection offline. Switching to Mock Mode.");
      mockApi.getSession().then(user => {
          if (user) {
              console.log("Restored Mock Session for:", user.email);
              setCurrentUser(user);
          }
          setLoading(false);
      });
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
        if (prev) {
          console.warn("Auth check timed out, proceeding.");
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
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
