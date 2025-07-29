import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";

export default function ERC1155TransferAndBalance() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contractAddress, setContractAddress] = useState("");

  const [from, setFrom] = useState(""); // 권한 위임 받은 계정
  const [to, setTo] = useState("");     // 전송 받는 계정
  const [ids, setIds] = useState(["1", "101"]);
  const [amounts, setAmounts] = useState(["100", "10"]);
  const [balances, setBalances] = useState<(bigint | null)[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/deploy-output.json");
      const json = await res.json();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signerInstance = await provider.getSigner();
      const contractInstance = new ethers.Contract(json.address, MULTITOKEN_ABI, signerInstance);

      setSigner(signerInstance);
      setContract(contractInstance);
      setContractAddress(json.address);
    })();
  }, []);

  const handleTransfer = async () => {
    if (!contract || !signer) return alert("컨트랙트 연결이 필요합니다");

    try {
      const tx = await contract.safeBatchTransferFrom(
        from,
        to,
        ids.map(Number),
        amounts.map(Number)
      );

      await tx.wait();
      alert("✅ 전송 완료!");

      // 수신자 잔액 조회
      const addressList = ids.map(() => to);
      const idList = ids.map(Number);
      const balanceResult = await contract.balanceOfBatch(addressList, idList);
      setBalances(balanceResult);

    } catch (e: any) {
      console.error(e);
      alert(`❌ 전송 실패: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: "1.5rem", background: "#181818", borderRadius: 12, color: "#eee" }}>
      <h2 style={{ color: "#29b6f6" }}>🚚 배치 전송 & 잔액확인</h2>
      <p>🔗 컨트랙트 주소: <code>{contractAddress}</code></p>

      <div style={{ marginTop: "1rem" }}>
        <label>From (권한 위임된 주소):&nbsp;
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div>
        <label>To (받는 지갑 주소):&nbsp;
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div>
        <label>Token IDs (`,`로 구분):&nbsp;
          <input
            value={ids.join(",")}
            onChange={(e) => setIds(e.target.value.split(","))}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div>
        <label>Amounts (`,`로 구분):&nbsp;
          <input
            value={amounts.join(",")}
            onChange={(e) => setAmounts(e.target.value.split(","))}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <button
        onClick={handleTransfer}
        style={{
          marginTop: "1rem",
          padding: "0.6rem 1.2rem",
          background: "#29b6f6",
          border: "none",
          fontWeight: 600,
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        전송하기 & 잔액조회
      </button>

      {balances.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h4>🔍 전송 후 잔액 (수신자 기준)</h4>
          {balances.map((b, i) => (
            <div key={i}>
              ID: <strong>{ids[i]}</strong> → <strong>{b?.toString()}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
