
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App.tsx';

// Global Error Handler for startup crashes
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    // Only overwrite if root is empty (prevent overwriting actual app errors caught by React)
    if (!root.hasChildNodes()) {
      root.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; margin: 20px; border-radius: 8px;">
          <h2 style="margin-top: 0;">Application Error</h2>
          <p>The application failed to start correctly.</p>
          <pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 4px; overflow: auto;">${event.message}</pre>
          <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
        </div>
      `;
    }
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
