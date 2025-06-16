import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBlock } from '../utils/web3';

const BlockDetail: React.FC = () => {
  const { blockNumber } = useParams<{ blockNumber: string }>();
  const [block, setBlock] = useState<any>(null);

  useEffect(() => {
    getBlock(Number(blockNumber)).then(setBlock);
  }, [blockNumber]);

  if (!block) return <p>Loading...</p>;

  return (
    <div>
      <h1>Block Detail</h1>
      <p>Block Number: {block.number}</p>
      <p>Hash: {block.hash}</p>
      <p>Transactions: {block.transactions.length}</p>
    </div>
  );
};

export default BlockDetail;
