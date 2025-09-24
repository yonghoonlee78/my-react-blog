import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// wagmi 관련 import 모두 삭제
// import { WagmiProvider, createConfig, http } from 'wagmi';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { sepolia } from 'wagmi/chains';
// import { metaMask } from '@wagmi/connectors';

// wagmi config 삭제
// const config = createConfig({...});
// const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();