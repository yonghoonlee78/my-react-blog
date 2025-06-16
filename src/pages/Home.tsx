import React, { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar';
import { getBlock, getNetworkStatus } from '../utils/web3';

const Home = () => {
  const [blockNum, setBlockNum] = useState<string>('');
  const [networkStatus, setNetworkStatus] = useState<boolean>(false);

  const fetchBlock = async () => {
    try {
      const latestBlock = await getBlock();
      setBlockNum(latestBlock.number.toString());
    } catch (error) {
      console.error('Error fetching latest block:', error);
    }
  };

  const fetchNetworkStatus = async () => {
    try {
      const networkStatus = await getNetworkStatus();
      setNetworkStatus(networkStatus);
    } catch (error) {
      console.error('Error fetching network status:', error);
    }
  };

  useEffect(() => {
    fetchBlock();
    fetchNetworkStatus();
  }, []);

  return (
    <div style={{ textAlign: 'center', color: 'deepskyblue' }}>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>Kaia Explorer</h1>
    
      <SearchBar />
    
    </div>
  );
};

export default Home;
