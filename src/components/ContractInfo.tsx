import React, { useState } from "react";
import { JsonRpcProvider } from "ethers";
const SimpleArtifact = require("../abi/SimpleContract.json");

const CONTRACT_ADDRESS = "0x491d87D97969caD34136243EA5e022B0f1d0357B";
const provider = new JsonRpcProvider("https://public-en-kairos.node.kaia.io");
const ABI = SimpleArtifact.abi;

const ContractInfo: React.FC = () => {
  const [detail, setDetail] = useState<React.ReactNode>();

  const handleSearch = async () => {
    try {
      const bytecode = await provider.getCode(CONTRACT_ADDRESS);
      if (bytecode === "0x") {
        setDetail(<p style={{ color: "#ff5d5d" }}>❌ 컨트랙트 바이트코드를 찾을 수 없습니다.</p>);
        return;
      }

      setDetail(
        <div style={{
          background: "#23272f", borderRadius: 12, padding: "2rem",
          marginTop: "2rem", color: "#fff", fontSize: "1.07em", boxShadow: "0 2px 12px #0004"
        }}>
          <h3 style={{ color: "#ffd600", fontWeight: 900, fontSize: "1.35em", marginBottom: 15, display: "flex", alignItems: "center" }}>
            <span role="img" aria-label="bytecode" style={{ marginRight: 6 }}>🧩</span>
            Bytecode length
          </h3>
          <div style={{ marginBottom: 30, color: "#b5ffbb", fontSize: "1.08em" }}>
            {bytecode.length} <span style={{ color: "#88f" }}>bytes</span>
          </div>

          <h3 style={{ color: "#ffd600", fontWeight: 900, fontSize: "1.35em", display: "flex", alignItems: "center" }}>
            <span role="img" aria-label="abi" style={{ marginRight: 7 }}>📦</span>
            ABI
          </h3>
          <pre style={{
            background: "#191c23", color: "#fff",
            borderRadius: "9px", padding: "1.1rem", marginTop: 12,
            fontSize: "0.98em", overflowX: "auto", boxShadow: "0 1px 6px #0003"
          }}>
            {JSON.stringify(ABI, null, 2)}
          </pre>
        </div>
      );
    } catch (e: any) {
      setDetail(<p style={{ color: "#ff5d5d" }}>⚠️ {e.message}</p>);
    }
  };

  return (
    <section style={{ maxWidth: 900, margin: "2rem auto", textAlign: "left" }}>
      <h1 style={{
        fontSize: "2.1em", fontWeight: 900, letterSpacing: "-1px", marginBottom: "1.4rem", color: "#fff"
      }}>🚀 스마트 컨트랙트 배포 정보</h1>
      <div style={{ display: "flex", marginBottom: "1.7rem" }}>
        <input
          value={CONTRACT_ADDRESS}
          readOnly
          style={{
            flex: 1, padding: "1rem", border: "1.7px solid #3687ff",
            borderRadius: "8px 0 0 8px", background: "#181b20",
            color: "#eee", fontSize: "1.13rem"
          }}
          placeholder="나의 컨트랙트 주소"
        />
        <button
          onClick={handleSearch}
          style={{
            padding: "0 2rem", border: "none", borderRadius: "0 8px 8px 0",
            background: "#2196f3", color: "#fff", fontSize: "1.13rem", cursor: "pointer",
            fontWeight: 600, boxShadow: "0 2px 8px #2286"
          }}
        >
          Search
        </button>
      </div>

      {detail}
    </section>
  );
};

export default ContractInfo;
