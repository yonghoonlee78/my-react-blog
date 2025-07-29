import { useState } from "react";
import { ethers } from "ethers";
import { MULTITOKEN_ADDRESS, MULTITOKEN_ABI } from "./ContractInfo";

export default function BalanceOfBatchSection() {
  const [addresses, setAddresses] = useState([""]);
  const [ids, setIds] = useState([""]);
  const [balances, setBalances] = useState<number[]>([]);

  const checkBalances = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(MULTITOKEN_ADDRESS, MULTITOKEN_ABI, signer);

    const addrArr = addresses.map((addr) => addr.trim());
    const idArr = ids.map((id) => Number(id));

    const result = await contract.balanceOfBatch(addrArr, idArr);
    setBalances(result.map((b: any) => Number(b)));
  };

  return (
    <div>
      <h2>📊 배치 잔액 조회</h2>
      <label>
        주소들 (,로 구분):{" "}
        <input
          value={addresses.join(",")}
          onChange={(e) => setAddresses(e.target.value.split(","))}
        />
      </label>
      <br />
      <label>
        토큰ID들 (,로 구분):{" "}
        <input value={ids.join(",")} onChange={(e) => setIds(e.target.value.split(","))} />
      </label>
      <br />
      <button onClick={checkBalances}>조회</button>
      <div>
        <strong>결과:</strong>
        {balances.map((b, i) => (
          <div key={i}>
            주소: {addresses[i]} - ID {ids[i]}: {b}
          </div>
        ))}
      </div>
    </div>
  );
}
