import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PostList from './components/PostList';
import PostDetail from './components/PostDetail';
import KaiaWallet from './pages/KaiaWallet';
import MnemonicWallet from './pages/MnemonicWallet';
import AboutPage from './components/AboutPage';
import NotFoundPage from './components/NotFoundPage';
import { Post } from './types/Post';
import { initialPosts } from './data';

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => setPosts(initialPosts), []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<PostList posts={posts} />} />
          <Route path="/post/:id" element={<PostDetail posts={posts} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/wallet" element={<KaiaWallet />} />
          <Route path="/mnemonic-wallet" element={<MnemonicWallet />} />
          <Route path="/my-react-blog" element={<PostList posts={posts} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;