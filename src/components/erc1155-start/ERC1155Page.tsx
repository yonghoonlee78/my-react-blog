import ERC1155MintForm from "../erc1155-start/ERC1155MintForm";
import BalanceOfBatchSection from "../erc1155-start/BalanceOfBatchSection";
import ERC1155MintAndBalance from "../erc1155-start/ERC1155MintAndBalance";
import ERC1155TransferAndBalance from "../erc1155-start/ERC1155TransferAndBalance";
import BatchTransferSection from "../erc1155-start/BatchTransferSection";
import SafeBatchTransferSection from "../erc1155-start/SafeBatchTransferSection";
import ApprovalSection from "../erc1155-start/ApprovalSection";
import ERC1155EventListener from "../erc1155-start/ERC1155EventListener";

export default function ERC1155Page() {
  return (
    <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", color: "#00d8ff", marginBottom: "2rem" }}>
        🌈 ERC-1155 멀티토큰 실습 대시보드
      </h1>

      <div style={{ display: "grid", gap: "2.5rem" }}>
        {/* 🪙 민팅 컴포넌트 */}
        <section style={sectionStyle}>
          <h2 style={titleStyle}>🪙 기본 Mint Form</h2>
          <ERC1155MintForm />
        </section>

        {/* 🪙 민팅 + balance 확인 */}
        <section style={sectionStyle}>
          <h2 style={titleStyle}>🧩 민팅 + 잔액 즉시 확인</h2>
          <ERC1155MintAndBalance />
        </section>

        {/* 💰 잔액 조회 */}
        <section style={sectionStyle}>
          <h2 style={titleStyle}>📊 배치 잔액 조회</h2>
          <BalanceOfBatchSection />
        </section>

        {/* 🚚 전송 + 잔액 확인 */}
        <section style={sectionStyle}>
          <h2 style={titleStyle}>🚚 전송 + 잔액 확인</h2>
          <ERC1155TransferAndBalance />
        </section>

        {/* ✉️ 사용자 정의 배치 전송 */}
        <section style={sectionStyle}>
          <h2 style={titleStyle}>📦 Batch Transfer (직접 지정)</h2>
          <BatchTransferSection />
        </section>

        {/* 🧷 안전한 권한 기반 전송 */}
        <section style={sectionStyle}>
          <h2 style={titleStyle}>🤝 Safe Batch Transfer (권한 위임 필요)</h2>
          <SafeBatchTransferSection />
        </section>

        {/* 🔐 권한 위임 */}
        <section style={sectionStyle}>
          <h2 style={titleStyle}>🔐 권한 위임 & 상태 확인</h2>
          <ApprovalSection />
        </section>

        {/* 🔔 이벤트 리스너 */}
        <section style={{ ...sectionStyle, background: "#2b2b2b" }}>
          <h2 style={titleStyle}>🔔 실시간 이벤트 로그</h2>
          <ERC1155EventListener />
        </section>
      </div>
    </div>
  );
}

// 🎨 스타일 설정 분리 (깔끔한 공통섹션 스타일)
const sectionStyle = {
  background: "#23272f",
  borderRadius: "10px",
  padding: "2rem",
};

const titleStyle = {
  color: "#00e6ff",
  marginBottom: "1rem",
};
