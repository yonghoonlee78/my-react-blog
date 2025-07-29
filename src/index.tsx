import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sepolia } from 'wagmi/chains';
import { metaMask } from '@wagmi/connectors';

// wagmi 클라이언트 설정
const config = createConfig({
  chains: [sepolia],
  connectors: [metaMask()],
  transports: {
    [sepolia.id]: http(), // or use alchemy(), infura(), publicProvider(), etc.
  },
});

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

reportWebVitals();
