import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ABI } from "./ContractInfo";

type TransferEvent = {
  operator: string;
  from: string;
  to: string;
  idOrIds: string; // stringified 단일 또는 배열
  valueOrValues: string; // stringified 단일 또는 배열
  type: "single" | "batch";
  txHash: string;
};

export default function ERC1155EventListener() {
  const [events, setEvents] = useState<TransferEvent[]>([]);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    let contractInstance: ethers.Contract | null = null;
    let provider: ethers.BrowserProvider;

    (async () => {
      const res = await fetch("/deploy-output.json");
      const json = await res.json();
      provider = new ethers.BrowserProvider(window.ethereum);
      contractInstance = new ethers.Contract(json.address, MULTITOKEN_ABI, provider);

      setContract(contractInstance);

      // TransferSingle 리스너
      contractInstance.on(
        "TransferSingle",
        (operator, from, to, id, value, event) => {
          setEvents((prev) => [
            {
              operator: operator,
              from: from,
              to: to,
              idOrIds: id.toString(),
              valueOrValues: value.toString(),
              type: "single",
              txHash: event.transactionHash,
            },
            ...prev,
          ]);
        }
      );

      // TransferBatch 리스너
      contractInstance.on(
        "TransferBatch",
        (operator, from, to, ids, values, event) => {
          setEvents((prev) => [
            {
              operator: operator,
              from: from,
              to: to,
              idOrIds: JSON.stringify(ids.map((x: any) => x.toString())),
              valueOrValues: JSON.stringify(values.map((x: any) => x.toString())),
              type: "batch",
              txHash: event.transactionHash,
            },
            ...prev,
          ]);
        }
      );
    })();

    // 클린업: 언마운트시 리스너 해제
    return () => {
      if (contractInstance) {
        contractInstance.removeAllListeners();
      }
    };
  }, []);

  return (
    <div
      style={{
        background: "#222",
        color: "#fff",
        padding: "1.5rem",
        borderRadius: "10px",
        minHeight: "200px",
        maxHeight: "340px",
        overflowY: "auto"
      }}
    >
      <h2 style={{ color: "#ffd600" }}>🔔 실시간 이벤트 로그</h2>
      {events.length === 0 && <p>아직 감지된 새로운 이벤트가 없습니다.</p>}
      {events.slice(0, 10).map((ev, idx) => (
        <div key={ev.txHash + idx} style={{ marginBottom: "1rem", borderBottom: "1px solid #444", paddingBottom: "0.7rem" }}>
          <strong>타입: {ev.type}</strong><br />
          From: {ev.from}<br />
          To: {ev.to}<br />
          Token ID(s): {ev.idOrIds}<br />
          Value(s): {ev.valueOrValues}<br />
          Tx Hash: <code style={{ color: "#81dfff" }}>{ev.txHash}</code>
        </div>
      ))}
    </div>
  );
}
