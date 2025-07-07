import React from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { initialPosts } from "../data";
import ContractInfo from "../components/ContractInfo";
import "../components/PostDetail.css"
import KaiaWallet from "../pages/KaiaWallet";        
import type { Post } from "../types/Post";

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

  // 🔸 스마트 컨트랙트 상세
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

  // 🔸 KaiaWallet 데모 + 설명 같이 출력
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
            background: "#7ee3ff",
            padding: "0.7rem 2rem",
            borderRadius: "6px",
            color: "#000",
          }}
        >
          목록으로 돌아가기
        </Link>
      </main>
    );
  }

  // 🔸 일반 마크다운 게시글
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>{post.title}</h1>
      <p style={{ color: "#999", fontSize: "0.9rem" }}>
        {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
      </p>
      <div className="markdown">
      <ReactMarkdown >{post.content}</ReactMarkdown>
      </div>
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
};

export default PostDetail;
