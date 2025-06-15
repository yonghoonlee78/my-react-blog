import React from 'react';
import { useParams } from 'react-router-dom';
import { posts } from '../data/posts';

const PostDetail: React.FC = () => {
  const { id } = useParams();
  const post = posts.find(p => p.id === id);
  if (!post) return <p>글을 찾을 수 없습니다.</p>;

  return (
    <main style={{ padding: '2rem' }}>
      <h1>{post.title}</h1>
      <article>
        
        <pre>{post.content}</pre>
      </article>
    </main>
  );
};
export default PostDetail;
