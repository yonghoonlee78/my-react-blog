import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '../utils/supabaseClient';
import './VolatilityPrediction.css';
import { ethers } from "ethers";

// ERC20 토큰 ABI (잔액 조회 및 전송용)
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function mint(address to, uint256 amount) external",
  "function transfer(address to, uint256 amount) returns (bool)"
];

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  winRate: number;
}

interface MarketIndicators {
  fearGreedIndex: number;
  fearGreedText: string;
  fundingRate: number;
  longShortRatio: number;
}

interface NetworkStats {
  hashrate: number;
  difficulty: number;
  unconfirmed: number;
  blockHeight: number;
}

interface FeeRecommendation {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
}

interface MempoolStats {
  count: number;
  vsize: number;
  total_fee: number;
}

interface ExchangeBalance {
  total: number;
  change24h: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

const VolatilityPrediction: React.FC = () => {
  // 기본 상태
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // 프로필 편집 상태
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // 메뉴 관련 상태
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState('wallet');
  const [stakingAmount, setStakingAmount] = useState(0);
  const [stakingDays, setStakingDays] = useState(10);
  const [globalSwapAmount, setGlobalSwapAmount] = useState(100); // 수정: 전역 상태로 변경
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [bitUSDTBalance, setBitUSDTBalance] = useState(0);
  
  // 출금 모달 상태
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentTokenBalance, setCurrentTokenBalance] = useState<string>('0');
  
  // 차트 탭 상태
  const [activeTab, setActiveTab] = useState('original');
  
  // 게임 상태
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [prediction, setPrediction] = useState<'up' | 'down' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [selectedTime, setSelectedTime] = useState(60);
  const [isGameActive, setIsGameActive] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [totalDraws, setTotalDraws] = useState(0);
  const [totalLosses, setTotalLosses] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [consecutiveDays, setConsecutiveDays] = useState(0);
  const [lastAttendance, setLastAttendance] = useState<Date | null>(null);
  const [startPrice, setStartPrice] = useState(0);
  
  // Bear/Bull 실시간 비율
  const [bearBullRatio, setBearBullRatio] = useState({ bear: 50, bull: 50 });

  const BITUSDT_ADDRESS = "0x29a895dcFCf23cfA660265983a03c0E9fCf665C5";
  
  // 추가 데이터
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [marketIndicators, setMarketIndicators] = useState<MarketIndicators>({
    fearGreedIndex: 53,
    fearGreedText: 'Neutral',
    fundingRate: 0.0044,
    longShortRatio: 1.00
  });
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    hashrate: 3.976,
    difficulty: 0.00,
    unconfirmed: 915073,
    blockHeight: 0
  });
  const [feeRecommendation, setFeeRecommendation] = useState<FeeRecommendation>({
    fastestFee: 3,
    halfHourFee: 3,
    hourFee: 2,
    economyFee: 2
  });
  const [btcDominance, setBtcDominance] = useState(56.1);
  const [mempoolStats, setMempoolStats] = useState<MempoolStats>({
    count: 150000,
    vsize: 280000000,
    total_fee: 1.5
  });
  const [exchangeBalance, setExchangeBalance] = useState<ExchangeBalance>({
    total: 2.39,
    change24h: -5097.31
  });
  
  // Refs
  const ws = useRef<WebSocket | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const bearBullCacheRef = useRef<{ data: any; timestamp: number } | null>(null);
  const stakingCheckRef = useRef<boolean>(false);

  // 스프레드 설정
  const getSpread = () => {
    if (selectedTime === 60) return 0.1;
    if (selectedTime === 180) return 0.2;
    return 0.3;
  };

  // 무료 포인트 받기 함수
  const claimFreePoints = async () => {
    if (!user) {
      alert('로그인이 필요합니다!');
      return;
    }

    const lastClaim = localStorage.getItem(`lastFreeClaim_${user.email}`);
    if (lastClaim) {
      const lastClaimTime = new Date(lastClaim);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastClaimTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        alert(`24시간마다 1번만 받을 수 있습니다. ${Math.ceil(24 - hoursDiff)}시간 후 다시 시도하세요.`);
        return;
      }
    }

    const newPoints = userPoints + 100;
    
    await supabase.from('users')
      .update({ points: newPoints })
      .eq('id', user.id);
    
    setUserPoints(newPoints);
    localStorage.setItem(`lastFreeClaim_${user.email}`, new Date().toISOString());
    alert('🎁 무료 100P를 받았습니다!');
  };

  // 스테이킹 만기 체크 함수 - 최적화
  const checkExpiredStaking = async () => {
    if (!user || stakingCheckRef.current) return;
    
    stakingCheckRef.current = true;
    
    try {
      const { data: expiredStaking, error } = await supabase
        .from('staking')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('claimed', false)
        .lte('end_date', new Date().toISOString());

      if (error) {
        console.error('Error checking staking:', error);
        return;
      }

      if (expiredStaking && expiredStaking.length > 0) {
        let totalReward = 0;
        
        for (const stake of expiredStaking) {
          const reward = Math.floor(stake.amount * (1 + stake.reward_rate));
          totalReward += reward;
          
          await supabase
            .from('staking')
            .update({ 
              status: 'completed',
              claimed: true 
            })
            .eq('id', stake.id);
        }
        
        const newPoints = userPoints + totalReward;
        await supabase
          .from('users')
          .update({ points: newPoints })
          .eq('id', user.id);
        
        setUserPoints(newPoints);
        alert(`🎉 스테이킹 만기! +${totalReward}P 지급 완료!`);
      }
    } catch (error) {
      console.error('Staking check error:', error);
    } finally {
      stakingCheckRef.current = false;
    }
  };

  // 출금 처리 함수
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('출금할 금액을 입력하세요');
      return;
    }
    
    if (!withdrawAddress || !ethers.isAddress(withdrawAddress)) {
      alert('올바른 지갑 주소를 입력하세요');
      return;
    }
    
    if (parseFloat(withdrawAmount) > parseFloat(currentTokenBalance)) {
      alert('잔액이 부족합니다');
      return;
    }
    
    try {
      setIsWithdrawing(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const tokenContract = new ethers.Contract(BITUSDT_ADDRESS, ERC20_ABI, signer);
      
      const amount = ethers.parseEther(withdrawAmount);
      const tx = await tokenContract.transfer(withdrawAddress, amount);
      
      console.log('Withdrawal transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Withdrawal confirmed:', receipt);
      
      await supabase.from('withdrawal_history').insert({
        user_id: user.id,
        from_address: walletAddress,
        to_address: withdrawAddress,
        amount: parseFloat(withdrawAmount),
        token: 'BITUSDT',
        tx_hash: tx.hash,
        network: 'sepolia',
        status: 'completed',
        created_at: new Date().toISOString()
      });
      
      alert(`✅ 출금 완료!\n\n${withdrawAmount} BITUSDT\n\n받는 주소: ${withdrawAddress.slice(0,6)}...${withdrawAddress.slice(-4)}\n\nTx: ${tx.hash.slice(0,10)}...`);
      
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
      
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      
      if (error.code === 4001) {
        alert('사용자가 트랜잭션을 취소했습니다');
      } else if (error.message.includes('insufficient')) {
        alert('가스비가 부족합니다. ETH를 충전하세요');
      } else {
        alert(`출금 실패: ${error.message}`);
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  // WalletSection 컴포넌트
  const WalletSection = memo(() => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [tokenBalance, setTokenBalance] = useState<string>('0');
    const [copied, setCopied] = useState(false);
    const mountedRef = useRef(true);
    
    const loadTokenBalance = async (address?: string) => {
      if (!mountedRef.current) return;
      
      try {
        if (!window.ethereum) return;
        
        const targetAddress = address || walletAddress || user?.wallet_address;
        if (!targetAddress) return;
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenContract = new ethers.Contract(BITUSDT_ADDRESS, ERC20_ABI, provider);
        
        const balance = await tokenContract.balanceOf(targetAddress);
        const formattedBalance = ethers.formatUnits(balance, 18);
        
        if (mountedRef.current) {
          setTokenBalance(formattedBalance);
          setCurrentTokenBalance(formattedBalance);
          setBitUSDTBalance(parseFloat(formattedBalance));
        }
      } catch (error) {
        console.error('Failed to load token balance:', error);
        if (mountedRef.current) {
          setTokenBalance('0');
          setCurrentTokenBalance('0');
        }
      }
    };
    
    const copyToClipboard = () => {
      navigator.clipboard.writeText(BITUSDT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    const handleConnectWallet = async () => {
      if (isConnecting) return;
      
      if (!window.ethereum) {
        alert("메타마스크를 설치하세요!");
        return;
      }
      
      try {
        setIsConnecting(true);
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        console.log('Connected wallet:', address);
        setWalletAddress(address);
        
        await loadTokenBalance(address);
        
        const network = await provider.getNetwork();
        console.log('Network:', network.chainId);
        
        if (network.chainId !== 11155111n) {
          const switchNetwork = window.confirm('Sepolia 테스트넷으로 변경하시겠습니까?');
          if (switchNetwork) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }],
              });
            } catch (switchError: any) {
              if (switchError.code === 4902) {
                alert('메타마스크에 Sepolia 네트워크를 추가해주세요.');
              }
            }
          }
        }
        
        if (user?.id) {
          const { error } = await supabase
            .from('users')
            .update({ wallet_address: address })
            .eq('id', user.id);
          
          if (error) {
            console.error('Supabase update error:', error);
          }
          
          setUser({ ...user, wallet_address: address });
        }
        
        alert(`지갑이 연결되었습니다!\n주소: ${address.slice(0, 6)}...${address.slice(-4)}`);
        
      } catch (error: any) {
        console.error('Wallet connection error:', error);
        
        if (error.code === 4001) {
          alert('사용자가 연결을 거부했습니다.');
        } else if (error.code === -32002) {
          alert('이미 메타마스크 연결 요청이 대기 중입니다.');
        } else {
          alert(`연결 실패: ${error.message || '알 수 없는 오류'}`);
        }
      } finally {
        setIsConnecting(false);
      }
    };

    const handleDisconnectWallet = async () => {
      if (user?.id) {
        await supabase
          .from('users')
          .update({ wallet_address: null })
          .eq('id', user.id);
        
        setUser({ ...user, wallet_address: null });
        setWalletAddress('');
        setTokenBalance('0');
        alert('지갑 연결이 해제되었습니다.');
      }
    };

    useEffect(() => {
      mountedRef.current = true;
      
      const checkExistingConnection = async () => {
        if (window.ethereum && user?.wallet_address && mountedRef.current) {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.listAccounts();
            
            if (accounts.length > 0 && mountedRef.current) {
              const signer = await provider.getSigner();
              const address = await signer.getAddress();
              setWalletAddress(address);
              await loadTokenBalance(address);
            }
          } catch (error) {
            console.error('Failed to check existing connection:', error);
          }
        }
      };
      
      checkExistingConnection();
      
      return () => {
        mountedRef.current = false;
      };
    }, []);

    return (
      <div className="wallet-section">
        <div className="network-selector">
          <label>네트워크</label>
          <div className="network-display">
            Ethereum Sepolia
          </div>
        </div>

        <div className="wallet-management">
          <h4>지갑 관리</h4>
          <div className="wallet-status">
            <span className="status-label">현재 연결된 지갑:</span>
            <span className="status-address">
              {walletAddress || user?.wallet_address ? 
                `${(walletAddress || user?.wallet_address).slice(0, 6)}...${(walletAddress || user?.wallet_address).slice(-4)}` : 
                '없음'}
            </span>
          </div>
          
          {!walletAddress && !user?.wallet_address ? (
            <button 
              className="connect-new-wallet-btn"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? '연결 중...' : '🔗 지갑 연결'}
            </button>
          ) : (
            <button 
              className="disconnect-wallet-btn"
              onClick={handleDisconnectWallet}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                cursor: 'pointer',
                marginTop: '10px',
                width: '100%'
              }}
            >
              지갑 연결 해제
            </button>
          )}
        </div>

        {(walletAddress || user?.wallet_address) && (
          <div className="wallet-management" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '15px'
          }}>
            <h4 style={{ color: 'white', marginBottom: '12px' }}>💎 BITUSDT 토큰</h4>
            
            <div className="wallet-status" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '10px'
            }}>
              <span className="status-label" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>잔액:</span>
              <span className="status-address" style={{ 
                color: 'white', 
                fontSize: '18px', 
                fontWeight: 'bold' 
              }}>
                {parseFloat(tokenBalance).toFixed(2)} BITUSDT
              </span>
            </div>
            
            <div className="wallet-status" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1 }}>
                <span className="status-label" style={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '12px',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  컨트랙트 주소:
                </span>
                <span className="status-address" style={{ 
                  color: 'white',
                  fontSize: '11px',
                  wordBreak: 'break-all'
                }}>
                  {BITUSDT_ADDRESS}
                </span>
              </div>
              <button
                onClick={copyToClipboard}
                style={{
                  background: copied ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  transition: 'all 0.3s',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="클립보드에 복사"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </div>
        )}

        <div className="wallet-management">
          <h4>계정 정보</h4>
          <div className="wallet-status">
            <span className="status-label">이메일:</span>
            <span className="status-address">
              {user?.email || '로그인 필요'}
            </span>
          </div>
        </div>

        <div className="wallet-balance-card">
          <h4>포인트 잔액</h4>
          <div className="balance-display">
            <span className="balance-amount">{userPoints}</span>
            <span className="balance-unit">P</span>
          </div>
        </div>

        <div className="wallet-actions">
          <button 
            className="action-btn free-points"
            onClick={claimFreePoints}
          >
            무료 100P 받기
          </button>
          <button 
            className="action-btn withdraw"
            onClick={() => {
              setCurrentTokenBalance(tokenBalance);
              setShowWithdrawModal(true);
            }}
          >
            출금하기
          </button>
          <button 
            className="action-btn history"
            onClick={() => alert('거래내역 기능은 준비중입니다.')}
          >
            거래내역
          </button>
        </div>
      </div>
    );
  });

  // 스테이킹 섹션 컴포넌트
  const StakingSection = memo(() => {
    const handleStaking = async () => {
      if (stakingAmount <= 0 || stakingAmount > userPoints) {
        alert('올바른 스테이킹 금액을 입력하세요');
        return;
      }

      const reward = stakingDays === 10 ? 0.05 : stakingDays === 20 ? 0.1 : 0.3;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + stakingDays);

      try {
        await supabase.from('staking').insert({
          user_id: user.id,
          amount: stakingAmount,
          days: stakingDays,
          reward_rate: reward,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          claimed: false
        });

        const newPoints = userPoints - stakingAmount;
        await supabase.from('users')
          .update({ points: newPoints })
          .eq('id', user.id);

        setUserPoints(newPoints);
        alert(`${stakingAmount}P 스테이킹 완료! ${stakingDays}일 후 ${Math.floor(stakingAmount * (1 + reward))}P 수령`);
        setStakingAmount(0);
      } catch (error) {
        alert('스테이킹 실패');
      }
    };

    return (
      <div className="staking-section">
        <div className="staking-balance">
          <h4>사용 가능 포인트</h4>
          <span className="points-display">{userPoints}P</span>
        </div>

        <div className="staking-periods">
          <h4>스테이킹 기간 선택</h4>
          <div className="period-options">
            <button 
              className={`period-option ${stakingDays === 10 ? 'active' : ''}`}
              onClick={() => setStakingDays(10)}
            >
              <div className="period-days">10일</div>
              <div className="period-reward">+5%</div>
              <div className="period-estimate">
                예상: +{Math.floor(stakingAmount * 0.05)}P
              </div>
            </button>
            <button 
              className={`period-option ${stakingDays === 20 ? 'active' : ''}`}
              onClick={() => setStakingDays(20)}
            >
              <div className="period-days">20일</div>
              <div className="period-reward">+10%</div>
              <div className="period-estimate">
                예상: +{Math.floor(stakingAmount * 0.1)}P
              </div>
            </button>
            <button 
              className={`period-option ${stakingDays === 30 ? 'active' : ''}`}
              onClick={() => setStakingDays(30)}
            >
              <div className="period-days">30일</div>
              <div className="period-reward">+30%</div>
              <div className="period-estimate">
                예상: +{Math.floor(stakingAmount * 0.3)}P
              </div>
            </button>
          </div>
        </div>

        <div className="staking-input-group">
          <label>스테이킹 수량</label>
          <div className="input-with-max">
            <input
              type="number"
              value={stakingAmount}
              onChange={(e) => setStakingAmount(Math.min(Number(e.target.value), userPoints))}
              placeholder="0"
              max={userPoints}
            />
            <button 
              className="max-btn"
              onClick={() => setStakingAmount(userPoints)}
            >
              MAX
            </button>
          </div>
        </div>

        <button 
          className="stake-confirm-btn"
          onClick={handleStaking}
          disabled={stakingAmount <= 0}
        >
          스테이킹 시작
        </button>

        <div className="staking-info">
          <p>⚠️ 스테이킹 기간 중 출금 불가</p>
          <p>✅ 만기 시 원금+이자 자동 지급</p>
        </div>
      </div>
    );
  });

  // 수정된 SwapSection 컴포넌트 - props로 상태 받기
  const SwapSection = React.memo(({ 
    userPoints, 
    setUserPoints, 
    user,
    swapAmount,
    setSwapAmount 
  }: {
    userPoints: number;
    setUserPoints: (points: number) => void;
    user: any;
    swapAmount: number;
    setSwapAmount: (amount: number) => void;
  }) => {
    const receiveAmount = swapAmount / 100;
    
    const [isSwapping, setIsSwapping] = useState(false);
    const [userBitUSDTBalance, setUserBitUSDTBalance] = useState<string>('0');
    const [isInitialized, setIsInitialized] = useState(false);
    
    const TOKEN_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function mint(address to, uint256 amount) external"
    ];

    const loadTokenBalance = useCallback(async () => {
      if (!window.ethereum || !user?.wallet_address) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenContract = new ethers.Contract(BITUSDT_ADDRESS, TOKEN_ABI, provider);
        
        const balance = await tokenContract.balanceOf(user.wallet_address);
        const formattedBalance = ethers.formatUnits(balance, 18);
        setUserBitUSDTBalance(formattedBalance);
      } catch (error) {
        console.error('Balance load failed:', error);
        setUserBitUSDTBalance('0');
      }
    }, [user?.wallet_address]);

    useEffect(() => {
      if (!isInitialized && user?.wallet_address) {
        setIsInitialized(true);
        loadTokenBalance();
      }
    }, [isInitialized, user?.wallet_address, loadTokenBalance]);

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      setSwapAmount(Math.min(value, userPoints));
    }, [userPoints, setSwapAmount]);

    const handleSwap = useCallback(async () => {
      if (!user?.wallet_address) {
        alert('먼저 지갑을 연결해주세요!');
        setActiveMenuTab('wallet');
        return;
      }
      
      if (swapAmount < 100 || swapAmount > userPoints) {
        alert('100P 이상, 보유 포인트 이내로 입력하세요');
        return;
      }
    
      try {
        setIsSwapping(true);
        
        // Edge Function 호출
        const { data, error } = await supabase.functions.invoke('swap', {
          body: {
            userId: user.id,
            points: swapAmount,
            walletAddress: user.wallet_address
          }
        });
        
        if (error) {
          throw new Error(error.message || '스왑 실패');
        }
        
        if (data?.txHash) {
          const newPoints = userPoints - swapAmount;
          setUserPoints(newPoints);
          await loadTokenBalance();
          
          alert(`✅ 스왑 완료!\n\n${swapAmount}P → ${receiveAmount} BITUSDT\n\nTx Hash: ${data.txHash.slice(0,10)}...${data.txHash.slice(-8)}`);
          setSwapAmount(100);
        }
        
      } catch (error: any) {
        console.error('Swap failed:', error);
        alert(`스왑 실패: ${error.message}`);
      } finally {
        setIsSwapping(false);
      }
    }, [swapAmount, receiveAmount, userPoints, user, loadTokenBalance, setUserPoints, setSwapAmount]);

    return (
      <div className="swap-section">
        <div className="swap-rate-info">
          <h4>교환 비율</h4>
          <div className="rate-display">
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fcd535' }}>
              100 P = 1 BITUSDT
            </span>
          </div>
          <div className="minimum-info">
            최소 교환: 100 P
          </div>
        </div>
        
        <div className="current-balance">
          <div className="balance-row">
            <span>보유 포인트:</span>
            <span>{userPoints} P</span>
          </div>
          <div className="balance-row" style={{
            marginTop: '8px',
            padding: '8px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
            borderRadius: '6px',
            border: '1px solid rgba(102, 126, 234, 0.3)'
          }}>
            <span>보유 BITUSDT:</span>
            <span style={{ color: '#667eea', fontWeight: 'bold' }}>
              {parseFloat(userBitUSDTBalance).toFixed(2)} BITUSDT
            </span>
          </div>
        </div>
        
        <div className="swap-input-group">
          <label>스왑할 포인트</label>
          <input
            type="number"
            value={swapAmount}
            onChange={handleAmountChange}
            min="100"
            step="100"
            max={userPoints}
            disabled={isSwapping}
          />
          <div className="swap-output" style={{
            background: 'rgba(102, 126, 234, 0.05)',
            padding: '10px',
            borderRadius: '6px',
            marginTop: '10px'
          }}>
            <span className="output-label">받을 토큰:</span>
            <span className="output-amount" style={{ 
              color: '#667eea',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              {receiveAmount.toFixed(2)} BITUSDT
            </span>
          </div>
        </div>

        {!user?.wallet_address && (
          <div style={{
            padding: '10px',
            background: 'rgba(246, 70, 93, 0.1)',
            borderRadius: '6px',
            marginBottom: '10px',
            color: '#f6465d',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ⚠️ 지갑 연결이 필요합니다
          </div>
        )}
        
        <button 
          className="swap-confirm-btn"
          onClick={handleSwap}
          disabled={isSwapping || swapAmount < 100 || swapAmount > userPoints || !user?.wallet_address}
          style={{
            background: isSwapping ? '#2b3139' : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            opacity: (!user?.wallet_address || swapAmount < 100 || swapAmount > userPoints) ? 0.5 : 1,
            cursor: (isSwapping || !user?.wallet_address || swapAmount < 100 || swapAmount > userPoints) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSwapping ? '스왑 진행중...' : '스왑하기'}
        </button>

        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#848e9c'
        }}>
          <p>📌 스왑 절차:</p>
          <ol style={{ marginLeft: '20px', marginTop: '5px' }}>
            <li>스왑할 포인트 입력</li>
            <li>메타마스크에서 트랜잭션 승인</li>
            <li>BITUSDT 토큰 자동 지급</li>
          </ol>
        </div>

        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px'
        }}>
          <a 
            href={`https://sepolia.etherscan.io/address/${BITUSDT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#667eea', textDecoration: 'none' }}
          >
            컨트랙트 보기 →
          </a>
        </div>
      </div>
    );
  });

  // 게임 룰 섹션 컴포넌트
  const RulesSection = () => (
    <div className="rules-section">
      <div className="rule-card">
        <h4>🎯 스프레드 시스템</h4>
        <p>단순 UP/DOWN이 아닌 목표 변동폭 달성 필요</p>
        <ul>
          <li>1분: ±0.1% 이상 변동</li>
          <li>3분: ±0.2% 이상 변동</li>
          <li>5분: ±0.3% 이상 변동</li>
        </ul>
      </div>

      <div className="rule-card">
        <h4>💰 보상 체계</h4>
        <table className="reward-table">
          <thead>
            <tr>
              <th>시간</th>
              <th>승리</th>
              <th>무승부</th>
              <th>패배</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1분</td>
              <td className="win">+10P</td>
              <td>0P</td>
              <td className="lose">-5P</td>
            </tr>
            <tr>
              <td>3분</td>
              <td className="win">+25P</td>
              <td>0P</td>
              <td className="lose">-10P</td>
            </tr>
            <tr>
              <td>5분</td>
              <td className="win">+50P</td>
              <td>0P</td>
              <td className="lose">-15P</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rule-card">
        <h4>🔥 연승 보너스</h4>
        <p>최대 4연승까지 추가 보너스</p>
        <ul>
          <li>1분: 연승당 +5P</li>
          <li>3분: 연승당 +10P</li>
          <li>5분: 연승당 +20P</li>
        </ul>
      </div>
    </div>
  );

  // WebSocket 연결 함수
  const connectWebSocket = useCallback(() => {
    // 기존 연결 정리
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  
    if (!isMountedRef.current) return;
  
    try {
      ws.current = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      
      // 연결 타임아웃 설정 (10초)
      const connectionTimeout = setTimeout(() => {
        if (ws.current?.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout, retrying...');
          ws.current?.close();
        }
      }, 10000);
      
      ws.current.onopen = () => {
        clearTimeout(connectionTimeout); // 연결 성공 시 타임아웃 해제
        console.log('Binance WebSocket connected');
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setCurrentPrice(parseFloat(data.c) || 0);
          setPriceChange24h(parseFloat(data.P) || 0);
          setHigh24h(parseFloat(data.h) || 0);
          setLow24h(parseFloat(data.l) || 0);
          setVolume24h(parseFloat(data.v) || 0);
        } catch (err) {
          console.error('WebSocket data parse error:', err);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
      };
      
      ws.current.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        clearTimeout(connectionTimeout);
        ws.current = null;
        
        if (isMountedRef.current) {
          // 재연결 딜레이를 상황에 따라 조절
          const reconnectDelay = event.code === 1006 ? 5000 : 3000; // 비정상 종료 시 더 긴 딜레이
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }
          }, reconnectDelay);
        }
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      
      // 연결 실패 시에도 재시도
      if (isMountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connectWebSocket();
          }
        }, 5000);
      }
    }
  }, []);

  // 프로필 업로드 함수
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('이미지를 선택해주세요');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      await supabase.from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id) ;

      alert('프로필 이미지가 업데이트되었습니다!');
    } catch (error: any) {
      alert('이미지 업로드 실패: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateUsername = async () => {
    if (!newUsername.trim()) {
      alert('닉네임을 입력해주세요');
      return;
    }

    try {
      await supabase.from('users')
        .update({ username: newUsername })
        .eq('id', user.id) ;

      setUser({...user, username: newUsername});
      setIsEditingProfile(false);
      alert('닉네임이 변경되었습니다!');
    } catch (error: any) {
      alert('닉네임 변경 실패: ' + error.message);
    }
  };

  // TradingView 차트 초기화
  const initTradingViewChart = () => {
    if (chartContainerRef.current && activeTab === 'original') {
      chartContainerRef.current.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        new (window as any).TradingView.widget({
          autosize: false,
          width: '100%',
          height: 600,
          symbol: 'BINANCE:BTCUSDTPERP',
          interval: '1',
          timezone: 'Asia/Seoul',
          theme: 'dark',
          style: '1',
          locale: 'kr',
          toolbar_bg: '#0b0e11',
          backgroundColor: '#0b0e11',
          gridColor: '#1e2329',
          enable_publishing: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: 'tradingview_chart'
        });
      };
      document.head.appendChild(script);
    }
  };

  // 사용자 확인
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      // users 테이블 체크 및 생성
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!userData || error) {
        // users 테이블에 데이터가 없으면 생성
        console.log('Creating missing user data...');
        const { error: insertError } = await supabase.from('users').insert([
          {
            id: session.user.id,
            email: session.user.email,
            username: session.user.email?.split('@')[0],
            points: 1000,
            streak: 0,
            total_wins: 0,
            total_draws: 0,
            total_losses: 0,
            consecutive_days: 0,
            created_at: new Date().toISOString()
          }
        ]);
        
        if (!insertError) {
          alert('신규 유저 보너스 1000P가 지급되었습니다!');
        }
      }
      
      await loadUserData(session.user);
    }
  };

  // 사용자 데이터 로드
  const loadUserData = async (user: any) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error loading user data:', error);
        return;
      }
      
      if (data) {
        console.log('Loaded user data:', data);
        setUserPoints(data.points || 0);
        setStreak(data.streak || 0);
        setTotalWins(data.total_wins || 0);
        setTotalDraws(data.total_draws || 0);
        setTotalLosses(data.total_losses || 0);
        setAvatarUrl(data.avatar_url || '');
        
        const total = (data.total_wins || 0) + (data.total_losses || 0);
        setWinRate(total > 0 ? Math.round((data.total_wins / total) * 100) : 0);
        
        setConsecutiveDays(data.consecutive_days || 0);
        setLastAttendance(data.last_attendance ? new Date(data.last_attendance) : null);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // 시장 지표 로드
  const loadMarketIndicators = async () => {
    try {
      const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
      const data = await response.json();
      
      setMarketIndicators({
        fearGreedIndex: 53,
        fearGreedText: 'Neutral',
        fundingRate: parseFloat(data.lastFundingRate || '0.0001') * 100,
        longShortRatio: 1.00
      });
    } catch (error) {
      console.error('Failed to load market indicators:', error);
    }
  };

  // 리더보드 로드
  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('users')
      .select('username, points, total_wins, total_losses')
      .order('points', { ascending: false })
      .limit(10);
    
    if (data) {
      setLeaderboard(data.map((item, index) => ({
        rank: index + 1,
        username: item.username || 'Anonymous',
        points: item.points,
        winRate: (item.total_wins && item.total_losses) ? 
          Math.round((item.total_wins / (item.total_wins + item.total_losses)) * 100) : 0
      })));
    }
  };

  // Bear/Bull 비율 로드 - 최적화
  const loadBearBullRatio = async () => {
    // 캐시 확인 (10초 이내 데이터는 재사용)
    if (bearBullCacheRef.current) {
      const age = Date.now() - bearBullCacheRef.current.timestamp;
      if (age < 10000) return; // 10초 이내면 스킵
    }

    try {
      const { data } = await supabase
        .from('active_predictions')
        .select('prediction')
        .gte('expires_at', new Date().toISOString());
      
      if (data && data.length > 0) {
        const upCount = data.filter((p: any) => p.prediction === 'up').length;
        const downCount = data.filter((p: any) => p.prediction === 'down').length;
        const total = upCount + downCount;
        
        setBearBullRatio({
          bear: total > 0 ? Math.round((downCount / total) * 100) : 50,
          bull: total > 0 ? Math.round((upCount / total) * 100) : 50
        });
        
        // 캐시 업데이트
        bearBullCacheRef.current = {
          data: { bear: bearBullRatio.bear, bull: bearBullRatio.bull },
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Failed to load bear/bull ratio:', error);
    }
  };

  // 인증 처리 - 로그인
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // users 테이블에 해당 유저가 있는지 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (!userData || userError) {
          // 유저 데이터가 없으면 생성
          console.log('Creating missing user data...');
          await supabase.from('users').insert([
            {
              id: data.user.id,
              email: data.user.email,
              username: data.user.email?.split('@')[0],
              points: 1000,  // 신규 유저 보너스
              streak: 0,
              total_wins: 0,
              total_draws: 0,
              total_losses: 0,
              consecutive_days: 0,
              created_at: new Date().toISOString()
            }
          ]);
          
          // 다시 로드
          await loadUserData(data.user);
        } else {
          await loadUserData(data.user);
        }
      }
      
      setUser(data.user);
      setShowLoginModal(false);
      
      if (data.user) {
        localStorage.setItem('userEmail', data.user.email!);
      }
      
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 처리
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // users 테이블에 데이터 삽입 - upsert 사용으로 중복 방지
        const { error: insertError } = await supabase.from('users').upsert([
          {
            id: data.user.id,
            email: data.user.email,
            username: email.split('@')[0],
            points: 1000,  // 초기 포인트
            streak: 0,
            total_wins: 0,
            total_draws: 0,
            total_losses: 0,
            consecutive_days: 0,
            created_at: new Date().toISOString()
          }
        ], {
          onConflict: 'id'
        });

        if (insertError) {
          console.error('User table insert error:', insertError);
          // 실패 시 재시도
          const { error: retryError } = await supabase.from('users').insert([
            {
              id: data.user.id,
              email: data.user.email,
              username: email.split('@')[0],
              points: 1000,
              streak: 0,
              total_wins: 0,
              total_draws: 0,
              total_losses: 0,
              consecutive_days: 0
            }
          ]);
          
          if (retryError) {
            console.error('Retry failed:', retryError);
          }
        }
      }
      
      setMessage('회원가입 성공!');
      setShowSignupModal(false);
      alert('회원가입이 완료되었습니다! 1000P가 지급되었습니다.');
      
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 예측 함수
  const makePrediction = async (direction: 'up' | 'down') => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    const minPoints = selectedTime === 60 ? 5 : selectedTime === 180 ? 10 : 15;
    if (userPoints < minPoints) {
      alert(`포인트가 부족합니다! 최소 ${minPoints}P 필요`);
      return;
    }
    
    try {
      await supabase.from('active_predictions').insert({
        user_id: user.id,
        prediction: direction,
        expires_at: new Date(Date.now() + selectedTime * 1000).toISOString()
      });
    } catch (error) {
      console.error('Failed to save active prediction:', error);
    }
    
    setPrediction(direction);
    setIsGameActive(true);
    setTimeRemaining(selectedTime);
    setStartPrice(currentPrice);
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          checkResult(direction);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 결과 확인
  const checkResult = async (direction: 'up' | 'down') => {
    const endPrice = currentPrice;
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;
    const spread = getSpread();
    
    let result: 'win' | 'draw' | 'lose' = 'lose';
    let pointsEarned = 0;
    
    if (direction === 'up') {
      if (changePercent > spread) {
        result = 'win';
      } else if (changePercent < -spread) {
        result = 'lose';
      } else {
        result = 'draw';
      }
    } else {
      if (changePercent < -spread) {
        result = 'win';
      } else if (changePercent > spread) {
        result = 'lose';
      } else {
        result = 'draw';
      }
    }
    
    if (result === 'win') {
      let baseReward = selectedTime === 60 ? 10 : selectedTime === 180 ? 25 : 50;
      let streakBonus = selectedTime === 60 ? 5 : selectedTime === 180 ? 10 : 20;
      pointsEarned = baseReward + (Math.min(streak, 4) * streakBonus);
      
      if (Math.abs(changePercent) > spread * 3) {
        pointsEarned += 20;
      }
    } else if (result === 'lose') {
      pointsEarned = selectedTime === 60 ? -5 : selectedTime === 180 ? -10 : -15;
    }
    
    await supabase.from('predictions').insert([{
      user_id: user.id,
      wallet_address: null,
      prediction: direction,
      actual_change: changePercent,
      is_correct: result === 'win',
      is_draw: result === 'draw',
      points_earned: pointsEarned,
      streak_at_time: streak,
      time_frame: selectedTime
    }]);
    
    const newPoints = userPoints + pointsEarned;
    const newStreak = result === 'win' ? streak + 1 : 0;
    const newWins = result === 'win' ? totalWins + 1 : totalWins;
    const newDraws = result === 'draw' ? totalDraws + 1 : totalDraws;
    const newLosses = result === 'lose' ? totalLosses + 1 : totalLosses;
    
    await supabase.from('users')
      .update({ 
        points: newPoints,
        streak: newStreak,
        total_wins: newWins,
        total_draws: newDraws,
        total_losses: newLosses
      })
      .eq('id', user.id);
    
    setUserPoints(newPoints);
    setStreak(newStreak);
    setTotalWins(newWins);
    setTotalDraws(newDraws);
    setTotalLosses(newLosses);
    
    const total = newWins + newLosses;
    setWinRate(total > 0 ? Math.round((newWins / total) * 100) : 0);
    
    setIsGameActive(false);
    setPrediction(null);
    setStartPrice(0);
    
    let resultMessage = '';
    if (result === 'win') {
      resultMessage = `🎉 성공! +${pointsEarned} 포인트\n변동: ${changePercent.toFixed(3)}%\n목표 스프레드(±${spread}%) 달성!`;
    } else if (result === 'draw') {
      resultMessage = `🤝 무승부!\n변동: ${changePercent.toFixed(3)}%\n스프레드(±${spread}%) 미달`;
    } else {
      resultMessage = `😢 실패! ${pointsEarned} 포인트\n변동: ${changePercent.toFixed(3)}%`;
    }
    
    alert(resultMessage);
  };

  // 출석 체크
  const handleDailyAttendance = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (lastAttendance) {
      const lastDate = new Date(lastAttendance);
      lastDate.setHours(0, 0, 0, 0);
      
      if (lastDate.getTime() === today.getTime()) {
        alert('오늘은 이미 출석했습니다!');
        return;
      }
    }
    
    let bonusPoints = 10;
    let newConsecutiveDays = 1;
    
    if (lastAttendance) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastDate = new Date(lastAttendance);
      lastDate.setHours(0, 0, 0, 0);
      
      if (lastDate.getTime() === yesterday.getTime()) {
        newConsecutiveDays = consecutiveDays + 1;
        if (newConsecutiveDays === 7) {
          bonusPoints += 20;
        }
      }
    }
    
    const newPoints = userPoints + bonusPoints;
    
    await supabase.from('users')
      .update({
        points: newPoints,
        consecutive_days: newConsecutiveDays,
        last_attendance: today.toISOString()
      })
      .eq('id', user.id);
    
    setUserPoints(newPoints);
    setConsecutiveDays(newConsecutiveDays);
    setLastAttendance(today);
    
    alert(`출석 완료! +${bonusPoints} 포인트`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserPoints(0);
    setStreak(0);
    setTotalWins(0);
    setTotalLosses(0);
    setWinRate(0);
    window.location.reload();
  };

  // 글로벌 이벤트 리스너
  useEffect(() => {
    if (!window.ethereum) return;
    
    let mounted = true;
    
    const handleAccountsChanged = (accounts: string[]) => {
      if (!mounted) return;
      console.log('Global account change detected:', accounts[0]);
    };
    
    const handleChainChanged = () => {
      if (!mounted) return;
      window.location.reload();
    };
    
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
    return () => {
      mounted = false;
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // 초기화 useEffect
  useEffect(() => {
    isMountedRef.current = true;

    const initialize = async () => {
      try {
        await checkUser();
        connectWebSocket();
        loadLeaderboard();
        loadMarketIndicators();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
      
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    if (activeTab === 'original') {
      initTradingViewChart();
    }
  }, [activeTab]);

  // Bear/Bull 비율 로드 - 최적화된 버전
  useEffect(() => {
    let isMounted = true;

    const loadRatio = async () => {
      if (!isMounted) return;
      await loadBearBullRatio();
    };

    loadRatio();
    
    // 60초마다 한 번만 체크
    const interval = setInterval(() => {
      if (isMounted) loadBearBullRatio();
    }, 60000); // 60초

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 스테이킹 체크 - 최적화된 버전
  useEffect(() => {
    if (!user) return;

    let checkInterval: NodeJS.Timeout;
    let isMounted = true;

    const startChecking = async () => {
      if (!isMounted) return;
      await checkExpiredStaking();
      
      // 10분마다 체크
      checkInterval = setInterval(() => {
        if (isMounted) checkExpiredStaking();
      }, 600000); // 10분
    };

    startChecking();

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [user?.id]);

  // JSX 렌더링
  return (
    <div className="trading-platform">
      <header className="platform-header">
        <div className="ticker-section">
          <div className="left-section">
            <div className="price-display">
              <div className="coin-info">
                <span className="coin-pair">BTC/USDT</span>
                <span className="coin-label">Bitcoin Futures</span>
              </div>
              
              <div className="price-info">
                <span className="current-price">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`price-change ${priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                  {priceChange24h >= 0 ? '▲' : '▼'} {Math.abs(priceChange24h).toFixed(2)}%
                </span>
              </div>
              
              <div className="market-stats-below">
                <div className="stat-inline">
                  <label>24H HIGH</label>
                  <span>${high24h.toLocaleString()}</span>
                </div>
                <div className="stat-inline">
                  <label>24H LOW</label>
                  <span>${low24h.toLocaleString()}</span>
                </div>
                <div className="stat-inline">
                  <label>24H VOLUME(USDT)</label>
                  <span>{(volume24h / 1000000000).toFixed(2)}B</span>
                </div>
              </div>
            </div>
          </div>

          <div className="center-indicators-container">
            <div className="header-indicator-widget">
              <h3>선물 시장 지표</h3>
              <div className="funding-indicators">
                <div className="indicator-item">
                  <label>Funding Rate</label>
                  <span className={marketIndicators.fundingRate > 0 ? 'positive' : 'negative'}>
                    {marketIndicators.fundingRate > 0 ? '+' : ''}{marketIndicators.fundingRate.toFixed(4)}%
                  </span>
                </div>
                <div className="indicator-item">
                  <label>Long/Short Ratio</label>
                  <span className={marketIndicators.longShortRatio > 1 ? 'positive' : 'negative'}>
                    {marketIndicators.longShortRatio.toFixed(2)}
                  </span>
                </div>
                <div className="ratio-bar">
                  <div className="long-bar" style={{width: `${(marketIndicators.longShortRatio / (marketIndicators.longShortRatio + 1)) * 100}%`}}>
                    Long {((marketIndicators.longShortRatio / (marketIndicators.longShortRatio + 1)) * 100).toFixed(1)}%
                  </div>
                  <div className="short-bar">
                    Short {(100 - (marketIndicators.longShortRatio / (marketIndicators.longShortRatio + 1)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="header-indicator-widget">
              <h3>공포 & 탐욕 지수</h3>
              <div className="fear-greed-compact">
                <div className="meter-value">
                  <span className="value">{marketIndicators.fearGreedIndex}</span>
                  <span className="label">{marketIndicators.fearGreedText}</span>
                </div>
                <div className="meter-bar-compact">
                  <div 
                    className="meter-pointer" 
                    style={{left: `${marketIndicators.fearGreedIndex}%`}}
                  />
                  <div className="meter-gradient" />
                </div>
                <div className="meter-labels">
                  <span>공포</span>
                  <span>중립</span>
                  <span>탐욕</span>
                </div>
              </div>
            </div>

            <div className="header-indicator-widget">
              <h3>네트워크 건강도</h3>
              <div className="network-health">
                <div className="network-stat">
                  <label>해시레이트</label>
                  <span className="value">{networkStats.hashrate.toFixed(3)} EH/s</span>
                </div>
                <div className="network-stat">
                  <label>난이도</label>
                  <span className="value">{networkStats.difficulty.toFixed(2)} T</span>
                </div>
                <div className="network-stat">
                  <label>미확인 TX</label>
                  <span className={`value ${networkStats.unconfirmed > 10000 ? 'warning' : ''}`}>
                    {networkStats.unconfirmed.toLocaleString()}
                  </span>
                </div>
                <div className="network-stat">
                  <label>블록높이</label>
                  <span className="value">#{networkStats.blockHeight.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="header-indicator-widget">
              <h3>수수료 & 멤풀</h3>
              <div className="fee-mempool-stats">
                <div className="fee-section">
                  <div className="fee-stat">
                    <label>빠름</label>
                    <span className="value urgent">{feeRecommendation.fastestFee} sat/vB</span>
                  </div>
                  <div className="fee-stat">
                    <label>보통</label>
                    <span className="value">{feeRecommendation.halfHourFee} sat/vB</span>
                  </div>
                  <div className="fee-stat">
                    <label>느림</label>
                    <span className="value">{feeRecommendation.economyFee} sat/vB</span>
                  </div>
                </div>
                <div className="mempool-section">
                  <div className="mempool-stat">
                    <label>멤풀 크기</label>
                    <span className="value">{(mempoolStats.vsize / 1000000).toFixed(2)} MB</span>
                  </div>
                  <div className="mempool-stat">
                    <label>대기 거래</label>
                    <span className="value">{mempoolStats.count.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="header-indicator-widget compact">
              <h3>BTC 도미넌스</h3>
              <div className="dominance-display">
                <span className="dominance-value">{btcDominance.toFixed(1)}%</span>
                <div className="dominance-bar">
                  <div className="dominance-fill" style={{width: `${btcDominance}%`}}></div>
                </div>
              </div>
            </div>

            <div className="header-indicator-widget compact">
              <h3>거래소 BTC</h3>
              <div className="exchange-balance">
                <span className="balance-value">
                  {(exchangeBalance.total).toFixed(2)}M
                </span>
                <span className={`balance-change ${exchangeBalance.change24h < 0 ? 'outflow' : 'inflow'}`}>
                  {exchangeBalance.change24h < 0 ? '▼' : '▲'} 
                  {Math.abs(exchangeBalance.change24h).toLocaleString()} BTC
                </span>
                <div className="balance-info">
                  {exchangeBalance.change24h < 0 ? '유출중' : '유입중'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="platform-body">
        <main className="main-content">
          <div className="chart-container">
            <div className="chart-overlay-controls">
              <div className="chart-view-tabs">
                <button 
                  className={`view-tab ${activeTab === 'original' ? 'active' : ''}`}
                  onClick={() => handleTabChange('original')}
                >
                  BTC Futures
                </button>
                <button 
                  className={`view-tab ${activeTab === 'depth' ? 'active' : ''}`}
                  onClick={() => handleTabChange('depth')}
                >
                  Depth
                </button>
              </div>
            </div>

            {activeTab === 'original' && (
              <div id="tradingview_chart" ref={chartContainerRef}></div>
            )}
            {activeTab === 'tradingview' && (
              <div style={{ width: '100%', height: '600px' }}>
                <iframe
                  src="https://s3.tradingview.com/widgetembed/?symbol=BINANCE%3ABTCUSDTPERP&interval=1&theme=dark&style=1&locale=kr&toolbar_bg=%230b0e11&enable_publishing=false&hide_side_toolbar=false&widgetbar=0&studies_overrides=%7B%7D&overrides=%7B%7D"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                ></iframe>
              </div>
            )}
            {activeTab === 'depth' && (
              <div style={{ width: '100%', height: '600px', background: '#0b0e11', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
                  <div style={{ background: '#181a20', borderRadius: '8px', padding: '15px' }}>
                    <h4 style={{ color: '#0ecb81', marginBottom: '15px' }}>매수 호가</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[...Array(10)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: 'rgba(14, 203, 129, 0.05)' }}>
                          <span style={{ color: '#0ecb81' }}>${(currentPrice - (i * 10)).toFixed(2)}</span>
                          <span style={{ color: '#848e9c' }}>{(Math.random() * 100).toFixed(3)} BTC</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: '#181a20', borderRadius: '8px', padding: '15px' }}>
                    <h4 style={{ color: '#f6465d', marginBottom: '15px' }}>매도 호가</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[...Array(10)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: 'rgba(246, 70, 93, 0.05)' }}>
                          <span style={{ color: '#f6465d' }}>${(currentPrice + (i * 10)).toFixed(2)}</span>
                          <span style={{ color: '#848e9c' }}>{(Math.random() * 100).toFixed(3)} BTC</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="prediction-section">
            {isGameActive ? (
              <div className="active-prediction">
                <h3>예측 진행중: {prediction === 'up' ? '상승 📈' : '하락 📉'}</h3>
                <div className="game-progress">
                  <div className="price-tracking">
                    <div className="price-item">
                      <span className="label">시작 가격</span>
                      <span className="value">${startPrice.toFixed(2)}</span>
                    </div>
                    <div className="price-item">
                      <span className="label">현재 가격</span>
                      <span className="value">${currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="price-item">
                      <span className="label">변동률</span>
                      <span className={`value ${((currentPrice - startPrice) / startPrice * 100) > 0 ? 'positive' : 'negative'}`}>
                        {((currentPrice - startPrice) / startPrice * 100).toFixed(3)}%
                      </span>
                    </div>
                    <div className="price-item">
                      <span className="label">목표 스프레드</span>
                      <span className="value">±{getSpread()}%</span>
                    </div>
                  </div>
                </div>
                <div className="countdown">
                  <div className="time-display">
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${((selectedTime - timeRemaining) / selectedTime) * 100}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prediction-buttons-container">
                <h3>{selectedTime === 60 ? '1분' : selectedTime === 180 ? '3분' : '5분'} 후 가격 예측</h3>
                
                <div className="time-selector">
                  <button 
                    className={`time-btn ${selectedTime === 60 ? 'active' : ''}`}
                    onClick={() => setSelectedTime(60)}
                  >
                    <span className="time-label">1분</span>
                    <span className="multiplier">스프레드 ±{0.1}%</span>
                    <div className="rewards-info">
                      <div className="reward-win">성공: +10P</div>
                      <div className="reward-lose">실패: -5P</div>
                      <div className="reward-draw">무승부: 0P</div>
                    </div>
                  </button>
                  <button 
                    className={`time-btn ${selectedTime === 180 ? 'active' : ''}`}
                    onClick={() => setSelectedTime(180)}
                  >
                    <span className="time-label">3분</span>
                    <span className="multiplier">스프레드 ±{0.2}%</span>
                    <div className="rewards-info">
                      <div className="reward-win">성공: +25P</div>
                      <div className="reward-lose">실패: -10P</div>
                      <div className="reward-draw">무승부: 0P</div>
                    </div>
                  </button>
                  <button 
                    className={`time-btn ${selectedTime === 300 ? 'active' : ''}`}
                    onClick={() => setSelectedTime(300)}
                  >
                    <span className="time-label">5분</span>
                    <span className="multiplier">스프레드 ±{0.3}%</span>
                    <div className="rewards-info">
                      <div className="reward-win">성공: +50P</div>
                      <div className="reward-lose">실패: -15P</div>
                      <div className="reward-draw">무승부: 0P</div>
                    </div>
                  </button>
                </div>

                <div className="prediction-info">
                  <div className="info-item">
                    <div className="info-label">현재 연승</div>
                    <div className="info-value">{streak} 🔥</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">연승 보너스</div>
                    <div className="info-value">+{Math.min(streak, 4) * (selectedTime === 60 ? 5 : selectedTime === 180 ? 10 : 20)}P</div>
                  </div>
                  <div className="info-item compact">
                    <div className="info-label">필요 변동폭</div>
                    <div className="info-value">±{getSpread()}%</div>
                  </div>
                </div>
                
                <div className="prediction-buttons">
                  <button 
                    className="predict-btn down"
                    onClick={() => makePrediction('down')}
                  >
                    <span className="direction">📉 DOWN</span>
                    <span className="target-label">목표 가격</span>
                    <span className="target-price">
                      ${(currentPrice * (1 - getSpread()/100)).toFixed(2)}
                    </span>
                    <span className="spread-info">-{getSpread()}% 이하</span>
                    <span className="odds">Bear {bearBullRatio.bear}%</span>
                  </button>
                  <button 
                    className="predict-btn up"
                    onClick={() => makePrediction('up')}
                  >
                    <span className="direction">📈 UP</span>
                    <span className="target-label">목표 가격</span>
                    <span className="target-price">
                      ${(currentPrice * (1 + getSpread()/100)).toFixed(2)}
                    </span>
                    <span className="spread-info">+{getSpread()}% 이상</span>
                    <span className="odds">Bull {bearBullRatio.bull}%</span>
                  </button>
                </div>
                
                <div className="spread-explanation">
                  <p>⚡ 스프레드 시스템: 목표 변동폭 이상 움직여야 승리!</p>
                  <p>📊 무승부 구간: -{getSpread()}% ~ +{getSpread()}%</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="right-panel">
          {user ? (
            <>
              <div className="profile-widget">
                <div className="profile-header-row">
                  <h3>내 프로필</h3>
                  <button 
                    className="menu-btn" 
                    onClick={() => setShowMenuModal(true)}
                  >
                    메뉴
                  </button>
                </div>
                <div className="profile-info">
                  <div className="user-avatar" onClick={() => setIsEditingProfile(true)}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="avatar-image" />
                    ) : (
                      <span>{user.email?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                    <div className="avatar-edit-overlay">
                      <span>✏️</span>
                    </div>
                  </div>
                  <div className="user-details">
                    <span className="username" onClick={() => setIsEditingProfile(true)}>
                      {user.username || user.email?.split('@')[0]}
                      <span className="edit-icon">✏️</span>
                    </span>
                    <span className="user-level">Lv. {Math.floor(userPoints / 1000) + 1}</span>
                  </div>
                </div>
                <div className="balance-info">
                  <div className="balance-item">
                    <label>포인트</label>
                    <span>{userPoints.toLocaleString()} P</span>
                  </div>
                  <div className="balance-item">
                    <label>전적</label>
                    <span>{totalWins}승 {totalDraws}무 {totalLosses}패</span>
                  </div>
                </div>
                <div className="win-rate-bar">
                  <div className="win-rate-label">
                    <span>승률</span>
                    <span className="win-rate-value">{winRate}%</span>
                  </div>
                  <div className="win-rate-progress">
                    <div 
                      className="win-rate-fill" 
                      style={{width: `${winRate}%`}}
                    />
                  </div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>

              <div className="attendance-widget">
                <h3>출석 체크</h3>
                <div className="attendance-grid">
                  {[...Array(7)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`day ${i < consecutiveDays ? 'checked' : ''}`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <button 
                  className="attendance-btn"
                  onClick={handleDailyAttendance}
                >
                  출석하기 (+10P)
                </button>
                {consecutiveDays === 6 && (
                  <p className="bonus-notice">내일 출석 시 +30P 보너스!</p>
                )}
              </div>
            </>
          ) : (
            <div className="login-prompt">
              <h3>로그인이 필요합니다</h3>
              <button 
                className="login-btn email-btn"
                onClick={() => setShowLoginModal(true)}
              >
                로그인
              </button>
              <button 
                className="login-btn signup-btn"
                onClick={() => setShowSignupModal(true)}
              >
                회원가입
              </button>
            </div>
          )}

          <div className="leaderboard-widget">
            <h3>🏆 리더보드 TOP 10</h3>
            <div className="leaderboard-list">
              {leaderboard.map(entry => (
                <div key={entry.rank} className={`leader-item ${entry.rank <= 3 ? 'top3' : ''}`}>
                  <span className="rank">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </span>
                  <span className="name">{entry.username}</span>
                  <span className="points">{entry.points.toLocaleString()}P</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 모달들 */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: '#1a1d29',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'white', margin: 0 }}>BITUSDT 출금</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#848e9c',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                color: '#848e9c' 
              }}>
                출금 가능 잔액
              </label>
              <div style={{
                padding: '15px',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                borderRadius: '8px',
                border: '1px solid rgba(102, 126, 234, 0.3)'
              }}>
                <span style={{ 
                  color: '#667eea', 
                  fontSize: '24px', 
                  fontWeight: 'bold' 
                }}>
                  {parseFloat(currentTokenBalance).toFixed(2)} BITUSDT
                </span>
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                color: '#848e9c' 
              }}>
                출금할 금액
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                step="0.01"
                max={currentTokenBalance}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0b0e11',
                  border: '1px solid #2b3139',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
              <button
                onClick={() => setWithdrawAmount(currentTokenBalance)}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: 'rgba(102, 126, 234, 0.2)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '4px',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                MAX
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                color: '#848e9c' 
              }}>
                받는 지갑 주소
              </label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0b0e11',
                  border: '1px solid #2b3139',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            <div style={{
              padding: '12px',
              background: 'rgba(246, 70, 93, 0.1)',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#f6465d',
              border: '1px solid rgba(246, 70, 93, 0.2)'
            }}>
              ⚠️ 주의사항:
              <ul style={{ margin: '8px 0 0 20px', lineHeight: '1.6' }}>
                <li>Sepolia 테스트넷 주소만 가능</li>
                <li>출금 후 취소 불가</li>
                <li>가스비(ETH)가 필요합니다</li>
                <li>최소 출금: 0.01 BITUSDT</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || !withdrawAddress || parseFloat(withdrawAmount) <= 0}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: isWithdrawing ? '#2b3139' : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: isWithdrawing ? 'not-allowed' : 'pointer',
                  opacity: (!withdrawAmount || !withdrawAddress || parseFloat(withdrawAmount) <= 0) ? 0.5 : 1
                }}
              >
                {isWithdrawing ? '출금 진행중...' : '출금하기'}
              </button>
              
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                  setWithdrawAddress('');
                }}
                disabled={isWithdrawing}
                style={{
                  padding: '14px 24px',
                  background: '#2b3139',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showMenuModal && (
        <div className="modal-overlay" onClick={() => setShowMenuModal(false)}>
          <div 
            className="menu-modal" 
            onClick={e => e.stopPropagation()}
            style={{ willChange: 'auto' }}
          >
            <button className="close-modal" onClick={() => setShowMenuModal(false)}>×</button>
            
            <h2>메뉴</h2>
            
            <div className="menu-tabs">
              <button 
                className={`menu-tab ${activeMenuTab === 'wallet' ? 'active' : ''}`}
                onClick={() => setActiveMenuTab('wallet')}
              >
                👛 계정
              </button>
              <button 
                className={`menu-tab ${activeMenuTab === 'staking' ? 'active' : ''}`}
                onClick={() => setActiveMenuTab('staking')}
              >
                💰 스테이킹
              </button>
              <button 
                className={`menu-tab ${activeMenuTab === 'swap' ? 'active' : ''}`}
                onClick={() => setActiveMenuTab('swap')}
              >
                💱 스왑
              </button>
              <button 
                className={`menu-tab ${activeMenuTab === 'rules' ? 'active' : ''}`}
                onClick={() => setActiveMenuTab('rules')}
              >
                📖 게임룰
              </button>
            </div>

            <div className="menu-content">
              {activeMenuTab === 'wallet' && <WalletSection />}
              {activeMenuTab === 'staking' && <StakingSection />}
              {activeMenuTab === 'swap' && (
                <SwapSection 
                  userPoints={userPoints} 
                  setUserPoints={setUserPoints}
                  user={user}
                  swapAmount={globalSwapAmount}
                  setSwapAmount={setGlobalSwapAmount}
                />
              )}
              {activeMenuTab === 'rules' && <RulesSection />}
            </div>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="modal-overlay" onClick={() => setIsEditingProfile(false)}>
          <div className="edit-profile-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setIsEditingProfile(false)}>×</button>
            
            <h2>프로필 편집</h2>
            
            <div className="avatar-upload-section">
              <div className="current-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Current Avatar" />
                ) : (
                  <div className="default-avatar">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <label className="upload-btn">
                {uploadingAvatar ? '업로드 중...' : '이미지 변경'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploadingAvatar}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            <div className="username-edit-section">
              <label>닉네임</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={user.username || '새 닉네임 입력'}
                maxLength={20}
              />
              <button 
                className="save-username-btn"
                onClick={updateUsername}
              >
                닉네임 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowLoginModal(false)}>×</button>
            
            <div className="modal-header">
              <h2>로그인</h2>
              <p>비트코인 변동성 예측 게임</p>
            </div>
            
            <form onSubmit={handleAuth} className="auth-form">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '처리중...' : '로그인'}
              </button>
              
              <p className="toggle-mode">
                처음이신가요?
                <button 
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowSignupModal(true);
                    setIsSignUp(false);
                    setEmail('');
                    setPassword('');
                  }}
                >
                  회원가입
                </button>
              </p>
              
              {message && <div className="alert">{message}</div>}
            </form>
          </div>
        </div>
      )}

      {showSignupModal && (
        <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowSignupModal(false)}>×</button>
            
            <div className="modal-header">
              <h2>회원가입</h2>
              <p>비트코인 변동성 예측 게임</p>
            </div>
            
            <form onSubmit={handleSignUp} className="auth-form">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <input
                  type="password"
                  placeholder="비밀번호 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '처리중...' : '회원가입'}
              </button>
              
              <p className="toggle-mode">
                이미 계정이 있으신가요?
                <button 
                  type="button"
                  onClick={() => {
                    setShowSignupModal(false);
                    setShowLoginModal(true);
                    setEmail('');
                    setPassword('');
                  }}
                >
                  로그인
                </button>
              </p>
              
              {message && <div className="alert">{message}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolatilityPrediction;