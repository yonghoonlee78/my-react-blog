import React, { useState } from "react";
import { JsonRpcProvider } from "ethers";
import SimpleArtifact from "../artifacts/contracts/SimpleContract.sol/SimpleContract.json";

const provider = new JsonRpcProvider(
  `https://eth-sepolia.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
);

const KNOWN_CONTRACTS: Record<string, any> = {
  "0x5b7e5d770d2772979bf46e8d267ff6760737ce8": SimpleArtifact.abi,
};


const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
    background: "rgba(0,0,0,0.60)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
  }}>
    <div style={{
      background: "#fff", color: "#222", borderRadius: "18px", boxShadow: "0 8px 40px #0006",
      padding: "2.5rem", minWidth: 350, maxWidth: 800, position: "relative", textAlign: "left"
    }}>
      <button onClick={onClose}
        style={{
          position: "absolute", right: 25, top: 15, border: "none", background: "none", fontSize: "1.7em", color: "#444", cursor: "pointer"
        }}>×</button>
      {children}
    </div>
  </div>
);

const ContractExplorer: React.FC = () => {
  const [input, setInput] = useState("");
  const [modal, setModal] = useState<React.ReactNode | null>(null);

  const handleSearch = async () => {
    const value = input.trim().toLowerCase();
    if (!value.startsWith("0x")) {
      setModal(
        <Modal onClose={() => setModal(null)}>
          <p style={{ color: "#d32f2f" }}>❌ 0x로 시작해야 합니다.</p>
        </Modal>
      );
      return;
    }

    try {
      if (value.length === 42) {
        const code = await provider.getCode(value);
        if (code === "0x") {
          setModal(
            <Modal onClose={() => setModal(null)}>
              <p style={{ color: "#d32f2f" }}>❌ 해당 주소에 컨트랙트가 없습니다.</p>
            </Modal>
          );
          return;
        }
        const abi = KNOWN_CONTRACTS[value];
        setModal(
          <Modal onClose={() => setModal(null)}>
            <h2 style={{ color: "#20232a", fontWeight: 800, marginBottom: 20 }}>📜 Contract Info</h2>
            <div style={{ color: "#444", fontSize: "1.1em", marginBottom: "1em" }}>
              <b>Address:</b> <code style={{ color: "#1976d2" }}>{value}</code>
            </div>
            <h3>🧩 Bytecode Length</h3>
            <p>{code.length} bytes</p>
            {abi ? (
              <>
                <h3 style={{ marginTop: "1.5rem" }}>📦 ABI</h3>
                <pre style={{
                  background: "#23272f", color: "#fafafa", padding: "1em", borderRadius: "10px",
                  maxHeight: 330, overflowY: "auto", fontSize: "0.97em"
                }}>
                  {JSON.stringify(abi, null, 2)}
                </pre>
              </>
            ) : (
              <p style={{ color: "#999" }}>🔎 로컬 ABI를 찾을 수 없습니다.</p>
            )}
          </Modal>
        );
      }
      else if (value.length === 66) {
        const receipt = await provider.getTransactionReceipt(value);
        if (!receipt) {
          setModal(
            <Modal onClose={() => setModal(null)}>
              <p style={{ color: "#d32f2f" }}>❌ 영수증을 찾을 수 없습니다.</p>
            </Modal>
          );
          return;
        }
        setModal(
          <Modal onClose={() => setModal(null)}>
            <h3>트랜잭션 Receipt</h3>
            <pre style={{ background: "#23272f", color: "#fff", padding: "1em", borderRadius: "10px", maxHeight: 330, overflowY: "auto" }}>
              {JSON.stringify(receipt, null, 2)}
            </pre>
          </Modal>
        );
      } else {
        setModal(
          <Modal onClose={() => setModal(null)}>
            <p>❌ 42(주소)·66(해시) 글자만 지원합니다.</p>
          </Modal>
        );
      }
    } catch (e: any) {
      setModal(
        <Modal onClose={() => setModal(null)}>
          <p style={{ color: "#d32f2f" }}>⚠️ 에러: {e.message}</p>
        </Modal>
      );
    }
  };

  return (
    <section style={{ textAlign: "center", marginTop: "3rem" }}>
      <h2>Kaia Explorer</h2>
      <input
        style={{
          width: "60%",
          padding: "1rem",
          fontSize: "1rem",
          borderRadius: "8px 0 0 8px",
          background: "#1e1e1e",
          color: "#eee",
          border: "1px solid #444",
        }}
        placeholder="0x… 주소 또는 트랜잭션 해시"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button
        style={{
          padding: "1rem 2rem",
          fontSize: "1rem",
          borderRadius: "0 8px 8px 0",
          border: "none",
          cursor: "pointer",
          background: "#1E90FF",
          color: "#fff",
        }}
        onClick={handleSearch}
      >
        Search
      </button>

      {modal}
    </section>
  );
};

export default ContractExplorer;
