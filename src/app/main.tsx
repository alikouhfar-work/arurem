import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { LedgerPage } from './LedgerPage';
import '@/shared/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LedgerPage />
    <Toaster
      position="bottom-center"
      gutter={8}
      containerClassName="!z-[100]"
      toastOptions={{ duration: 4000 }}
    />
  </StrictMode>,
);
