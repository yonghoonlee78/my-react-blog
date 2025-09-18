import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { initialPosts } from "../data";
import { getPostById } from "../utils/blogApi";
import { Post } from "../types/Post";

// 컴포넌트 import들 - 기존과 동일
import ContractInfo from "../components/ContractInfo";
import KaiaWallet from "../pages/KaiaWallet";
import KaiaMnemonicWallet from "../pages/MnemonicWallet";
import KaiaExplorer from "../components/SearchBar";
import NFTExplorer from "./NFTExplorer";
import NFTTransfer from "../components/NFTTransfer";
import NFTEventListener from "./NFTEventListener";
import WalletDashboard from "./WalletDashboard";
import UpgradeUIcontact from "../components/UpgradeUIcontract";
import BettingGame from "../components/BettingGame";
import Web3Profile from "../components/Web3Profile";
import ERC1155Page from "./erc1155-start/ERC1155Page";
import MiniMiner from "./MiniMiner";
import ERC2612_2771Demo from "../components/ERC2612_2771Demo";
import StakingDashboard from "../components/StakingDashboard";
import SimpleDEX from "../components/SimpleDEX";
import NFTMarketplace from "../components/NFTMarketplace";
import VolatilityPrediction from "../components/VolatilityPrediction";


import "../components/PostDetail.css";

const userAddress = "0xf3a9d84E06363a251bE733E8F2bFCa1849b3c512";

const PostDetail: React.FC = () => {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) {
        setError('Post ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 1. 먼저 Supabase에서 찾기 시도
        const supabasePost = await getPostById(id);
        
        if (supabasePost) {
          setPost(supabasePost);
        } else {
          // 2. Supabase에서 못 찾으면 기존 initialPosts에서 찾기 (Web3 컴포넌트용)
          const localPost = initialPosts.find((p) => p.id === id);
          if (localPost) {
            setPost(localPost);
          } else {
            setError('게시물을 찾을 수 없습니다.');
          }
        }
      } catch (err) {
        console.error('포스트 로딩 실패:', err);
        // 에러 발생시에도 로컬 데이터에서 찾기 시도
        const localPost = initialPosts.find((p) => p.id === id);
        if (localPost) {
          setPost(localPost);
        } else {
          setError('게시물을 불러오는데 실패했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  // 로딩 상태
  if (loading) {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <p>게시물을 불러오는 중...</p>
      </main>
    );
  }

  // 에러 또는 포스트 없음
  if (error || !post) {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h1>게시물을 찾을 수 없습니다.</h1>
        <p>{error}</p>
        <Link to="/" className="back-button">← 목록으로 돌아가기</Link>
      </main>
    );
  }

  // 기존 Web3 컴포넌트별 분기 처리 - 그대로 유지
  if (post.type === "contract-info") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>스마트 컨트랙트 배포 정보</h1>
        <ContractInfo />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "kaia-wallet") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <KaiaWallet />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "kaia-mnemonic-wallet") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <KaiaMnemonicWallet />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "explorer") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <KaiaExplorer />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.type === "nft-explorer") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <NFTExplorer />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.type === "nft-transfer") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <NFTTransfer />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "sepolia-nft-listener") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <NFTEventListener />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "wallet-dashboard") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <WalletDashboard />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "upgradeable-contract-manager") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <p style={{ color: '#ffc107', fontStyle: 'italic' }}>
          필수: 메타마스크 → Owner {userAddress}
        </p>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <UpgradeUIcontact />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "token-bet-mini-game") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <BettingGame />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "web3-profile") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <Web3Profile />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "erc1155-all-assets-dashboard") {
    return (
      <main style={{ padding: "2rem" }}>
        <ERC1155Page />
        <Link to="/" className="back-button">← 목록으로</Link>
      </main>
    );
  }

  if (post.id === "mini-pow-miner-demo") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <MiniMiner />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "erc2612-2771-unified-demo") {
    return (
      <main style={{ padding: 0 }}>
        <ERC2612_2771Demo />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Link to="/" className="back-button">목록으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  if (post.id === "sepolia-staking-service") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <StakingDashboard />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "simple-dex-sepolia") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <SimpleDEX />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "nft-marketplace-dragons") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <NFTMarketplace />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  if (post.id === "bitcoin-volatility-prediction") {
    return (
      <main className="post-container">
        <h1>{post.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <VolatilityPrediction />
        <Link to="/" className="back-button">목록으로 돌아가기</Link>
      </main>
    );
  }

  // 기본 마크다운 렌더링 (새로운 Supabase 포스트들이 여기에 해당)
  return (
    <main className="post-container">
      <h1>{post.title}</h1>
      <p className="post-meta">{post.date} | {post.category}</p>
      <div className="post-tags">
        {post.tags?.map(tag => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {post.content}
      </ReactMarkdown>
      <Link to="/" className="back-button">목록으로 돌아가기</Link>
    </main>
  );
};

export default PostDetail;