// components/WalletLogin.tsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { supabase } from '../utils/supabaseClient';
import './WalletLogin.css';

import metamaskLogo from '../assets/metamask.png';  // wallets 폴더 제거
import phantomLogo from '../assets/phantom.png';     // wallets 폴더 제거  

declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}

interface WalletLoginProps {
  onSuccess: (user: any) => void;
  onClose: () => void;
}

const WalletLogin: React.FC<WalletLoginProps> = ({ onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');

  useEffect(() => {
    // 저장된 월렛 주소로 자동 로그인
    const savedAddress = localStorage.getItem('walletAddress');
    const savedType = localStorage.getItem('walletType');
    
    if (savedAddress && savedType) {
      autoLogin(savedAddress, savedType);
    }
  }, []);

  const autoLogin = async (address: string, type: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .single();

      if (data) {
        onSuccess(data);
        onClose();
      }
    } catch (err) {
      console.error('Auto login failed:', err);
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletType');
    }
  };

  // MetaMask 연결
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      setError('MetaMask가 설치되지 않았습니다');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setLoading(true);
    setError('');
    setSelectedWallet('metamask');

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const address = accounts[0].toLowerCase();
      
      // 서명 생성
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = `BTC Prediction Game 로그인\n\n지갑 주소: ${address}\n시간: ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);

      // DB 저장
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .upsert({
          wallet_address: address,
          wallet_type: 'metamask',
          username: `User_${address.slice(0, 6)}`,
          points: 1000,
          streak: 0,
          consecutive_days: 0,
          last_login: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      localStorage.setItem('walletAddress', address);
      localStorage.setItem('walletType', 'metamask');
      
      onSuccess(userData);
      onClose();
      
    } catch (err: any) {
      setError(err.message || 'MetaMask 연결 실패');
    } finally {
      setLoading(false);
      setSelectedWallet('');
    }
  };

  const connectPhantom = async () => {
    const { solana } = window;
    
    if (!solana || !solana.isPhantom) {
      setError('Phantom 월렛이 설치되지 않았습니다');
      window.open('https://phantom.app/', '_blank');
      return;
    }
  
    setLoading(true);
    setError('');
    setSelectedWallet('phantom');
  
    try {
      // 연결 시 onlyIfTrusted 옵션 제거
      const response = await solana.connect();
      const publicKey = response.publicKey.toString();
      
      // DB 저장 시 에러 처리 개선
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', publicKey.toLowerCase())
        .single();
  
      let userData;
      
      if (existingUser) {
        // 기존 유저면 업데이트
        const { data, error } = await supabase
          .from('users')
          .update({
            last_login: new Date().toISOString()
          })
          .eq('wallet_address', publicKey.toLowerCase())
          .select()
          .single();
          
        userData = data;
      } else {
        // 새 유저면 생성
        const { data, error } = await supabase
          .from('users')
          .insert({
            wallet_address: publicKey.toLowerCase(),
            wallet_type: 'phantom',
            username: `User_${publicKey.slice(0, 6)}`,
            points: 1000,
            streak: 0,
            consecutive_days: 0,
            last_login: new Date().toISOString()
          })
          .select()
          .single();
          
        userData = data;
      }
  
      if (userData) {
        localStorage.setItem('walletAddress', publicKey);
        localStorage.setItem('walletType', 'phantom');
        onSuccess(userData);
        onClose();
      }
      
    } catch (err: any) {
      console.error('Phantom error:', err);
      setError('Phantom 연결 실패: ' + err.message);
    } finally {
      setLoading(false);
      setSelectedWallet('');
    }
  };


  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      logo: metamaskLogo,  // icon 대신 logo로 변경
      description: 'Ethereum, BSC, Polygon',
      connect: connectMetaMask,
      color: '#f6851b'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      logo: phantomLogo,  // icon 대신 logo로 변경
      description: 'Solana',
      connect: connectPhantom,
      color: '#ab9ff2'
    }
  ];

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>×</button>
        
        <div className="wallet-header">
          <h2>지갑 연결</h2>
          <p>Web3 지갑으로 간편 로그인</p>
        </div>
  
        {error && (
          <div className="wallet-error">
            ⚠️ {error}
          </div>
        )}
  
        <div className="wallet-grid">
          {wallets.map(wallet => (
            <button
              key={wallet.id}
              className={`wallet-card ${selectedWallet === wallet.id ? 'active' : ''}`}
              onClick={wallet.connect}
              disabled={loading}
              style={{
                '--wallet-color': wallet.color
              } as React.CSSProperties}
            >
              <img 
                src={wallet.logo} 
                alt={wallet.name}
                className="wallet-logo"
              />
              <div className="wallet-info">
                <div className="wallet-name">{wallet.name}</div>
                <div className="wallet-description">{wallet.description}</div>
              </div>
              {loading && selectedWallet === wallet.id && (
                <div className="wallet-loading">
                  <div className="spinner"></div>
                </div>
              )}
            </button>
          ))}
        </div>
  
        <div className="wallet-footer">
          <p>지갑이 없으신가요?</p>
          <div className="wallet-links">
            <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">MetaMask 설치</a>
            <span>•</span>
            <a href="https://phantom.app" target="_blank" rel="noopener noreferrer">Phantom 설치</a>
          </div>
        </div>
      </div>
    </div>
  );
}; 

export default WalletLogin;