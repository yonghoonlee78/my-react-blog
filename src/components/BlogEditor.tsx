import React, { useState, useEffect } from 'react';
import { createPost, updatePost } from '../utils/blogApi';
import { Post } from '../types/Post';
import './BlogEditor.css';

interface BlogEditorProps {
  post?: Post | null;
  onClose: () => void;
  categories: string[];
  tags: string[];
}

const BlogEditor: React.FC<BlogEditorProps> = ({ post, onClose, categories, tags }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[],
    route: '',
    type: '',
    contractAddress: ''
  });
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // 편집 모드인 경우 기존 데이터 로드
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        category: post.category || '',
        tags: post.tags || [],
        route: post.route || '',
        type: post.type || '',
        contractAddress: post.contractAddress || ''
      });
    }
  }, [post]);

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 태그 추가
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // 태그 제거
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 기존 태그에서 선택
  const selectExistingTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.category.trim()) {
      alert('제목, 내용, 카테고리는 필수입니다.');
      return;
    }

    setLoading(true);
    
    try {
      const postData = {
        ...formData,
        date: post ? post.date : new Date().toISOString()
      };

      if (post) {
        // 수정
        const updatedPost = await updatePost(post.id, postData);
        if (updatedPost) {
          alert('게시물이 수정되었습니다.');
          onClose();
        } else {
          alert('수정에 실패했습니다.');
        }
      } else {
        // 새 글 작성
        const newPost = await createPost(postData);
        if (newPost) {
          alert('게시물이 작성되었습니다.');
          onClose();
        } else {
          alert('작성에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editor-container">
      <header className="editor-header">
        <h1>{post ? '게시물 수정' : '새 게시물 작성'}</h1>
        <button onClick={onClose} className="btn-close">
          취소
        </button>
      </header>

      <form onSubmit={handleSubmit} className="editor-form">
        {/* 제목 */}
        <div className="form-group">
          <label htmlFor="title">제목 *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="게시물 제목을 입력하세요"
            required
          />
        </div>

        {/* 카테고리 */}
        <div className="form-group">
  <label htmlFor="category">카테고리 *</label>
  <div className="category-input">
    <select
      id="category"
      name="category"
      value={formData.category}
      onChange={handleChange}
    >
      <option value="">카테고리 선택</option>
      {categories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
    <span className="or">또는</span>
    <input
      type="text"
      name="category"
      value={formData.category}
      onChange={handleChange}
      placeholder="새 카테고리 입력"
    />
  </div>
</div>

        {/* 태그 */}
        <div className="form-group">
          <label>태그</label>
          <div className="tag-input-section">
            <div className="tag-input">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="태그 입력 후 Enter 또는 추가 버튼"
              />
              <button type="button" onClick={addTag}>추가</button>
            </div>
            
            {/* 기존 태그 선택 */}
            {tags.length > 0 && (
              <div className="existing-tags">
                <p>기존 태그:</p>
                <div className="tag-buttons">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => selectExistingTag(tag)}
                      className={`tag-btn ${formData.tags.includes(tag) ? 'selected' : ''}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 선택된 태그들 */}
            {formData.tags.length > 0 && (
              <div className="selected-tags">
                {formData.tags.map(tag => (
                  <span key={tag} className="tag-item">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 선택사항 필드들 */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="type">타입 (선택사항)</label>
            <input
              type="text"
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="예: tutorial, guide"
            />
          </div>
          <div className="form-group">
            <label htmlFor="route">라우트 (선택사항)</label>
            <input
              type="text"
              id="route"
              name="route"
              value={formData.route}
              onChange={handleChange}
              placeholder="예: /custom-path"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="contractAddress">컨트랙트 주소 (선택사항)</label>
          <input
            type="text"
            id="contractAddress"
            name="contractAddress"
            value={formData.contractAddress}
            onChange={handleChange}
            placeholder="0x..."
          />
        </div>

        {/* 내용 */}
        <div className="form-group">
          <label htmlFor="content">내용 *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="마크다운 형식으로 작성하세요..."
            rows={20}
            required
          />
          <small className="help-text">
            마크다운 문법을 사용할 수 있습니다. 예: **굵게**, *기울임*, `코드`, ```코드블록```
          </small>
        </div>

        {/* 제출 버튼 */}
        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            취소
          </button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? '저장 중...' : (post ? '수정하기' : '작성하기')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogEditor;