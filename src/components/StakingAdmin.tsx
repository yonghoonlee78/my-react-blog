import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import StakingTokenABI from '../abi/StakingToken.json';
import SimpleStakingABI from '../abi/SimpleStaking.json';

const CONTRACT_ADDRESSES = {
  TOKEN: "0x443e32954eF4Db723e082b5E731F6b260C96B62D",
  STAKING: "0x6d6953A9eA6FAB66e3174f5623092eb8746f3BB1"
};

const StakingAdmin: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [rewardRate, setRewardRate] = useState<string>('');
  const [newRewardRate, setNewRewardRate] = useState<string>('');
  const [mintAmount, setMintAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [totalStaked, setTotalStaked] = useState<string>('0');
  const [contractBalance, setContractBalance] = useState<string>('0');
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [withdrawFee, setWithdrawFee] = useState<string>('100');
  const [earlyWithdrawFee, setEarlyWithdrawFee] = useState<string>('500');
  const [newWithdrawFee, setNewWithdrawFee] = useState<string>('');
  const [newEarlyWithdrawFee, setNewEarlyWithdrawFee] = useState<string>('');
  const [batchAddresses, setBatchAddresses] = useState<string>('');
  const [claimFeeRate, setClaimFeeRate] = useState<string>('0');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [newClaimFee, setNewClaimFee] = useState<string>('');
  const [collectedFees, setCollectedFees] = useState<string>('0');

  const styles = {
    input: {
      padding: '8px',
      marginRight: '10px',
      width: '200px',
      border: '1px solid #ddd',
      borderRadius: '4px'
    },
    inputGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px',
      alignItems: 'center'
    },
    button: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      color: 'white'
    }
  };

  const checkOwner = async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        provider
      );
      
      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN,
        StakingTokenABI.abi,
        provider
      );
      
      const owner = await stakingContract.owner();
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
      
      const rate = await stakingContract.rewardRate();
      setRewardRate(rate.toString());
      
      const total = await stakingContract.totalStaked();
      setTotalStaked(ethers.formatEther(total));
      
      const balance = await tokenContract.balanceOf(CONTRACT_ADDRESSES.STAKING);
      setContractBalance(ethers.formatEther(balance));
      
      const withdrawFeeVal = await stakingContract.withdrawFee();
      const earlyFeeVal = await stakingContract.earlyWithdrawFee();
      const claimFeeVal = await stakingContract.claimFee();
      const fees = await stakingContract.collectedFees();
      const paused = await stakingContract.paused();
      
      setWithdrawFee(withdrawFeeVal.toString());
      setEarlyWithdrawFee(earlyFeeVal.toString());
      setClaimFeeRate(claimFeeVal.toString());
      setCollectedFees(ethers.formatEther(fees));
      setIsPaused(paused);
      
    } catch (error) {
      console.error('Owner 확인 실패:', error);
    }
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
      
      await checkOwner(address, provider);
    } catch (error) {
      console.error('지갑 연결 실패:', error);
    }
  };

  const handleSetRewardRate = async () => {
    if (!provider || !newRewardRate) return;
    
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );
      
      const tx = await stakingContract.setRewardRate(newRewardRate);
      await tx.wait();

      setTxHistory([...txHistory, {
        type: 'reward_rate_change',
        value: newRewardRate,
        txHash: tx.hash,
        timestamp: new Date().toISOString()
      }]);
      
      setMessage('보상률 변경 성공!');
      setRewardRate(newRewardRate);
      setNewRewardRate('');
    } catch (error: any) {
      setMessage('보상률 변경 실패');
      console.error(error);
    }
    setLoading(false);
  };

  const handleMintRewards = async () => {
    if (!provider || !mintAmount) return;
    
    setLoading(true);
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
      
      setMessage(`${mintAmount} STK 민팅 성공!`);
      setMintAmount('');
      await checkOwner(account, provider);
    } catch (error) {
      setMessage('민팅 실패');
      console.error(error);
    }
    setLoading(false);
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
      
      if (feeType === 'withdraw') setWithdrawFee(value);
      else if (feeType === 'early') setEarlyWithdrawFee(value);
      else if (feeType === 'claim') setClaimFeeRate(value);
      
      setMessage(`${feeType} 수수료 변경 성공!`);
    } catch (error: any) {
      setMessage(`수수료 설정 실패: ${error.message}`);
      console.error(error);
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
      
      setMessage('수수료 인출 완료!');
      setCollectedFees('0');
    } catch (error: any) {
      setMessage(`수수료 인출 실패: ${error.message}`);
      console.error(error);
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
      setMessage(isPaused ? '컨트랙트 재개됨' : '컨트랙트 일시중지됨');
    } catch (error: any) {
      setMessage(`Pause/Unpause 실패: ${error.message}`);
      console.error(error);
    }
    setLoading(false);
  };

  const handleEmergencyWithdraw = async () => {
    if (!provider) return;
    
    const confirmed = window.confirm(
      '정말로 모든 자금을 인출하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
    );
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
      
      setMessage('긴급 출금 완료!');
      await checkOwner(account, provider);
    } catch (error: any) {
      setMessage(`긴급 출금 실패: ${error.message}`);
      console.error(error);
    }
    setLoading(false);
  };

  const handleBatchRewards = async (addresses: string[]) => {
    if (!provider) return;
    
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.STAKING,
        SimpleStakingABI.abi,
        signer
      );
      
      const tx = await stakingContract.batchClaim(addresses);
      await tx.wait();
      setMessage('배치 보상 지급 완료!');
    } catch (error) {
      setMessage('배치 보상 지급 실패');
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>⚙️ Staking Admin Panel</h1>
      
      {!account ? (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
          관리자 지갑 연결
        </button>
      ) : !isOwner ? (
        <div style={{ color: 'red', padding: '20px', background: '#ffebee', borderRadius: '5px' }}>
          ⚠️ 관리자 권한이 없습니다. Owner 계정으로 접속해주세요.
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
            <p>✅ 관리자 인증 완료</p>
            <p>주소: {account.slice(0, 6)}...{account.slice(-4)}</p>
          </div>

          <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3>📊 스테이킹 현황</h3>
            <p>전체 스테이킹: {totalStaked} STK</p>
            <p>컨트랙트 잔액: {contractBalance} STK</p>
            <p>누적 수수료: {collectedFees} STK</p>
            <p>컨트랙트 상태: {isPaused ? '⏸️ 일시중지' : '✅ 정상작동'}</p>
          </div>

          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>📈 보상률 관리</h3>
            <p>현재 보상률: {rewardRate} (연 {Number(rewardRate) / 10}%)</p>
            <div style={styles.inputGroup}>
              <input
                type="number"
                placeholder="새 보상률 (100 = 10%)"
                value={newRewardRate}
                onChange={(e) => setNewRewardRate(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleSetRewardRate}
                disabled={loading}
                style={{ ...styles.button, backgroundColor: '#4CAF50' }}
              >
                변경
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>💸 수수료 관리</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label>일반 인출 수수료: {Number(withdrawFee) / 100}%</label>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="새 수수료 (100 = 1%)"
                  value={newWithdrawFee}
                  onChange={(e) => setNewWithdrawFee(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={() => handleSetFee('withdraw', newWithdrawFee)}
                  disabled={loading}
                  style={{ ...styles.button, backgroundColor: '#FF9800' }}
                >
                  변경
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>조기 인출 수수료 (3일 이내): {Number(earlyWithdrawFee) / 100}%</label>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="새 수수료 (500 = 5%)"
                  value={newEarlyWithdrawFee}
                  onChange={(e) => setNewEarlyWithdrawFee(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={() => handleSetFee('early', newEarlyWithdrawFee)}
                  disabled={loading}
                  style={{ ...styles.button, backgroundColor: '#FF9800' }}
                >
                  변경
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>보상 클레임 수수료: {Number(claimFeeRate) / 100}%</label>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="새 수수료 (0 = 0%)"
                  value={newClaimFee}
                  onChange={(e) => setNewClaimFee(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={() => handleSetFee('claim', newClaimFee)}
                  disabled={loading}
                  style={{ ...styles.button, backgroundColor: '#FF9800' }}
                >
                  변경
                </button>
              </div>
            </div>

            <button
              onClick={handleWithdrawFees}
              disabled={loading || parseFloat(collectedFees) === 0}
              style={{ 
                ...styles.button, 
                backgroundColor: '#9C27B0',
                width: '100%',
                marginTop: '15px'
              }}
            >
              누적 수수료 인출 ({collectedFees} STK)
            </button>
          </div>

          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>🚨 긴급 제어</h3>
            
            <button
              onClick={handlePauseToggle}
              disabled={loading}
              style={{ 
                ...styles.button, 
                backgroundColor: isPaused ? '#4CAF50' : '#f44336',
                width: '100%',
                marginBottom: '10px'
              }}
            >
              {isPaused ? 'Unpause (재개)' : 'Pause (일시중지)'}
            </button>

            <button
              onClick={handleEmergencyWithdraw}
              disabled={loading}
              style={{ 
                ...styles.button, 
                backgroundColor: '#f44336',
                width: '100%'
              }}
            >
              긴급 출금 (모든 자금 회수)
            </button>
          </div>

          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>💰 보상 풀 충전</h3>
            <div style={styles.inputGroup}>
              <input
                type="number"
                placeholder="민팅할 토큰 수량"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleMintRewards}
                disabled={loading}
                style={{ ...styles.button, backgroundColor: '#2196F3' }}
              >
                토큰 민팅
              </button>
            </div>
          </div>

          {message && (
            <div style={{ 
              padding: '10px', 
              background: message.includes('실패') ? '#ffebee' : '#e3f2fd', 
              borderRadius: '5px', 
              marginTop: '20px',
              color: message.includes('실패') ? '#c62828' : '#1976d2'
            }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StakingAdmin;