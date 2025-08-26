import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";
import deployData from '../../deploy-output.json';

// 게임 토큰 정보
const GAME_TOKENS = {
    GOLD: { 
      id: 1, 
      name: "골드", 
      image: "https://gateway.pinata.cloud/ipfs/bafkreieoie7id6dg73eyfgi33nr3pvr5cwl6oeueobc24ryt4dlf7qfboy",
      color: "#FFD700", 
      unit: "G"
    },
    SWORD: { 
      id: 101, 
      name: "전설의검", 
      image: "https://gateway.pinata.cloud/ipfs/bafybeif3bulppcsluoj64b5iwzvukicglhvtk2leqsdtbrg74ncxy3gwbm",
      color: "#8A2BE2", 
      unit: "자루"
    },
    POTION: { 
      id: 1001, 
      name: "물약", 
      image: "https://gateway.pinata.cloud/ipfs/bafkreicc2tyznplojawopgygvwmev3h2c2oyiiwftbxyu6hryspqr3e6tm",
      color: "#32CD32", 
      unit: "병"
    }
  };

  // GAME_TOKENS 정의 후에 추가
  const TokenImage = ({ token, size = "64px" }: { 
    token: any, 
    size?: string 
  }) => (
    <div style={{ 
      position: "relative", 
      display: "inline-block",
      width: size,
      height: size
    }}>
      <img 
        src={token.image} 
        alt={token.name}
        style={{ 
          width: size, 
          height: size, 
          borderRadius: "50%",
          border: `3px solid ${token.color}`,
          objectFit: "cover",
          display: "block"
        }}
        onError={(e) => {
          // 이미지 로드 실패시에만 이모지로 fallback
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
      <div style={{ 
        fontSize: `calc(${size} * 0.6)`,
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        position: "absolute",
        top: 0,
        left: 0,
        borderRadius: "50%",
        border: `3px solid ${token.color}`,
        backgroundColor: token.color + "20"
      }}>
        {token.icon}
      </div>
    </div>
  );

export default function GameInventory() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 잔액 데이터
  const [balances, setBalances] = useState<{ [key: number]: bigint }>({});
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        if (!window.ethereum) {
          setError("🦊 메타마스크가 필요합니다.");
          return;
        }

        setContractAddress(deployData.address);

        const provider = new ethers.BrowserProvider(window.ethereum);
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        }

        const signerInstance = await provider.getSigner();
        const contractInstance = new ethers.Contract(deployData.address, MULTITOKEN_ABI, signerInstance);
        const address = await signerInstance.getAddress();

        setContract(contractInstance);
        setUserAddress(address);
        setIsConnected(true);
        setError("");

        // 초기 잔액 조회
        await updateBalances(contractInstance, address);

        console.log("✅ 게임 인벤토리 연결 성공!");
      } catch (err: any) {
        console.error("연결 실패:", err);
        setError(`❌ 연결 실패: ${err.message}`);
      }
    };

    init();
  }, []);

  // 잔액 업데이트 (balanceOfBatch 사용)
  const updateBalances = async (contractInstance?: ethers.Contract, address?: string) => {
    const contractToUse = contractInstance || contract;
    const addressToUse = address || userAddress;
    
    if (!contractToUse || !addressToUse) return;

    setIsLoading(true);
    try {
      const tokenIds = [GAME_TOKENS.GOLD.id, GAME_TOKENS.SWORD.id, GAME_TOKENS.POTION.id];
      const addresses = tokenIds.map(() => addressToUse);
      
      // balanceOfBatch 호출
      const balanceResult = await contractToUse.balanceOfBatch(addresses, tokenIds);
      
      const newBalances: { [key: number]: bigint } = {};
      tokenIds.forEach((id, index) => {
        newBalances[id] = balanceResult[index];
      });
      
      setBalances(newBalances);
      setLastUpdated(new Date());
      
      // 총 가치 계산 (골드 기준)
      const goldValue = Number(newBalances[GAME_TOKENS.GOLD.id] || 0n);
      const swordValue = Number(newBalances[GAME_TOKENS.SWORD.id] || 0n) * 10000; // 전설의검 1자루 = 골드 10,000개
      const potionValue = Number(newBalances[GAME_TOKENS.POTION.id] || 0n) * 100; // 물약 1병 = 골드 100개
      
      setTotalValue(goldValue + swordValue + potionValue);
      
    } catch (err) {
      console.error("잔액 조회 실패:", err);
      setError("잔액 조회에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 개별 토큰 잔액 조회
  const checkSingleBalance = async (tokenId: number, tokenName: string) => {
    if (!contract || !userAddress) return;

    try {
      const balance = await contract.balanceOf(userAddress, tokenId);
      alert(`${tokenName} 잔액: ${balance.toString()}개`);
    } catch (err: any) {
      alert(`${tokenName} 잔액 조회 실패: ${err.message}`);
    }
  };

  // 토큰 카드 컴포넌트
  const TokenCard = ({ token }: { token: typeof GAME_TOKENS.GOLD }) => {
    const balance = balances[token.id] || 0n;
    const balanceNum = Number(balance);
    
    return (
      <div style={{ 
        background: "#2a2a2a", 
        border: `2px solid ${token.color}`, 
        borderRadius: 12, 
        padding: "1.5rem",
        margin: "1rem",
        flex: "1",
        minWidth: "250px",
        boxShadow: `0 4px 12px ${token.color}33`,
        transition: "transform 0.2s",
        cursor: "pointer"
      }}
      onClick={() => checkSingleBalance(token.id, token.name)}
      onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
      onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0px)"}
      >
        <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "center" }}>
  <TokenImage token={token} size="80px" />
</div>

          <h3 style={{ color: token.color, margin: "0.5rem 0" }}>{token.name}</h3>
          <p style={{ color: "#888", fontSize: "0.9rem", margin: "0.5rem 0" }}>ID: {token.id}</p>
          
          <div style={{ 
            background: "#1a1a1a", 
            padding: "1rem", 
            borderRadius: 8, 
            margin: "1rem 0" 
          }}>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: token.color }}>
              {balance.toString()}
            </div>
            <div style={{ color: "#aaa", fontSize: "0.9rem" }}>
              {token.unit}
            </div>
          </div>

          {/* 가치 표시 */}
          {token.id === GAME_TOKENS.GOLD.id && (
            <p style={{ color: "#888", fontSize: "0.8rem" }}>기본 화폐</p>
          )}
          {token.id === GAME_TOKENS.SWORD.id && (
            <p style={{ color: "#888", fontSize: "0.8rem" }}>
              가치: {(balanceNum * 10000).toLocaleString()}G
            </p>
          )}
          {token.id === GAME_TOKENS.POTION.id && (
            <p style={{ color: "#888", fontSize: "0.8rem" }}>
              가치: {(balanceNum * 100).toLocaleString()}G
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      padding: "2rem", 
      background: "#1a1a1a", 
      borderRadius: 12, 
      color: "#ddd",
      maxWidth: "1000px",
      margin: "0 auto"
    }}>
      <h1 style={{ 
        color: "#00d8ff", 
        textAlign: "center", 
        marginBottom: "2rem",
        fontSize: "2rem"
      }}>
        📊 게임 인벤토리
      </h1>
      
      {/* 연결 상태 */}
      <div style={{ 
        background: "#333", 
        padding: "1rem", 
        borderRadius: 8, 
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        <p>👤 플레이어: <code style={{ color: "#00ff00" }}>{userAddress}</code></p>
        <p>📡 상태: 
          <span style={{ color: isConnected ? "#00ff00" : "#ff0000", fontWeight: "bold" }}>
            {isConnected ? " ✅ 연결됨" : " ❌ 연결 안됨"}
          </span>
        </p>
        {lastUpdated && (
          <p style={{ color: "#888", fontSize: "0.9rem" }}>
            마지막 업데이트: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        {error && <p style={{ color: "#ff0000" }}>⚠️ {error}</p>}
      </div>

      {/* 총 자산 가치 */}
      <div style={{ 
        background: "linear-gradient(135deg, #FFD700, #FFA500)", 
        padding: "1.5rem", 
        borderRadius: 12, 
        marginBottom: "2rem",
        textAlign: "center",
        color: "#000"
      }}>
        <h2 style={{ margin: "0 0 0.5rem 0" }}>💰 총 자산 가치</h2>
        <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
          {totalValue.toLocaleString()} G
        </div>
        <p style={{ margin: "0.5rem 0 0 0", opacity: 0.8 }}>
          골드 환산 기준
        </p>
      </div>

      {/* 토큰 카드들 */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: "1rem",
        justifyContent: "center"
      }}>
        <TokenCard token={GAME_TOKENS.GOLD} />
        <TokenCard token={GAME_TOKENS.SWORD} />
        <TokenCard token={GAME_TOKENS.POTION} />
      </div>

      {/* 컨트롤 버튼들 */}
      <div style={{ 
        display: "flex", 
        gap: "1rem", 
        justifyContent: "center", 
        marginTop: "2rem",
        flexWrap: "wrap"
      }}>
        <button
          onClick={() => updateBalances()}
          disabled={!isConnected || isLoading}
          style={{
            padding: "1rem 2rem",
            background: isLoading ? "#666" : "#00d8ff",
            color: "#000",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: isConnected && !isLoading ? "pointer" : "not-allowed",
            fontSize: "1rem",
            opacity: isConnected && !isLoading ? 1 : 0.5
          }}
        >
          {isLoading ? "🔄 업데이트 중..." : "🔄 잔액 새로고침"}
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "1rem 2rem",
            background: "#666",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "1rem"
          }}
        >
          🔄 페이지 새로고침
        </button>
      </div>

      {/* 사용법 안내 */}
      <div style={{ 
        background: "#2a2a2a", 
        padding: "1rem", 
        borderRadius: 8, 
        marginTop: "2rem",
        border: "1px solid #444"
      }}>
        <h4 style={{ color: "#00d8ff", margin: "0 0 0.5rem 0" }}>💡 사용법</h4>
        <ul style={{ color: "#aaa", fontSize: "0.9rem", margin: 0, paddingLeft: "1.5rem" }}>
          <li>토큰 카드를 클릭하면 개별 잔액을 확인할 수 있습니다</li>
          <li>자동으로 모든 토큰의 잔액을 balanceOfBatch로 조회합니다</li>
          <li>총 자산 가치는 골드 기준으로 환산됩니다</li>
          <li>새로고침 버튼으로 최신 잔액을 확인하세요</li>
        </ul>
      </div>
    </div>
  );
}