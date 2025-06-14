import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css'; 

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <h1 className="not-found-title">404</h1>
      <p className="not-found-message">페이지를 찾을 수 없습니다.</p>
      <p className="not-found-description">요청하신 페이지가 존재하지 않거나, 주소가 잘못되었습니다.</p>
      <Link to="/" className="not-found-home-link">홈으로 돌아가기</Link>
    </div>
  );
};

export default NotFoundPage; 