// src/utils/walletConnection.ts
export const connectWalletDirect = async () => {
    // wagmi 없이 직접 연결
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      return accounts[0];
    }
    return null;
  };