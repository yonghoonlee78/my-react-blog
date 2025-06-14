import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="blog-title">My React Blog</h1>
        <p className="blog-description">개발, 일상, 그리고 잡다한 이야기</p>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li><Link to="/" className="nav-link">홈</Link></li>
          <li><Link to="/about" className="nav-link">소개</Link></li>
          {/* 추가 메뉴는 나중에 필요에 따라 여기에 추가할 수 있습니다. */}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <p>&copy; 2025 Yonghoon Lee</p>
      </div>
    </aside>
  );
};

export default Sidebar;