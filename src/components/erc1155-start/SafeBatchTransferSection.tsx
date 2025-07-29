import { useState } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ADDRESS, MULTITOKEN_ABI } from "./ContractInfo";

export default function SafeBatchTransferSection() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ids, setIds] = useState([""]);
  const [amounts, setAmounts] = useState([""]);

  const handleTransfer = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(MULTITOKEN_ADDRESS, MULTITOKEN_ABI, signer);

    await contract.safeBatchTransferFrom(
      from,
      to,
      ids.map(Number),
      amounts.map(Number)
    );
    alert("✅ 권한 위임 후 배치 전송 완료");
  };

  return (
    <div>
      <h2>🤝 권한 위임 받은 주소로 배치 전송</h2>
      <label>
        From:
        <input value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <br />
      <label>
        To:
        <input value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <br />
      <label>
        Token IDs:
        <input value={ids.join(",")} onChange={(e) => setIds(e.target.value.split(","))} />
      </label>
      <br />
      <label>
        Amounts:
        <input value={amounts.join(",")} onChange={(e) => setAmounts(e.target.value.split(","))} />
      </label>
      <br />
      <button onClick={handleTransfer}>배치 전송</button>
    </div>
  );
}
