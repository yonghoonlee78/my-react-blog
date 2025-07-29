import React, { useState } from 'react';
import { ethers } from 'ethers';
import MinimalForwarder_ABI_JSON from "../abi/MinimalForwarder.json";
import Recipient_ABI_JSON from "../abi/MyERC2771Recipient.json";


// 배포된 컨트랙트 주소/ABI
const FORWARDER_ADDRESS = "0xd7a6b777fb8Bbb5fEFC90469Ce6B6696A2cF7ebE";
const RECIPIENT_ADDRESS = "0x31aB88CB8A88B8bAfeAE263FF0338d192a41d23c";

const FORWARDER_ABI = MinimalForwarder_ABI_JSON.abi as any[];
const RECIPIENT_ABI = Recipient_ABI_JSON.abi as any[];


const ERC2771Demo: React.FC = () => {
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState("");

  // 1. doSomething()을 호출하는 메타트랜잭션 생성 & 서명 -> Relayer가 대신 보내기
  const handleMetaTx = async () => {
    try {
      //@ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const from = await signer.getAddress();

      // doSomething() 호출 데이터
      const iface = new ethers.Interface(RECIPIENT_ABI);
      const data = iface.encodeFunctionData("doSomething");

      // MinimalForwarder 인스턴스/nonce
      const forwarder = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, provider);
      const nonce = await forwarder.nonce(from);

      // 요청 구조
      const request = {
        from,
        to: RECIPIENT_ADDRESS,
        value: 0,
        gas: 1_000_000,
        nonce,
        data,
      };

      // EIP-712 도메인/타입
      const domain = {
        name: "MinimalForwarder",
        version: "0.0.1",
        chainId: await signer.provider.getNetwork().then((n: any) => n.chainId),
        verifyingContract: FORWARDER_ADDRESS,
      };
      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ]
      };

      //@ts-ignore
      const signature = await signer.signTypedData(domain, types, request);

      // Relayer 역할: 직접 트랜잭션 보내기(실제 실전에서는 백엔드 서버나 relayer로 분리—but 테스트니까 직접)
      const relayer = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, signer);
      const tx = await relayer.execute(request, signature, { gasLimit: 1_000_000 });
      setTxHash(tx.hash);
      setStatus("실행 완료! 오너 이벤트를 컨트랙트에서 확인할 수 있습니다.");
    } catch (e: any) {
      setStatus("실패: " + e.message);
    }
  };

  return (
    <div>
      <h2>ERC-2771 메타트랜잭션 Demo</h2>
      <div>
        <button onClick={handleMetaTx}>메타트랜잭션(doSomething) 실행</button>
      </div>
      {txHash && (
        <div>
          트랜잭션 해시: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
        </div>
      )}
      <div style={{marginTop: 10}}>{status}</div>
      <div style={{marginTop: 20, color: "#aaa", fontSize: "0.9em"}}>
        실제 실무에서는 이 기능이 <b>Relayer 백엔드</b>에서 실행되도록 분리합니다.<br />
        테스트를 위해 프론트에서 한 번에 체험할 수 있게 구성된 것!
      </div>
    </div>
  );
};

export default ERC2771Demo;
