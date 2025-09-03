import React, { useState, useEffect } from 'react';
import { getAllPosts, deletePost, getCategories, getTags } from '../utils/blogApi';
import { Post } from '../types/Post';
import BlogEditor from './BlogEditor';
import './AdminPage.css';

const AdminPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // 포스트 목록 새로고침
  const refreshPosts = async () => {
    try {
      const data = await getAllPosts();
      setPosts(data);
      const categoriesData = await getCategories();
      const tagsData = await getTags();
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('포스트 로딩 실패:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await refreshPosts();
      setLoading(false);
    };
    loadData();
  }, []);

  // 포스트 삭제
  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`"${title}" 게시물을 삭제하시겠습니까?`)) {
      const success = await deletePost(id);
      if (success) {
        alert('삭제되었습니다.');
        refreshPosts();
      } else {
        alert('삭제에 실패했습니다.');
      }
    }
  };

  // 편집 모드 진입
  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  // 새 글 작성
  const handleNewPost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };

  // 편집기 닫기
  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingPost(null);
    refreshPosts();
  };

  if (loading) {
    return (
      <div className="admin-container">
        <h1>관리자 페이지</h1>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="admin-container">
        <BlogEditor
          post={editingPost}
          onClose={handleCloseEditor}
          categories={categories}
          tags={tags}
        />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>블로그 관리자</h1>
        <button onClick={handleNewPost} className="btn-primary">
          새 글 작성
        </button>
      </header>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>{posts.length}</h3>
          <p>총 게시물</p>
        </div>
        <div className="stat-card">
          <h3>{categories.length}</h3>
          <p>카테고리</p>
        </div>
        <div className="stat-card">
          <h3>{tags.length}</h3>
          <p>태그</p>
        </div>
      </div>

      <div className="posts-table">
        <h2>게시물 목록</h2>
        {posts.length === 0 ? (
          <p className="empty-message">게시물이 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>카테고리</th>
                <th>태그</th>
                <th>날짜</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="title-cell">
                    <strong>{post.title}</strong>
                  </td>
                  <td>
                    <span className="category-badge">{post.category}</span>
                  </td>
                  <td>
                    <div className="tags-cell">
                      {post.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="tag-mini">#{tag}</span>
                      ))}
                      {post.tags.length > 2 && (
                        <span className="tag-more">+{post.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>{new Date(post.date).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button 
                      onClick={() => handleEdit(post)} 
                      className="btn-edit"
                    >
                      수정
                    </button>
                    <button 
                      onClick={() => handleDelete(post.id, post.title)} 
                      className="btn-delete"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminPage;