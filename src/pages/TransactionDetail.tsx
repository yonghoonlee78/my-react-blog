import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTransactionReceipt, getTransaction, fromWei } from '../utils/web3';
import { Transaction, TransactionReceipt } from 'web3-types';

const TransactionDetail: React.FC = () => {
  const { txHash } = useParams<{ txHash: string }>();
  const [transaction, setTransaction] = useState<TransactionReceipt | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<boolean>(false);
  const [txDetails, setTxDetails] = useState<Transaction | Record<string, any>>(
    {}
  );
  const [amount, setAmount] = useState<string | null>(null);
  const [gasPrice, setGasPrice] = useState<string | null>(null);

  useEffect(() => {
    if (!txHash) {
      setError('트랜잭션 해시가 제공되지 않았습니다.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTx = async () => {
      try {
        setLoading(true);
        setError(null);

        const tx = await getTransaction(txHash);
        if (!tx) {
          throw new Error('트랜잭션을 찾을 수 없습니다.');
        }

        if (tx.blockNumber === null) {
          if (isMounted) {
            setPending(true);
            setTxDetails(tx);
            setAmount(fromWei(tx.value));
            setGasPrice(fromWei(tx.gasPrice));
          }
          return;
        }

        const receipt = await getTransactionReceipt(txHash);
        if (isMounted) {
          setTransaction(receipt);
          setTxDetails(tx);
          setPending(false);
          setAmount(fromWei(tx.value));
          setGasPrice(fromWei(tx.gasPrice));
        }
      } catch (err) {
        if (isMounted) {
          setError('트랜잭션 정보를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTx();

    const interval = setInterval(() => {
      if (pending) {
        fetchTx();
      } else {
        clearInterval(interval);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [txHash, pending]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (pending) return <p>⏳ 트랜잭션이 아직 처리 중입니다...</p>;
  if (!transaction) return <p>트랜잭션 정보를 찾을 수 없습니다.</p>;

  return (
    <div>
      <h1>Transaction Detail</h1>
      <p>
        <strong>Hash:</strong> {txHash}
      </p>
      <p>
        <strong>Status:</strong>{' '}
        {transaction.status ? '✅ Success' : '❌ Failed'}
      </p>
      <p>
        <strong>From:</strong> {txDetails.from}
      </p>
      <p>
        <strong>To:</strong> {txDetails.to}
      </p>
      <p>
        <strong>Amount:</strong> {amount} KAIA
      </p>
      <p>
        <strong>Gas Used:</strong> {transaction.gasUsed}
      </p>
      <p>
        <strong>Gas Price: </strong>
        {gasPrice} KAIA
      </p>
    </div>
  );
};

export default TransactionDetail;
