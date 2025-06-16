import React from 'react';
import dayjs from 'dayjs';
import web3 from '../utils/web3';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface BlockOverviewProps {
  block: {
    number: number | bigint;
    hash: string;
    parentHash: string;
    timestamp: number | bigint;
    gasUsed: number | bigint;
    baseFeePerGas?: number | bigint;
    transactions: any[];
    size?: number | bigint;
  };
}

const BlockOverview: React.FC<BlockOverviewProps> = ({ block }) => {
  const toNum = (v: number | bigint | undefined) =>
    typeof v === 'bigint' ? Number(v) : v ?? 0;

  const feeWei = BigInt(block.gasUsed) * BigInt(block.baseFeePerGas ?? 0);
  const fee = Number(web3.utils.fromWei(feeWei.toString(), 'ether'));
  const minted = 9.6;
  const totalReward = minted + fee;

  const data = [
    ['Time', `${dayjs.unix(toNum(block.timestamp)).fromNow()} (${dayjs.unix(toNum(block.timestamp)).format('YYYY. MM. DD HH:mm:ss')} / Local)`],
    ['Hash', block.hash],
    ['Parent Hash', block.parentHash],
    ['Total TXs', `${block.transactions.length} TXs`],
    ['Block Reward', `${totalReward.toFixed(6)} KAIA (Minted ${minted} + TX Fee ${fee.toFixed(6)})`],
    ['Block Size', `${toNum(block.size).toLocaleString()} bytes`],
  ];

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: '1.5rem',
      maxWidth: 900,
      margin: '2rem auto',
      fontFamily: 'SFMono-Regular, Menlo, monospace',
      color: '#333',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {data.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{
                padding: '12px 16px',
                fontWeight: 600,
                color: '#666',
                whiteSpace: 'nowrap',
                width: '160px',
              }}>
                {label}
              </td>
              <td style={{
                padding: '12px 16px',
                color: '#000',
                wordBreak: 'break-word',
              }}>
                {label === 'Parent Hash'
                  ? <strong>{value}</strong>
                  : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BlockOverview;
