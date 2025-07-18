

import React, { useState } from "react";
import { ethers } from "ethers";


const ERC721_ABI = [
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];


const KAIA_RPC = "https://public-en-kairos.node.kaia.io";

const NFTTransfer: React.FC = () => {
  const [contractAddr, setContractAddr] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [privKey, setPrivKey] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

 
  const handleTransfer = async () => {
    setError(null);
    setTxHash(null);

   
    if (!ethers.isAddress(contractAddr)) {
      setError("컨트랙트 주소가 올바르지 않습니다.");
      return;
    }
    if (!ethers.isAddress(toAddr)) {
      setError("받는 주소가 올바르지 않습니다.");
      return;
    }
    if (!tokenId || isNaN(Number(tokenId))) {
      setError("토큰ID는 숫자여야 합니다.");
      return;
    }
    
    let realPrivKey = privKey.trim();
    if (!realPrivKey.startsWith("0x")) {
      realPrivKey = "0x" + realPrivKey;
    }
    if (realPrivKey.length !== 66) {
      setError("프라이빗키가 올바르지 않습니다.");
      return;
    }
    

    setLoading(true);
    try {
     
      const provider = new ethers.JsonRpcProvider(KAIA_RPC);
      const wallet = new ethers.Wallet(privKey, provider);

  
      const nft = new ethers.Contract(contractAddr, ERC721_ABI, wallet);

      
      const owner = await nft.ownerOf(tokenId);
      if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        setError("해당 토큰의 소유자가 아닙니다.");
        setLoading(false);
        return;
      }

    
      const tx = await nft.transferFrom(owner, toAddr, tokenId);
      setTxHash(tx.hash);
      await tx.wait(); 
    } catch (e: any) {
      setError(e?.reason || e?.message || "전송 실패");
    }
    setLoading(false);
  };

  return (
    <section style={{
      background: "#23272f", borderRadius: 14, padding: "2.3rem", marginTop: "2rem",
      boxShadow: "0 4px 20px #0003", maxWidth: 550, margin: "2rem auto"
    }}>
      <h2 style={{ color: "#ff4545", marginBottom: 20 }}>■ NFT 전송하기</h2>

      <div style={{ marginBottom: 15 }}>
        <b>컨트랙트 주소 :</b>
        <input value={contractAddr} onChange={e => setContractAddr(e.target.value)} style={{ marginLeft: 10, width: 340, padding: "0.8em", borderRadius: 7, border: "1px solid #444" }} />
      </div>
      <div style={{ marginBottom: 15 }}>
        <b style={{ color: "#ff4545" }}>토큰 ID :</b>
        <input value={tokenId} onChange={e => setTokenId(e.target.value)} style={{ marginLeft: 10, width: 180, padding: "0.8em", borderRadius: 7, border: "1px solid #444" }} />
      </div>
      <div style={{ marginBottom: 15 }}>
        <b>받는 주소 :</b>
        <input value={toAddr} onChange={e => setToAddr(e.target.value)} style={{ marginLeft: 10, width: 340, padding: "0.8em", borderRadius: 7, border: "1px solid #444" }} />
      </div>
      <div style={{ marginBottom: 22 }}>
        <b>내 프라이빗키 :</b>
        <input value={privKey} onChange={e => setPrivKey(e.target.value)} style={{ marginLeft: 10, width: 340, padding: "0.8em", borderRadius: 7, border: "1px solid #444" }} type="password" />
      </div>

      <button onClick={handleTransfer} disabled={loading} style={{
        padding: "0.7em 2em", borderRadius: 9, background: "#20b5ff", color: "#fff",
        fontWeight: 800, fontSize: "1.1em", border: 0, cursor: "pointer"
      }}>
        {loading ? "전송 중..." : "전송하기"}
      </button>

      {error && <div style={{ color: "#f33", marginTop: 18 }}>{error}</div>}

      {txHash && (
        <div style={{ color: "#4cff9a", marginTop: 18 }}>
          트랜잭션 해시 : <a href={`https://kairos.kaiascan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a>
        </div>
      )}
    </section>
  );
};

export default NFTTransfer;
