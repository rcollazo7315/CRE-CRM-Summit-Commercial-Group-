
import React, { useState } from 'react';
import { Shield, Save, AlertTriangle, AlertCircle } from 'lucide-react';

interface SetupPageProps {
  error?: Error | null;
}

const SetupPage: React.FC<SetupPageProps> = ({ error }) => {
  const [keys, setKeys] = useState({
    VITE_FIREBASE_API_KEY: '',
    VITE_FIREBASE_AUTH_DOMAIN: '',
    VITE_FIREBASE_PROJECT_ID: '',
    VITE_FIREBASE_STORAGE_BUCKET: '',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '',
    VITE_FIREBASE_APP_ID: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeys({ ...keys, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // Save to LocalStorage so the config.ts file can read them on reload
    // We explicitly trim whitespace to avoid copy-paste errors
    Object.entries(keys).forEach(([key, value]) => {
      localStorage.setItem(key, String(value).trim());
    });
    // Force reload to re-run config.ts
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden">
        <div className={`p-6 text-white flex items-center gap-3 ${error ? 'bg-red-500' : 'bg-amber-500'}`}>
          <AlertTriangle size={32} />
          <div>
            <h1 className="text-2xl font-bold">{error ? 'Initialization Failed' : 'Database Connection Required'}</h1>
            <p className="opacity-90">{error ? 'Firebase failed to start. Check your configuration.' : 'The application cannot find your Firebase configuration.'}</p>
          </div>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 mb-6 flex gap-3 items-start">
               <AlertCircle className="shrink-0 mt-0.5" size={20} />
               <div className="overflow-hidden">
                 <p className="font-bold mb-1">Error Details:</p>
                 <pre className="text-xs whitespace-pre-wrap font-mono break-all">{error.message}</pre>
               </div>
            </div>
          )}

          <p className="text-slate-600 mb-6">
            To fix the issue, please copy your configuration values from the 
            <strong> Firebase Console {'>'} Project Settings {'>'} General {'>'} Your Apps</strong> and paste them below.
          </p>

          <div className="space-y-4">
            {Object.keys(keys).map((key) => (
              <div key={key}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{key.replace('VITE_FIREBASE_', '')}</label>
                <input
                  name={key}
                  type="text"
                  placeholder={`Paste ${key}...`}
                  onChange={handleChange}
                  className="w-full p-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            ))}
          </div>

          <button 
            onClick={handleSave}
            className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Save size={20} /> Save Configuration & Restart
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
