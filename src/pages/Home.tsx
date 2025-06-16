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
    <div>
      <SearchBar />
      <h2>Latest Block: {blockNum ? blockNum : 'Loading...'}</h2>
      <h2>
        Network Status:{' '}
        {networkStatus
          ? 'Network is healthy ^___^'
          : 'Network is unhealthy ㅠ___ㅠ'}
      </h2>
    </div>
  );
};

export default Home;
