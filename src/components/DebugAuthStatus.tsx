
import React from 'react';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export const DebugAuthStatus: React.FC = () => {
  const { currentUser } = useAuth();
  
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-slate-900 text-white rounded-lg text-xs z-[9999] opacity-75 hover:opacity-100 transition-opacity font-mono">
      <h3 className="font-bold border-b border-slate-700 pb-1 mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>Firebase: {auth.currentUser ? '✅ Connected' : '❌ Disconnected'}</div>
        <div>UID: {auth.currentUser?.uid || 'N/A'}</div>
        <div>Context User: {currentUser ? '✅ Loaded' : '❌ Missing'}</div>
        <div>Context ID: {currentUser?.id || 'N/A'}</div>
        {auth.currentUser?.uid !== currentUser?.id && (
          <div className="text-red-400 font-bold mt-2">⚠️ ID Mismatch!</div>
        )}
      </div>
    </div>
  );
};
