import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";

export default function ERC1155MintForm() {
  const [tokenId, setTokenId] = useState(1);
  const [amount, setAmount] = useState(1);
  const [uri, setUri] = useState("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    const connect = async () => {
      try {
        const res = await fetch("/deploy-output.json");
        const data = await res.json();
        const contractAddress = data.address;
        setAddress(contractAddress);

        if (!window.ethereum) {
          alert("🦊 메타마스크가 필요합니다.");
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signerInstance = await provider.getSigner();
        const contractInstance = new ethers.Contract(
          contractAddress,
          MULTITOKEN_ABI,
          signerInstance
        );

        setSigner(signerInstance);
        setContract(contractInstance);
      } catch (err) {
        console.error("컨트랙트 또는 메타마스크 연결 실패:", err);
      }
    };

    connect();
  }, []);

  const mint = async () => {
    if (!contract || !signer) {
      alert("⛔ 컨트랙트가 아직 연결되지 않았습니다");
      return;
    }

    try {
      const signerAddress = await signer.getAddress(); // signer에서 주소 가져오기
      const tx = await contract.mint(signerAddress, tokenId, amount, uri);
      await tx.wait();
      alert("✅ 민팅 완료!");
    } catch (e: any) {
      console.error("민팅 에러:", e);
      alert(`❌ 민팅 실패: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: "1.5rem", background: "#181818", borderRadius: 12, color: "#ddd" }}>
      <h2 style={{ color: "#00d8ff" }}>🪙 ERC1155 민팅</h2>
      <p>📍 연결된 컨트랙트 주소: <code>{address || "로딩 중..."}</code></p>

      <div style={{ marginTop: "1rem" }}>
        <label>🆔 Token ID:&nbsp;
          <input
            type="number"
            value={tokenId}
            onChange={(e) => setTokenId(Number(e.target.value))}
            style={{ marginBottom: "0.5rem", padding: "0.3rem" }}
          />
        </label>
      </div>

      <div>
        <label>🔢 Amount:&nbsp;
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ marginBottom: "0.5rem", padding: "0.3rem" }}
          />
        </label>
      </div>

      <div>
        <label>🖼️ URI (NFT 전용):&nbsp;
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            style={{ marginBottom: "0.5rem", width: "100%", padding: "0.3rem" }}
            placeholder="ipfs://..."
          />
        </label>
      </div>

      <button
        onClick={mint}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          fontWeight: "bold",
          borderRadius: 6,
          background: "#00d8ff",
          color: "#000",
          border: "none",
          cursor: "pointer"
        }}
      >
        Mint
      </button>
    </div>
  );
}
