import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";
import deployData from '../../deploy-output.json';

// 게임 토큰 정보
const GAME_TOKENS = {
  1: { name: "골드", color: "#FFD700" },
  101: { name: "전설의검", color: "#8A2BE2" },
  1001: { name: "물약", color: "#32CD32" }
};

type ViewMode = "approval" | "delegated";

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

export default function ApprovalManager() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("approval");

  // 권한 관리
  const [operatorAddress, setOperatorAddress] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<boolean | null>(null);

  // 위임 전송
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [tokenId, setTokenId] = useState<1 | 101 | 1001>(1);
  const [amount, setAmount] = useState(100);
  const [hasPermission, setHasPermission] = useState(false);
  const [ownerBalances, setOwnerBalances] = useState<{ [key: number]: bigint }>({});

  useEffect(() => {
    const init = async () => {
      try {
        const ethereum = getEthereum();
        if (!ethereum) {
          setError("MetaMask가 필요합니다.");
          return;
        }

        const provider = new ethers.BrowserProvider(ethereum);
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length === 0) {
          return;
        }

        const signerInstance = await provider.getSigner();
        const contractInstance = new ethers.Contract(deployData.address, MULTITOKEN_ABI, signerInstance);
        const address = await signerInstance.getAddress();

        setSigner(signerInstance);
        setContract(contractInstance);
        setUserAddress(address);
        setIsConnected(true);
        setError("");

        console.log("권한 관리 시스템 연결 성공!");
      } catch (err: any) {
        console.error("연결 실패:", err);
        setError(`연결 실패: ${err.message}`);
      }
    };

    init();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setUserAddress("");
        setContract(null);
        setSigner(null);
      } else {
        window.location.reload();
      }
    };

    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.on?.('accountsChanged', handleAccountsChanged);
    }

    return () => {
      const ethereum = getEthereum();
      if (ethereum) {
        ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const connectWallet = async () => {
    try {
      const ethereum = getEthereum();
      if (!ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다.");
      }

      await ethereum.request({ method: 'eth_requestAccounts' });
      window.location.reload();
    } catch (err: any) {
      setError(`지갑 연결 실패: ${err.message}`);
    }
  };

  // 권한 상태 확인
  const checkApproval = async () => {
    if (!contract || !userAddress || !operatorAddress) return;

    if (!ethers.isAddress(operatorAddress)) {
      alert("올바른 주소를 입력해주세요");
      return;
    }

    try {
      setIsLoading(true);
      const isApproved = await contract.isApprovedForAll(userAddress, operatorAddress);
      setApprovalStatus(isApproved);
      alert(`권한 상태: ${isApproved ? "승인됨" : "승인 안됨"}`);
    } catch (err: any) {
      console.error("권한 확인 실패:", err);
      alert(`권한 확인 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 권한 승인/해제
  const setApproval = async (approved: boolean) => {
    if (!contract || !signer || !operatorAddress) {
      alert("컨트랙트가 연결되지 않았거나 주소가 입력되지 않았습니다");
      return;
    }

    if (!ethers.isAddress(operatorAddress)) {
      alert("올바른 주소를 입력해주세요");
      return;
    }

    const action = approved ? "승인" : "해제";
    const confirmed = window.confirm(
      `${operatorAddress}에게 권한을 ${action}하시겠습니까?\n\n` +
      `${approved ? 
        "승인하면 해당 주소가 당신의 모든 토큰을 자유롭게 전송할 수 있습니다." : 
        "해제하면 해당 주소는 더 이상 당신의 토큰을 전송할 수 없습니다."}`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      console.log(`권한 ${action} 시작:`, { operator: operatorAddress, approved });
      
      const tx = await contract.setApprovalForAll(operatorAddress, approved);
      console.log("트랜잭션 전송됨:", tx.hash);
      
      await tx.wait();
      
      alert(`권한 ${action} 완료!\nTx: ${tx.hash}`);
      
      // 권한 상태 업데이트
      setApprovalStatus(approved);
      
    } catch (e: any) {
      console.error("권한 설정 에러:", e);
      alert(`권한 설정 실패: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 위임 전송 권한 확인
  const checkDelegatedPermission = async () => {
    if (!contract || !fromAddress || !userAddress) return;
    
    if (!ethers.isAddress(fromAddress)) {
      alert("올바른 소유자 주소를 입력해주세요");
      return;
    }

    try {
      setIsLoading(true);
      const permission = await contract.isApprovedForAll(fromAddress, userAddress);
      setHasPermission(permission);
      
      if (permission) {
        const balances: { [key: number]: bigint } = {};
        for (const id of [1, 101, 1001]) {
          const balance = await contract.balanceOf(fromAddress, id);
          balances[id] = balance;
        }
        setOwnerBalances(balances);
        alert("권한 확인 완료! 소유자의 토큰을 전송할 수 있습니다.");
      } else {
        setOwnerBalances({});
        alert("권한이 없습니다. 토큰 소유자가 먼저 권한을 부여해야 합니다.");
      }
    } catch (error: any) {
      console.error("권한 확인 실패:", error);
      alert(`권한 확인 실패: ${error.message}`);
      setHasPermission(false);
      setOwnerBalances({});
    } finally {
      setIsLoading(false);
    }
  };

  // 위임 전송 실행
  const handleDelegatedTransfer = async () => {
    if (!contract || !hasPermission) {
      alert("권한이 없거나 컨트랙트가 연결되지 않았습니다");
      return;
    }

    if (!ethers.isAddress(toAddress)) {
      alert("유효하지 않은 받는 주소입니다");
      return;
    }

    const ownerBalance = ownerBalances[tokenId] || 0n;
    if (ownerBalance < BigInt(amount)) {
      alert("소유자의 잔액이 부족합니다");
      return;
    }

    const confirmed = window.confirm(
      `위임 전송을 실행하시겠습니까?\n\n` +
      `토큰 소유자: ${fromAddress}\n` +
      `받는 주소: ${toAddress}\n` +
      `토큰: ${GAME_TOKENS[tokenId].name}\n` +
      `수량: ${amount}개`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      
      console.log("위임 전송 시작:", {
        권한받은주소: userAddress,
        토큰소유자: fromAddress,
        받는주소: toAddress,
        토큰ID: tokenId,
        수량: amount
      });

      const tx = await contract.safeTransferFrom(
        fromAddress,
        toAddress,
        tokenId,
        amount,
        "0x"
      );

      console.log("트랜잭션 해시:", tx.hash);
      await tx.wait();
      
      alert(`위임 전송 완료!\n${GAME_TOKENS[tokenId].name} ${amount}개\nTx: ${tx.hash}`);
      
      // 잔액 새로고침
      await checkDelegatedPermission();
      
    } catch (error: any) {
      console.error("위임 전송 실패:", error);
      
      let errorMessage = "위임 전송 실패";
      if (error.code === "ACTION_REJECTED") {
        errorMessage = "사용자가 트랜잭션을 취소했습니다";
      } else if (error.message.includes("Not authorized")) {
        errorMessage = "권한이 없습니다. 토큰 소유자가 권한을 취소했을 수 있습니다";
      } else if (error.message.includes("Insufficient balance")) {
        errorMessage = "토큰 소유자의 잔액이 부족합니다";
      } else {
        errorMessage = error.message || "알 수 없는 오류";
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
        권한 관리 센터
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
              style={{
                padding: "0.8rem 2rem",
                background: "#00d8ff",
                color: "#000",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "1rem"
              }}
            >
              MetaMask 연결
            </button>
          </div>
        ) : (
          <>
            <p>내 지갑: <code style={{ color: "#00ff00" }}>{userAddress}</code></p>
            <p>상태: <span style={{ color: "#00ff00", fontWeight: "bold" }}>연결됨</span></p>
          </>
        )}
        {error && <p style={{ color: "#ff0000" }}>{error}</p>}
      </div>

      {isConnected && (
        <>
          {/* 모드 선택 */}
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            marginBottom: "2rem",
            justifyContent: "center"
          }}>
            <button
              onClick={() => setViewMode("approval")}
              style={{
                padding: "0.8rem 2rem",
                background: viewMode === "approval" ? "#00d8ff" : "#666",
                color: viewMode === "approval" ? "#000" : "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              권한 관리
            </button>
            <button
              onClick={() => setViewMode("delegated")}
              style={{
                padding: "0.8rem 2rem",
                background: viewMode === "delegated" ? "#ff6b35" : "#666",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              위임 전송
            </button>
          </div>

          {/* 권한 관리 모드 */}
          {viewMode === "approval" && (
            <div style={{ 
              background: "#2a2a2a", 
              padding: "2rem", 
              borderRadius: 12
            }}>
              <h2 style={{ color: "#00d8ff", margin: "0 0 1.5rem 0", textAlign: "center" }}>
                토큰 권한 관리
              </h2>
              
              <p style={{ 
                color: "#aaa", 
                fontSize: "0.9rem", 
                textAlign: "center", 
                marginBottom: "2rem" 
              }}>
                다른 주소에게 당신의 모든 토큰을 관리할 수 있는 권한을 부여하거나 해제할 수 있습니다
              </p>

              {/* 주소 입력 */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ 
                  display: "block", 
                  color: "#00d8ff", 
                  fontWeight: "bold", 
                  marginBottom: "0.5rem" 
                }}>
                  권한을 관리할 주소:
                </label>
                <input
                  type="text"
                  value={operatorAddress}
                  onChange={(e) => {
                    setOperatorAddress(e.target.value);
                    setApprovalStatus(null); // 주소 변경 시 상태 초기화
                  }}
                  placeholder="0x... (권한을 부여하거나 해제할 주소)"
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    borderRadius: 6,
                    border: "1px solid #666",
                    background: "#1a1a1a",
                    color: "#fff",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              {/* 현재 권한 상태 표시 */}
              {approvalStatus !== null && operatorAddress && (
                <div style={{ 
                  background: approvalStatus ? "#2d4a2d" : "#4a2d2d", 
                  padding: "1rem", 
                  borderRadius: 8, 
                  marginBottom: "1.5rem",
                  border: `1px solid ${approvalStatus ? "#4caf50" : "#f44336"}`,
                  textAlign: "center"
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: approvalStatus ? "#4caf50" : "#f44336",
                    fontWeight: "bold" 
                  }}>
                    현재 상태: {approvalStatus ? "권한 승인됨" : "권한 없음"}
                  </p>
                </div>
              )}

              {/* 버튼들 */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <button
                  onClick={checkApproval}
                  disabled={!operatorAddress || !ethers.isAddress(operatorAddress) || isLoading}
                  style={{
                    flex: "1",
                    minWidth: "150px",
                    padding: "1rem",
                    background: operatorAddress && ethers.isAddress(operatorAddress) && !isLoading ? "#666" : "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: "bold",
                    cursor: operatorAddress && ethers.isAddress(operatorAddress) && !isLoading ? "pointer" : "not-allowed",
                    fontSize: "0.9rem"
                  }}
                >
                  {isLoading ? "확인 중..." : "권한 상태 확인"}
                </button>
                
                <button
                  onClick={() => setApproval(true)}
                  disabled={!operatorAddress || !ethers.isAddress(operatorAddress) || isLoading}
                  style={{
                    flex: "1",
                    minWidth: "150px",
                    padding: "1rem",
                    background: operatorAddress && ethers.isAddress(operatorAddress) && !isLoading ? "#32CD32" : "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: "bold",
                    cursor: operatorAddress && ethers.isAddress(operatorAddress) && !isLoading ? "pointer" : "not-allowed",
                    fontSize: "0.9rem"
                  }}
                >
                  {isLoading ? "처리 중..." : "권한 승인"}
                </button>
                
                <button
                  onClick={() => setApproval(false)}
                  disabled={!operatorAddress || !ethers.isAddress(operatorAddress) || isLoading}
                  style={{
                    flex: "1",
                    minWidth: "150px",
                    padding: "1rem",
                    background: operatorAddress && ethers.isAddress(operatorAddress) && !isLoading ? "#ff4444" : "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: "bold",
                    cursor: operatorAddress && ethers.isAddress(operatorAddress) && !isLoading ? "pointer" : "not-allowed",
                    fontSize: "0.9rem"
                  }}
                >
                  {isLoading ? "처리 중..." : "권한 해제"}
                </button>
              </div>

              {/* 사용법 안내 */}
              <div style={{ 
                background: "#1a1a1a", 
                padding: "1rem", 
                borderRadius: 8, 
                marginTop: "2rem",
                border: "1px solid #444"
              }}>
                <h4 style={{ color: "#00d8ff", margin: "0 0 0.5rem 0" }}>사용법 안내</h4>
                <ul style={{ color: "#aaa", fontSize: "0.8rem", margin: 0, paddingLeft: "1.5rem" }}>
                  <li>권한을 부여하면 해당 주소가 당신의 모든 토큰을 자유롭게 전송할 수 있습니다</li>
                  <li>신뢰할 수 있는 주소에만 권한을 부여하세요</li>
                  <li>사용하지 않는 권한은 즉시 해제하는 것이 안전합니다</li>
                  <li>권한 상태는 언제든지 확인할 수 있습니다</li>
                </ul>
              </div>
            </div>
          )}

          {/* 위임 전송 모드 */}
          {viewMode === "delegated" && (
            <div style={{ 
              background: "#2a2a2a", 
              padding: "2rem", 
              borderRadius: 12,
              border: "2px solid #ff6b35"
            }}>
              <h2 style={{ color: "#ff6b35", margin: "0 0 1rem 0", textAlign: "center" }}>
                위임 전송 센터
              </h2>
              
              <p style={{ 
                textAlign: "center", 
                marginBottom: "2rem", 
                color: "#aaa",
                fontSize: "0.9rem" 
              }}>
                다른 사용자로부터 권한을 받아 대신 토큰을 전송할 수 있습니다
              </p>

              {/* 토큰 소유자 주소 입력 */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ 
                  display: "block", 
                  color: "#ff6b35", 
                  fontWeight: "bold", 
                  marginBottom: "0.5rem" 
                }}>
                  토큰 소유자 주소:
                </label>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="0x... (토큰을 소유한 주소)"
                    style={{
                      flex: "1",
                      minWidth: "300px",
                      padding: "0.8rem",
                      borderRadius: 6,
                      border: "1px solid #666",
                      background: "#1a1a1a",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                  />
                  <button
                    onClick={checkDelegatedPermission}
                    disabled={!fromAddress || !ethers.isAddress(fromAddress) || isLoading}
                    style={{
                      padding: "0.8rem 1.5rem",
                      background: fromAddress && ethers.isAddress(fromAddress) && !isLoading ? "#ff6b35" : "#666",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: "bold",
                      cursor: fromAddress && ethers.isAddress(fromAddress) && !isLoading ? "pointer" : "not-allowed"
                    }}
                  >
                    {isLoading ? "확인 중..." : "권한 확인"}
                  </button>
                </div>
              </div>

              {/* 권한 상태 표시 */}
              {fromAddress && (
                <div style={{ 
                  background: hasPermission ? "#2d4a2d" : "#4a2d2d", 
                  padding: "1rem", 
                  borderRadius: 8, 
                  marginBottom: "1.5rem",
                  border: `1px solid ${hasPermission ? "#4caf50" : "#f44336"}`
                }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: hasPermission ? "#4caf50" : "#f44336" }}>
                    {hasPermission ? "권한 있음" : "권한 없음"}
                  </h3>
                  {hasPermission ? (
                    <>
                      <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem" }}>
                        소유자의 토큰을 전송할 권한이 있습니다
                      </p>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {Object.entries(GAME_TOKENS).map(([id, token]) => (
                          <div key={id} style={{
                            padding: "0.5rem",
                            background: "#1a1a1a",
                            borderRadius: 4,
                            border: `1px solid ${token.color}`
                          }}>
                            <span style={{ color: token.color }}>{token.name}:</span>
                            <strong style={{ color: "#fff", marginLeft: "0.5rem" }}>
                              {ownerBalances[Number(id)]?.toString() || "0"}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>
                      토큰 소유자가 당신에게 권한을 부여하지 않았습니다
                    </p>
                  )}
                </div>
              )}

              {/* 위임 전송 폼 */}
              {hasPermission && (
                <>
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <div style={{ flex: "1", minWidth: "200px" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem" }}>받는 주소:</label>
                      <input
                        type="text"
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        placeholder="0x..."
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
                    
                    <div style={{ flex: "1", minWidth: "150px" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem" }}>토큰 선택:</label>
                      <select
                        value={tokenId}
                        onChange={(e) => setTokenId(Number(e.target.value) as 1 | 101 | 1001)}
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
                            {token.name} - 잔액: {ownerBalances[Number(id)]?.toString() || "0"}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ flex: "1", minWidth: "120px" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem" }}>수량:</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        min="1"
                        max={Number(ownerBalances[tokenId] || 0)}
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
                    onClick={handleDelegatedTransfer}
                    disabled={!toAddress || !ethers.isAddress(toAddress) || isLoading}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      background: toAddress && ethers.isAddress(toAddress) && !isLoading ? "#ff6b35" : "#666",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: "bold",
                      cursor: toAddress && ethers.isAddress(toAddress) && !isLoading ? "pointer" : "not-allowed",
                      fontSize: "1rem"
                    }}
                  >
                    {isLoading ? "전송 중..." : "위임 전송 실행"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}