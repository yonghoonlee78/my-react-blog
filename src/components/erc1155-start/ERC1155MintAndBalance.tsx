import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";

export default function ERC1155MintAndBalance() {
  const [tokenId, setTokenId] = useState(1);
  const [amount, setAmount] = useState(1);
  const [uri, setUri] = useState("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [contractAddress, setContractAddress] = useState("");

  // 📦 초기 세팅: deploy-output.json에서 주소 읽고 컨트랙트 연결
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/deploy-output.json");
        const data = await res.json();

        setContractAddress(data.address);

        if (!window.ethereum) {
          alert("🦊 메타마스크가 필요합니다.");
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const instance = new ethers.Contract(data.address, MULTITOKEN_ABI, signer);

        const address = await signer.getAddress();

        setUserAddress(address);
        setSigner(signer);
        setContract(instance);
      } catch (err) {
        console.error("컨트랙트 연결 실패:", err);
      }
    };

    init();
  }, []);

  // ✅ Mint 후 → balanceOf 실행
  const handleMintAndBalance = async () => {
    if (!contract || !signer) {
      alert("⛔ 컨트랙트 연결이 필요합니다");
      return;
    }

    try {
      const tx = await contract.mint(userAddress, tokenId, amount, uri);
      await tx.wait();

      const balance = await contract.balanceOf(userAddress, tokenId);
      setBalance(balance);
      alert("✅ 민팅 완료 & 잔액 확인!");
    } catch (e: any) {
      console.error("❌ 민팅 에러:", e);
      alert(`민팅 실패: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: "1.5rem", background: "#111", borderRadius: 12, color: "#ddd" }}>
      <h2 style={{ color: "#00d8ff" }}>🪙 민팅 & 잔액 확인</h2>
      <p>✅ 사용자 주소: <code>{userAddress}</code></p>
      <p>📦 컨트랙트 주소: <code>{contractAddress}</code></p>

      <div style={{ marginTop: "1rem" }}>
        <label>Token ID:
          <input
            type="number"
            value={tokenId}
            onChange={(e) => setTokenId(Number(e.target.value))}
            style={{ marginLeft: 8, width: "100px", padding: "0.3rem" }}
          />
        </label>
      </div>

      <div>
        <label>Amount:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ marginLeft: 8, width: "100px", padding: "0.3rem" }}
          />
        </label>
      </div>

      <div>
        <label>URI (NFT):&nbsp;
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="ipfs://..."
            style={{ width: "100%", marginTop: "0.5rem", padding: "0.4rem" }}
          />
        </label>
      </div>

      <button
        onClick={handleMintAndBalance}
        style={{
          marginTop: "1rem",
          padding: "0.6rem 1.2rem",
          background: "#00d8ff",
          border: "none",
          borderRadius: 6,
          fontWeight: "bold",
          color: "#000",
          cursor: "pointer",
        }}
      >
        Mint & 확인
      </button>

      {balance !== null && (
        <div style={{ marginTop: "2rem", fontSize: "1.1rem" }}>
          🎯 <strong>잔액:</strong> 토큰 ID <code>{tokenId}</code> → <code>{balance.toString()}</code>
        </div>
      )}
    </div>
  );
}
