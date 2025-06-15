// src/pages/MnemonicWallet.tsx
import React, { useState } from 'react';
import { ethers, HDNodeWallet } from 'ethers';
import '../App.css';             
import './MnemonicWallet.css';   


const provider = new ethers.JsonRpcProvider(
  'https://public-en-kairos.node.kaia.io'
);

export default function MnemonicWallet() {
  
  const [mnemonic, setMnemonic] = useState('');
  const [wallet, setWallet]     = useState<HDNodeWallet | null>(null);
  const [balance, setBalance]   = useState<string | null>(null);
  const [toAddr, setToAddr]     = useState('');
  const [amount, setAmount]     = useState('');
  const [txHash, setTxHash]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  
  const generateMnemonic = () => {
    const hd = HDNodeWallet.createRandom();          
    setMnemonic(hd.mnemonic!.phrase);
    setWallet(hd.connect(provider));
    resetOutputs();
  };

  const restoreWallet = () => {
    try {
      const hd = HDNodeWallet.fromPhrase(mnemonic).connect(provider);
      setWallet(hd);
      resetOutputs();
      setError(null);
    } catch {
      setError('⚠️ 잘못된 니모닉 문구입니다.');
    }
  };

  
  const fetchBalance = async () => {
    if (!wallet) return;
    const wei = await provider.getBalance(wallet.address);
    setBalance(ethers.formatEther(wei));
  };

  
  const sendTx = async () => {
    if (!wallet || !toAddr || !amount) {
      setError('주소와 금액을 모두 입력하세요.');
      return;
    }
    try {
      const tx = await wallet.sendTransaction({
        to: toAddr,
        value: ethers.parseEther(amount),
      });
      setTxHash(tx.hash);
      await tx.wait();
      fetchBalance();
      setError(null);
    } catch (e) {
      console.error(e);
      setError('송금 실패: 잔액 또는 입력값 확인');
    }
  };

  
  const resetOutputs = () => {
    setBalance(null);
    setTxHash(null);
    setToAddr('');
    setAmount('');
  };

  
  return (
    <div className="mnemonic-app">
      <h2>Kaia Mnemonic Wallet (Testnet)</h2>

      
      <textarea
        className="mnemonic-input"
        placeholder="니모닉을 붙여넣거나 새로 생성하세요."
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
      />
<div className="mnemonic-btn-group">
  <button className="generate-btn" onClick={generateMnemonic}>니모닉 생성</button>
  <button className="restore-btn" onClick={restoreWallet}>니모닉 복구</button>
</div>

      
      {wallet && (
        <div className="wallet-card">
          <p className="kv"><strong>Address &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</strong> {wallet.address}</p>
          <p className="kv"><strong>Private Key :</strong> {wallet.privateKey}</p>
          

          <button className="balance-btn" onClick={fetchBalance}>잔액 조회</button>
          {balance && (
            <p className="balance-display">잔액 : {balance} KAIA</p>
          )}

          <h3 className="transfer-title">Send Kaia</h3>
          <div className="send-area">
            <input
              placeholder="받는 주소"
              value={toAddr}
              onChange={(e) => setToAddr(e.target.value)}
            />
            <input
              placeholder="보낼 금액 (KAIA)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button className="send-btn" onClick={sendTx}>송금</button>
          </div>

          {txHash && (
            <p className="tx-hash">
              트랜잭션 :
              <a
                href={`https://kairos.kaiascan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
