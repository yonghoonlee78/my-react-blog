import React from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { initialPosts } from "../data";
import ContractInfo from "../components/ContractInfo";
import KaiaWallet from "../pages/KaiaWallet";
import "../components/PostDetail.css"
import KaiaMnemonicWallet from "../pages/MnemonicWallet";
import KaiaExplorer from "../components/SearchBar";
import NFTExplorer from "./NFTExplorer";


const PostDetail: React.FC = () => {
  const { id } = useParams();
  const post = initialPosts.find((p) => p.id === id);

  if (!post)
    return (
      <main style={{ padding: "2rem" }}>
        <h1>❌ 글을 찾을 수 없습니다.</h1>
        <Link to="/" style={{ marginTop: "1rem", display: "inline-block" }}>
          ← 목록으로 돌아가기
        </Link>
      </main>
    );

  if (post.type === "contract-info") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>🚀 스마트 컨트랙트 배포 정보</h1>
        <ContractInfo />
        <div style={{ marginTop: "2rem" }}>
          <Link
            to="/"
            style={{
              background: "#7ee3ff",
              padding: "0.7rem 2rem",
              borderRadius: "6px",
              color: "#000",
            }}
          >
            목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (post.id === "kaia-wallet") {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <div style={{ margin: "3rem 0" }}>
          <KaiaWallet />
        </div>
        <Link
          to="/"
          style={{
              background: "slateblue",
              color: "#181818",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "150px",
              height: "64px",
              margin: "48px auto 0 auto",
              border: "none",
              borderRadius: "13px",
              fontSize: "1em",
              fontWeight: "1000",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(100,150,180,0.13)",
              transition: "background 0.22s, color 0.22s",
              textDecoration: "none",
              textAlign: "center",
            
          }}
        >
          목록으로 돌아가기
        </Link>
      </main>
    );
  }

  if (post.id === "kaia-mnemonic-wallet") {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        
        <div style={{ paddingLeft: '20rem' }}>
  <ReactMarkdown>{post.content}</ReactMarkdown>
</div>
        <div style={{ margin: "2rem 0" }}>
          <KaiaMnemonicWallet />
        </div>
        <Link
          to="/"
          className="back-button"
        >
          목록으로 돌아가기
        </Link>
      </main>
    );
  }

  if (post.id === "explorer") {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <ReactMarkdown>{post.content}</ReactMarkdown>
  
        {/* 여기 Explorer 실제 UI 붙이기! */}
        <div style={{ margin: "3rem 0" }}>
          <KaiaExplorer />
        </div>
        <Link to="/" className="back-button">
          목록으로 돌아가기
        </Link>
      </main>
    );
  }

  if (post.type === "nft-explorer") {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <div style={{ margin: "3rem 0" }}>
          <NFTExplorer />
        </div>
        <Link to="/" className="back-button">
          목록으로 돌아가기
        </Link>
      </main>
    );
  }
  
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>{post.title}</h1>
      <p style={{ color: "#999", fontSize: "0.9rem" }}>
        {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
      </p>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
       {post.content}
       </ReactMarkdown>
       <div className="center-btn-container">
  <Link to="/" className="back-button">
    목록으로 돌아가기
  </Link>
</div>
      
    </main>
  );
};

export default PostDetail;
