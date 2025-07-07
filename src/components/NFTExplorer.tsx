import React, { useState } from "react";
import { ethers } from "ethers";

const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];

const DEFAULT_CONTRACT = "0xd0f983bac626f719c6309004e8dc8c227a2e85b1"; // 배포한 Kaia NFT 컨트랙트

const NFTExplorer: React.FC = () => {
  const [contract, setContract] = useState(DEFAULT_CONTRACT);
  const [tokenId, setTokenId] = useState("");
  const [owner, setOwner] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [img, setImg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    setError(null);
    setOwner(null);
    setMeta(null);
    setImg(null);
    setLoading(true);

    try {
      if (!ethers.isAddress(contract)) throw new Error("올바른 NFT 컨트랙트 주소를 입력하세요.");
      if (!tokenId || isNaN(Number(tokenId))) throw new Error("토큰ID는 숫자여야 합니다.");

      // 👉 Kaia 테스트넷 RPC
      const provider = new ethers.JsonRpcProvider("https://rpc.kaia.network");
      const nft = new ethers.Contract(contract, ERC721_ABI, provider);

      // 1. ownerOf
      const ownerAddr = await nft.ownerOf(tokenId);
      setOwner(ownerAddr);

      // 2. tokenURI
      let tokenUri = await nft.tokenURI(tokenId);
      if (tokenUri.startsWith("ipfs://"))
        tokenUri = tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/");
      const metaRes = await fetch(tokenUri);
      if (!metaRes.ok) throw new Error("메타데이터 요청 실패");
      const metadata = await metaRes.json();
      setMeta(metadata);

      let imageUrl = metadata.image;
      if (imageUrl && imageUrl.startsWith("ipfs://"))
        imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
      setImg(imageUrl);

    } catch (e: any) {
      setError(e.message || "오류 발생");
    }
    setLoading(false);
  };

  return (
    <section style={{ background: "#23272f", borderRadius: 18, padding: "2.3rem", marginTop: "2rem", boxShadow: "0 4px 20px #0003" }}>
      <div style={{ marginBottom: 20 }}>
        <b>NFT 컨트랙트 주소:</b>
        <input value={contract} onChange={e => setContract(e.target.value)}
          placeholder="0x..." style={{ marginLeft: 10, width: 340, padding: "0.8em", borderRadius: 7, border: "1px solid #444" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <b>토큰ID:</b>
        <input value={tokenId} onChange={e => setTokenId(e.target.value)}
          placeholder="숫자" style={{ marginLeft: 10, width: 160, padding: "0.8em", borderRadius: 7, border: "1px solid #444" }} />
      </div>
      <button onClick={handleQuery} style={{ padding: "0.7em 2em", borderRadius: 9, background: "#20b5ff", color: "#fff", fontWeight: 800, fontSize: "1.1em", border: 0, cursor: "pointer" }}>
        {loading ? "조회 중..." : "NFT 조회"}
      </button>

      {error && <div style={{ color: "#f33", marginTop: 18 }}>{error}</div>}

      {owner && (
        <div style={{ marginTop: 24, color: "#eee" }}>
          <div><b>Owner:</b> <span style={{ color: "#47ecae" }}>{owner}</span></div>
        </div>
      )}

      {meta && (
        <div style={{ marginTop: 22, color: "#eee" }}>
          <div><b>Name:</b> {meta.name}</div>
          <div><b>Description:</b> {meta.description}</div>
          <div><b>tokenURI:</b> <a href={meta.image} target="_blank" rel="noopener noreferrer">{meta.image}</a></div>
          {img && <div style={{ marginTop: 15 }}><img src={img} alt="NFT" style={{ width: 220, borderRadius: 15, border: "2px solid #888" }} /></div>}
        </div>
      )}
    </section>
  );
};

export default NFTExplorer;
