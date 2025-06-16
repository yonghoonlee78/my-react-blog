import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import web3, { fromWei } from '../utils/web3';

const SearchBar = () => {
  const [input, setInput] = useState('');
  const [blockInfo, setBlockInfo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();


  const handleSearch = async () => {
    const q = input.trim();

    if (q.startsWith('0x') && q.length === 66) {
      navigate(`/explorer/tx/${q}`);
      return;
    }


    if (!isNaN(Number(q))) {
      try {
        const block = await web3.eth.getBlock(BigInt(q));
        if (!block) {
          setError('해당 블록을 찾을 수 없습니다.');
          setBlockInfo(null);
          return;
        }

        const baseFeeWei  = block.baseFeePerGas ?? '0';
        const gasUsed     = Number(block.gasUsed ?? 0);
        const baseFeeKAIA = Number(fromWei(baseFeeWei));
        const burntFees   = baseFeeKAIA * gasUsed;

        setBlockInfo({
          number:       Number(block.number),
          timestamp:    Number(block.timestamp),
          hash:         block.hash,
          parentHash:   block.parentHash,
          txCount:      block.transactions.length,
          blockSize:    block.size,
          baseFee:      baseFeeKAIA,
          burntFees,
          blockReward:  9.6,
        });
        setError(null);
      } catch (e) {
        console.error(e);
        setError('RPC 오류: 블록을 불러오지 못했습니다.');
        setBlockInfo(null);
      }
      return;
    }

 
    setError('올바른 블록 번호 또는 Tx 해시를 입력하세요.');
    setBlockInfo(null);
  };


  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginTop: '1.5rem',
        }}
      >
        <input
          placeholder="Enter Block Number or Tx Hash"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: '420px',
            height: '42px',
            padding: '8px 12px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #ccc',
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            width: '120px',
            height: '42px',
            fontSize: '16px',
            backgroundColor: '#1e90ff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Search
        </button>
      </div>

      {blockInfo && (
        <div
          style={{
            maxWidth: '860px',
            margin: '2rem auto',
            padding: '1.5rem 2rem',
            background: '#fff',
            color: '#333',
            borderRadius: '12px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            lineHeight: 1.7,
          }}
        >
          <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem', color: '#00bcd4' }}>
            Block #{blockInfo.number}
          </h2>
          <table style={{ width: '100%', borderSpacing: '0.5rem 0.7rem' }}>
            <tbody>
              <tr><th align="left">⏰ Time</th><td>{new Date(blockInfo.timestamp * 1000).toLocaleString()}</td></tr>
              <tr><th align="left">🔗 Hash</th><td><code>{blockInfo.hash}</code></td></tr>
              <tr><th align="left">↩ Parent Hash</th><td><code>{blockInfo.parentHash}</code></td></tr>
              <tr><th align="left">📦 Total TXs</th><td>{blockInfo.txCount} TXs</td></tr>
              <tr><th align="left">🎁 Block Reward</th><td>{blockInfo.blockReward} KAIA</td></tr>
              <tr><th align="left">📏 Block Size</th><td>{blockInfo.blockSize.toLocaleString()} bytes</td></tr>
              <tr><th align="left">🏷 Base Fee</th><td>{blockInfo.baseFee} KAIA</td></tr>
              <tr><th align="left">🔥 Burnt Fees</th><td>{blockInfo.burntFees.toFixed(6)} KAIA</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p style={{ color: '#ff5555', textAlign: 'center', marginTop: '1rem' }}>{error}</p>
      )}
    </>
  );   
};

export default SearchBar;
