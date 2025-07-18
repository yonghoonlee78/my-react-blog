import React, { useState } from "react";
import { ethers } from "ethers";

const ABI = [
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)"
];

const ENUM_IFACE_ID = "0x780e9d63";


function toIpfsGateway(url: string): string {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  // Pinata gateway → ipfs.io 변환
  if (url.startsWith("https://gateway.pinata.cloud/ipfs/")) {
    return url.replace("https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/");
  }
  // cf-ipfs.com 등도 필요시 추가
  return url;
}


const NFTExplorer: React.FC = () => {
  const [contract, setContract] = useState("");
  const [meta, setMeta] = useState<{ name?: string; symbol?: string }>();
  const [tokens, setTokens] = useState<any[]>([]);
  const [holders, setHolders] = useState<{ [addr: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    setError(null);
    setMeta(undefined);
    setTokens([]);
    setHolders({});
    setLoading(true);

    try {
      const provider = new ethers.JsonRpcProvider("https://public-en-kairos.node.kaia.io");
      const nft = new ethers.Contract(contract, ABI, provider);

      const name = await nft.name();
      const symbol = await nft.symbol();
      setMeta({ name, symbol });

      // Enumerable 지원 여부 확인
      let isEnumerable = false;
      try {
        isEnumerable = await nft.supportsInterface(ENUM_IFACE_ID);
      } catch {}

      let tokenIds: number[] = [];
      if (isEnumerable) {
        // Enumerable이면 totalSupply와 tokenByIndex로 전체 tokenId 가져오기
        const total = await nft.totalSupply();
        for (let i = 0; i < total; i++) {
          try {
            const tid = await nft.tokenByIndex(i);
            tokenIds.push(Number(tid));
          } catch {}
        }
      } else {
        // Enumerable이 아니면 ID 범위 스캔 (예: 1~101)
        for (let id = 1; id <= 101; id++) {
          try {
            await nft.ownerOf(id);
            tokenIds.push(id);
          } catch {}
        }
      }

      // tokenId별로 메타데이터 조회 및 홀더 집계
      const results = [];
      const holderMap: { [addr: string]: number } = {};
      for (let id of tokenIds) {
        try {
          const uriRaw = await nft.tokenURI(id);
          const uri = toIpfsGateway(uriRaw);
          let owner = "";
          try { owner = await nft.ownerOf(id); } catch {}
          // 소유자별 집계
          if (owner) {
            holderMap[owner] = (holderMap[owner] || 0) + 1;
          }
          // 메타데이터 가져오기
          let data = {};
          try {
            const resp = await fetch(uri);
            data = await resp.json();
          } catch {}
          // 이미지 gateway도 변환
          const image =
            typeof (data as any).image === "string"
              ? toIpfsGateway((data as any).image)
              : undefined;

          results.push({
            tokenId: id,
            ...data,
            tokenURI: uri,
            image,
            owner,
          });
        } catch (e) {
          // 없는 토큰ID (건너뜀)
        }
      }
      setTokens(results);
      setHolders(holderMap);
      if (results.length === 0) setError("NFT를 찾을 수 없습니다.");
    } catch (e: any) {
      setError(e.message || "오류 발생");
    }
    setLoading(false);
  };

  // 홀더 순위 계산
  const sortedHolders = Object.entries(holders)
    .sort((a, b) => b[1] - a[1])
    .map(([addr, count], i) => ({ rank: i + 1, addr, count }));

  return (
    <section style={{
      background: "#23272f", borderRadius: 18, padding: "2.3rem", marginTop: "2rem", boxShadow: "0 4px 20px #0003"
    }}>
      <div style={{ marginBottom: 20 }}>
        <b>컨트랙트 주소:</b>
        <input value={contract} onChange={e => setContract(e.target.value)}
          placeholder="0x..." style={{ marginLeft: 10, width: 400, padding: "0.8em", borderRadius: 7, border: "1px solid #444" }} />
        <button onClick={handleQuery} style={{
          marginLeft: 12, padding: "0.7em 2em", borderRadius: 9, background: "#20b5ff", color: "#fff",
          fontWeight: 800, fontSize: "1.1em", border: 0, cursor: "pointer"
        }}>{loading ? "조회 중..." : "NFT 전체 조회"}</button>
      </div>

      {error && <div style={{ color: "#f33", marginBottom: 20 }}>{error}</div>}

      {meta?.name &&
        <div style={{ marginBottom: 24, color: "#fff", fontSize: "1.25em", fontWeight: 700 }}>
          <b>컬렉션:</b> {meta.name} <span style={{ color: "#8bf" }}>({meta.symbol})</span>
          <span style={{ marginLeft: 20, color: "#ffd600", fontWeight: 900 }}>
            총 NFT 개수: {tokens.length}개
          </span>
        </div>
      }

      {/* 홀더 테이블 */}
      {sortedHolders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <b style={{ color: "#ddd" }}>지갑별 NFT 보유 개수</b>
          <table style={{ marginTop: 8, width: "80%", color: "#fff", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#23272f" }}>
                <th align="left" style={{ padding: 6 }}>Rank</th>
                <th align="left" style={{ padding: 6 }}>Address</th>
                <th align="left" style={{ padding: 6 }}>개수</th>
              </tr>
            </thead>
            <tbody>
              {sortedHolders.map(h => (
                <tr key={h.addr}>
                  <td style={{ padding: 6 }}>{h.rank}</td>
                  <td style={{ padding: 6, fontFamily: "monospace" }}>{h.addr}</td>
                  <td style={{ padding: 6 }}>{h.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 30 }}>
        {tokens.map((nft, i) => (
          <div key={i} style={{
            background: "#222", borderRadius: 14, padding: "1.3em", minWidth: 220, color: "#fff", marginBottom: 18
          }}>
            <div style={{ fontWeight: 800, fontSize: "1.09em", marginBottom: 8 }}>ID #{nft.tokenId}</div>
            <div style={{ fontWeight: 600 }}>{nft.name || <span style={{ color: "#888" }}>(no name)</span>}</div>
            {nft.image
              ? <img src={nft.image} alt="" style={{ width: 170, borderRadius: 10, margin: "9px 0" }} />
              : <div style={{
                  width: 170, height: 170, borderRadius: 10, margin: "9px 0",
                  background: "#333", color: "#888", display: "flex", alignItems: "center", justifyContent: "center"
                }}>No Image</div>
            }
            <div style={{ fontSize: "0.97em", color: "#aaa", minHeight: 36 }}>{nft.description}</div>
            <div style={{ fontSize: "0.93em", color: "#7cf" }}>URI: <a href={nft.tokenURI} style={{ color: "#8ff" }}>{nft.tokenURI}</a></div>
            <div style={{ fontSize: "0.93em", color: "#f7a" }}>Owner: {nft.owner}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NFTExplorer;
