import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types/Post';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <Link
  to={post.route ?? `/blog/${post.id}`}   // 🟢 route 있으면 그대로, 없으면 /blog/:id
  className="post-link"
>
      <div className="post-card-content">
        <h3>{post.title}</h3>
        <p>{post.date} | {post.category}</p>
        <div className="tags">
          {post.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default PostCard;