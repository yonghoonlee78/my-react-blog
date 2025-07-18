import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
// Alchemy SDK 임포트: Network enum도 함께 임포트
import { Alchemy, Network } from "alchemy-sdk"; 

declare global {
  interface Window {
    ethereum?: any;
  }
}

type NetworkConfig = {
  key: string;
  name: string;
  rpc: string;
  etherscan: string; // Etherscan API base URL
  symbol: string;
  // Alchemy 설정에 사용할 네트워크 문자열 (Network enum과 일치하도록)
  alchemyNetworkString: Network; // Network enum 타입으로 변경
};

type ERC20 = {
  name: string;
  symbol: string;
  decimals: string;
  contractAddress: string;
  balance: string;
};

const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY; 

const NETWORKS: NetworkConfig[] = [
  {
    key: "sepolia",
    name: "Sepolia Testnet",
    rpc: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    etherscan: "https://api-sepolia.etherscan.io/api",
    symbol: "SepoliaETH",
    alchemyNetworkString: Network.ETH_SEPOLIA, // Network enum 사용
  },
  // 다른 네트워크를 추가할 경우, 해당 네트워크의 Alchemy Network enum도 추가
  // {
  //   key: "mumbai",
  //   name: "Polygon Mumbai Testnet",
  //   rpc: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.REACT_APP_MUMBAI_ALCHEMY_API_KEY}`,
  //   etherscan: "https://api-mumbai.polygonscan.com/api",
  //   symbol: "MATIC",
  //   alchemyNetworkString: Network.MATIC_MUMBAI,
  // },
];

const ETHERSCAN_API_KEY = "35KWFDPV3IEQ3JG8D261RHQJKR4D48VH9H"; 

const WalletDashboard: React.FC = () => {
  const [network, setNetwork] = useState<NetworkConfig>(NETWORKS[0]); 
  const [address, setAddress] = useState<string>("");
  const [nativeBalance, setNativeBalance] = useState<string>("");
  const [erc20s, setERC20s] = useState<ERC20[]>([]);
  const [nfts, setNFTs] = useState<any[]>([]); 
  const [loading, setLoading] = useState<boolean>(false);
  const [transferRecipient, setTransferRecipient] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferTokenAddress, setTransferTokenAddress] = useState<string>("");
  const [transferTokenId, setTransferTokenId] = useState<string>("");
  const [transferFeedback, setTransferFeedback] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState<boolean>(false);

  // Alchemy 클라이언트 초기화 (settings 객체를 인자로 받음)
  const alchemy = React.useMemo(() => {
    if (!ALCHEMY_API_KEY) {
      console.error("ALCHEMY_API_KEY is not set.");
      // API 키가 없으면 더미 Alchemy 인스턴스를 반환하여 오류 방지
      // 이 경우 네트워크는 의미 없지만, 타입 오류를 피하기 위해 적절한 Network enum 값을 제공
      return new Alchemy({ apiKey: "dummy", network: Network.ETH_MAINNET }); 
    }
    return new Alchemy({
      apiKey: ALCHEMY_API_KEY,
      network: network.alchemyNetworkString, // Network enum 타입으로 직접 전달
    });
  }, [network.alchemyNetworkString]); // network.alchemyNetworkString이 변경될 때만 재생성

  // 메타마스크 연결
  const connectMetaMask = async () => {
    if (window.ethereum) {
      try {
        const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAddress(accounts[0]);
      } catch (err: any) {
        alert(`메타마스크 연결 실패: ${err.message || err}`);
      }
    } else {
      alert("메타마스크가 설치되어 있지 않습니다. https://metamask.io/ 에서 설치해주세요.");
    }
  };

  // 네이티브 잔액 조회
  const fetchNativeBalance = async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const balance = await provider.getBalance(addr);
      setNativeBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("네이티브 잔액 조회 실패:", err);
      setNativeBalance("조회 실패");
    }
  };

  // ERC-20 토큰 자동 탐색 및 잔액 조회 (Etherscan API)
  const fetchERC20Tokens = async (addr: string) => {
    try {
      const url = `${network.etherscan}?module=account&action=tokentx&address=${addr}&page=1&offset=100&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.result) {
        setERC20s([]);
        return;
      }

      const tokensMap: Map<string, Omit<ERC20, "balance">> = new Map();
      (data.result as any[]).forEach((tx) => {
        if (!tokensMap.has(tx.contractAddress)) {
          tokensMap.set(tx.contractAddress, {
            name: tx.tokenName,
            symbol: tx.tokenSymbol,
            decimals: tx.tokenDecimal,
            contractAddress: tx.contractAddress,
          });
        }
      });

      const balances: ERC20[] = await Promise.all(
        Array.from(tokensMap.values()).map(async (tokenInfo) => {
          const balUrl = `${network.etherscan}?module=account&action=tokenbalance&contractaddress=${tokenInfo.contractAddress}&address=${addr}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
          const balRes = await fetch(balUrl);
          const balData = await balRes.json();
          const balance = balData.result && balData.result !== '0' ? ethers.formatUnits(balData.result, tokenInfo.decimals) : "0.0";
          return {
            ...tokenInfo,
            balance: balance,
          };
        })
      );
      setERC20s(balances);
    } catch (err) {
      console.error("ERC-20 토큰 조회 실패:", err);
      setERC20s([]);
    }
  };

  // NFT 자동조회 (Alchemy SDK 사용)
  const fetchNFTs = async (addr: string) => {
    setNFTs([]); 
    if (!ALCHEMY_API_KEY) {
      console.warn("ALCHEMY_API_KEY가 설정되지 않아 NFT 조회를 건너뜁니다.");
      return;
    }
    try {
      const nftsResponse = await alchemy.nft.getNftsForOwner(addr);
      
      const formattedNfts = nftsResponse.ownedNfts.map((nft: any) => { // nft 매개변수를 any로 캐스팅하여 타입 오류 회피
        let imageUrl = nft.image?.originalUrl || nft.image?.cachedUrl || nft.image?.thumbnailUrl;
        
        if (!imageUrl && nft.raw?.metadata?.image) { // raw.metadata에서 직접 image 가져오기
            imageUrl = nft.raw.metadata.image;
        }

        if (imageUrl && imageUrl.startsWith('ipfs://')) {
          imageUrl = `https://ipfs.io/ipfs/${imageUrl.substring(7)}`; 
        }

        return {
          title: nft.title || nft.contract?.name || nft.raw?.metadata?.name || `NFT #${nft.tokenId}`, // title 속성이 없을 경우 폴백
          contract: { address: nft.contract.address },
          tokenId: nft.tokenId,
          imageUrl: imageUrl, 
        };
      });
      setNFTs(formattedNfts);
    } catch (err) {
      console.error("NFT 조회 실패 (Alchemy API):", err);
      setNFTs([]);
    }
  };

  // 전체 자산 조회
  const fetchAll = useCallback(async () => { // fetchAll도 useCallback으로 감싸서 최적화
    if (!ethers.isAddress(address)) {
      alert("올바른 지갑 주소를 입력하세요.");
      return;
    }
    setLoading(true);
    setERC20s([]);
    setNativeBalance("");
    setNFTs([]);
    
    await Promise.all([
      fetchNativeBalance(address),
      fetchERC20Tokens(address),
      fetchNFTs(address),
    ]);
    setLoading(false);
  }, [address, network, alchemy]); // fetchAll의 종속성도 명시

  // address 또는 network 변경 시 자동 조회 (useEffect 사용)
  useEffect(() => {
    if (address && ethers.isAddress(address)) {
      // alchemy 객체가 유효한지 확인: alchemy는 useMemo로 초기화되므로 null일 리 없지만,
      // API 키가 없으면 더미 객체이므로 실제 요청을 보내지 않도록 조건 추가
      if (ALCHEMY_API_KEY) { 
        fetchAll();
      } else {
        console.warn("Alchemy API Key가 설정되지 않아 NFT 및 일부 자산 조회가 제한됩니다.");
        setNFTs([]); // API 키 없으면 NFT 목록 비움
      }
    }
  }, [address, network, fetchAll]); // fetchAll을 종속성에 추가

  // --- 전송 기능 추가 ---

  // ETH 전송
  const sendNativeCoin = async () => {
    if (!address) { alert("먼저 지갑을 연결하세요."); return; }
    if (!ethers.isAddress(transferRecipient)) { alert("올바른 받는 주소를 입력하세요."); return; }
    if (isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) { alert("올바른 전송 금액을 입력하세요."); return; }

    setTransferLoading(true);
    setTransferFeedback("ETH 전송 중...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum); 
      const signer = await provider.getSigner(); 

      const tx = await signer.sendTransaction({
        to: transferRecipient,
        value: ethers.parseEther(transferAmount), 
      });

      await tx.wait(); 
      setTransferFeedback(`ETH 전송 성공! 트랜잭션 해시: ${tx.hash}`);
      alert("ETH 전송 성공!");
      await fetchAll(); 
    } catch (err: any) {
      setTransferFeedback(`ETH 전송 실패: ${err.message || err}`);
      alert(`ETH 전송 실패: ${err.message || err}`);
    } finally {
      setTransferLoading(false);
    }
  };

  // ERC-20 토큰 전송
  const sendERC20Token = async () => {
    if (!address) { alert("먼저 지갑을 연결하세요."); return; }
    if (!ethers.isAddress(transferRecipient)) { alert("올바른 받는 주소를 입력하세요."); return; }
    if (isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) { alert("올바른 전송 금액을 입력하세요."); return; }
    if (!ethers.isAddress(transferTokenAddress)) { alert("올바른 ERC-20 토큰 컨트랙트 주소를 입력하세요."); return; }

    setTransferLoading(true);
    setTransferFeedback("ERC-20 토큰 전송 중...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const erc20Abi = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)" 
      ];
      const tokenContract = new ethers.Contract(transferTokenAddress, erc20Abi, signer);

      const decimals = await tokenContract.decimals();
      const amountToSend = ethers.parseUnits(transferAmount, decimals);

      const tx = await tokenContract.transfer(transferRecipient, amountToSend);
      await tx.wait();
      setTransferFeedback(`ERC-20 토큰 전송 성공! 트랜잭션 해시: ${tx.hash}`);
      alert("ERC-20 토큰 전송 성공!");
      await fetchAll(); 
    } catch (err: any) {
      setTransferFeedback(`ERC-20 토큰 전송 실패: ${err.message || err}`);
      alert(`ERC-20 토큰 전송 실패: ${err.message || err}`);
    } finally {
      setTransferLoading(false);
    }
  };

  // ERC-721 NFT 전송
  const sendNFT = async () => {
    if (!address) { alert("먼저 지갑을 연결하세요."); return; }
    if (!ethers.isAddress(transferRecipient)) { alert("올바른 받는 주소를 입력하세요."); return; }
    if (!ethers.isAddress(transferTokenAddress)) { alert("올바른 NFT 컨트랙트 주소를 입력하세요."); return; }
    if (isNaN(Number(transferTokenId)) || Number(transferTokenId) < 0) { alert("올바른 토큰 ID를 입력하세요."); return; }

    setTransferLoading(true);
    setTransferFeedback("NFT 전송 중...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const erc721Abi = [
        "function safeTransferFrom(address from, address to, uint256 tokenId) public",
      ];
      const nftContract = new ethers.Contract(transferTokenAddress, erc721Abi, signer);

      const tx = await nftContract.safeTransferFrom(address, transferRecipient, transferTokenId);
      await tx.wait();
      setTransferFeedback(`NFT 전송 성공! 트랜잭션 해시: ${tx.hash}`);
      alert("NFT 전송 성공!");
      await fetchAll(); 
    } catch (err: any) {
      setTransferFeedback(`NFT 전송 실패: ${err.message || err}`);
      alert(`NFT 전송 실패: ${err.message || err}`);
    } finally {
      setTransferLoading(false);
    }
  };


  return (
    <div style={{ maxWidth: 540, margin: "40px auto", padding: 24, background: "#222", borderRadius: 14, color: "#fff" }}>
      <h2>🦊 내 지갑 자산 대시보드</h2>
      <div style={{ margin: "10px 0" }}>
        <select
          value={network.key}
          onChange={(e) => {
            const n = NETWORKS.find((n) => n.key === e.target.value);
            if (n) setNetwork(n);
            setERC20s([]);
            setNativeBalance("");
            setNFTs([]);
            setAddress(""); 
          }}
          style={{ width: "100%", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#333", color: "#fff" }}
        >
          {NETWORKS.map((n) => (
            <option key={n.key} value={n.key}>{n.name}</option>
          ))}
        </select>
      </div>
      <button onClick={connectMetaMask} style={{ width: "100%", padding: "12px", margin: "8px 0", borderRadius: 7, fontWeight: 600, background: address ? "#4CAF50" : "#007bff", color: "#fff", border: "none", cursor: "pointer" }}>
        {address ? `지갑 연결됨: ${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "메타마스크 연결"}
      </button>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        style={{ width: "100%", margin: "12px 0", padding: 8, borderRadius: 7, border: "none", color: "#000", background: "#eee" }} 
        placeholder="0x로 시작하는 내 지갑 주소"
        readOnly 
      />
      <button onClick={fetchAll} style={{ width: "100%", padding: 14, borderRadius: 9, marginBottom: 10, fontWeight: 700, background: "#6c757d", color: "#fff", border: "none", cursor: "pointer" }} disabled={loading}>
        {loading ? "조회 중..." : "자산 전체 조회"}
      </button>
      
      {loading && <div style={{ margin: 8, color: "#aaa" }}>자산 정보를 로딩 중입니다...</div>}

      <div style={{ margin: "22px 0", border: "1px solid #444", padding: 15, borderRadius: 10, background: "#2a2a2a" }}>
        <h3>네이티브 코인 잔액</h3>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 15 }}>
          {nativeBalance ? `${nativeBalance} ${network.symbol}` : "-"}
        </div>
        {/* 네이티브 코인 전송 */}
        <div style={{ marginTop: 15, borderTop: "1px dashed #555", paddingTop: 15 }}>
          <h4>네이티브 코인 전송</h4>
          <input type="text" placeholder="받는 주소 (0x...)" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} style={{ width: "calc(100% - 16px)", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#333", color: "#fff", marginBottom: 5 }} />
          <input type="number" step="any" placeholder="금액 (ETH/SepoliaETH)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} style={{ width: "calc(100% - 16px)", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#333", color: "#fff", marginBottom: 10 }} />
          <button onClick={sendNativeCoin} disabled={transferLoading || !address || !transferRecipient || !transferAmount} style={{ width: "100%", padding: 10, borderRadius: 7, background: "#007bff", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" }}>
            {transferLoading ? "전송 중..." : "전송"}
          </button>
        </div>
      </div>

      <div style={{ margin: "22px 0", border: "1px solid #444", padding: 15, borderRadius: 10, background: "#2a2a2a" }}>
        <h3>ERC-20 토큰 목록</h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {erc20s.length === 0 && <li style={{ color: "#aaa" }}>표시할 토큰 없음</li>}
          {erc20s.map((t, i) => (
            <li key={i} style={{ borderBottom: "1px solid #333", paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{t.name} ({t.symbol})</span>: <b>{t.balance}</b>
                </div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{t.contractAddress.substring(0, 8)}...</div>
              </div>
              {/* ERC-20 토큰 전송 */}
              <div style={{ marginTop: 10, borderTop: "1px dashed #555", paddingTop: 10 }}>
                <h4>{t.symbol} 토큰 전송</h4>
                <input type="text" placeholder="받는 주소 (0x...)" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} style={{ width: "calc(100% - 16px)", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#333", color: "#fff", marginBottom: 5 }} />
                <input type="number" step="any" placeholder="금액" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} style={{ width: "calc(100% - 16px)", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#333", color: "#fff", marginBottom: 5 }} />
                <button onClick={() => { setTransferTokenAddress(t.contractAddress); sendERC20Token(); }} disabled={transferLoading || !address || !transferRecipient || !transferAmount || !t.contractAddress} style={{ width: "100%", padding: 10, borderRadius: 7, background: "#28a745", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" }}>
                  {transferLoading ? "전송 중..." : `전송 (${t.symbol})`}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ margin: "22px 0", border: "1px solid #444", padding: 15, borderRadius: 10, background: "#2a2a2a" }}>
        <h3>NFT (ERC-721/1155) 목록</h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {nfts.length === 0 && <li style={{ color: "#aaa" }}>표시할 NFT 없음</li>}
          {nfts.map((nft, i) => (
            <li key={i} style={{ borderBottom: "1px solid #333", paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>{nft.title || "(이름 없음)"}</div>
              <div style={{ fontSize: 13, color: "#bbb" }}>컨트랙트: {nft.contract.address.substring(0, 8)}...</div>
              <div style={{ fontSize: 13, color: "#bbb" }}>토큰 ID: {nft.tokenId}</div>
              {nft.imageUrl && ( 
                <img src={nft.imageUrl} alt={nft.title || "NFT"} width={100} style={{ marginTop: 8, borderRadius: 6 }} />
              )}
              {/* NFT 전송 */}
              <div style={{ marginTop: 10, borderTop: "1px dashed #555", paddingTop: 10 }}>
                <h4>NFT 전송</h4>
                <input type="text" placeholder="받는 주소 (0x...)" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} style={{ width: "calc(100% - 16px)", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#333", color: "#fff", marginBottom: 5 }} />
                <input type="text" placeholder="NFT 컨트랙트 주소" value={nft.contract.address} readOnly style={{ width: "calc(100% - 16px)", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#444", color: "#fff", marginBottom: 5 }} />
                <input type="text" placeholder="토큰 ID" value={nft.tokenId} readOnly style={{ width: "calc(100% - 16px)", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#444", color: "#fff", marginBottom: 5 }} />
                <button onClick={() => { setTransferTokenAddress(nft.contract.address); setTransferTokenId(nft.tokenId); sendNFT(); }} disabled={transferLoading || !address || !transferRecipient || !nft.contract.address || !nft.tokenId} style={{ width: "100%", padding: 10, borderRadius: 7, background: "#dc3545", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" }}>
                  {transferLoading ? "전송 중..." : "전송 (NFT)"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {transferFeedback && (
        <div style={{ marginTop: 20, padding: 10, borderRadius: 7, background: transferFeedback.includes("실패") ? "#dc354533" : "#28a74533", color: transferFeedback.includes("실패") ? "#dc3545" : "#28a745", border: `1px solid ${transferFeedback.includes("실패") ? "#dc3545" : "#28a745"}` }}>
          {transferFeedback}
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;