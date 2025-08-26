import GameTokenMinter from './GameTokenMinter';
import GameInventory from './GameInventory';
import TokenTransfer from './TokenTransfer';
import ApprovalManager from './ApprovalManager';

export default function ERC1155Page() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1 style={{ 
        color: "#00d8ff", 
        textAlign: "center", 
        marginBottom: "3rem",
        fontSize: "2.5rem"
      }}>
        🎮 ERC-1155 게임 토큰 대시보드
      </h1>
      
      <GameTokenMinter />
      <div style={{ margin: "3rem 0" }} />
      
      <GameInventory />
      <div style={{ margin: "3rem 0" }} />
      
      <TokenTransfer />
      <div style={{ margin: "3rem 0" }} />
      
      <ApprovalManager />
    </div>
  );
}
