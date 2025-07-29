import { useState } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ADDRESS, MULTITOKEN_ABI } from "./ContractInfo";

export default function BatchTransferSection() {
  const [tos, setTos] = useState([""]);
  const [ids, setIds] = useState([""]);
  const [amounts, setAmounts] = useState([""]);

  const transfer = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(MULTITOKEN_ADDRESS, MULTITOKEN_ABI, signer);

    await contract.batchTransfer(
      tos.map((a) => a.trim()),
      ids.map(Number),
      amounts.map(Number)
    );
    alert("✅ 배치 전송 완료!");
  };

  return (
    <div>
      <h2>🚚 배치 전송 (내 계정 → 여러 계정)</h2>
      <label>
        받는 주소들:
        <input value={tos.join(",")} onChange={(e) => setTos(e.target.value.split(","))} />
      </label>
      <label>
        토큰 ID들:
        <input value={ids.join(",")} onChange={(e) => setIds(e.target.value.split(","))} />
      </label>
      <label>
        수량들:
        <input
          value={amounts.join(",")}
          onChange={(e) => setAmounts(e.target.value.split(","))}
        />
      </label>
      <br />
      <button onClick={transfer}>전송</button>
    </div>
  );
}
