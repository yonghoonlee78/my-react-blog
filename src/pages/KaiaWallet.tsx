import '../App.css'
import React, { useState } from 'react';
import Web3 from 'web3';
import { Web3Account } from 'web3-eth-accounts';


const web3 = new Web3('https://public-en-kairos.node.kaia.io');

function KaiaWallet() {
  const [wallet, setWallet] = useState<Web3Account | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  
  const createWallet = () => {
    const newWallet = web3.eth.accounts.create();
    setWallet(newWallet);
    setBalance(null);
    setTxHash(null);
  };

  
  const getBalance = async () => {
    if (!wallet) return;
    const wei = await web3.eth.getBalance(wallet.address);
    setBalance(web3.utils.fromWei(wei, 'ether'));
  };

  
  const sendTransaction = async () => {
    if (!wallet || !recipient || !amount) return;
    try {
      const value = web3.utils.toWei(amount, 'ether');
      const gasPrice = await web3.eth.getGasPrice();
      const tx = { from: wallet.address, to: recipient, value, gas: 21000, gasPrice };

      const signed = await web3.eth.accounts.signTransaction(tx, wallet.privateKey);
      const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction as string);

      setTxHash(receipt.transactionHash.toString());
      getBalance();          
    } catch (e) {
      console.error('Transaction Failed:', e);
    }
  };

  
  const copyPrivateKey = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet.privateKey);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  
  return (
    <div className="App">
      <h2>Kaia Wallet (Testnet)</h2>

      {!wallet ? (
        <div className="wallet-container center-box">
          <button onClick={createWallet}>새 지갑 생성</button>
        </div>
      ) : (
        <div className="wallet-container">
          
          <div className="wallet-info">
            <p className="address-private-section">
              <strong>주소&nbsp;:</strong>&nbsp; {wallet.address}
            </p>
            <div className="private-key-section address-private-section">
            <strong style={{ fontSize: '1.0rem'}}>개인키&nbsp;:&nbsp;</strong>
              <button onClick={copyPrivateKey} className="copy-btn">복사</button>
              {copySuccess && <span className="copy-success">✔ 복사됨!</span>}
            </div>
          </div>

          <div className="balance-btn-wrapper">
          <button onClick={getBalance} className="balance-btn">잔액 조회</button></div>
          {balance !== null && (
            <p className="balance-display">
              <strong>잔액&nbsp;:</strong> {balance} KAIA
            </p>
          )}

          
          <h3 className="transfer-title">💸 송금</h3>
          <div className="send-transaction">
          <p className="send-label"></p>
          
            <input
              type="text"
              placeholder="Receive Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              type="text"
              placeholder="Token Quantity (KAIA)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={sendTransaction} className="send-btn">Send Kaia</button>
          </div>

          
          {txHash && (
            <p className="tx-hash">
              ✅ <strong>트랜잭션 해시:</strong>{' '}
              <a
                href={`https://kairos.kaiascan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default KaiaWallet;
