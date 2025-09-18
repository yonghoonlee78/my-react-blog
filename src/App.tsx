import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PostList from './components/PostList';
import PostDetail from './components/PostDetail';
import AboutPage from './components/AboutPage';
import NotFoundPage from './components/NotFoundPage';
import ContractExplorer from './components/ContractExplorer';
import AdminPage from './components/AdminPage'; // 새로 추가

import Home from './pages/Home';
import BlockDetail from './pages/BlockDetail';
import TransactionDetail from './pages/TransactionDetail';
import KaiaWallet from './pages/KaiaWallet';
import MnemonicWallet from './pages/MnemonicWallet';
import ContractInfo from './components/ContractInfo';

import { initialPosts } from './data'; // 기존 Web3 기능 유지를 위해 보존
import type { Post } from './types/Post';
import WalletDashboard from './components/WalletDashboard';
import NFTEventListener from './components/NFTEventListener';
import Web3Profile from './components/Web3Profile';
import MiniMiner from './components/MiniMiner';
import StakingDashboard from './components/StakingDashboard';

import AssetDashboard from './components/AssetDashboard';
import SimpleDEX from './components/SimpleDEX';
import NFTMarketplace from './components/NFTMarketplace';
import VolatilityPrediction from './components/VolatilityPrediction';

// Routes 안에 추가
<Route path="/volatility-prediction" element={<VolatilityPrediction />} />

console.log("ALCHEMY_ENV_KEY:", process.env.REACT_APP_ALCHEMY_API_KEY);

const App: React.FC = () => {
  // 기존 Web3 기능들이 여전히 필요할 수 있으므로 유지
  const [allPosts, setPosts] = useState<Post[]>([]);
  useEffect(() => setPosts(initialPosts), []);

  return (
    <Router>
      <Layout>
        <Routes>
          {/* 블로그 관련 라우트 */}
          <Route path="/" element={<PostList />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/admin" element={<AdminPage />} /> {/* 관리자 페이지 추가 */}
          <Route path="/about" element={<AboutPage />} />
          
          {/* Web3 관련 라우트들 */}
          <Route path="/wallet" element={<KaiaWallet />} />
          <Route path="/mnemonic-wallet" element={<MnemonicWallet />} />
          <Route path="/contract-explorer" element={<ContractExplorer />} />
          
          <Route path="/explorer" element={<Home />} />
          <Route path="/explorer/block/:blockNumber" element={<BlockDetail />} />
          <Route path="/explorer/tx/:txHash" element={<TransactionDetail />} />
          <Route path="/kaiatestnet-event-listener" element={<NFTEventListener />} />
          
          <Route path="/contract-info" element={<ContractInfo />} />
          <Route path="/wallet-dashboard" element={<WalletDashboard />} />
          
          <Route path="/web3-profile" element={<Web3Profile />} />
          <Route path="/staking" element={<StakingDashboard />} />
          <Route path="/simple-dex" element={<SimpleDEX />} />
          <Route path="/nft-marketplace" element={<NFTMarketplace />} />
          <Route path="/volatility-prediction" element={<VolatilityPrediction />} />
          
          {/* MiniMiner 단독 실습 페이지 ROUTE */}
          <Route
            path="/mini-miner"
            element={
              <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
                <h1>나만의 블록체인 미니 채굴 실습</h1>
                <MiniMiner />
              </main>
            }
          />
          
          {/* 기타 라우트들 */}
          <Route path="/erc1155-all-assets-dashboard" element={<AssetDashboard />} />
           {/* 비트코인 변동성 예측 게임 라우트 추가 */}
           <Route path="/volatility-prediction" element={<VolatilityPrediction />} />


          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;