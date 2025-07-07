import React, { useState } from "react";
import { JsonRpcProvider } from "ethers";

import SimpleArtifact from "../artifacts/SimpleContract.json";

const provider = new JsonRpcProvider(
  `https://eth-sepolia.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
);

const CONTRACT_ADDRESS = "0x5b7E5D770D2772979bf46E8d267Ff6760737cE8".toLowerCase();
const ABI = SimpleArtifact.abi;

const ContractInfo: React.FC = () => {
  const [detail, setDetail] = useState<React.ReactNode>();

  const handleSearch = async () => {
    try {
      const bytecode = await provider.getCode(CONTRACT_ADDRESS);
      if (bytecode === "0x") {
        setDetail(<p style={{color:"#ff5d5d"}}>❌ 컨트랙트 바이트코드를 찾을 수 없습니다.</p>);
        return;
      }

      setDetail(
        <div style={{whiteSpace:"pre-wrap",wordBreak:"break-word",marginTop:"2rem"}}>
          <h3>🧩 Bytecode length</h3>
          <p>{bytecode.length} bytes</p>

          <h3 style={{marginTop:"1.5rem"}}>📦 ABI</h3>
          <pre>{JSON.stringify(ABI, null, 2)}</pre>
        </div>
      );
    } catch (e:any) {
      setDetail(<p style={{color:"#ff5d5d"}}>⚠️ {e.message}</p>);
    }
  };

  return (
    <>
      {/* 입력창 & 버튼 */}
      <div style={{display:"flex",marginTop:"1.5rem"}}>
        <input
          value={CONTRACT_ADDRESS}
          readOnly
          style={{
            flex:1,padding:"1rem",border:"1px solid #444",
            borderRadius:"8px 0 0 8px",background:"#f6f6f6",
            color:"#666",fontSize:"1rem"
          }}
          placeholder="나의 컨트랙트 주소"
        />

        <button
          onClick={handleSearch}
          style={{
            padding:"0 2rem",border:"none",borderRadius:"0 8px 8px 0",
            background:"#1e90ff",color:"#fff",fontSize:"1rem",cursor:"pointer"
          }}
        >
          Search
        </button>
      </div>

      {detail}
    </>
  );
};

export default ContractInfo;
