import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import PostList from './components/PostList';
import PostDetail from './components/PostDetail';
import AboutPage from './components/AboutPage';
import NotFoundPage from './components/NotFoundPage';
import ContractExplorer from './components/ContractExplorer';

import Home from './pages/Home';
import BlockDetail from './pages/BlockDetail';
import TransactionDetail from './pages/TransactionDetail';
import KaiaWallet from './pages/KaiaWallet';
import MnemonicWallet from './pages/MnemonicWallet';
import ContractInfo from './components/ContractInfo';

import { initialPosts } from './data';
import type { Post } from './types/Post';


const App: React.FC = () => {
  const [allPosts, setPosts] = useState<Post[]>([]);
  useEffect(() => setPosts(initialPosts), []);

  return (
    <Router>
      <Layout>
        <Routes>
         
          <Route path="/" element={<PostList posts={allPosts} />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/about" element={<AboutPage />} />

         
          <Route path="/wallet" element={<KaiaWallet />} />
          <Route path="/mnemonic-wallet" element={<MnemonicWallet />} />
          <Route path="/contract-explorer" element={<ContractExplorer />} />

          <Route path="/explorer" element={<Home />} />
          <Route path="/explorer/block/:blockNumber" element={<BlockDetail />} />
          <Route path="/explorer/tx/:txHash" element={<TransactionDetail />} />

          <Route path="/contract-info" element={<ContractInfo />} />

      
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
