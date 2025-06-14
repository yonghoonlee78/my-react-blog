import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PostList from './components/PostList';
import PostDetail from './components/PostDetail';
import KaiaWallet from './pages/KaiaWallet';
import NotFoundPage from './components/NotFoundPage';
import { Post } from './types/Post';
import { initialPosts } from './data';
import AboutPage from './components/AboutPage';

// 🟢 dev·prod 환경에 따라 basename 분기
const base =
  process.env.NODE_ENV === 'production' ? '/my-react-blog' : '/';

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => setPosts(initialPosts), []);

  return (
    <Router basename={base}>
      <Layout>
        <Routes>
          {/* 홈 */}
          <Route path="/" element={<PostList posts={posts} />} />

          {/* 상세 글 */}
          <Route path="/post/:id" element={<PostDetail posts={posts} />} />

          {/* 소개  ←★ 추가 */}
          <Route path="/about" element={<AboutPage />} />

          {/* 지갑 */}
          <Route path="/wallet" element={<KaiaWallet />} />

          {/* (GitHub Pages 루트 직접 입력 대비) */}
          <Route path="/my-react-blog" element={<PostList posts={posts} />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;