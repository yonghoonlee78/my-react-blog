import React from 'react';
import './AboutPage.css';

const AboutPage: React.FC = () => {
  return (
    <div className="about-page-container">
      <h1 className="about-page-title">소개 페이지</h1>
      <p>
        이 블로그는 React와 TypeScript를 사용하여 구축되었습니다.
        GitHub Pages를 통해 배포되었으며, 기본적인 게시물 관리 및
        라우팅 기능을 포함하고 있습니다.
      </p>
      <p>
        개발 경험을 공유하고 학습한 내용을 정리하기 위해 만들었습니다.
        프론트엔드 개발, 특히 React와 TypeScript에 대한 관심이 많습니다.
      </p>
      <p>
        블로그에 대한 피드백이나 질문이 있다면 언제든지 문의해주세요!
      </p>
      <div className="contact-info">
        <h3>연락처</h3>
        <p>이메일: yhttt1@naver.com</p> 
        <p>GitHub: <a href="https://github.com/yonghoonlee78" target="_blank" rel="noopener noreferrer">yonghoonlee78</a></p> 
      </div>
    </div>
  );
};

export default AboutPage;