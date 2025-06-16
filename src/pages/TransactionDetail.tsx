import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import web3 from '../utils/web3';
import './TxOverview.css';

interface TxView {
  status: 'Success' | 'Fail';
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  effectiveGasPrice: string;
  gasUsed: number;
  gasLimit: number;
  txFee: string;
  nonce: number;
  methodSig?: string;
  timestamp: number;
}

const weiToKaia = (wei: string | bigint) =>
  web3.utils.fromWei(wei.toString(), 'ether');

export default function TransactionDetail() {
  const { txHash } = useParams<{ txHash: string }>();
  const [txInfo, setTxInfo] = useState<TxView | null>(null);

  useEffect(() => {
    if (!txHash) return;

    (async () => {
      const tx: any = await web3.eth.getTransaction(txHash);
      const receipt: any = await web3.eth.getTransactionReceipt(txHash);
      const block: any = await web3.eth.getBlock(receipt.blockNumber);

      const gasUsed      = Number(receipt.gasUsed);
      const rawGasPrice  = tx.gasPrice ?? tx.maxFeePerGas ?? '0';
      const rawEffPrice  = receipt.effectiveGasPrice ?? rawGasPrice;

      const gasPriceKAIA = weiToKaia(rawGasPrice);
      const effPriceKAIA = weiToKaia(rawEffPrice);
      const txFeeKAIA    = (Number(effPriceKAIA) * gasUsed).toFixed(6);

      setTxInfo({
        status: receipt.status ? 'Success' : 'Fail',
        blockNumber: Number(tx.blockNumber),
        from: tx.from,
        to: tx.to,
        value: weiToKaia(tx.value),
        gasPrice: gasPriceKAIA,
        effectiveGasPrice: effPriceKAIA,
        gasUsed,
        gasLimit: Number(tx.gas),
        txFee: txFeeKAIA,
        nonce: tx.nonce,
        methodSig: tx.input?.slice(0, 10),
        timestamp: Number(block.timestamp),
      });
    })();
  }, [txHash]);

  if (!txInfo) return <p style={{ textAlign: 'center' }}>Loading…</p>;

  return (
    <div className="tx-card">
      <h2>
        Transaction&nbsp;
        <span className={`badge ${txInfo.status === 'Success' ? 'success' : 'fail'}`}>
          {txInfo.status}
        </span>
      </h2>

      <table>
        <tbody>
          <tr><th>Block #</th><td>{txInfo.blockNumber}</td></tr>
          <tr><th>From</th><td className="mono">{txInfo.from}</td></tr>
          <tr><th>To</th><td className="mono">{txInfo.to ?? '-'}</td></tr>
          <tr><th>Amount</th><td>{txInfo.value} KAIA</td></tr>
          <tr><th>Gas Price</th><td>{txInfo.gasPrice} KAIA</td></tr>
          <tr><th>Effective Gas Price</th><td>{txInfo.effectiveGasPrice} KAIA</td></tr>
          <tr><th>Gas Used</th><td>{txInfo.gasUsed.toLocaleString()}</td></tr>
          <tr><th>Gas Limit</th><td>{txInfo.gasLimit.toLocaleString()}</td></tr>
          <tr><th>TX Fee</th><td>{txInfo.txFee} KAIA</td></tr>
          <tr><th>MethodSig</th><td className="mono">{txInfo.methodSig ?? '-'}</td></tr>
          <tr><th>Time</th>
              <td>{new Date(txInfo.timestamp * 1000).toLocaleString('ko-KR', { hour12: false })}</td></tr>
          <tr><th>Nonce</th><td>{txInfo.nonce}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
