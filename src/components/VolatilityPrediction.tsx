import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import WalletLogin from './WalletLogin';
import './VolatilityPrediction.css';

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

const VolatilityPrediction: React.FC = () => {
  // 기본 상태
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
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
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [selectedNetwork, setSelectedNetwork] = useState('mumbai');
  const [swapAmount, setSwapAmount] = useState(4000);
  const [copiedAddress, setCopiedAddress] = useState(false);
  
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
  
  // 스프레드 설정
  const getSpread = () => {
    if (selectedTime === 60) return 0.1;
    if (selectedTime === 180) return 0.2;
    return 0.3;
  };
  
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
  
  const ws = useRef<WebSocket | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 스테이킹 만기 체크 함수 추가
  const checkExpiredStaking = async () => {
    if (!user) return;
    
    try {
      // 만기된 스테이킹 조회
      const { data: expiredStaking, error } = await supabase
        .from('staking')
        .select('*')
        .eq('user_id', user.wallet_address || user.email)
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
          
          // 스테이킹 완료 처리
          await supabase
            .from('staking')
            .update({ 
              status: 'completed',
              claimed: true 
            })
            .eq('id', stake.id);
        }
        
        // 포인트 한번에 업데이트
        const newPoints = userPoints + totalReward;
        await supabase
          .from('users')
          .update({ points: newPoints })
          .eq(user.wallet_address ? 'wallet_address' : 'email',
              user.wallet_address || user.email);
        
        setUserPoints(newPoints);
        alert(`🎉 스테이킹 만기! +${totalReward}P 지급 완료!`);
      }
    } catch (error) {
      console.error('Staking check error:', error);
    }
  };

  // 지갑 섹션 컴포넌트
  const WalletSection = () => {
    const copyAddress = () => {
      if (user?.wallet_address) {
        navigator.clipboard.writeText(user.wallet_address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      }
    };

    return (
      <div className="wallet-section">
        <div className="network-selector">
          <label>네트워크 선택</label>
          <select 
            value={selectedNetwork} 
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="network-select"
          >
            <option value="sepolia">Ethereum Sepolia</option>
            <option value="mumbai">Polygon Mumbai</option>
            <option value="devnet">Solana Devnet</option>
          </select>
        </div>

        <div className="wallet-balance-card">
          <h4>테스트넷 USDT 잔액</h4>
          <div className="balance-display">
            <span className="balance-amount">{usdtBalance.toFixed(2)}</span>
            <span className="balance-unit">USDT</span>
          </div>
        </div>

        <div className="wallet-address-card">
          <h4>입금 주소</h4>
          <div className="address-display">
            <span className="address-text">
              {user?.wallet_address ? 
                `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}` : 
                '지갑 연결 필요'}
            </span>
            <button onClick={copyAddress} className="copy-btn">
              {copiedAddress ? '✓' : '📋'}
            </button>
          </div>
        </div>

        <div className="wallet-actions">
          <button className="action-btn withdraw">
            출금하기
          </button>
          <button className="action-btn history">
            거래내역
          </button>
        </div>
      </div>
    );
  };

  // 스테이킹 섹션 컴포넌트
  const StakingSection = () => {
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
          user_id: user.wallet_address || user.email,
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
          .eq(user.wallet_address ? 'wallet_address' : 'email', 
              user.wallet_address || user.email);

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
  };

  // 스왑 섹션 컴포넌트
  const SwapSection = () => {
    const handleSwap = async () => {
      if (swapAmount < 4000 || swapAmount > userPoints) {
        alert('최소 4000P 이상, 보유 포인트 이내로 입력하세요');
        return;
      }

      try {
        const newPoints = userPoints - swapAmount;
        const usdtAmount = swapAmount / 100;
        
        await supabase.from('swap_history').insert({
          user_id: user.wallet_address || user.email,
          points: swapAmount,
          usdt: usdtAmount,
          network: selectedNetwork,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        await supabase.from('users')
          .update({ points: newPoints })
          .eq(user.wallet_address ? 'wallet_address' : 'email',
              user.wallet_address || user.email);
        
        setUserPoints(newPoints);
        setUsdtBalance(prev => prev + usdtAmount);
        
        alert(`${swapAmount}P → ${usdtAmount} USDT 스왑 요청 완료!`);
        setSwapAmount(4000);
      } catch (error) {
        alert('스왑 실패. 잠시 후 다시 시도하세요.');
      }
    };

    return (
      <div className="swap-section">
        <div className="swap-rate-info">
          <h4>교환 비율</h4>
          <div className="rate-display">
            <span>1000 P = 10 USDT</span>
          </div>
          <div className="minimum-info">
            최소 교환: 4000 P
          </div>
        </div>

        <div className="swap-input-group">
          <label>스왑할 포인트</label>
          <input
            type="number"
            value={swapAmount}
            onChange={(e) => setSwapAmount(Number(e.target.value))}
            min="4000"
            step="1000"
            max={userPoints}
          />
          <div className="swap-output">
            <span className="output-label">받을 금액:</span>
            <span className="output-amount">{(swapAmount / 100).toFixed(2)} USDT</span>
          </div>
        </div>

        <div className="network-info">
          <label>수령 네트워크</label>
          <div className="selected-network">
            {selectedNetwork === 'mumbai' ? 'Polygon Mumbai' : 
             selectedNetwork === 'sepolia' ? 'Ethereum Sepolia' : 
             'Solana Devnet'}
          </div>
        </div>

        <button 
          className="swap-confirm-btn"
          onClick={handleSwap}
          disabled={swapAmount < 4000 || swapAmount > userPoints}
        >
          스왑하기
        </button>
      </div>
    );
  };

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

  // 기존 함수들
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('이미지를 선택해주세요');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.wallet_address || user.email}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      if (user.wallet_address) {
        await supabase.from('users')
          .update({ avatar_url: publicUrl })
          .eq('wallet_address', user.wallet_address);
      } else {
        await supabase.from('users')
          .update({ avatar_url: publicUrl })
          .eq('email', user.email);
      }

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
      if (user.wallet_address) {
        await supabase.from('users')
          .update({ username: newUsername })
          .eq('wallet_address', user.wallet_address);
      } else {
        await supabase.from('users')
          .update({ username: newUsername })
          .eq('email', user.email);
      }

      setUser({...user, username: newUsername});
      setIsEditingProfile(false);
      alert('닉네임이 변경되었습니다!');
    } catch (error: any) {
      alert('닉네임 변경 실패: ' + error.message);
    }
  };

  // useEffect에 스테이킹 체크 추가
  useEffect(() => {
    if (user) {
      checkExpiredStaking(); // 로그인시 만기 체크
      
      // 1분마다 체크 (선택사항)
      const interval = setInterval(checkExpiredStaking, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    loadBearBullRatio();
    
    const subscription = supabase
      .channel('predictions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'active_predictions' },
        loadBearBullRatio
      )
      .subscribe();

    const interval = setInterval(loadBearBullRatio, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadBearBullRatio = async () => {
    try {
      const { data } = await supabase
        .from('active_predictions')
        .select('prediction')
        .gte('expires_at', new Date().toISOString());
      
      if (data && data.length > 0) {
        const upCount = data.filter(p => p.prediction === 'up').length;
        const downCount = data.filter(p => p.prediction === 'down').length;
        const total = upCount + downCount;
        
        setBearBullRatio({
          bear: total > 0 ? Math.round((downCount / total) * 100) : 50,
          bull: total > 0 ? Math.round((upCount / total) * 100) : 50
        });
      }
    } catch (error) {
      console.error('Failed to load bear/bull ratio:', error);
    }
  };

  useEffect(() => {
    checkUser();
    connectWebSocket();
    loadLeaderboard();
    if (activeTab === 'original') {
      initTradingViewChart();
    }
    loadMarketIndicators();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [activeTab]);

  const checkUser = async () => {
    const walletAddress = localStorage.getItem('walletAddress');
    if (walletAddress) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();
      
      if (data) {
        setUser(data);
        setUserPoints(data.points);
        setStreak(data.streak);
        setTotalWins(data.total_wins || 0);
        setTotalDraws(data.total_draws || 0);
        setTotalLosses(data.total_losses || 0);
        setAvatarUrl(data.avatar_url || '');
        
        const total = (data.total_wins || 0) + (data.total_losses || 0);
        setWinRate(total > 0 ? Math.round((data.total_wins / total) * 100) : 0);
        
        setConsecutiveDays(data.consecutive_days || 0);
        setLastAttendance(data.last_attendance ? new Date(data.last_attendance) : null);
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await loadUserData(session.user);
    }
  };

  const loadUserData = async (user: any) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();
    
    if (data) {
      setUserPoints(data.points);
      setStreak(data.streak);
      setTotalWins(data.total_wins || 0);
      setTotalDraws(data.total_draws || 0);
      setTotalLosses(data.total_losses || 0);
      setAvatarUrl(data.avatar_url || '');
      
      const total = (data.total_wins || 0) + (data.total_losses || 0);
      setWinRate(total > 0 ? Math.round((data.total_wins / total) * 100) : 0);
      
      setConsecutiveDays(data.consecutive_days || 0);
      setLastAttendance(data.last_attendance ? new Date(data.last_attendance) : null);
    }
  };

  const loadMarketIndicators = async () => {
    try {
      const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
      const data = await response.json();
      
      setMarketIndicators({
        fearGreedIndex: 53,
        fearGreedText: 'Neutral',
        fundingRate: parseFloat(data.lastFundingRate || 0.0001) * 100,
        longShortRatio: 1.00
      });
    } catch (error) {
      console.error('Failed to load market indicators:', error);
    }
  };

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

  const connectWebSocket = () => {
    ws.current = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    ws.current.onopen = () => {
      console.log('Binance WebSocket connected');
    };
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentPrice(parseFloat(data.c));
      setPriceChange24h(parseFloat(data.P));
      setHigh24h(parseFloat(data.h));
      setLow24h(parseFloat(data.l));
      setVolume24h(parseFloat(data.v));
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.current.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(connectWebSocket, 3000);
    };
  };

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user) {
          await supabase.from('users').insert([
            {
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
        }
        setMessage('회원가입 성공!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setUser(data.user);
        setShowLoginModal(false);
        if (data.user) loadUserData(data.user);
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const makePrediction = async (direction: 'up' | 'down') => {
    if (!user) {
      setShowWalletModal(true);
      return;
    }
    
    const minPoints = selectedTime === 60 ? 5 : selectedTime === 180 ? 10 : 15;
    if (userPoints < minPoints) {
      alert(`포인트가 부족합니다! 최소 ${minPoints}P 필요`);
      return;
    }
    
    try {
      await supabase.from('active_predictions').insert({
        user_id: user.wallet_address || user.email,
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
      user_id: user.email || null,
      wallet_address: user.wallet_address || null,
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
    
    if (user.wallet_address) {
      await supabase.from('users')
        .update({ 
          points: newPoints,
          streak: newStreak,
          total_wins: newWins,
          total_draws: newDraws,
          total_losses: newLosses
        })
        .eq('wallet_address', user.wallet_address);
    } else {
      await supabase.from('users')
        .update({ 
          points: newPoints,
          streak: newStreak,
          total_wins: newWins,
          total_draws: newDraws,
          total_losses: newLosses
        })
        .eq('email', user.email);
    }
    
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

  const handleDailyAttendance = async () => {
    if (!user) {
      setShowWalletModal(true);
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
    
    if (user.wallet_address) {
      await supabase.from('users')
        .update({
          points: newPoints,
          consecutive_days: newConsecutiveDays,
          last_attendance: today.toISOString()
        })
        .eq('wallet_address', user.wallet_address);
    } else {
      await supabase.from('users')
        .update({
          points: newPoints,
          consecutive_days: newConsecutiveDays,
          last_attendance: today.toISOString()
        })
        .eq('email', user.email);
    }
    
    setUserPoints(newPoints);
    setConsecutiveDays(newConsecutiveDays);
    setLastAttendance(today);
    
    alert(`출석 완료! +${bonusPoints} 포인트`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    if (user?.wallet_address) {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletType');
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
    setUserPoints(0);
    setStreak(0);
    setTotalWins(0);
    setTotalLosses(0);
    setWinRate(0);
    window.location.reload();
  };

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
                  className={`view-tab ${activeTab === 'tradingview' ? 'active' : ''}`}
                  onClick={() => handleTabChange('tradingview')}
                >
                  Trading View
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
                  src="https://s.tradingview.com/widgetembed/?symbol=BINANCE%3ABTCUSDTPERP&interval=1&theme=dark&style=1&locale=kr&toolbar_bg=%230b0e11&enable_publishing=false&hide_side_toolbar=false&widgetbar=0&studies_overrides=%7B%7D&overrides=%7B%7D"
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
                      <span>{user.wallet_address ? '🦊' : user.email?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                    <div className="avatar-edit-overlay">
                      <span>✏️</span>
                    </div>
                  </div>
                  <div className="user-details">
                    <span className="username" onClick={() => setIsEditingProfile(true)}>
                      {user.username || (user.wallet_address ? 
                        `User_${user.wallet_address.slice(0, 6)}` : 
                        user.email?.split('@')[0])}
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
                className="login-btn wallet-btn"
                onClick={() => setShowWalletModal(true)}
              >
                지갑으로 로그인
              </button>
              <button 
                className="login-btn email-btn"
                onClick={() => setShowLoginModal(true)}
              >
                이메일로 로그인
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

      {/* 메뉴 모달 */}
      {showMenuModal && (
        <div className="modal-overlay" onClick={() => setShowMenuModal(false)}>
          <div className="menu-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowMenuModal(false)}>×</button>
            
            <h2>메뉴</h2>
            
            <div className="menu-tabs">
              <button 
                className={`menu-tab ${activeMenuTab === 'wallet' ? 'active' : ''}`}
                onClick={() => setActiveMenuTab('wallet')}
              >
                👛 지갑
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
              {activeMenuTab === 'swap' && <SwapSection />}
              {activeMenuTab === 'rules' && <RulesSection />}
            </div>
          </div>
        </div>
      )}

      {/* 프로필 편집 모달 */}
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
                    {user.wallet_address ? '🦊' : user.email?.[0]?.toUpperCase() || 'U'}
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
              <h2>{isSignUp ? '회원가입' : '로그인'}</h2>
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
                {loading ? '처리중...' : (isSignUp ? '회원가입' : '로그인')}
              </button>
              
              <div className="divider">
                <span>또는</span>
              </div>
              
              <button 
                type="button" 
                className="oauth-btn wallet"
                onClick={() => {
                  setShowLoginModal(false);
                  setShowWalletModal(true);
                }}
              >
                🦊 Web3 지갑으로 로그인
              </button>
              
              <p className="toggle-mode">
                {isSignUp ? '이미 계정이 있으신가요?' : '처음이신가요?'}
                <button 
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? '로그인' : '회원가입'}
                </button>
              </p>
              
              {message && <div className="alert">{message}</div>}
            </form>
          </div>
        </div>
      )}

      {showWalletModal && (
        <WalletLogin
          onSuccess={(userData) => {
            setUser(userData);
            setUserPoints(userData.points);
            setStreak(userData.streak);
            setTotalWins(userData.total_wins || 0);
            setTotalDraws(userData.total_draws || 0);
            setTotalLosses(userData.total_losses || 0);
            setAvatarUrl(userData.avatar_url || '');
            const total = (userData.total_wins || 0) + (userData.total_losses || 0);
            setWinRate(total > 0 ? Math.round((userData.total_wins / total) * 100) : 0);
            setConsecutiveDays(userData.consecutive_days || 0);
            setLastAttendance(userData.last_attendance ? new Date(userData.last_attendance) : null);
            setShowWalletModal(false);
          }}
          onClose={() => setShowWalletModal(false)}
        />
      )}
    </div>
  );
};

export default VolatilityPrediction;