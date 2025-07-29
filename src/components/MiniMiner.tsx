import React, { useState, useRef } from "react";

// SHA-256 해시 함수(JS 표준 WebCrypto API 사용)
async function sha256(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  // 해시 결과를 hex string으로 변환
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function MiniMiner() {
  const [running, setRunning] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [hash, setHash] = useState<string>("");
  const [difficulty, setDifficulty] = useState(4); // 앞자리 0의 개수(난이도)
  const [found, setFound] = useState(false);

  const stopRef = useRef(false);

  // 채굴 시작
  const startMining = async () => {
    setRunning(true);
    setFound(false);
    stopRef.current = false;
    let n = 0;
    let lastHash = "";

    const prefix = "0".repeat(difficulty);

    while (!stopRef.current) {
      // 블록데이터+nonce 조합
      const msg = "my-test-blockchain-data" + n;
      lastHash = await sha256(msg);

      if (lastHash.startsWith(prefix)) {
        // 목표 해시를 찾음!
        setNonce(n);
        setHash(lastHash);
        setFound(true);
        setRunning(false);
        return;
      }

      if (n % 1000 === 0) {
        setNonce(n);
        setHash(lastHash);
        await new Promise((res) => setTimeout(res, 0)); // 브라우저 UI 갱신
      }
      n++;
    }
    setRunning(false);
  };

  // 채굴 중단
  const stopMining = () => {
    stopRef.current = true;
    setRunning(false);
  };

  // 난이도 자동 조절
  const handleDiff = (diff: number) => {
    setDifficulty(diff);
    setFound(false);
    setNonce(0);
    setHash("");
  };

  return (
    <div style={{padding: 20, border:"1px solid #BBB", borderRadius: 10, width: 400}}>
      <h2>🛠 미니 SHA-256 채굴 시뮬레이터</h2>
      <div>난이도(앞자리 0):{" "}
        {[3,4,5].map(d=>
          <button 
            key={d} 
            disabled={difficulty===d}
            onClick={()=>handleDiff(d)}
            style={{marginRight:5}}>
            {d}
          </button>
        )}
      </div>
      <div style={{margin:"12px 0"}}>
        <button onClick={startMining} disabled={running}>채굴 시작</button>
        <button onClick={stopMining} disabled={!running}>채굴 중단</button>
      </div>
      <div>Nonce: <b>{nonce}</b></div>
      <div>최근 Hash: <div style={{wordBreak:"break-all",fontFamily:"monospace"}}>{hash}</div></div>
      {found && (
        <div style={{color:"green",marginTop:10, fontWeight:"bold"}}>
          🎉 성공! (Nonce: {nonce}, Hash: {hash.slice(0,20)}...)
        </div>
      )}
      <div style={{fontSize:12, color:"#888",marginTop:12}}>
        * “채굴 시작”을 누르면 해시 목표(앞자리 0 {difficulty}개) 미만이 나올 때까지 nonce를 자동 상승시켜 블록 해시를 찾습니다.<br/>
        * 실제 블록체인도 이 원리(해시 퍼즐)를 기초로 동작합니다.
      </div>
    </div>
  );
}
