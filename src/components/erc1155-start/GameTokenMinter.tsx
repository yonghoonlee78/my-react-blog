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
    defaultAmount: 1000,
    unit: "G"
  },
  SWORD: { 
    id: 101, 
    name: "전설의검", 
    image: "https://gateway.pinata.cloud/ipfs/bafybeif3bulppcsluoj64b5iwzvukicglhvtk2leqsdtbrg74ncxy3gwbm",
    color: "#8A2BE2", 
    defaultAmount: 1,
    unit: "자루"
  },
  POTION: { 
    id: 1001, 
    name: "물약", 
    image: "https://gateway.pinata.cloud/ipfs/bafkreicc2tyznplojawopgygvwmev3h2c2oyiiwftbxyu6hryspqr3e6tm",
    color: "#32CD32", 
    defaultAmount: 50,
    unit: "병"
  }
};

// TokenImage 컴포넌트 수정
const TokenImage = ({ token, size = "64px" }: { 
  token: any, 
  size?: string 
}) => (
  <img 
    src={token.image} 
    alt={token.name}
    style={{ 
      width: size, 
      height: size, 
      borderRadius: "8px", // 네모 형태
      border: `2px solid ${token.color}`,
      objectFit: "cover"
    }}
    onError={(e) => {
      // 이미지 로드 실패시 fallback
      const target = e.target as HTMLImageElement;
      target.style.display = 'none';
      const fallbackDiv = document.createElement('div');
      fallbackDiv.style.cssText = `
        width: ${size}; 
        height: ${size}; 
        border-radius: 8px; 
        border: 2px solid ${token.color}; 
        background: ${token.color}; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: ${size === "24px" ? "12px" : size === "48px" ? "20px" : "24px"}; 
        font-weight: bold; 
        color: #fff; 
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      `;
      fallbackDiv.textContent = token.name.charAt(0);
      target.parentNode?.replaceChild(fallbackDiv, target);
    }}
  />
);

// MetaMask 타입 정의
interface MetaMaskEthereum {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener?: (eventName: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
}

// 안전한 타입 체크 함수
const getEthereum = (): MetaMaskEthereum | null => {
  const ethereum = (window as any).ethereum;
  return ethereum || null;
};

export default function GameTokenMinter() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 각 토큰별 민팅 수량
  const [goldAmount, setGoldAmount] = useState(GAME_TOKENS.GOLD.defaultAmount);
  const [swordAmount, setSwordAmount] = useState(GAME_TOKENS.SWORD.defaultAmount);
  const [potionAmount, setPotionAmount] = useState(GAME_TOKENS.POTION.defaultAmount);

  // 각 토큰별 잔액
  const [balances, setBalances] = useState<{ [key: number]: bigint }>({});

  // MetaMask 연결 함수
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError("");

      const ethereum = getEthereum();
      if (!ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다.");
      }

      // 계정 연결 요청
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error("MetaMask에서 계정을 선택해주세요.");
      }

      // Provider와 Signer 설정
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signerInstance = await provider.getSigner();
      const address = await signerInstance.getAddress();

      // Contract 인스턴스 생성
      const contractInstance = new ethers.Contract(
        deployData.address, 
        MULTITOKEN_ABI, 
        signerInstance
      );

      // 상태 업데이트
      setSigner(signerInstance);
      setContract(contractInstance);
      setUserAddress(address);
      setContractAddress(deployData.address);
      setIsConnected(true);

      // 초기 잔액 조회
      await updateBalances(contractInstance, address);

      console.log("게임 토큰 민팅 시스템 연결 성공!");

    } catch (err: any) {
      console.error("지갑 연결 실패:", err);
      setError(`지갑 연결 실패: ${err.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 자동 연결 시도
    const init = async () => {
      const ethereum = getEthereum();
      if (!ethereum) {
        setError("MetaMask가 필요합니다.");
        return;
      }

      try {
        // 이미 연결된 계정이 있는지 확인
        const accounts = await ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          // 이미 연결되어 있다면 자동 연결
          await connectWallet();
        }
      } catch (err) {
        console.log("자동 연결 실패 (정상적인 경우):", err);
      }
    };

    init();

    // 계정 변경 이벤트 리스너
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // 연결 해제
        setIsConnected(false);
        setUserAddress("");
        setContract(null);
        setSigner(null);
        setBalances({});
      } else {
        // 계정 변경 시 재연결
        connectWallet();
      }
    };

    // 네트워크 변경 이벤트 리스너
    const handleChainChanged = (chainId: string) => {
      console.log("네트워크 변경됨:", chainId);
      window.location.reload();
    };

    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.on?.('accountsChanged', handleAccountsChanged);
      ethereum.on?.('chainChanged', handleChainChanged);
    }

    // 클린업
    return () => {
      const ethereum = getEthereum();
      if (ethereum) {
        ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
        ethereum.removeListener?.('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // 잔액 업데이트 - 개별 조회로 변경
  const updateBalances = async (contractInstance?: ethers.Contract, address?: string) => {
    const contractToUse = contractInstance || contract;
    const addressToUse = address || userAddress;
    
    if (!contractToUse || !addressToUse) return;

    try {
      console.log("개별 잔액 조회 시작...");
      
      const newBalances: { [key: number]: bigint } = {};
      const tokenIds = [GAME_TOKENS.GOLD.id, GAME_TOKENS.SWORD.id, GAME_TOKENS.POTION.id];
      
      // 각 토큰별로 개별 조회
      for (const tokenId of tokenIds) {
        try {
          const balance = await contractToUse.balanceOf(addressToUse, tokenId);
          const balanceValue = typeof balance === 'bigint' ? balance : BigInt(balance.toString());
          newBalances[tokenId] = balanceValue;
          console.log(`토큰 ID ${tokenId}: ${balanceValue.toString()}개`);
        } catch (individualErr) {
          console.error(`토큰 ID ${tokenId} 조회 실패:`, individualErr);
          newBalances[tokenId] = 0n;
        }
      }
      
      setBalances(newBalances);
      console.log("잔액 업데이트 완료:", newBalances);
      
    } catch (err: any) {
      console.error("잔액 조회 실패:", err);
      // 기본값 설정
      setBalances({ 1: 0n, 101: 0n, 1001: 0n });
    }
  };

  // 토큰 민팅
  const mintToken = async (tokenId: number, amount: number, tokenName: string) => {
    if (!contract || !signer) {
      alert("컨트랙트가 연결되지 않았습니다");
      return;
    }

    try {
      setIsLoading(true);
      console.log(`${tokenName} 민팅 시작:`, { tokenId, amount });
      
      // 가스 추정
      const estimatedGas = await contract.mint.estimateGas(userAddress, tokenId, amount, "0x");
      console.log("예상 가스:", estimatedGas.toString());

      const tx = await contract.mint(userAddress, tokenId, amount, "0x", {
        gasLimit: estimatedGas + BigInt(10000) // 여유분 추가
      });
      
      console.log("트랜잭션 전송됨:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("트랜잭션 완료:", receipt);
      
      alert(`${tokenName} ${amount}개 민팅 완료!\nTx: ${tx.hash}`);
      
      // 잔액 업데이트
      await updateBalances();
    } catch (e: any) {
      console.error(`${tokenName} 민팅 에러:`, e);
      let errorMessage = "민팅 실패";
      
      if (e.code === "ACTION_REJECTED") {
        errorMessage = "사용자가 트랜잭션을 취소했습니다";
      } else if (e.message.includes("insufficient funds")) {
        errorMessage = "가스비가 부족합니다";
      } else if (e.message.includes("execution reverted")) {
        errorMessage = "컨트랙트 실행이 거부되었습니다";
      } else {
        errorMessage = e.message || "알 수 없는 오류";
      }
      
      alert(`${tokenName} ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 토큰 카드 컴포넌트
  const TokenCard = ({ token, amount, setAmount, onMint }: {
    token: typeof GAME_TOKENS.GOLD,
    amount: number,
    setAmount: (amount: number) => void,
    onMint: () => void
  }) => (
    <div style={{ 
      background: "#2a2a2a", 
      border: `2px solid ${token.color}`, 
      borderRadius: 12, 
      padding: "1.5rem", 
      margin: "1rem 0",
      boxShadow: `0 4px 8px ${token.color}33`
    }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ marginRight: "0.5rem" }}>
          <TokenImage token={token} size="48px" />
        </div>
        <h3 style={{ color: token.color, margin: 0 }}>{token.name} (ID: {token.id})</h3>
      </div>
      
      <div style={{ marginBottom: "1rem" }}>
        <p style={{ color: "#aaa", margin: "0.5rem 0" }}>
          현재 보유: <strong style={{ color: token.color }}>
            {balances[token.id]?.toString() || "0"}개
          </strong>
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <label style={{ color: "#ddd", minWidth: "80px" }}>민팅 수량:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min="1"
          style={{ 
            padding: "0.5rem", 
            borderRadius: 6, 
            border: `1px solid ${token.color}`,
            background: "#1a1a1a",
            color: "#fff",
            width: "100px"
          }}
        />
        <button
          onClick={onMint}
          disabled={!isConnected || isLoading}
          style={{
            padding: "0.5rem 1rem",
            background: (isConnected && !isLoading) ? token.color : "#666",
            color: token.color === "#FFD700" ? "#000" : "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            cursor: (isConnected && !isLoading) ? "pointer" : "not-allowed",
            opacity: (isConnected && !isLoading) ? 1 : 0.5
          }}
        >
          {isLoading ? "민팅 중..." : "민팅"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ 
      padding: "2rem", 
      background: "#1a1a1a", 
      borderRadius: 12, 
      color: "#ddd",
      maxWidth: "800px",
      margin: "0 auto"
    }}>
      <h1 style={{ 
        color: "#00d8ff", 
        textAlign: "center", 
        marginBottom: "2rem",
        fontSize: "2rem"
      }}>
        게임 토큰 민팅 센터
      </h1>
      
      {/* 연결 상태 */}
      <div style={{ 
        background: "#333", 
        padding: "1rem", 
        borderRadius: 8, 
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        {!isConnected ? (
          <div>
            <p style={{ marginBottom: "1rem" }}>지갑이 연결되지 않았습니다</p>
            <button
              onClick={connectWallet}
              disabled={isLoading}
              style={{
                padding: "0.8rem 2rem",
                background: "#00d8ff",
                color: "#000",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "1rem"
              }}
            >
              {isLoading ? "연결 중..." : "MetaMask 연결"}
            </button>
          </div>
        ) : (
          <>
            <p>컨트랙트: <code style={{ color: "#00d8ff" }}>{contractAddress}</code></p>
            <p>지갑: <code style={{ color: "#00ff00" }}>{userAddress}</code></p>
            <p>상태: 
              <span style={{ color: "#00ff00", fontWeight: "bold" }}>
                연결됨
              </span>
            </p>
          </>
        )}
        {error && <p style={{ color: "#ff0000" }}>{error}</p>}
      </div>

      {/* 연결된 경우에만 민팅 카드들 표시 */}
      {isConnected && (
        <>
          {/* 게임 토큰 민팅 카드들 */}
          <div>
            <TokenCard 
              token={GAME_TOKENS.GOLD}
              amount={goldAmount}
              setAmount={setGoldAmount}
              onMint={() => mintToken(GAME_TOKENS.GOLD.id, goldAmount, GAME_TOKENS.GOLD.name)}
            />
            
            <TokenCard 
              token={GAME_TOKENS.SWORD}
              amount={swordAmount}
              setAmount={setSwordAmount}
              onMint={() => mintToken(GAME_TOKENS.SWORD.id, swordAmount, GAME_TOKENS.SWORD.name)}
            />
            
            <TokenCard 
              token={GAME_TOKENS.POTION}
              amount={potionAmount}
              setAmount={setPotionAmount}
              onMint={() => mintToken(GAME_TOKENS.POTION.id, potionAmount, GAME_TOKENS.POTION.name)}
            />
          </div>

          {/* 전체 잔액 새로고침 */}
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              onClick={() => updateBalances()}
              disabled={!isConnected || isLoading}
              style={{
                padding: "0.8rem 2rem",
                background: "#00d8ff",
                color: "#000",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: (isConnected && !isLoading) ? "pointer" : "not-allowed",
                fontSize: "1rem"
              }}
            >
              잔액 새로고침
            </button>
          </div>
        </>
      )}
    </div>
  );
}