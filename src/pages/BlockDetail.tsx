import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import web3 from '../utils/web3';
import '../components/BlockOverview.css';          

interface BlockPayload {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  miner: string;
  size: number;
  transactions: string[];
  gasUsed: string;
  baseFeePerGas?: string;
}

export default function BlockDetail() {
  const { blockNumber } = useParams();
  const [block, setBlock] = useState<BlockPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await web3.eth.getBlock(Number(blockNumber));
        setBlock(data as unknown as BlockPayload);
      } finally {
        setLoading(false);
      }
    })();
  }, [blockNumber]);

  if (loading) return <p style={{ textAlign: 'center' }}>Loading…</p>;
  if (!block)   return <p style={{ textAlign: 'center' }}>Block not found</p>;

  const toLocal = (ts: number) =>
    new Date(ts * 1000).toLocaleString('ko-KR', { hour12: false });

  return (
    <div className="overview-card">
      <h2>
        Block <span className="badge">#{block.number}</span>
      </h2>

      <table>
        <tbody>
          <tr><th>Time</th><td>{toLocal(block.timestamp)}</td></tr>
          <tr><th>Hash</th><td className="hash">{block.hash}</td></tr>
          <tr><th>Parent Hash</th><td className="hash">{block.parentHash}</td></tr>
          <tr><th>Total TXs</th><td>{block.transactions.length} TXs</td></tr>
          <tr><th>Block Size</th><td>{block.size.toLocaleString()} bytes</td></tr>
          <tr><th>Gas Used</th><td>{Number(block.gasUsed).toLocaleString()}</td></tr>
          {block.baseFeePerGas && (
            <tr>
              <th>Base Fee</th>
              <td>{web3.utils.fromWei(block.baseFeePerGas, 'ether')} KAIA</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
