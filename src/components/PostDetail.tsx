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
import NFTTransfer from "../components/NFTTransfer";
import NFTEventListener from "./NFTEventListener";
import NFTQuery from "../components/NFTQuery";
import WalletDashboard from "./WalletDashboard";
import UpgradeUIcontact from "../components/UpgradeUIcontract";
import BettingGame from "../components/BettingGame";
import Web3Profile from "../components/Web3Profile";
import ERC1155MintForm from "./erc1155-start/ERC1155MintForm";
import BalanceOfBatchSection from "./erc1155-start/BalanceOfBatchSection";
import ERC1155MintAndBalance from "./erc1155-start/ERC1155MintAndBalance";
import ERC1155TransferAndBalance from "./erc1155-start/ERC1155TransferAndBalance";
import BatchTransferSection from "./erc1155-start/BatchTransferSection";
import SafeBatchTransferSection from "./erc1155-start/SafeBatchTransferSection";
import ApprovalSection from "./erc1155-start/ApprovalSection";
import ERC1155EventListener from "./erc1155-start/ERC1155EventListener";
import ERC1155Page from "../components/erc1155-start/ERC1155Page";
import ERC2612Demo from "./erc2612-demo"; 
import ERC2771Demo from "./erc2771-demo";
import MiniMiner from "./MiniMiner";




const userAddress = "0xf3a9d84E06363a251bE733E8F2bFCa1849b3c512"

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

  if (post.type === "nft-transfer") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>🖼️ {post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <div style={{ margin: "2rem 0" }}>
          <NFTTransfer />
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
  }
  if (!post) {
    return (
      <main style={{ padding: '2rem', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h1>게시물을 찾을 수 없습니다.</h1>
        <div style={{ marginTop: '2rem' }}>
          <Link to="/" style={{
            background: "#7ee3ff",
            padding: "0.7rem 2rem",
            borderRadius: "6px",
            color: "#000",
          }}>목록으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  if (post.id === "sepolia-nft-listener") { 
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <div style={{ margin: "2rem 0" }}>
          {/* NFTEventListener 컴포넌트 렌더링 */}
          <NFTEventListener/>
        </div>
        <div style={{ marginTop: "2rem" }}>
          <Link to="/" style={{
            background: "#7ee3ff",
            padding: "0.7rem 2rem",
            borderRadius: "6px",
            color: "#000",
          }}>목록으로 돌아가기</Link>
        </div>
      </main>
    );
  }
  
  if (post.type === "wallet-dashboard" || post.id === "wallet-dashboard") {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <ReactMarkdown>{post.content}</ReactMarkdown>
        <div style={{ margin: "2rem 0" }}>
          <WalletDashboard />
        </div>
        <div style={{ marginTop: "2rem" }}>
          <Link to="/" style={{
            background: "#7ee3ff",
            padding: "0.7rem 2rem",
            borderRadius: "6px",
            color: "#000",
          }}>목록으로 돌아가기</Link>
        </div>
      </main>
    );
  }


  if (post.id === "upgradeable-contract-manager") {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>

        {/* --- 이 부분을 추가하세요 --- */}
        <p style={{ color: '#ffc107', marginTop: '-10px', marginBottom: '20px', fontSize: '0.9em', fontStyle: 'italic' }}>
          필수 : 메타마스크 -&gt; Owner 0xf3a9d84E06363a251bE733E8F2bFCa1849b3c512
        </p>

        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        
        <div style={{ margin: "2rem 0", border: "1px solid #444", padding: "20px", borderRadius: "8px" }}>
          <UpgradeUIcontact /> {/* 이전에 수정한 컴포넌트 이름 */}
        </div>

        <div className="center-btn-container">
          <Link to="/" className="back-button">
            목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (post.id === "token-bet-mini-game" || post.type === "betting-game") {
    return (
      <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
        <h1>{post.title}</h1>
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
        </p>
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
        <div style={{ margin: "2rem 0" }}>
          <BettingGame />
        </div>
        <div style={{ marginTop: "2rem" }}>
          <Link to="/" className="back-button">목록으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  if (post.id === "web3-profile") {
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>{post.title}</h1>
      <p style={{ color: "#999", fontSize: "0.9rem" }}>
        {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
      </p>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {post.content}
      </ReactMarkdown>

      <div style={{ margin: "2rem 0" }}>
        <Web3Profile />
      </div>

      <div className="center-btn-container">
        <Link to="/" className="back-button">
          목록으로 돌아가기
        </Link>
      </div>
    </main>
  );
}

if (post.id === "erc1155-all-assets-dashboard") {
  return (
    <main style={{ padding: "2rem" }}>
      <ERC1155Page />
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <Link to="/" className="back-button">← 목록으로</Link>
      </div>
    </main>
  );
}

if (post.id === "erc2612-sepolia-permit-demo") {
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>{post.title}</h1>
      <p style={{ color: "#999", fontSize: "0.9rem" }}>
        {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
      </p>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {post.content}
      </ReactMarkdown>
      <div style={{ margin: "2rem 0" }}>
      <ERC2612Demo />
      </div>
      <Link to="/" className="back-button">목록으로 돌아가기</Link>
    </main>
  );
}


if (post.id === "erc2771-meta-tx-demo") {
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>{post.title}</h1>
      <p style={{ color: "#999", fontSize: "0.9rem" }}>
        {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
      </p>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {post.content}
      </ReactMarkdown>
      <div style={{ margin: "2rem 0" }}>
      <ERC2771Demo />
      </div>
      <Link to="/" className="back-button">목록으로 돌아가기</Link>
    </main>
  );
}

if (post.id === "mini-pow-miner-demo") {
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>{post.title}</h1>
      <p style={{ color: "#999", fontSize: "0.9rem" }}>
        {post.date} | {post.category} | 태그: {post.tags?.join(", ")}
      </p>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {post.content}
      </ReactMarkdown>
      <div style={{ margin: "3rem 0" }}>
        <MiniMiner />
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
