import React, { useState } from 'react';
import { ethers } from 'ethers';
import ERC2612_ABI_JSON from "../abi/MyERC2612Token.json";
const ABI = ERC2612_ABI_JSON.abi as any[]; // 또는 그냥 ERC2612_ABI_JSON.abi

// 배포한 ERC2612 컨트랙트 주소/ABI (직접 복사해 넣으세요)
const CONTRACT_ADDRESS = "0x2552Af3a76289E7b7a54f047441E6534569521a6";

const ERC2612Demo: React.FC = () => {
  const [spender, setSpender] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [sig, setSig] = useState<any>(null);
  const [result, setResult] = useState<string | null>(null);

  // permit 메시지 만들고 서명 요청    
  const handleSignPermit = async () => {
    try {
      // 1. 지갑 연결    
      //@ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 2. 컨트랙트 인스턴스화
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // 3. nonce, DOMAIN_SEPARATOR 등 permit 준비
      const nonce = await contract.nonces(address);
      const domain = {
        name: await contract.name(),
        version: '1',
        chainId: await signer.provider.getNetwork().then((n: any) => n.chainId),
        verifyingContract: CONTRACT_ADDRESS,
      };
      const permit = {
        owner: address,
        spender,
        value: ethers.parseEther(amount),
        nonce,
        deadline,
      };

      // 4. EIP-712 형식으로 서명 요청
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ],
      };

      //@ts-ignore
      const signature = await signer.signTypedData(domain, types, permit);
      // ethers v6은 signTypedData, v5는 _signTypedData 차이 있음

      setSig(signature);
      setResult("서명 완료! 이제 permit 트랜잭션을 보낼 수 있습니다.");

    } catch (e: any) {
      setResult("서명 실패: " + e.message);
    }
  };

  // permit 트랜잭션 실행
  const handleSendPermit = async () => {
    try {
      //@ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // signature: 65바이트(0x...) => v,r,s 분리 필요
      if (!sig) return setResult('먼저 서명을 해주세요!');
      const r = '0x' + sig.slice(2, 66);
      const s = '0x' + sig.slice(66, 130);
      const v = parseInt(sig.slice(130, 132), 16);

      const tx = await contract.permit(
        await signer.getAddress(),
        spender,
        ethers.parseEther(amount),
        deadline,
        v, r, s
      );
      await tx.wait();
      setResult(`Permit 성공! 트랜잭션 해시: ${tx.hash}`);
    } catch (e: any) {
      setResult("permit 트랜잭션 실패: " + e.message);
    }
  };

  return (
    <div>
      <h2>ERC-2612 Permit 데모</h2>
      <div>
        <label>Spender Address: <input value={spender} onChange={e => setSpender(e.target.value)} /></label>
      </div>
      <div>
        <label>Amount (token): <input value={amount} onChange={e => setAmount(e.target.value)} type="number" /></label>
      </div>
      <div>
        <label>Deadline (timestamp): <input value={deadline} onChange={e => setDeadline(e.target.value)} type="number" /></label>
      </div>
      <button onClick={handleSignPermit}>1. permit 메시지 서명하기</button>
      <button onClick={handleSendPermit} disabled={!sig}>2. permit 트랜잭션 보내기</button>
      <div style={{margin: "16px 0"}}>{result}</div>
    </div>
  );
};

export default ERC2612Demo;
