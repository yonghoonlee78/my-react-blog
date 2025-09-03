import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types/Post';
import { getAllPosts } from '../utils/blogApi';
import { initialPosts } from '../data';
import './PostList.css';

const PostList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // 하이브리드 방식: Supabase + 기존 데이터 합치기
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        // 1. Supabase에서 새로운 포스트 가져오기
        const supabasePosts = await getAllPosts();
        
        // 2. 기존 initialPosts와 합치기 (중복 제거)
        const existingIds = supabasePosts.map(post => post.id);
        const localPosts = initialPosts.filter(post => !existingIds.includes(post.id));
        
        // 3. 합친 데이터 (Supabase 포스트가 우선, 그 다음 로컬 포스트)
        const combinedPosts = [...supabasePosts, ...localPosts];
        
        // 4. 날짜순 정렬
        combinedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setPosts(combinedPosts);
        setError(null);
      } catch (err) {
        console.error('포스트 로딩 실패:', err);
        
        // Supabase 실패시 기존 데이터라도 보여주기
        setPosts(initialPosts);
        setError('새로운 포스트를 불러오는데 실패했습니다. 기존 포스트만 표시됩니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 필터링 로직
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? post.category === selectedCategory : true;
    const matchesTag = selectedTag ? post.tags.includes(selectedTag) : true;
    return matchesSearch && matchesCategory && matchesTag;
  });

  // 카테고리와 태그 목록 생성
  const categories = Array.from(new Set(posts.map(post => post.category)));
  const tags = Array.from(new Set(posts.flatMap(post => post.tags)));

  // 로딩 상태
  if (loading) {
    return (
      <div className="post-list-container">
        <h2 className="page-title">모든 게시물</h2>
        <div className="loading">
          <p>게시물을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="post-list-container">
      <h2 className="page-title">모든 게시물</h2>
      
      {/* 에러 메시지 (있을 경우만 표시) */}
      {error && (
        <div className="error-notice">
          <p>{error}</p>
        </div>
      )}
      
      <div className="filters">
        <input
          type="text"
          placeholder="게시물 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedTag('');
          }}
          className="filter-select"
        >
          <option value="">모든 카테고리</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          value={selectedTag}
          onChange={(e) => {
            setSelectedTag(e.target.value);
            setSelectedCategory('');
          }}
          className="filter-select"
        >
          <option value="">모든 태그</option>
          {tags.map(tag => (
            <option key={tag} value={tag}>#{tag}</option>
          ))}
        </select>
      </div>

      <div className="post-grid">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <div key={post.id} className="post-card">
              <Link to={`/post/${post.id}`} className="post-link">
                <h3>{post.title}</h3>
                <p className="post-meta">{post.date} | {post.category}</p>
                <div className="post-tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </Link>
            </div>
          ))
        ) : (
          <p className="no-posts">
            {posts.length === 0 ? '게시물이 없습니다.' : '검색 결과가 없습니다.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default PostList;