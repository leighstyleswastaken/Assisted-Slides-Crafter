
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Note: 'scope: /' requires the Service-Worker-Allowed header if sw.js is in a subdirectory.
    // If that header is missing, the browser console will log a scope error.
    navigator.serviceWorker.register('/public/sw.js', { scope: '/' }).then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
