import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import './WalletLogin.css';

interface WalletLoginProps {
  onSuccess: (userData: any) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

const WalletLogin: React.FC<WalletLoginProps> = ({ onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const connectWallet = async () => {
    setLoading(true);
    setError('');

    try {
      // MetaMask 설치 확인
      if (!window.ethereum) {
        setError('MetaMask가 설치되어 있지 않습니다.');
        window.open('https://metamask.io/download/', '_blank');
        setLoading(false);
        return;
      }

      // 계정 연결 요청
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        setError('계정을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      const address = accounts[0];
      console.log('Connected wallet:', address);

      // Sepolia 네트워크 전환
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia test network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          } catch (addError) {
            console.error('네트워크 추가 실패:', addError);
            setError('Sepolia 네트워크 추가 실패');
            setLoading(false);
            return;
          }
        } else {
          console.error('네트워크 전환 실패:', switchError);
          setError('네트워크 전환 실패');
          setLoading(false);
          return;
        }
      }

      // 현재 로그인된 사용자 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email) {
        const { data, error: updateError } = await supabase
          .from('users')
          .update({ wallet_address: address })
          .eq('email', session.user.email)
          .select()
          .single();

        if (updateError) {
          console.error('사용자 정보 업데이트 실패:', updateError);
          setError('사용자 정보 업데이트 실패');
        } else if (data) {
          console.log('사용자 정보 업데이트 성공:', data);
          onSuccess(data);
          alert('지갑이 연결되었습니다!');
        }
      } else {
        // 세션이 없는 경우 localStorage 사용
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
          const { data, error: updateError } = await supabase
            .from('users')
            .update({ wallet_address: address })
            .eq('email', userEmail)
            .select()
            .single();

          if (updateError) {
            console.error('사용자 정보 업데이트 실패:', updateError);
            setError('사용자 정보 업데이트 실패');
          } else if (data) {
            console.log('사용자 정보 업데이트 성공:', data);
            onSuccess(data);
            alert('지갑이 연결되었습니다!');
          }
        } else {
          setError('로그인이 필요합니다.');
        }
      }

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setError(error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>MetaMask 지갑 연결</h2>
        <p className="network-info">Ethereum Sepolia 테스트넷</p>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="wallet-icon">
          🦊
        </div>

        <button 
          className="connect-wallet-btn"
          onClick={connectWallet}
          disabled={loading}
        >
          {loading ? '연결 중...' : '🦊 MetaMask 연결하기'}
        </button>

        <div className="wallet-instructions">
          <h4>연결 순서</h4>
          <ol>
            <li>MetaMask 연결 버튼 클릭</li>
            <li>MetaMask 팝업에서 계정 선택</li>
            <li>연결 승인</li>
            <li>Sepolia 네트워크로 자동 전환</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default WalletLogin;