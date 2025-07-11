import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { captureXTrackyData } from './utils/xTrackyUtils';

// Capturar dados do xTracky assim que a aplicação carregar
captureXTrackyData();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
