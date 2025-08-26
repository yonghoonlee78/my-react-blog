import React from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { initialPosts } from "../data";

// 컴포넌트 import
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



import "../components/PostDetail.css";

const userAddress = "0xf3a9d84E06363a251bE733E8F2bFCa1849b3c512";

const PostDetail: React.FC = () => {
  const { id } = useParams();
  const post = initialPosts.find((p) => p.id === id);

  if (!post) {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h1>❌ 글을 찾을 수 없습니다.</h1>
        <Link to="/" className="back-button">← 목록으로 돌아가기</Link>
      </main>
    );
  }

  // 각 게시물 타입/ID별 상세 UI 렌더링
  if (post.type === "contract-info") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>🚀 스마트 컨트랙트 배포 정보</h1>
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
      <main style={{ padding: 0 }}> {/* padding 제거 */}
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


  // 기본 마크다운 렌더링
  return (
    <main className="post-container">
      <h1>{post.title}</h1>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {post.content}
      </ReactMarkdown>
      <Link to="/" className="back-button">목록으로 돌아가기</Link>
    </main>
  );
};

export default PostDetail;
