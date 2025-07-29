import React, { useEffect, useState } from 'react';
import { useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';

const developerAddress = '0xf3a9d84E06363a251bE733E8F2bFCa1849b3c512'; // 본인 주소 넣으세요

const Tipping = () => {
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const { data, sendTransaction, isPending, isSuccess, error } = useSendTransaction();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendTransaction({
      to: developerAddress,
      value: parseEther(amount),
    });
  };

  useEffect(() => {
    if (data && isSuccess) {
      setHistory((prev) => [...prev, data]);
      setAmount('');
    }
  }, [data, isSuccess]);

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h3>💸 후원하기</h3>
      <form onSubmit={handleSend}>
        <input
          type="number"
          placeholder="ETH 금액"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.001"
          step="0.001"
          required
        />
        <button type="submit" disabled={isPending || !amount}>
          {isPending ? '전송 중...' : '팁 보내기'}
        </button>
      </form>
      {isSuccess && data && (
        <p>
          🎉 트랜잭션 완료!{' '}
          <a href={`https://sepolia.etherscan.io/tx/${data}`} target="_blank" rel="noreferrer">
            View Tx
          </a>
        </p>
      )}
      {error && <p style={{ color: 'red' }}>❌ {error.message}</p>}

      {history.length > 0 && (
        <>
          <h4>📜 후원 내역</h4>
          <ul>
            {history.map((tx, i) => (
              <li key={i}>
                <a
                  href={`https://sepolia.etherscan.io/tx/${tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tx}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

export default Tipping;

