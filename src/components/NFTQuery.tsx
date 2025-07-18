import React, { useState } from "react";
import { ethers } from "ethers";
import BasicERC721_ABI from "../abi/BasicERC721.json";

const CONTRACT_ADDRESS = "0xd0f983bac626f719c6309004e8dc8c227a2e85b1";
const provider = new ethers.JsonRpcProvider("https://public-en-kairos.node.kaia.io");
const contract = new ethers.Contract(CONTRACT_ADDRESS, BasicERC721_ABI, provider);

const NFTQuery: React.FC = () => {
  const [tokenId, setTokenId] = useState("");
  const [owner, setOwner] = useState("");
  const [uri, setUri] = useState("");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState("");

  const handleQuery = async () => {
    setStatus("조회중...");
    try {
      // ownerOf 조회
      const ownerAddr = await contract.ownerOf(tokenId);
      setOwner(ownerAddr);

      // tokenURI 조회
      const tokenUri = await contract.tokenURI(tokenId);
      setUri(tokenUri);

      // 메타데이터 fetch (IPFS, http 가능)
      if (tokenUri.startsWith("http")) {
        const res = await fetch(tokenUri);
        const data = await res.json();
        setImage(data.image);
      } else {
        setImage("");
      }
      setStatus("조회 성공!");
    } catch (err: any) {
      setStatus("조회 실패: " + (err?.message || String(err)));
      setOwner(""); setUri(""); setImage("");
    }
  };

  return (
    <div style={{maxWidth:420}}>
      <h3>Kaia NFT 토큰 조회</h3>
      <input
        value={tokenId}
        onChange={e => setTokenId(e.target.value)}
        placeholder="Token ID"
        style={{padding:"0.5em",width:120,marginRight:8}}
      />
      <button onClick={handleQuery}>조회</button>
      <div style={{marginTop:16}}>{status}</div>
      {owner && <div>소유자: {owner}</div>}
      {uri && <div>Token URI: <a href={uri} target="_blank" rel="noopener noreferrer">{uri}</a></div>}
      {image && (
        <div>
          <img src={image} alt="NFT" style={{width:200,marginTop:8}} />
        </div>
      )}
    </div>
  );
};

export default NFTQuery;
