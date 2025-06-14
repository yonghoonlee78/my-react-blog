import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; 
import { Post } from '../types/Post'; 
import './PostDetail.css';

interface PostDetailProps {
  posts: Post[];
}

const PostDetail: React.FC<PostDetailProps> = ({ posts }) => {
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | undefined>(undefined);

  useEffect(() => {
   
    const foundPost = posts.find(p => p.id === id);
    setPost(foundPost);

   
    if (!foundPost) {
      navigate('/404');
    }
  }, [id, posts, navigate]);

  if (!post) {
    return <div className="post-detail-loading">게시물을 불러오는 중...</div>; // 
  }

  return (
    <div className="post-detail-container">
      <h1 className="post-detail-title">{post.title}</h1>
      <p className="post-detail-meta">
        {post.date} | {post.category} | 태그: {post.tags.join(', ')}
      </p>
      <div className="post-content">
        <ReactMarkdown>{post.content}</ReactMarkdown> 
      </div>
      <button onClick={() => navigate('/')} className="back-button">
        목록으로 돌아가기
      </button>
    </div>
  );
};

export default PostDetail;