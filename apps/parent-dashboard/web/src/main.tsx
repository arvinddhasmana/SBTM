import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initPromise } from './i18n/config';
import App from './App.tsx';

// Wait for i18n to be fully initialized before rendering
initPromise.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"><div className="text-white">Loading...</div></div>}>
        <App />
      </Suspense>
    </StrictMode>,
  );
});
