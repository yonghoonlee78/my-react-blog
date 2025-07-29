import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";

export default function ApprovalSection() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [operator, setOperator] = useState("");
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  // 🧩 최초 로드 시 컨트랙트 + signer 연결
  useEffect(() => {
    const connect = async () => {
      try {
        const res = await fetch("/deploy-output.json");
        const json = await res.json();

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signerInstance = await provider.getSigner();
        const contractInstance = new ethers.Contract(json.address, MULTITOKEN_ABI, signerInstance);
        const myAddress = await signerInstance.getAddress();

        setSigner(signerInstance);
        setContract(contractInstance);
        setContractAddress(json.address);
        setUserAddress(myAddress);
      } catch (err) {
        console.error("컨트랙트 연결 실패:", err);
      }
    };

    connect();
  }, []);

  // ✅ 권한 위임 실행
  const approve = async () => {
    if (!contract) return alert("컨트랙트가 연결되지 않았습니다.");
    try {
      const tx = await contract.setApprovalForAll(operator, true);
      await tx.wait();
      alert("✅ 권한 위임 완료!");
    } catch (e: any) {
      alert("❌ 권한 위임 실패: " + e.message);
    }
  };

  // 🔍 현재 위임 상태 확인
  const checkApproval = async () => {
    if (!contract) return;

    try {
      const result = await contract.isApprovedForAll(userAddress, operator);
      setIsApproved(result);
    } catch (e: any) {
      alert("❌ 확인 실패: " + e.message);
    }
  };

  return (
    <div style={{ background: "#1c1c1c", padding: "1.5rem", borderRadius: "10px", color: "#fff" }}>
      <h2 style={{ color: "#ffc107" }}>🔐 권한 위임 / 조회</h2>
      <p>👤 내 주소: <code>{userAddress}</code></p>
      <p>📦 컨트랙트 주소: <code>{contractAddress}</code></p>

      <label>
        위임 대상(operator) 주소:
        <input
          type="text"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          placeholder="0x..."
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem", marginBottom: "1rem" }}
        />
      </label>

      <div>
        <button
          onClick={approve}
          style={{
            background: "#28a745",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: 6,
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
            marginRight: "1rem"
          }}
        >
          ✅ 권한 위임하기
        </button>

        <button
          onClick={checkApproval}
          style={{
            background: "#007bff",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: 6,
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          🔍 위임 여부 조회
        </button>
      </div>

      {isApproved !== null && (
        <div style={{ marginTop: "1rem", fontSize: "1.1rem" }}>
          {isApproved ? (
            <span style={{ color: "#28ff8f" }}>✅ 위임됨</span>
          ) : (
            <span style={{ color: "#ff5e5e" }}>❌ 아직 위임되지 않음</span>
          )}
        </div>
      )}
    </div>
  );
}
