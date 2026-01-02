
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App.tsx';

console.log("[Index] Script starting...");

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element missing");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
