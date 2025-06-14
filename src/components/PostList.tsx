import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types/Post'; 
import './PostList.css';

interface PostListProps {
  posts: Post[];
}

const PostList: React.FC<PostListProps> = ({ posts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState(''); // 초기값 수정

  
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? post.category === selectedCategory : true;
    const matchesTag = selectedTag ? post.tags.includes(selectedTag) : true;
    return matchesSearch && matchesCategory && matchesTag;
  });

 
  const categories = Array.from(new Set(posts.map(post => post.category)));
  const tags = Array.from(new Set(posts.flatMap(post => post.tags)));

  return (
    <div className="post-list-container">
      <h2 className="page-title">모든 게시물</h2>
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
              <Link to={post.route ?? `/post/${post.id}`} className="post-link">
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
          <p className="no-posts">게시물이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default PostList; 