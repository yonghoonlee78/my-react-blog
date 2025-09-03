import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import StakingTokenABI from '../abi/StakingToken.json';
import SimpleStakingABI from '../abi/SimpleStaking.json';

const CONTRACT_ADDRESSES = {
  TOKEN: "0x443e32954eF4Db723e082b5E731F6b260C96B62D",
  STAKING: "0x6d6953A9eA6FAB66e3174f5623092eb8746f3BB1"
};

const StakingDashboard: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [stakedAmount, setStakedAmount] = useState<string>('0');
  const [pendingRewards, setPendingRewards] = useState<string>('0');
  const [stakeInput, setStakeInput] = useState<string>('');
  const [unstakeInput, setUnstakeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [totalStaked, setTotalStaked] = useState<string>('0');
  const [rewardRate, setRewardRate] = useState<string>('0');
  const [lastTxHash, setLastTxHash] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showUnstakeModal, setShowUnstakeModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [newRewardRate, setNewRewardRate] = useState<string>('');
  const [mintAmount, setMintAmount] = useState<string>('');
  const [stakingStats, setStakingStats] = useState({
    totalRewardsEarned: '0',
    stakingDuration: 0,
    averageAPY: '10'
  });
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });
  const [autoCompound, setAutoCompound] = useState<boolean>(
    localStorage.getItem('autoCompound') === 'true'
  );
  const [earlyWithdrawFee, setEarlyWithdrawFee] = useState<string>('500');
  const [collectedFees, setCollectedFees] = useState<string>('0');
  const [withdrawFeeRate, setWithdrawFeeRate] = useState<string>('100');
  const [claimFeeRate, setClaimFeeRate] = useState<string>('0');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [newUnstakeFee, setNewUnstakeFee] = useState<string>('');
  const [newWithdrawFee, setNewWithdrawFee] = useState<string>('');
  const [newClaimFee, setNewClaimFee] = useState<string>('');
  const [newEarlyWithdrawFee, setNewEarlyWithdrawFee] = useState<string>('');

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  const styles = {
    container: {
      padding: '40px 20px',
      maxWidth: '900px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      border: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '24px',
      color: '#ffffff'
    },
    inputGroup: {
      display: 'flex',
      gap: '12px',
      alignItems: 'stretch',
      marginTop: '16px'
    },
    input: {
      flex: 1,
      padding: '14px 18px',
      fontSize: '16px',
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      transition: 'all 0.3s',
      outline: 'none',
    },
    button: {
      padding: '14px 28px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: '#333',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  };

  const handleSetFee = async (feeType: string, value: string) => {
    if (!provider || !value) return;
    
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );
      
      let tx;
      if (feeType === 'withdraw') {
        tx = await stakingContract.setWithdrawFee(value);
      } else if (feeType === 'early') {
        tx = await stakingContract.setEarlyWithdrawFee(value);
      } else if (feeType === 'claim') {
        tx = await stakingContract.setClaimFee(value);
      }
      
      await tx.wait();
      showNotification(`${feeType} 수수료 변경 성공!`, 'success');
      await loadBalances(account, provider);
    } catch (error) {
      handleError(error, '수수료 설정');
    }
    setLoading(false);
  };
  
  const handlePauseToggle = async () => {
    if (!provider) return;
    
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );
      
      const tx = isPaused 
        ? await stakingContract.unpause()
        : await stakingContract.pause();
      
      await tx.wait();
      setIsPaused(!isPaused);
      showNotification(isPaused ? '컨트랙트 재개됨' : '컨트랙트 일시중지됨', 'success');
    } catch (error) {
      handleError(error, 'Pause/Unpause');
    }
    setLoading(false);
  };
  
  const handleEmergencyWithdraw = async () => {
    if (!provider) return;
    
    const confirmed = window.confirm('정말로 모든 자금을 인출하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );
      
      const tx = await stakingContract.adminEmergencyWithdraw();
      await tx.wait();
      showNotification('긴급 출금 완료!', 'success');
      await loadBalances(account, provider);
    } catch (error) {
      handleError(error, '긴급 출금');
    }
    setLoading(false);
  };
  
  const handleWithdrawFees = async () => {
    if (!provider) return;
    
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );
      
      const tx = await stakingContract.withdrawCollectedFees();
      await tx.wait();
      showNotification('수수료 인출 완료!', 'success');
      setCollectedFees('0');
    } catch (error) {
      handleError(error, '수수료 인출');
    }
    setLoading(false);
  };
  
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask를 설치해주세요!');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setProvider(provider);
      setAccount(address);
      
      await loadBalances(address, provider);
    } catch (error) {
      handleError(error, '지갑 연결');
    }
  };

  const loadBalances = async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN,
        StakingTokenABI.abi,
        provider
      );
      
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        provider
      );

      const owner = await stakingContract.owner();
      const isOwnerAccount = owner.toLowerCase() === address.toLowerCase();
      setIsOwner(isOwnerAccount);

      const balance = await tokenContract.balanceOf(address);
      setBalance(ethers.formatEther(balance));

      const stakeInfo = await stakingContract.stakes(address);
      setStakedAmount(ethers.formatEther(stakeInfo.amount));

      const rewards = await stakingContract.getPendingRewards(address);
      setPendingRewards(parseFloat(ethers.formatEther(rewards)).toFixed(8));

      const total = await stakingContract.totalStaked();
      setTotalStaked(ethers.formatEther(total));

      const rate = await stakingContract.rewardRate();
      setRewardRate(rate.toString());

      const withdrawFee = await stakingContract.withdrawFee();
      const earlyFee = await stakingContract.earlyWithdrawFee();
      const claimFee = await stakingContract.claimFee();
      const fees = await stakingContract.collectedFees();
      const paused = await stakingContract.paused();
      
      setWithdrawFeeRate(withdrawFee.toString());
      setEarlyWithdrawFee(earlyFee.toString());
      setClaimFeeRate(claimFee.toString());
      setCollectedFees(ethers.formatEther(fees));
      setIsPaused(paused);

      const stakeTimestamp = stakeInfo.timestamp || stakeInfo.startTime;
      if (stakeTimestamp > 0) {
        const duration = Math.floor((Date.now() / 1000) - Number(stakeTimestamp));
        const days = Math.floor(duration / 86400);
        
        setStakingStats({
          totalRewardsEarned: pendingRewards,
          stakingDuration: days,
          averageAPY: '10'
        });
      }
    } catch (error) {
      console.error('잔액 로드 실패:', error);
    }
  };

  const handleSetRewardRate = async () => {
    if (!provider || !newRewardRate) return;
    
    setLoading(true);
    setLoadingMessage('보상률 변경 중...');
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );
      
      const tx = await stakingContract.setRewardRate(newRewardRate);
      await tx.wait();
      
      showNotification('보상률 변경 성공!', 'success');
      setRewardRate(newRewardRate);
      setNewRewardRate('');
      await loadBalances(account, provider);
    } catch (error) {
      handleError(error, '보상률 변경');
    }
    setLoading(false);
  };

  const handleMintRewards = async () => {
    if (!provider || !mintAmount) return;
    
    setLoading(true);
    setLoadingMessage('토큰 민팅 중...');
    try {
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN,
        StakingTokenABI.abi,
        signer
      );
      
      const amount = ethers.parseEther(mintAmount);
      const tx = await tokenContract.mint(CONTRACT_ADDRESSES.STAKING, amount);
      await tx.wait();
      
      showNotification(`${mintAmount} STK 민팅 성공!`, 'success');
      setMintAmount('');
      await loadBalances(account, provider);
    } catch (error) {
      handleError(error, '토큰 민팅');
    }
    setLoading(false);
  };

  const handleStake = async () => {
    if (!provider || !stakeInput) return;

    if (isPaused) {
      showNotification('컨트랙트가 일시중지 상태입니다', 'error');
      return;
    }

    setLoading(true);
    setLoadingMessage('토큰 승인 중...');

    try {
      const signer = await provider.getSigner();
      const amount = ethers.parseEther(stakeInput);

      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN,
        StakingTokenABI.abi,
        signer
      );
      
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );

      const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.STAKING, amount);
      await approveTx.wait();

      setLoadingMessage('스테이킹 처리 중...');
      
      const stakeTx = await stakingContract.stake(amount);
      setLastTxHash(stakeTx.hash);
      await stakeTx.wait();

      const history = JSON.parse(localStorage.getItem('stakingHistory') || '[]');
      history.push({
        type: 'stake',
        amount: stakeInput,
        txHash: stakeTx.hash,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('stakingHistory', JSON.stringify(history));

      showNotification('스테이킹 성공!', 'success');
      setStakeInput('');
      await loadBalances(account, provider);
    } catch (error) {
      handleError(error, '스테이킹');
    }
    setLoading(false);
  };

  const handleUnstake = async () => {
    if (!provider || !unstakeInput) return;

    if (isPaused) {
      showNotification('컨트랙트가 일시중지 상태입니다', 'error');
      return;
    }

    const stakeInfo = await (async () => {
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        provider
      );
      return await stakingContract.stakes(account);
    })();

    const stakedDuration = Math.floor((Date.now() / 1000) - Number(stakeInfo.startTime));
    const isEarlyWithdraw = stakedDuration < 3 * 24 * 60 * 60;
    const feeRate = isEarlyWithdraw ? Number(earlyWithdrawFee) / 100 : Number(withdrawFeeRate) / 100;
    const feeAmount = (parseFloat(unstakeInput) * feeRate / 100).toFixed(4);

    const confirmed = window.confirm(
      `정말 ${unstakeInput} STK를 언스테이킹 하시겠습니까?\n\n` +
      `현재 보상: ${pendingRewards} STK\n` +
      `적용 수수료: ${feeRate}% (${feeAmount} STK)\n` +
      `실제 수령액: ${(parseFloat(unstakeInput) - parseFloat(feeAmount)).toFixed(4)} STK\n` +
      `보상이 함께 지급됩니다.`
    );
    
    if (!confirmed) return;
  
    setLoading(true);
    setLoadingMessage('언스테이킹 처리 중...');

    try {
      const signer = await provider.getSigner();
      const amount = ethers.parseEther(unstakeInput);
      
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );

      const unstakeTx = await stakingContract.unstake(amount);
      setLastTxHash(unstakeTx.hash);
      await unstakeTx.wait();

      const history = JSON.parse(localStorage.getItem('stakingHistory') || '[]');
      history.push({
        type: 'unstake',
        amount: unstakeInput,
        txHash: unstakeTx.hash,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('stakingHistory', JSON.stringify(history));
  
      showNotification('언스테이킹 성공!', 'success'); 
      setUnstakeInput('');
      await loadBalances(account, provider);
    } catch (error) {
      handleError(error, '언스테이킹');
    }
    
    setLoading(false);
  };

  const handleClaimRewards = async () => {
    if (!provider) return;
    
    if (isPaused) {
      showNotification('컨트랙트가 일시중지 상태입니다', 'error');
      return;
    }

    const feeAmount = (parseFloat(pendingRewards) * Number(claimFeeRate) / 10000).toFixed(4);
    const actualReward = (parseFloat(pendingRewards) - parseFloat(feeAmount)).toFixed(4);
    
    if (Number(claimFeeRate) > 0) {
      const confirmed = window.confirm(
        `보상을 수령하시겠습니까?\n\n` +
        `보상액: ${pendingRewards} STK\n` +
        `수수료: ${Number(claimFeeRate) / 100}% (${feeAmount} STK)\n` +
        `실제 수령액: ${actualReward} STK`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setLoadingMessage('보상 수령 중...');

    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );

      const claimTx = await stakingContract.claimRewards();
      setLastTxHash(claimTx.hash);
      await claimTx.wait();

      const history = JSON.parse(localStorage.getItem('stakingHistory') || '[]');
      history.push({
        type: 'claim',
        amount: actualReward,
        txHash: claimTx.hash,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('stakingHistory', JSON.stringify(history));
      
      showNotification('보상 수령 성공!', 'success'); 
      await loadBalances(account, provider);
    } catch (error) {
      handleError(error, '보상 수령');
    }
    
    setLoading(false);
  };

  const handleAutoCompound = async () => {
    if (!provider) return;
    
    try {
        const signer = await provider.getSigner();
        const stakingContract = new ethers.Contract(
            CONTRACT_ADDRESSES.STAKING,
            SimpleStakingABI.abi,
            signer
        );
        
        const tokenContract = new ethers.Contract(
            CONTRACT_ADDRESSES.TOKEN,
            StakingTokenABI.abi,
            signer
        );
        
        // 클레임 전 잔액 저장
        const balanceBefore = await tokenContract.balanceOf(account);
        
        // 보상 클레임
        const claimTx = await stakingContract.claimRewards();
        await claimTx.wait();
        
        // 클레임 후 잔액
        const balanceAfter = await tokenContract.balanceOf(account);
        
        // 받은 보상만 계산
        const rewardAmount = balanceAfter - balanceBefore;
        
        if (rewardAmount > 0) {
            const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.STAKING, rewardAmount);
            await approveTx.wait();
            
            const stakeTx = await stakingContract.stake(rewardAmount);
            await stakeTx.wait();
        }
        
        showNotification('자동 재스테이킹 완료!', 'success');
        await loadBalances(account, provider);
    } catch (error) {
        console.error('Auto compound failed:', error);
    }
};

  const loadHistory = () => {
    const savedHistory = JSON.parse(localStorage.getItem('stakingHistory') || '[]');
    setHistory(savedHistory.reverse());
  };

  const handleError = (error: any, action: string) => {
    console.error(`${action} 실패:`, error);
    
    let message = `${action} 실패: `;
    
    if (error.message.includes('insufficient funds')) {
      message += '잔액이 부족합니다.';
    } else if (error.message.includes('user rejected')) {
      message += '사용자가 트랜잭션을 취소했습니다.';
    } else if (error.message.includes('Insufficient balance')) {
      message += '스테이킹된 금액이 부족합니다.';
    } else if (error.message.includes('paused')) {
      message += '컨트랙트가 일시중지 상태입니다.';
    } else {
      message += '트랜잭션 실패. 다시 시도해주세요.';
    }
    
    showNotification(message, 'error');
  };

  const getTierInfo = (amount: string) => {
    const staked = parseFloat(amount);
    if (staked >= 10000) return { tier: 'Diamond', bonus: '50%', color: '#b9f2ff' };
    if (staked >= 5000) return { tier: 'Gold', bonus: '25%', color: '#ffd700' };
    if (staked >= 1000) return { tier: 'Silver', bonus: '10%', color: '#c0c0c0' };
    return { tier: 'Bronze', bonus: '0%', color: '#cd7f32' };
  };
  
  const tierInfo = getTierInfo(stakedAmount);

  const calculateFee = (amount: string, isEarly: boolean = false) => {
    const value = parseFloat(amount);
    const rate = isEarly ? Number(earlyWithdrawFee) / 10000 : Number(withdrawFeeRate) / 10000;
    return value * rate;
  };
  
  useEffect(() => {
    loadHistory();
  }, [lastTxHash]); 

  useEffect(() => {
    if (!account || !provider) return;
    
    const interval = setInterval(() => {
      loadBalances(account, provider);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [account, provider]);

  useEffect(() => {
    if (!autoCompound || !provider || parseFloat(pendingRewards) < 0.1) return;
    
    const interval = setInterval(async () => {
      if (parseFloat(pendingRewards) >= 0.1) {
        await handleAutoCompound();
      }
    }, 3600000);
    
    return () => clearInterval(interval);
  }, [autoCompound, pendingRewards, provider]);

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: '10px' }}>{loadingMessage || '처리중...'}</p>
          </div>
        </div>
      )}

      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '15px 20px',
          background: notification.type === 'success' ? '#4CAF50' : 
                      notification.type === 'error' ? '#f44336' : '#2196F3',
          color: 'white',
          borderRadius: '5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1001,
          animation: 'slideIn 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {notification.type === 'success' ? '✅' : 
             notification.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {notification.message}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            Sepolia Staking Service
          </h1>
          <p style={{ color: '#666', fontSize: '18px' }}>
            토큰 스테이킹 · 보상 대시보드
          </p>
          {isPaused && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: '#ff9800',
              color: 'white',
              borderRadius: '5px',
              fontWeight: 'bold'
            }}>
              ⚠️ 컨트랙트가 일시중지 상태입니다
            </div>
          )}
        </div>

        {!account ? (
          <div style={{ ...styles.card, textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ marginBottom: '20px', color: '#ffffff' }}>
              지갑을 연결하여 시작하세요
            </h2>
            <button 
              onClick={connectWallet}
              style={{
                ...styles.button,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '16px 40px',
                fontSize: '18px'
              }}
            >
              지갑 연결
            </button>
          </div>
        ) : (
          <>
            <div style={styles.card}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0',
                textAlign: 'center'
              }}>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px' }}>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '12px', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    연결된 주소
                  </p>
                  <p style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#ffffff',
                    marginTop: '4px'
                  }}>
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
                
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px' }}>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '12px', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    토큰 잔액
                  </p>
                  <p style={{ 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: '#64b5f6',
                    marginTop: '4px'
                  }}>
                    {parseFloat(balance).toFixed(2)}
                  </p>
                  <p style={{ 
                    fontSize: '14px', 
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: '2px'
                  }}>
                    STK
                  </p>
                </div>
                
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px' }}>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '12px', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    스테이킹 금액
                  </p>
                  <p style={{ 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: '#ce93d8',
                    marginTop: '4px'
                  }}>
                    {parseFloat(stakedAmount).toFixed(2)}
                  </p>
                  <p style={{ 
                    fontSize: '14px', 
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: '2px'
                  }}>
                    STK
                  </p>
                </div>
                
                <div style={{ padding: '10px' }}>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '12px', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    예상 보상
                  </p>
                  <p style={{ 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: '#81c784',
                    marginTop: '4px'
                  }}>
                    {parseFloat(pendingRewards).toFixed(4)}
                  </p>
                  <p style={{ 
                    fontSize: '14px', 
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: '2px'
                  }}>
                    STK
                  </p>
                </div>
              </div>
            </div>

            {parseFloat(stakedAmount) > 0 && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                color: 'white'
              }}>
                <h3 style={{ margin: '0 0 10px 0' }}>📊 나의 스테이킹 통계</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <div>
                    <p style={{ margin: '5px 0', opacity: 0.9, fontSize: '12px' }}>스테이킹 기간</p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold' }}>
                      {stakingStats.stakingDuration}일
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '5px 0', opacity: 0.9, fontSize: '12px' }}>총 수익률</p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold' }}>
                      {((parseFloat(pendingRewards) / parseFloat(stakedAmount)) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '5px 0', opacity: 0.9, fontSize: '12px' }}>일일 평균 수익</p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold' }}>
                      {(parseFloat(stakedAmount) * 0.1 / 365).toFixed(4)} STK
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '5px 0', opacity: 0.9, fontSize: '12px' }}>예상 월 수익</p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold' }}>
                      {(parseFloat(stakedAmount) * 0.1 / 12).toFixed(2)} STK
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '5px 0', opacity: 0.9, fontSize: '12px' }}>티어</p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: tierInfo.color }}>
                      {tierInfo.tier} (+{tierInfo.bonus})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {parseFloat(stakedAmount) > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4>🎯 스테이킹 목표 (1000 STK)</h4>
                <div style={{ 
                  background: '#e0e0e0', 
                  borderRadius: '10px', 
                  height: '20px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                    height: '100%',
                    width: `${Math.min((parseFloat(stakedAmount) / 1000) * 100, 100)}%`,
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {((parseFloat(stakedAmount) / 1000) * 100).toFixed(1)}%
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {parseFloat(stakedAmount)} / 1000 STK
                </p>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>스테이킹</h3>
              
              {stakeInput && (
                <div style={{ 
                  marginTop: '10px', 
                  marginBottom: '10px',
                  padding: '20px', 
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#ffffff',
                  textAlign: 'center'
                }}>
                  <strong style={{ fontSize: '16px', marginBottom: '15px', display: 'block' }}>
                    예상 수익 (APY {Number(rewardRate) / 10}%)
                  </strong>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    marginTop: '15px'
                  }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '5px' }}>
                        일일
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {(parseFloat(stakeInput) * Number(rewardRate) / 1000 / 365).toFixed(4)} STK
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '5px' }}>
                        월간
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {(parseFloat(stakeInput) * Number(rewardRate) / 1000 / 12).toFixed(4)} STK
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '5px' }}>
                        연간
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {(parseFloat(stakeInput) * Number(rewardRate) / 1000).toFixed(4)} STK
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="스테이킹할 금액"
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  style={{
                    flex: '1 1 60%',
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    outline: 'none',
                    minWidth: '200px'
                  }}
                />
                <button 
                  onClick={handleStake} 
                  disabled={loading || isPaused}
                  style={{
                    flex: '0 1 25%',
                    padding: '14px 20px',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: loading || isPaused ? '#ccc' : '#4CAF50',
                    color: 'white',
                    minWidth: '100px'
                  }}
                >
                  {loading ? '처리중...' : 'Stake'}
                </button>
                <button
                  onClick={() => setStakeInput(balance)}
                  disabled={loading}
                  style={{
                    flex: '0 1 15%',
                    padding: '14px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    minWidth: '60px'
                  }}
                >
                  MAX
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>언스테이킹</h3>
              
              {unstakeInput && (
                <div style={{ 
                  marginTop: '10px',
                  marginBottom: '10px',
                  padding: '10px',
                  background: '#fff3cd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  color: '#856404'
                }}>
                  <strong>수수료 안내</strong><br/>
                  • 언스테이킹 수수료: {Number(withdrawFeeRate) / 100}% ({calculateFee(unstakeInput).toFixed(4)} STK)<br/>
                  • Early 언스테이킹 수수료 (3일 이내): {Number(earlyWithdrawFee) / 100}%<br/>
                  • 실제 수령액: 수수료 차감 후 지급
                </div>
              )}
              
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="언스테이킹할 금액"
                  value={unstakeInput}
                  onChange={(e) => setUnstakeInput(e.target.value)}
                  style={{
                    flex: '1 1 60%',
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    outline: 'none',
                    minWidth: '200px'
                  }}
                />
                <button 
                  onClick={handleUnstake} 
                  disabled={loading || isPaused}
                  style={{
                    flex: '0 1 25%',
                    padding: '14px 20px',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: loading || isPaused ? '#ccc' : '#f44336',
                    color: 'white',
                    minWidth: '100px'
                  }}
                >
                  {loading ? '처리중...' : 'Unstake'}
                </button>
                <button
                  onClick={() => setUnstakeInput(stakedAmount)}
                  disabled={loading}
                  style={{
                    flex: '0 1 15%',
                    padding: '14px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    minWidth: '60px'
                  }}
                >
                  MAX
                </button>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>보상 수령</h3>
              <p style={{ textAlign: 'center', fontSize: '18px', marginBottom: '20px' }}>
                현재 보상: <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{pendingRewards} STK</span>
                {Number(claimFeeRate) > 0 && (
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {' '}(수수료: {Number(claimFeeRate) / 100}%)
                  </span>
                )}
              </p>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '15px' 
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={autoCompound}
                    onChange={(e) => {
                      setAutoCompound(e.target.checked);
                      localStorage.setItem('autoCompound', String(e.target.checked));
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>자동 재스테이킹 (1시간마다)</span>
                </label>
                
                <button 
                  onClick={handleClaimRewards} 
                  disabled={loading || parseFloat(pendingRewards) === 0 || isPaused}
                  style={{
                    padding: '12px 40px',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: loading || parseFloat(pendingRewards) === 0 || isPaused ? '#ccc' : '#2196F3',
                    color: 'white',
                    transition: 'all 0.3s',
                    minWidth: '200px'
                  }}
                >
                  {loading ? '처리중...' : 'Claim Rewards'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
                거래 내역
              </h3>
              
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid #334155', 
                borderRadius: '8px',
                padding: '15px',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                color: '#ffffff'
              }}>
                {history.length === 0 ? (
                  <p style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    textAlign: 'center',
                    padding: '20px 0'
                  }}>
                    거래 내역이 없습니다
                  </p>
                ) : (
                  history.map((item, index) => (
                    <div key={index} style={{ 
                      marginBottom: '15px', 
                      paddingBottom: '15px', 
                      borderBottom: index !== history.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold',
                        fontSize: '16px',
                        marginBottom: '8px',
                        color: item.type === 'stake' ? '#81c784' : 
                               item.type === 'unstake' ? '#ff8a80' : '#64b5f6'
                      }}>
                        {item.type === 'stake' ? '스테이킹' : 
                         item.type === 'unstake' ? '언스테이킹' : '보상 수령'}: {item.amount} STK
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'rgba(255,255,255,0.8)',
                        marginBottom: '4px'
                      }}>
                        {new Date(item.timestamp).toLocaleString('ko-KR')}
                      </div>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${item.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontSize: '12px', 
                          color: '#4fc3f7',
                          textDecoration: 'none'
                        }}
                      >
                        {item.txHash.slice(0, 8)}...
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {lastTxHash && (
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', 
                borderRadius: '8px',
                textAlign: 'center',
                color: '#ffffff'
              }}>
                <p style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                  마지막 트랜잭션
                </p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#4fc3f7', 
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)} ↗
                </a>
              </div>
            )}

            <div style={{ marginTop: '30px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
              <p>* APY: {Number(rewardRate) / 10}% (연이율)</p>
              <p>* 보상은 실시간으로 계산됩니다</p>
              <p>* 언스테이킹시 보상이 자동 지급됩니다</p>
              <p>* 수수료: 일반 {Number(withdrawFeeRate) / 100}%, 조기(3일) {Number(earlyWithdrawFee) / 100}%</p>
            </div>
          </>
        )}
      </div>

      {isOwner && showAdminPanel && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
            }}
            onClick={() => setShowAdminPanel(false)}
          />
          
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            zIndex: 1000,
            maxWidth: '600px',
            width: '90%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#ff5722', margin: '0 auto', textAlign: 'center' }}>🔧 관리자 기능</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                style={{
                    position: 'absolute',
                    right: '10px',      // 오른쪽에서 10px
                    top: '10px',        // 위에서 10px
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '5px',
                    lineHeight: '1',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
              >
                ✕
              </button>
            </div>

            <div style={{ 
              marginBottom: '25px', 
              padding: '20px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', marginBottom: '15px' }}>📊 현황</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '15px',
                color: 'white'
              }}>
                <div>
                  <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '5px' }}>총 스테이킹</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalStaked} STK</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '5px' }}>누적 수수료</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{collectedFees} STK</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '5px' }}>컨트랙트 상태</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {isPaused ? '⏸️ 일시중지' : '✅ 정상작동'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '15px' }}>보상률 설정</h3>
              <p style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
                현재: {rewardRate} (연 {Number(rewardRate) / 10}%)
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="새 보상률 (100 = 10%)"
                  value={newRewardRate}
                  onChange={(e) => setNewRewardRate(e.target.value)}
                  style={{
                    flex: 1,
                    maxWidth: '300px',
                    padding: '10px',
                    fontSize: '14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSetRewardRate}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    minWidth: '80px',      
                    maxWidth: '100px'      
                  }}
                >
                  변경
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '15px' }}>수수료 설정</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                  언스테이킹 수수료 (현재: {Number(withdrawFeeRate) / 100}%)
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="수수료율 (100 = 1%)"
                    value={newWithdrawFee}
                    onChange={(e) => setNewWithdrawFee(e.target.value)}
                    style={{
                      flex: 1,
                      maxWidth: '300px',
                      padding: '10px',
                      fontSize: '14px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={() => handleSetFee('withdraw', newWithdrawFee)}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      maxWidth: '100px', 
                      minWidth: '80px'
                    }}
                  >
                    변경
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                 Early 언스테이킹 수수료 (현재: {Number(earlyWithdrawFee) / 100}%)
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="수수료율 (500 = 5%)"
                    value={newEarlyWithdrawFee}
                    onChange={(e) => setNewEarlyWithdrawFee(e.target.value)}
                    style={{
                      flex: 1,
                      maxWidth: '300px',
                      padding: '10px',
                      fontSize: '14px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={() => handleSetFee('early', newEarlyWithdrawFee)}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      minWidth: '80px',      
                      maxWidth: '100px'      
                    }}
                  >
                    변경
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                  보상 클레임 수수료 (현재: {Number(claimFeeRate) / 100}%)
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="수수료율 (0 = 0%)"
                    value={newClaimFee}
                    onChange={(e) => setNewClaimFee(e.target.value)}
                    style={{
                      flex: 1,
                      maxWidth: '300px',
                      padding: '10px',
                      fontSize: '14px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={() => handleSetFee('claim', newClaimFee)}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      minWidth: '80px',      
                      maxWidth: '100px'      
                    }}
                  >
                    변경
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleWithdrawFees}
                disabled={loading || parseFloat(collectedFees) === 0}
                style={{
                  padding: '12px 30px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#9c27b0',
                  color: 'white',
                  marginTop: '10px',
                  width: '100%',
                  maxWidth: '400px'
                }}
              >
                누적 수수료 인출 ({collectedFees} STK)
              </button>
            </div>

            {/* 긴급 제어 섹션 */}
            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '15px', color: '#f44336' }}>긴급 제어</h3>
              
              <button
                onClick={handlePauseToggle}
                disabled={loading}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isPaused ? '#4CAF50' : '#f44336',
                  color: 'white',
                  marginBottom: '10px'
                }}
              >
                {isPaused ? 'Unpause (재개)' : 'Pause (일시중지)'}
              </button>

              <button
                onClick={handleEmergencyWithdraw}
                disabled={loading}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#f44336',
                  color: 'white'
                }}
              >
                🚨 긴급 출금 (모든 자금 회수)
              </button>
            </div>
            
            {/* 보상 풀 충전 섹션 */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '15px' }}>보상 풀 충전</h3>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="민팅할 토큰 수량"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  style={{
                    flex: 1,
                    maxWidth: '300px',
                    padding: '10px',
                    fontSize: '14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleMintRewards}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: '#2196f3',
                    color: 'white',
                    minWidth: '80px',      // 추가: 최소 너비 설정
                    maxWidth: '100px'      // 추가: 최대 너비 제한
                  }}
                >
                  민팅
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isOwner && (
        <button
          onClick={() => setShowAdminPanel(true)}
          style={{ 
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '15px',
            background: '#808080',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            zIndex: 100
          }}
        >
          ⚙️
        </button>
      )}
    </>
  );
};

export default StakingDashboard;