import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";
import deployData from '../../deploy-output.json';

// 게임 토큰 정보
const GAME_TOKENS = {
  1: { 
    name: "골드",  
    image: "https://gateway.pinata.cloud/ipfs/bafkreieoie7id6dg73eyfgi33nr3pvr5cwl6oeueobc24ryt4dlf7qfboy",
    color: "#FFD700"
  },
  101: { 
    name: "전설의검", 
    image: "https://gateway.pinata.cloud/ipfs/bafybeif3bulppcsluoj64b5iwzvukicglhvtk2leqsdtbrg74ncxy3gwbm",
    color: "#8A2BE2"
  },
  1001: { 
    name: "물약", 
    image: "https://gateway.pinata.cloud/ipfs/bafkreicc2tyznplojawopgygvwmev3h2c2oyiiwftbxyu6hryspqr3e6tm",
    color: "#32CD32"
  }
};

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
      borderRadius: "8px",
      border: `2px solid ${token.color}`,
      objectFit: "cover"
    }}
    onError={(e) => {
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
        font-size: ${size === "24px" ? "12px" : "24px"}; 
        font-weight: bold; 
        color: #fff; 
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      `;
      fallbackDiv.textContent = token.name.charAt(0);
      target.parentNode?.replaceChild(fallbackDiv, target);
    }}
  />
);

type TransferMode = "single" | "batch";
type GameToken = 1 | 101 | 1001;

interface MetaMaskEthereum {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener?: (eventName: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
}

const getEthereum = (): MetaMaskEthereum | null => {
  const ethereum = (window as any).ethereum;
  return ethereum || null;
};

// 에러 파싱 함수 추가
const parseContractError = (error: any): string => {
  console.error("Contract Error Details:", error);
  
  // 커스텀 에러 처리
  if (error.data) {
    try {
      const errorSignature = error.data.slice(0, 10);
      
      // 커스텀 에러 시그니처 매핑
      const errorMap: { [key: string]: string } = {
        "0x5b05999a": "InvalidAddress()",
        "0x37c3be29": "InsufficientBalance", 
        "0x42b06de1": "ArrayLengthMismatch()",
        "0x4ca88867": "NotAuthorized()"
      };
      
      if (errorMap[errorSignature]) {
        return `컨트랙트 에러: ${errorMap[errorSignature]}`;
      }
    } catch (e) {
      console.log("에러 파싱 실패:", e);
    }
  }
  
  // 기존 에러 메시지 처리
  if (error.code === "ACTION_REJECTED") {
    return "사용자가 트랜잭션을 취소했습니다";
  } else if (error.message.includes("insufficient funds")) {
    return "가스비가 부족합니다";
  } else if (error.message.includes("execution reverted")) {
    return "컨트랙트 실행이 거부되었습니다. 잔액이나 권한을 확인해주세요";
  } else if (error.reason) {
    return error.reason;
  } else {
    return error.message || "알 수 없는 오류";
  }
};

export default function TokenTransfer() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<TransferMode>("single");
  const [isLoading, setIsLoading] = useState(false);

  const [toAddress, setToAddress] = useState("");
  const [balances, setBalances] = useState<{ [key: number]: bigint }>({});

  const [singleTokenId, setSingleTokenId] = useState<GameToken>(1);
  const [singleAmount, setSingleAmount] = useState(100);

  const [batchTransfers, setBatchTransfers] = useState([
    { tokenId: 1 as GameToken, amount: 100 },
    { tokenId: 101 as GameToken, amount: 1 },
    { tokenId: 1001 as GameToken, amount: 10 }
  ]);

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError("");

      const ethereum = getEthereum();
      if (!ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다.");
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error("MetaMask에서 계정을 선택해주세요.");
      }

      const chainId = await ethereum.request({
        method: 'eth_chainId'
      });
      console.log("현재 네트워크:", chainId);

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signerInstance = await provider.getSigner();
      const address = await signerInstance.getAddress();

      const contractInstance = new ethers.Contract(
        deployData.address, 
        MULTITOKEN_ABI, 
        signerInstance
      );

      setSigner(signerInstance);
      setContract(contractInstance);
      setUserAddress(address);
      setContractAddress(deployData.address);
      setIsConnected(true);

      await updateBalances(contractInstance, address);

      console.log("✅ 지갑 연결 성공!");

    } catch (err: any) {
      console.error("지갑 연결 실패:", err);
      setError(`지갑 연결 실패: ${err.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const ethereum = getEthereum();
      if (!ethereum) {
        setError("🦊 MetaMask가 필요합니다.");
        return;
      }

      try {
        const accounts = await ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (err) {
        console.log("자동 연결 실패 (정상적인 경우):", err);
      }
    };

    init();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setUserAddress("");
        setContract(null);
        setSigner(null);
        setBalances({});
      } else {
        connectWallet();
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log("네트워크 변경됨:", chainId);
      window.location.reload();
    };

    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.on?.('accountsChanged', handleAccountsChanged);
      ethereum.on?.('chainChanged', handleChainChanged);
    }

    return () => {
      const ethereum = getEthereum();
      if (ethereum) {
        ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
        ethereum.removeListener?.('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const updateBalances = async (contractInstance?: ethers.Contract, address?: string) => {
    const contractToUse = contractInstance || contract;
    const addressToUse = address || userAddress;
    
    if (!contractToUse || !addressToUse) return;

    try {
      const newBalances: { [key: number]: bigint } = {};
      const tokenIds = [1, 101, 1001];
      
      for (const tokenId of tokenIds) {
        try {
          const balance = await contractToUse.balanceOf(addressToUse, tokenId);
          const balanceValue = typeof balance === 'bigint' ? balance : BigInt(balance.toString());
          newBalances[tokenId] = balanceValue;
        } catch (individualErr) {
          console.error(`❌ 토큰 ID ${tokenId} 조회 실패:`, individualErr);
          newBalances[tokenId] = 0n;
        }
      }
      
      setBalances(newBalances);
      
    } catch (err: any) {
      console.error("❌ 전체 잔액 조회 실패:", err);
      setBalances({ 1: 0n, 101: 0n, 1001: 0n });
    }
  };

  // 단일 토큰 전송 (개선된 버전)
  const handleSingleTransfer = async () => {
    if (!contract || !signer || !toAddress) {
      alert("⛔ 컨트랙트 연결 또는 받는 주소를 확인해주세요");
      return;
    }

    if (!ethers.isAddress(toAddress)) {
      alert("⛔ 유효하지 않은 주소입니다");
      return;
    }

    const currentBalance = balances[singleTokenId] || 0n;
    if (currentBalance < BigInt(singleAmount)) {
      alert("⛔ 잔액이 부족합니다");
      return;
    }

    try {
      setIsLoading(true);
      
      console.log("=== 단일 전송 시작 ===");
      console.log("from:", userAddress);
      console.log("to:", toAddress);
      console.log("tokenId:", singleTokenId);
      console.log("amount:", singleAmount);
      
      // 가스 추정을 더 안전하게
      let estimatedGas: bigint;
      try {
        estimatedGas = await contract.safeTransferFrom.estimateGas(
          userAddress,
          toAddress,
          singleTokenId,
          singleAmount,
          "0x"
        );
        console.log("예상 가스:", estimatedGas.toString());
      } catch (gasError) {
        console.error("가스 추정 실패:", gasError);
        throw new Error("가스 추정 실패: " + parseContractError(gasError));
      }
      
      const tx = await contract.safeTransferFrom(
        userAddress,
        toAddress,
        singleTokenId,
        singleAmount,
        "0x",
        {
          gasLimit: estimatedGas + BigInt(20000) // 가스 여유분 증가
        }
      );

      console.log("트랜잭션 전송됨:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("트랜잭션 완료:", receipt);
      
      alert(`✅ ${GAME_TOKENS[singleTokenId].name} ${singleAmount}개 전송 완료!\nTx: ${tx.hash}`);
      
      await updateBalances();
    } catch (e: any) {
      console.error("단일 전송 에러:", e);
      const errorMessage = parseContractError(e);
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 배치 전송 (대폭 개선된 버전)
  const handleBatchTransfer = async () => {
    if (!contract || !signer || !toAddress) {
      alert("컨트랙트 연결 또는 받는 주소를 확인해주세요");
      return;
    }

    if (!ethers.isAddress(toAddress)) {
      alert("유효하지 않은 주소입니다");
      return;
    }

    const validTransfers = batchTransfers.filter(t => t.amount > 0);
    if (validTransfers.length === 0) {
      alert("전송할 토큰이 없습니다");
      return;
    }

    // 중복 토큰 통합
    const consolidatedTransfers = new Map<number, number>();
    validTransfers.forEach(transfer => {
      const current = consolidatedTransfers.get(transfer.tokenId) || 0;
      consolidatedTransfers.set(transfer.tokenId, current + transfer.amount);
    });

    // 잔액 검증
    for (const [tokenId, amount] of consolidatedTransfers) {
      const currentBalance = balances[tokenId] || 0n;
      if (currentBalance < BigInt(amount)) {
        const tokenInfo = GAME_TOKENS[tokenId as keyof typeof GAME_TOKENS];
        alert(`${tokenInfo?.name || `토큰 ID ${tokenId}`} 잔액이 부족합니다`);
        return;
      }
    }

    try {
      setIsLoading(true);
      
      const tokenIds = Array.from(consolidatedTransfers.keys());
      const amounts = Array.from(consolidatedTransfers.values());

      console.log("=== 배치 전송 시작 ===");
      console.log("from:", userAddress);
      console.log("to:", toAddress);
      console.log("tokenIds:", tokenIds);
      console.log("amounts:", amounts);

      // 가스 추정을 더 안전하게
      let estimatedGas: bigint;
      try {
        estimatedGas = await contract.safeBatchTransferFrom.estimateGas(
          userAddress,
          toAddress,
          tokenIds,
          amounts,
          "0x"
        );
        console.log("예상 가스:", estimatedGas.toString());
      } catch (gasError) {
        console.error("가스 추정 실패:", gasError);
        throw new Error("가스 추정 실패: " + parseContractError(gasError));
      }

      const tx = await contract.safeBatchTransferFrom(
        userAddress,
        toAddress,
        tokenIds,
        amounts,
        "0x",
        {
          gasLimit: estimatedGas + BigInt(50000) // 가스 여유분
        }
      );

      console.log("트랜잭션 해시:", tx.hash);
      const receipt = await tx.wait();
      console.log("트랜잭션 완료:", receipt);
      
      const transferSummary = tokenIds
        .map((id, i) => {
          const tokenInfo = GAME_TOKENS[id as keyof typeof GAME_TOKENS];
          return `${tokenInfo?.name || `토큰 ID ${id}`} ${amounts[i]}개`;
        })
        .join(", ");
      
      alert(`✅ 배치 전송 완료!\n${transferSummary}\nTx: ${tx.hash}`);
      await updateBalances();
      
    } catch (e: any) {
      console.error("배치 전송 실행 에러:", e);
      const errorMessage = parseContractError(e);
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 개별 전송 함수도 에러 처리 개선
  const handleIndividualTransfers = async (transfers: typeof batchTransfers) => {
    console.log("개별 전송 모드 시작");
    
    for (const transfer of transfers) {
      try {
        console.log(`${GAME_TOKENS[transfer.tokenId].name} ${transfer.amount}개 개별 전송 시작`);
        
        const tx = await contract!.safeTransferFrom(
          userAddress,
          toAddress,
          transfer.tokenId,
          transfer.amount,
          "0x"
        );

        console.log(`${GAME_TOKENS[transfer.tokenId].name} 트랜잭션:`, tx.hash);
        await tx.wait();
        console.log(`${GAME_TOKENS[transfer.tokenId].name} 전송 완료`);
        
      } catch (err: any) {
        console.error(`${GAME_TOKENS[transfer.tokenId].name} 개별 전송 실패:`, err);
        const errorMessage = parseContractError(err);
        alert(`${GAME_TOKENS[transfer.tokenId].name} 전송 실패: ${errorMessage}`);
        break;
      }
    }
    
    alert("개별 전송 완료!");
    await updateBalances();
  };

  const updateBatchTransfer = (index: number, field: 'tokenId' | 'amount', value: any) => {
    const newBatchTransfers = [...batchTransfers];
    newBatchTransfers[index] = { ...newBatchTransfers[index], [field]: value };
    setBatchTransfers(newBatchTransfers);
  };

  const addBatchTransfer = () => {
    setBatchTransfers([...batchTransfers, { tokenId: 1 as GameToken, amount: 0 }]);
  };

  const removeBatchTransfer = (index: number) => {
    if (batchTransfers.length > 1) {
      setBatchTransfers(batchTransfers.filter((_, i) => i !== index));
    }
  };

  return (
    <div style={{ 
      padding: "2rem", 
      background: "#1a1a1a", 
      borderRadius: 12, 
      color: "#ddd",
      maxWidth: "900px",
      margin: "0 auto"
    }}>
      <h1 style={{ 
        color: "#00d8ff", 
        textAlign: "center", 
        marginBottom: "2rem",
        fontSize: "2rem"
      }}>
        💸 게임 토큰 전송 센터 (수정됨)
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
            <p style={{ marginBottom: "1rem" }}>👤 지갑이 연결되지 않았습니다</p>
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
              {isLoading ? "연결 중..." : "🦊 MetaMask 연결"}
            </button>
          </div>
        ) : (
          <>
            <p>👤 내 지갑: <code style={{ color: "#00ff00" }}>{userAddress}</code></p>
            <p>📡 상태: 
              <span style={{ color: "#00ff00", fontWeight: "bold" }}>
                ✅ 연결됨
              </span>
            </p>
            <p>📋 컨트랙트: <code style={{ color: "#00d8ff" }}>{contractAddress}</code></p>
          </>
        )}
        {error && <p style={{ color: "#ff0000" }}>⚠️ {error}</p>}
      </div>

      {/* 연결된 경우에만 나머지 UI 표시 */}
      {isConnected && (
        <>
          {/* 내 잔액 표시 */}
          <div style={{ 
            background: "#2a2a2a", 
            padding: "1rem", 
            borderRadius: 8, 
            marginBottom: "2rem" 
          }}>
            <h3 style={{ color: "#00d8ff", margin: "0 0 1rem 0" }}>💰 내 잔액</h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {Object.entries(GAME_TOKENS).map(([id, token]) => (
                <div key={id} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.5rem",
                  background: "#1a1a1a",
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  border: `1px solid ${token.color}`
                }}>
                  <TokenImage token={token} size="24px" />
                  <span style={{ color: token.color }}>{token.name}:</span>
                  <strong style={{ color: "#fff" }}>{balances[Number(id)]?.toString() || "0"}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* 모드 선택 */}
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            marginBottom: "2rem",
            justifyContent: "center"
          }}>
            <button
              onClick={() => setMode("single")}
              style={{
                padding: "0.8rem 2rem",
                background: mode === "single" ? "#00d8ff" : "#666",
                color: mode === "single" ? "#000" : "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              🎯 단일 전송
            </button>
            <button
              onClick={() => setMode("batch")}
              style={{
                padding: "0.8rem 2rem",
                background: mode === "batch" ? "#00d8ff" : "#666",
                color: mode === "batch" ? "#000" : "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              📦 배치 전송
            </button>
          </div>

          {/* 받는 주소 입력 */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ 
              display: "block", 
              color: "#00d8ff", 
              fontWeight: "bold", 
              marginBottom: "0.5rem" 
            }}>
              📤 받는 주소:
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%",
                padding: "0.8rem",
                borderRadius: 6,
                border: "1px solid #666",
                background: "#2a2a2a",
                color: "#fff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          {/* 단일 전송 모드 */}
          {mode === "single" && (
            <div style={{ 
              background: "#2a2a2a", 
              padding: "1.5rem", 
              borderRadius: 8, 
              marginBottom: "2rem" 
            }}>
              <h3 style={{ color: "#00d8ff", margin: "0 0 1rem 0" }}>🎯 단일 토큰 전송 (safeTransferFrom)</h3>
              
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1", minWidth: "200px" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>토큰 선택:</label>
                  <select
                    value={singleTokenId}
                    onChange={(e) => setSingleTokenId(Number(e.target.value) as GameToken)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#1a1a1a",
                      color: "#fff"
                    }}
                  >
                    {Object.entries(GAME_TOKENS).map(([id, token]) => (
                      <option key={id} value={id}>
                        {token.name} (ID: {id}) - 잔액: {balances[Number(id)]?.toString() || "0"}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ flex: "1", minWidth: "150px" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem" }}>수량:</label>
                  <input
                    type="number"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(Number(e.target.value))}
                    min="1"
                    max={Number(balances[singleTokenId] || 0)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#1a1a1a",
                      color: "#fff"
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleSingleTransfer}
                disabled={!isConnected || !toAddress || isLoading || !ethers.isAddress(toAddress)}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: (isConnected && toAddress && !isLoading && ethers.isAddress(toAddress)) ? "#32CD32" : "#666",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: "bold",
                  cursor: (isConnected && toAddress && !isLoading) ? "pointer" : "not-allowed",
                  fontSize: "1rem"
                }}
              >
                {isLoading ? "전송 중..." : "🚀 단일 전송 실행"}
              </button>
            </div>
          )}

          {/* 배치 전송 모드 */}
          {mode === "batch" && (
            <div style={{ 
              background: "#2a2a2a", 
              padding: "1.5rem", 
              borderRadius: 8, 
              marginBottom: "2rem" 
            }}>
              <h3 style={{ color: "#00d8ff", margin: "0 0 1rem 0" }}>📦 배치 전송 (safeBatchTransferFrom)</h3>
              
              {batchTransfers.map((transfer, index) => (
                <div key={index} style={{ 
                  background: "#1a1a1a", 
                  padding: "1rem", 
                  borderRadius: 6, 
                  marginBottom: "1rem",
                  border: "1px solid #444"
                }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: "1", minWidth: "200px" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                        토큰 #{index + 1}:
                      </label>
                      <select
                        value={transfer.tokenId}
                        onChange={(e) => updateBatchTransfer(index, 'tokenId', Number(e.target.value) as GameToken)}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: 4,
                          border: "1px solid #666",
                          background: "#2a2a2a",
                          color: "#fff",
                          fontSize: "0.9rem"
                        }}
                      >
                        {Object.entries(GAME_TOKENS).map(([id, token]) => (
                          <option key={id} value={id}>
                            {token.name} (ID: {id}) - 잔액: {balances[Number(id)]?.toString() || "0"}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ flex: "1", minWidth: "120px" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                        수량:
                      </label>
                      <input
                        type="number"
                        value={transfer.amount}
                        onChange={(e) => updateBatchTransfer(index, 'amount', Number(e.target.value))}
                        min="0"
                        max={Number(balances[transfer.tokenId] || 0)}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: 4,
                          border: "1px solid #666",
                          background: "#2a2a2a",
                          color: "#fff",
                          fontSize: "0.9rem"
                        }}
                      />
                    </div>

                    <button
                      onClick={() => removeBatchTransfer(index)}
                      disabled={batchTransfers.length <= 1}
                      style={{
                        padding: "0.5rem",
                        background: batchTransfers.length > 1 ? "#ff4444" : "#666",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: batchTransfers.length > 1 ? "pointer" : "not-allowed",
                        fontSize: "0.9rem"
                      }}
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  onClick={addBatchTransfer}
                  style={{
                    flex: "1",
                    padding: "0.8rem",
                    background: "#666",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  ➕ 토큰 추가
                </button>

                <button
                  onClick={handleBatchTransfer}
                  disabled={!isConnected || !toAddress || isLoading || !ethers.isAddress(toAddress)}
                  style={{
                    flex: "2",
                    padding: "0.8rem",
                    background: (isConnected && toAddress && !isLoading && ethers.isAddress(toAddress)) ? "#8A2BE2" : "#666",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: "bold",
                    cursor: (isConnected && toAddress && !isLoading) ? "pointer" : "not-allowed",
                    fontSize: "1rem"
                  }}
                >
                  {isLoading ? "전송 중..." : "🚀 배치 전송 실행"}
                </button>
              </div>
            </div>
          )}

          {/* 잔액 새로고침 */}
          <div style={{ textAlign: "center" }}>
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
              🔄 잔액 새로고침
            </button>
          </div>

          {/* 디버그 정보 */}
          <div style={{ 
            background: "#333", 
            padding: "1rem", 
            borderRadius: 8, 
            marginTop: "2rem",
            fontSize: "0.8rem"
          }}>
            <h4 style={{ color: "#00d8ff", margin: "0 0 0.5rem 0" }}>🔧 디버그 정보</h4>
            <p>컨트랙트 주소: {contractAddress}</p>
            <p>사용자 주소: {userAddress}</p>
            <p>받는 주소 유효성: {toAddress ? (ethers.isAddress(toAddress) ? "✅ 유효" : "❌ 무효") : "❓ 미입력"}</p>
          </div>
        </>
      )}
    </div>
  );
}