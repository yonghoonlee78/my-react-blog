import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import BettingGameAbi from "../abi/BettingGame.json";

const BETTING_GAME_ADDRESS = "0x485e9583D3610986f857797910812520be9876a0";
const USDT_ADDRESS = "0xF2dF465211f9910f17d666D7b4d2aa2B898D8ED1";
const MIN_NUM = 1;
const MAX_NUM = 99;
const BET_DECIMALS = 18; 

const BettingGame: React.FC = () => {
  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<ethers.BrowserProvider>();
  const [signer, setSigner] = useState<ethers.Signer>();
  const [betNumber, setBetNumber] = useState<number | "">("");
  const [betAmount, setBetAmount] = useState<string>("");
  const [usdtBalance, setUsdtBalance] = useState<string>("");
  const [txStatus, setTxStatus] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [result, setResult] = useState<null | {
    random: number;
    won: boolean;
    payout: string;
  }>(null);

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert("메타마스크 설치 필요");
      return;
    }
    const _provider = new ethers.BrowserProvider((window as any).ethereum);
    await _provider.send("eth_requestAccounts", []);
    const _signer = await _provider.getSigner();
    const addr = await _signer.getAddress();

    setProvider(_provider);
    setSigner(_signer);
    setAccount(addr);
  };

  const fetchUsdtBalance = async () => {
    if (account && provider) {
      const usdt = new ethers.Contract(USDT_ADDRESS, [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ], provider);
      const [raw, decimals] = await Promise.all([
        usdt.balanceOf(account),
        usdt.decimals()
      ]);
      setUsdtBalance(ethers.formatUnits(raw, decimals));
    }
  };

  useEffect(() => {
    if (account && provider) fetchUsdtBalance();
  }, [account, provider, txStatus]);


  const playBet = async () => {
    //★★★★ 트랜잭션 시작 전에 반드시 오류 메시지/결과 상태 클리어!
    setResult(null);
    setTxStatus("");
    
    if (!ethers.isAddress(recipient)) {
      setTxStatus("유효한 이더리움 주소를 입력하세요!");
      return;
    }
    if (!signer) {
      alert("지갑 먼저 연결하세요!");
      return;
    }
    if (
      !betNumber || isNaN(Number(betNumber)) ||
      Number(betNumber) < MIN_NUM || Number(betNumber) > MAX_NUM
    ) {
      setTxStatus("베팅 숫자를 1~99 사이로 입력하세요!");
      return;
    }
    if (!betAmount || isNaN(Number(betAmount)) || Number(betAmount) <= 0) {
      setTxStatus("베팅할 USDT 수량을 입력하세요!");
      return;
    }
    let amount;
    try {
      amount = ethers.parseUnits(betAmount, BET_DECIMALS);
    } catch {
      setTxStatus("USDT 입력값/소수점 변환 오류입니다.");
      return;
    }

    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, [
        "function approve(address,uint256) returns (bool)"
      ], signer);

      const approveTx = await usdt.approve(BETTING_GAME_ADDRESS, amount);
      setTxStatus("USDT 사용 승인 중...");
      await approveTx.wait();
    } catch (err: any) {
      // ★★★ estimateGas 사전 오류 무시
      if (
        err.code === "UNPREDICTABLE_GAS_LIMIT" ||
        (err.message && err.message.toLowerCase().includes("estimategas"))
      ) {
        // 숨김 또는 안내만
        setTxStatus("네트워크 예측 에러(실제 트랜잭션으로 시도합니다)"); // 또는 아무 메시지도 띄우지 않기
      } else {
        setTxStatus("USDT 전송 허락 실패: " + (err.reason || err.message));
      }
      return;
    }

    try {
      const bettingGame = new ethers.Contract(
        BETTING_GAME_ADDRESS,
        BettingGameAbi.abi,
        signer
      );
      setTxStatus("베팅 트랜잭션 전송 중...");

      const tx = await bettingGame.bet(
        Number(betNumber),
        amount,
        recipient
      );
      await tx.wait();

      setTxStatus(""); // 성공/실패에 관계 없이 메시지 초기화

      const receipt = await provider!.getTransactionReceipt(tx.hash);
      let betEvent = null;
      if (receipt && receipt.logs) {
        betEvent = receipt.logs
          .map(log => {
            try {
              return bettingGame.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find(evt => evt && evt.name === "Bet");
      }
      if (betEvent) {
        setResult({
          random: Number(betEvent.args.random),
          won: betEvent.args.win,
          payout: ethers.formatUnits(betEvent.args.payout, BET_DECIMALS),
        });
        setTxStatus(betEvent.args.win ? "축하합니다! 승리!" : "아쉽지만 졌습니다.");
      } else {
        setTxStatus(""); //★★★★ 결과/에러 메시지도 즉시 클리어
      }
      fetchUsdtBalance();
    } catch (err: any) {
      // ★★★ estimateGas 사전 오류 무시
      if (
        err.code === "UNPREDICTABLE_GAS_LIMIT" ||
        (err.message && err.message.toLowerCase().includes("estimategas"))
      ) {
        setTxStatus("네트워크 예측 에러(실제 트랜잭션 확인)"); // 혹은 아무것도 표시 X
      } else if (err.code === 4001) {
        setTxStatus("사용자가 트랜잭션을 취소했습니다.");
      } else {
        setTxStatus("베팅 트랜잭션 실패: " + (err.reason || err.message));
      }
    }
  };

  return (
    <div style={{ maxWidth: 450, margin: "40px auto", padding: 24, background: "#212127", borderRadius: 10, color: "#fff" }}>
      <h2>USDT 숫자 베팅 미니게임</h2>
      <button onClick={connectWallet}>
        {account ? "지갑연결 완료" : "메타마스크 지갑 연결"}
      </button>
      {account && (
        <>
          <div style={{ margin: "16px 0" }}>내 주소: {account}</div>
          <div>USDT 잔액: {usdtBalance}</div>
          <input
            type="text"
            placeholder="배당 받을 주소 입력"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 10, marginBottom: 10 }}
          />
          <input
            type="number"
            placeholder="베팅 숫자(1~99)"
            min={MIN_NUM}
            max={MAX_NUM}
            value={betNumber}
            onChange={e => setBetNumber(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ marginTop: 10, width: 120 }}
          />
          <input
            type="number"
            placeholder="베팅 USDT"
            min={0}
            value={betAmount}
            onChange={e => setBetAmount(e.target.value)}
            style={{ marginLeft: 8, width: 120 }}
          />
          <button onClick={playBet} style={{ marginLeft: 8 }}>
            베팅!
          </button>
        </>
      )}
      <div style={{ marginTop: 12, minHeight: 30}}>{txStatus}</div>
      {result && (
        <div style={{ marginTop: 12, background: "#393952", padding: 12, borderRadius: 8 }}>
          <div>랜덤 숫자: {result.random}</div>
          <div>승리 여부: {result.won ? "승리!(배당금 획득)" : "패배"}</div>
          <div>배당금: {result.payout} USDT</div>
        </div>
      )}
    </div>
  );
};

export default BettingGame;
