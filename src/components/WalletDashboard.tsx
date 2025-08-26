import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { Alchemy, Network } from "alchemy-sdk";

// Window 객체에 ethereum 속성 추가 (MetaMask 감지용)
declare global {
  interface Window {
    ethereum?: any;
  }
}

// --- 타입 정의 ---
type NetworkConfig = {
  key: string;
  name: string;
  rpc: string;
  etherscan: string;
  symbol: string;
  alchemyNetworkString?: Network; // Alchemy SDK Network enum 타입
  chainId: string; // MetaMask에서 사용하는 10진수 체인 ID 문자열
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

type ERC20 = {
  name: string;
  symbol: string;
  decimals: number;
  contractAddress: string;
  balance: string;
};

// --- 상수 정의 ---
const KAIA_TOKENS: Omit<ERC20, "balance">[] = [
  {
    name: "NEMM",
    symbol: "NEMM",
    decimals: 18,
    contractAddress: "0xf8841f261f2fCed4688B13f1D3AFED244F6EC384",
  },
  {
    name: "DEPS",
    symbol: "DEPS",
    decimals: 18,
    contractAddress: "0x5E25cceDEFe186055536AE57aCfD4BbA8fE87B39",
  },
];

const KAIA_NFTS = [
  {
    title: "나의 첫 NFT",
    contract: { address: "0xD0f983Bac626F719C6309004e8dC8C227a2e85b1" },
    tokenId: "1",
    imageUrl: "https://gateway.pinata.cloud/ipfs/bafybeiez77uohmfwddf2jkmg6kdnhwxnwjali6usqzkwhhwnx6fpcaivdi",
  },
  {
    title: "Goseum #1",
    contract: { address: "0x6fDa04A242F5d6E0cDb2daCdA82133F44c77e71B" },
    tokenId: "1",
    imageUrl: "https://storage.googleapis.com/nft-first/images/1.png",
  },
];

const AMOY_TOKENS: Omit<ERC20, "balance">[] = [
  {
    name: "POL",
    symbol: "POL",
    decimals: 18,
    contractAddress: "0xfa68f1a5d1893dcd105bead09d2fdaf1b0c62d97",
  },
  {
    name: "LINK",
    symbol: "LINK",
    decimals: 18,
    contractAddress: "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904",
  },
];

// 환경 변수에서 API 키 로드
const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY;
const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY; // Etherscan API 키도 환경 변수에서 가져옴

const NETWORKS: NetworkConfig[] = [
  {
    key: "kaia",
    name: "Kaia Testnet",
    rpc: process.env.REACT_APP_KAIA_RPC_URL || "https://api.testnet.klaytn.foundation/v2/rpc",
    chainId: "1001",
    rpcUrls: [process.env.REACT_APP_KAIA_RPC_URL || "https://api.testnet.klaytn.foundation/v2/rpc"],
    blockExplorerUrls: ["https://kaia-testnet.blockscout.com/"],
    nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
    etherscan: "https://kaia-testnet.blockscout.com/api",
    symbol: "KAIA",
  },
  {
    key: "sepolia",
    name: "Sepolia Testnet",
    rpc: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    chainId: "11155111",
    rpcUrls: [`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, "https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    nativeCurrency: { name: "SepoliaETH", symbol: "SepoliaETH", decimals: 18 },
    etherscan: "https://api-sepolia.etherscan.io/api",
    symbol: "SepoliaETH",
    alchemyNetworkString: Network.ETH_SEPOLIA,
  },
  {
    key: "amoy",
    name: "Polygon Amoy Testnet",
    rpc: process.env.REACT_APP_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
    chainId: "80002",
    rpcUrls: [process.env.REACT_APP_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    etherscan: "https://api-amoy.polygonscan.com/api",
    symbol: "POL", // 또는 MATIC
  },
];

// 로컬 스토리지 키
const LOCAL_STORAGE_KEY_NETWORK = "walletdashboard_selected_network";
const LOCAL_STORAGE_KEY_ADDRESS = "walletdashboard_connected_address";

// --- 유틸리티 함수 ---
// Chain ID 비교를 위한 유틸 함수 (BigInt 생성자 인자 타입 명확화)
const isChainIdMatch = (chainIdA: string | number | BigInt, chainIdB: string | number | BigInt): boolean => {
  // MetaMask에서 받은 chainId는 16진수 문자열일 수 있으므로 BigInt로 변환하여 비교하는 것이 안전합니다.
  // DApp의 chainId는 10진수 문자열로 가정합니다.
  try {
    const bigIntA = typeof chainIdA === 'string' && chainIdA.startsWith('0x') ? BigInt(chainIdA) : BigInt(chainIdA.toString());
    const bigIntB = typeof chainIdB === 'string' && chainIdB.startsWith('0x') ? BigInt(chainIdB) : BigInt(chainIdB.toString());
    return bigIntA.toString() === bigIntB.toString();
  } catch (e) {
    console.error("Error in isChainIdMatch:", e);
    return false;
  }
};

// --- React 컴포넌트 시작 ---
const WalletDashboard: React.FC = () => {
  // 상태 변수 정의
  const [network, setNetwork] = useState<NetworkConfig>(() => {
    const savedKey = localStorage.getItem(LOCAL_STORAGE_KEY_NETWORK);
    const found = NETWORKS.find((n) => n.key === savedKey);
    return found || NETWORKS[0]; // 저장된 네트워크가 없으면 첫 번째 네트워크 (Kaia) 선택
  });

  const [address, setAddress] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_ADDRESS) || "";
  });

  const [nativeBalance, setNativeBalance] = useState<string>("");
  const [polLinkBalances, setPolLinkBalances] = useState<{ [symbol: string]: string }>({}); // Amoy 토큰용
  const [erc20s, setERC20s] = useState<ERC20[]>([]); // Kaia, Sepolia 토큰용
  const [nfts, setNFTs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [nativeRecipient, setNativeRecipient] = useState<string>("");
  const [nativeAmount, setNativeAmount] = useState<string>("");
  const [erc20Recipients, setErc20Recipients] = useState<{ [addr: string]: string }>({}); // ERC20 토큰 전송 수신자
  const [erc20Amounts, setErc20Amounts] = useState<{ [addr: string]: string }>({}); // ERC20 토큰 전송 수량
  const [nftRecipients, setNftRecipients] = useState<{ [key: string]: string }>({}); // NFT 전송 수신자

  const [transferFeedback, setTransferFeedback] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState<boolean>(false);

  // Alchemy SDK 인스턴스 메모이제이션
  const alchemy = useMemo(() => {
    if (!network.alchemyNetworkString || !ALCHEMY_API_KEY) {
      console.warn("Alchemy SDK가 설정되지 않았거나 API 키가 없습니다. NFT 및 일부 자산 조회가 제한됩니다.");
      // API 키가 없으면 더미 Alchemy 인스턴스를 반환하여 오류 방지
      return new Alchemy({ apiKey: "dummy", network: Network.ETH_MAINNET });
    }
    return new Alchemy({
      apiKey: ALCHEMY_API_KEY,
      network: network.alchemyNetworkString,
    });
  }, [network.alchemyNetworkString, ALCHEMY_API_KEY]); // ALCHEMY_API_KEY도 종속성에 추가

  // --- MetaMask 네트워크 전환 로직 ---
  const switchNetworkInMetaMask = useCallback(async (targetNetwork: NetworkConfig): Promise<boolean> => {
    if (!window.ethereum) {
      alert("메타마스크가 설치되어 있지 않습니다.");
      return false;
    }
    try {
      console.log(`MetaMask 네트워크를 ${targetNetwork.name} (DApp ChainID: ${targetNetwork.chainId})으로 전환 요청 중...`);
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BigInt(targetNetwork.chainId).toString(16)}` }], // 10진수 chainId를 16진수 문자열로 변환
      });
      console.log(`MetaMask 네트워크가 ${targetNetwork.name}으로 성공적으로 전환되었습니다.`);
      return true;
    } catch (switchError: any) {
      console.error(`네트워크 전환 실패 (${targetNetwork.name}):`, switchError);
      if (switchError.code === 4902) { // 네트워크가 MetaMask에 없는 경우
        try {
          console.log(`${targetNetwork.name} 네트워크를 MetaMask에 추가 요청 중...`);
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${BigInt(targetNetwork.chainId).toString(16)}`, // 10진수 chainId를 16진수 문자열로 변환
              chainName: targetNetwork.name,
              rpcUrls: targetNetwork.rpcUrls,
              nativeCurrency: targetNetwork.nativeCurrency,
              blockExplorerUrls: targetNetwork.blockExplorerUrls,
            }],
          });
          console.log(`${targetNetwork.name}이 MetaMask에 성공적으로 추가되고 전환되었습니다.`);
          return true;
        } catch (addError: any) {
          alert(`네트워크 추가 실패: ${addError.message || addError}`);
          return false;
        }
      } else {
        alert(`네트워크 전환 실패: ${switchError.message || switchError}`);
        return false;
      }
    }
  }, []);

  // --- 자산 조회 함수들 (useCallback으로 래핑하여 최적화) ---
  const fetchNativeBalance = useCallback(async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const balance = await provider.getBalance(addr);
      setNativeBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("네이티브 잔액 조회 실패:", err);
      setNativeBalance("조회 실패");
    }
  }, [network.rpc]);

  const fetchKaiaERC20Tokens = useCallback(async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const balances: ERC20[] = await Promise.all(
        KAIA_TOKENS.map(async (t) => {
          const abi = ["function balanceOf(address) view returns (uint256)"];
          const contract = new ethers.Contract(t.contractAddress, abi, provider);
          const raw = await contract.balanceOf(addr);
          return {
            ...t,
            balance: ethers.formatUnits(raw, t.decimals),
          };
        })
      );
      setERC20s(balances);
    } catch (err) {
      console.error("Kaia ERC20 토큰 조회 실패:", err);
      setERC20s([]);
    }
  }, [network.rpc]);

  const fetchAmoyPolLinkBalances = useCallback(async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      let balances: { [symbol: string]: string } = {};
      for (let t of AMOY_TOKENS) {
        try {
          const abi = ["function balanceOf(address) view returns (uint256)"];
          const contract = new ethers.Contract(t.contractAddress, abi, provider);
          const raw = await contract.balanceOf(addr);
          balances[t.symbol] = ethers.formatUnits(raw, t.decimals);
        } catch (err) {
          console.error(`Amoy ${t.symbol} 잔액 조회 실패:`, err);
          balances[t.symbol] = "0.0";
        }
      }
      setPolLinkBalances(balances);
    } catch (err) {
      console.error("Amoy POL/LINK 잔액 조회 실패:", err);
      setPolLinkBalances({});
    }
  }, [network.rpc]);

  // Etherscan API를 사용하는 범용 ERC20 토큰 조회
  const fetchDefaultERC20Tokens = useCallback(async (addr: string) => {
    if (!ETHERSCAN_API_KEY) {
      console.warn("Etherscan API Key가 설정되지 않아 일부 ERC-20 토큰 조회를 건너뜀니다.");
      setERC20s([]);
      return;
    }
    try {
      const url = `${network.etherscan}?module=account&action=tokentx&address=${addr}&page=1&offset=100&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.result || !Array.isArray(data.result)) {
        setERC20s([]);
        return;
      }

      const tokensMap: Map<string, Omit<ERC20, "balance">> = new Map();
      (data.result as any[]).forEach((tx) => {
        // contractAddress가 유효한 주소인지 확인
        if (ethers.isAddress(tx.contractAddress) && !tokensMap.has(tx.contractAddress)) {
          tokensMap.set(tx.contractAddress, {
            name: tx.tokenName,
            symbol: tx.tokenSymbol,
            decimals: Number(tx.tokenDecimal), // `tokenDecimal`이 문자열일 수 있으므로 `Number()`로 변환
            contractAddress: tx.contractAddress,
          });
        }
      });

      const balances: ERC20[] = await Promise.all(
        Array.from(tokensMap.values()).map(async (t) => {
          const balUrl = `${network.etherscan}?module=account&action=tokenbalance&contractaddress=${t.contractAddress}&address=${addr}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
          const balRes = await fetch(balUrl);
          const balData = await balRes.json();
          const balance = balData.result && balData.result !== '0' ? ethers.formatUnits(balData.result, t.decimals) : "0.0";
          return { ...t, balance };
        })
      );
      setERC20s(balances);
    } catch (err) {
      console.error("기본 ERC20 토큰 조회 실패 (Etherscan API):", err);
      setERC20s([]);
    }
  }, [network.etherscan, ETHERSCAN_API_KEY]);

  const fetchKaiaNFTs = useCallback(async (addr: string) => {
    // Kaia 네트워크의 NFT는 하드코딩된 목록으로만 표시
    setNFTs([]);
    // 특정 주소에 대해서만 하드코딩된 NFT를 표시하도록 가정
    if (addr.toLowerCase() === "0xf3a9d84e06363a251be733e8f2bfca1849b3c512") {
      setNFTs(KAIA_NFTS);
    } else {
        setNFTs([]); // 해당 주소가 아니면 Kaia NFT는 표시하지 않음
    }
  }, []);

  // Alchemy SDK를 사용하여 ERC20 토큰 조회 (Sepolia 전용)
  const fetchAlchemyERC20Tokens = useCallback(async (addr: string) => {
    setERC20s([]);
    if (!alchemy || !network.alchemyNetworkString || !ALCHEMY_API_KEY) {
      console.warn("Alchemy SDK가 Sepolia 네트워크에 설정되지 않았거나 API 키가 없어 ERC-20 토큰 조회를 건너뜁니다.");
      return;
    }

    try {
      const balancesResponse = await alchemy.core.getTokenBalances(addr);
      const erc20Balances: ERC20[] = [];
      for (const token of balancesResponse.tokenBalances) {
        const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);
        if (metadata.name && metadata.symbol && metadata.decimals !== null) {
          const balance = ethers.formatUnits(token.tokenBalance || "0", metadata.decimals);
          erc20Balances.push({
            name: metadata.name,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            contractAddress: token.contractAddress,
            balance: balance,
          });
        }
      }
      setERC20s(erc20Balances);
    } catch (err) {
      console.error("Alchemy를 사용하여 ERC-20 토큰을 가져오는 중 오류 발생:", err);
      setERC20s([]);
    }
  }, [alchemy, network.alchemyNetworkString, ALCHEMY_API_KEY]);

  // Alchemy SDK를 사용하여 NFT 조회 (Sepolia, Amoy 등 Alchemy 지원 네트워크)
  const fetchDefaultNFTs = useCallback(async (addr: string) => {
    setNFTs([]);
    if (!alchemy || !network.alchemyNetworkString || !ALCHEMY_API_KEY) {
      console.warn("Alchemy SDK가 설정되지 않았거나 API 키가 없어 NFT 조회를 건너뜁니다.");
      return;
    }
    try {
      const nftsResponse = await alchemy.nft.getNftsForOwner(addr);
      const formattedNfts = nftsResponse.ownedNfts
        .filter((nft: any) => nft.tokenType === "ERC721") // ERC721만 필터링 (필요시 ERC1155 추가)
        .map((nft: any) => {
          let imageUrl = nft.image?.originalUrl || nft.image?.cachedUrl || nft.image?.thumbnailUrl;
          if (!imageUrl && nft.raw?.metadata?.image) imageUrl = nft.raw.metadata.image;
          if (imageUrl && imageUrl.startsWith('ipfs://')) {
            imageUrl = `https://ipfs.io/ipfs/${imageUrl.substring(7)}`; // IPFS 이미지 처리
          }
          return {
            title: nft.title || nft.contract?.name || nft.raw?.metadata?.name || `NFT #${nft.tokenId}`,
            contract: { address: nft.contract.address },
            tokenId: nft.tokenId,
            imageUrl,
          };
        });
      setNFTs(formattedNfts);
    } catch (err) {
      console.error("기본 NFT 조회 실패 (Alchemy API):", err);
      setNFTs([]);
    }
  }, [alchemy, network.alchemyNetworkString, ALCHEMY_API_KEY]);

  // --- 모든 자산을 조회하는 통합 함수 ---
  const fetchAll = useCallback(async () => {
    // 주소가 유효하지 않으면 조회를 시도하지 않고 상태만 초기화 후 반환
    if (!ethers.isAddress(address)) {
      setNativeBalance("");
      setERC20s([]);
      setNFTs([]);
      setPolLinkBalances({});
      return;
    }
    setLoading(true);
    setERC20s([]);
    setNativeBalance("");
    setNFTs([]);
    setPolLinkBalances({});
    setTransferFeedback("자산 정보를 조회 중...");

    try {
      // MetaMask 연결 상태 및 네트워크 일치 여부 확인
      if (window.ethereum) {
        const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) {
          console.warn(`MetaMask 네트워크가 일치하지 않습니다. MetaMask: ${currentMetaMaskChainId}, DApp: ${network.chainId} (${network.name}). 표시되는 자산은 DApp 설정 네트워크 기준일 수 있습니다.`);
          setTransferFeedback(`경고: MetaMask가 ${network.name}이 아닌 다른 네트워크에 연결되어 있습니다. 자산 조회가 정확하지 않을 수 있습니다.`);
        } else {
          setTransferFeedback(""); // 네트워크가 일치하면 경고 메시지 제거
        }
      }

      // 네트워크 키에 따라 다른 자산 조회 함수 호출
      if (network.key === "kaia") {
        await Promise.all([
          fetchNativeBalance(address),
          fetchKaiaERC20Tokens(address),
          fetchKaiaNFTs(address),
        ]);
      } else if (network.key === "amoy") {
        await Promise.all([
          fetchNativeBalance(address),
          fetchAmoyPolLinkBalances(address), // Amoy는 별도 토큰 리스트
          fetchDefaultNFTs(address), // Amoy도 Alchemy NFT 조회 가능
        ]);
        setERC20s([]); // Amoy는 별도 polLinkBalances 상태를 사용하므로 erc20s는 비움
      } else if (network.key === "sepolia") {
        await Promise.all([
          fetchNativeBalance(address),
          fetchAlchemyERC20Tokens(address), // Sepolia는 Alchemy ERC20 조회
          fetchDefaultNFTs(address), // Sepolia는 Alchemy NFT 조회
        ]);
      } else {
        // 기본 (Etherscan API 기반 ERC20, Alchemy NFT)
        await Promise.all([
          fetchNativeBalance(address),
          fetchDefaultERC20Tokens(address),
          fetchDefaultNFTs(address),
        ]);
      }
      setTransferFeedback("자산 조회 완료!");
    } catch (error) {
      console.error("자산 전체 조회 실패:", error);
      setTransferFeedback(`자산 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [
    address, network, alchemy, // alchemy도 종속성에 추가
    fetchNativeBalance, fetchKaiaERC20Tokens, fetchKaiaNFTs,
    fetchAmoyPolLinkBalances, fetchAlchemyERC20Tokens, fetchDefaultNFTs,
    fetchDefaultERC20Tokens // 새로운 함수 추가
  ]);

  // --- MetaMask 계정 및 체인 변경 이벤트 리스너 설정 및 초기 동기화 ---
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log("MetaMask accountsChanged:", accounts);
      if (accounts.length === 0) {
        setAddress("");
        localStorage.removeItem(LOCAL_STORAGE_KEY_ADDRESS);
        alert("메타마스크 계정 연결이 해제되었습니다.");
        // 모든 자산 상태 초기화
        setNativeBalance("");
        setERC20s([]);
        setNFTs([]);
        setPolLinkBalances({});
        setTransferFeedback("지갑 연결 해제됨.");
      } else {
        setAddress(accounts[0]);
        localStorage.setItem(LOCAL_STORAGE_KEY_ADDRESS, accounts[0]);
        setTransferFeedback("메타마스크 계정 변경됨. 자산 조회 중...");
        fetchAll(); // 계정 변경 시 자산 다시 조회
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log(`MetaMask chainChanged: ${chainId}`);
      // MetaMask에서 받은 chainId는 16진수 문자열이므로 isChainIdMatch 사용
      const matched = NETWORKS.find((n) => isChainIdMatch(n.chainId, chainId));
      if (matched) {
        setNetwork(matched);
        localStorage.setItem(LOCAL_STORAGE_KEY_NETWORK, matched.key);
        console.log(`DApp 네트워크를 ${matched.name}으로 업데이트합니다.`);
        // 네트워크 변경 시 UI 및 상태 초기화
        setERC20s([]);
        setNativeBalance("");
        setPolLinkBalances({});
        setNFTs([]);
        setNativeRecipient("");
        setNativeAmount("");
        setErc20Recipients({});
        setErc20Amounts({});
        setNftRecipients({});
        setTransferFeedback(`네트워크가 ${matched.name}으로 전환되었습니다. 자산 조회 중...`);

        if (address && ethers.isAddress(address)) {
          fetchAll(); // 주소가 있으면 자산 다시 조회
        } else {
          // 주소가 없으면 초기화만
          setNativeBalance("");
          setERC20s([]);
          setNFTs([]);
          setPolLinkBalances({});
        }
      } else {
        console.warn(`알 수 없는 체인ID 감지됨: ${chainId}. DApp이 올바르게 작동하지 않을 수 있습니다.`);
        alert(`메타마스크에서 알 수 없는 네트워크(${chainId})로 변경되었습니다. 대시보드가 제대로 작동하지 않을 수 있습니다.`);
        setTransferFeedback(`경고: 알 수 없는 네트워크 (${chainId}). 대시보드 오류 가능성.`);
      }
    };

    // 초기 계정 및 체인 ID 로드
    window.ethereum.request({ method: "eth_accounts" })
      .then(handleAccountsChanged)
      .catch((err: any) => console.error("초기 계정 로드 실패:", err));

    window.ethereum.request({ method: "eth_chainId" })
      .then(handleChainChanged)
      .catch((err: any) => console.error("초기 체인 ID 로드 실패:", err));

    // 이벤트 리스너 등록
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [fetchAll, address]); // fetchAll과 address를 종속성에 추가

  // address나 network가 변경될 때 fetchAll 호출
  useEffect(() => {
    if (address && ethers.isAddress(address)) {
      fetchAll();
    }
  }, [address, network, fetchAll]); // fetchAll을 종속성에 추가

  // --- UI 상호작용 핸들러 ---
  // 네트워크 선택 드롭다운 변경 핸들러
  const onNetworkSelectChange = useCallback(async (key: string) => {
    const selectedNetwork = NETWORKS.find((n) => n.key === key);
    if (!selectedNetwork) return;

    // MetaMask 네트워크 전환 시도
    const switchedSuccessfully = await switchNetworkInMetaMask(selectedNetwork);
    if (switchedSuccessfully) {
      setNetwork(selectedNetwork);
      localStorage.setItem(LOCAL_STORAGE_KEY_NETWORK, selectedNetwork.key);
      // UI 초기화
      setERC20s([]);
      setNativeBalance("");
      setPolLinkBalances({});
      setNFTs([]);
      setNativeRecipient("");
      setNativeAmount("");
      setErc20Recipients({});
      setErc20Amounts({});
      setNftRecipients({});
      setTransferFeedback(`${selectedNetwork.name}으로 네트워크 전환 완료.`);
    } else {
      alert("MetaMask에서 네트워크 전환에 실패했습니다. MetaMask에서 직접 해당 네트워크로 전환해 주세요.");
      setTransferFeedback("네트워크 전환 실패. MetaMask를 확인하세요.");
    }
  }, [switchNetworkInMetaMask]);

  // MetaMask 연결 버튼 클릭 핸들러
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert("메타마스크가 설치되어 있지 않습니다. https://metamask.io/ 에서 설치해주세요.");
      return;
    }
    try {
      setTransferFeedback("메타마스크 연결 요청 중...");
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        localStorage.setItem(LOCAL_STORAGE_KEY_ADDRESS, accounts[0]);

        // 현재 DApp 네트워크와 MetaMask 네트워크가 다른 경우 전환 시도
        const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) {
          setTransferFeedback(`MetaMask 네트워크가 ${network.name}과 다릅니다. 전환을 시도합니다.`);
          const switched = await switchNetworkInMetaMask(network);
          if (!switched) {
            alert(`경고: MetaMask 네트워크가 DApp의 현재 설정(${network.name})과 다릅니다. MetaMask에서 직접 ${network.name}으로 전환하거나, DApp의 네트워크 선택 드롭다운을 사용하여 전환해주세요.`);
            setTransferFeedback("연결 실패: 네트워크 불일치.");
            return;
          }
          // 네트워크 전환 후 잠시 대기하여 MetaMask가 안정화되도록 함
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        setTransferFeedback("지갑 연결 및 자산 조회 중...");
        fetchAll(); // 연결 성공 후 자산 조회
      }
    } catch (err: any) {
      console.error("메타마스크 연결 실패:", err);
      alert(`메타마스크 연결 실패: ${err.message || err}`);
      setTransferFeedback("메타마스크 연결 실패.");
    }
  };

  // --- 전송 함수들 ---
  // 네트워크 일치 확인 및 전환 시도 로직을 전송 함수 내부에 통합
  const checkAndSwitchNetworkForTransfer = async (): Promise<boolean> => {
    if (!window.ethereum) {
      setTransferFeedback("메타마스크가 설치되어 있지 않습니다.");
      return false;
    }

    const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) {
      setTransferLoading(true);
      setTransferFeedback(`MetaMask 네트워크가 ${network.name}과(와) 다릅니다. 전환을 시도합니다. MetaMask 팝업을 확인해주세요.`);
      const switched = await switchNetworkInMetaMask(network);
      setTransferLoading(false);
      if (!switched) {
        setTransferFeedback(`전송 실패: MetaMask 네트워크를 ${network.name}으로 전환해야 합니다. 수동으로 전환 후 다시 시도해주세요.`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1500)); // 전환 후 대기
      const afterSwitchChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (!isChainIdMatch(afterSwitchChainId, network.chainId)) {
        setTransferFeedback(`네트워크 전환 실패: MetaMask가 여전히 ${network.name}으로 전환되지 않았습니다. 수동으로 전환 후 다시 시도해주세요.`);
        return false;
      }
    }

    // Signer의 네트워크가 DApp 네트워크와 일치하는지 최종 확인
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const networkInfo = await signer.provider?.getNetwork();
      const signerChainId = networkInfo?.chainId?.toString() ?? "";

      if (!isChainIdMatch(signerChainId, network.chainId)) {
        console.error(`[Signer Check Failed] Final signerChainId: ${signerChainId}, DApp network.chainId: ${network.chainId}`);
        setTransferFeedback(`전송 실패: Signer의 네트워크가 ${network.name}과 일치하지 않습니다. MetaMask를 다시 확인하고 DApp을 새로고침해주세요.`);
        return false;
      }
      return true; // 모든 검증 통과
    } catch (err) {
      console.error("Signer 네트워크 확인 중 오류 발생:", err);
      setTransferFeedback(`전송 실패: MetaMask Signer를 가져올 수 없습니다. 지갑을 확인하고 DApp을 새로고침해주세요.`);
      return false;
    }
  };

  // 네이티브 코인 전송 함수
  const sendNativeCoin = async () => {
    if (!address) { setTransferFeedback("지갑을 먼저 연결하세요."); return; }
    if (!ethers.isAddress(nativeRecipient)) { setTransferFeedback("받는 주소가 유효하지 않습니다."); return; }
    if (!nativeAmount || isNaN(Number(nativeAmount)) || Number(nativeAmount) <= 0) { setTransferFeedback("전송 수량이 유효하지 않습니다."); return; }

    const networkCheckPassed = await checkAndSwitchNetworkForTransfer();
    if (!networkCheckPassed) return;

    try {
      setTransferLoading(true);
      setTransferFeedback("네이티브 코인 전송 중...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: nativeRecipient,
        value: ethers.parseEther(nativeAmount),
      });
      await tx.wait();
      setTransferFeedback(`전송 완료! TX: ${tx.hash}`);
      fetchAll(); // 전송 후 자산 업데이트
    } catch (err: any) {
      console.error("네이티브 코인 전송 오류:", err);
      let errorMessage = `전송 실패: ${err.message || err}`;
      if (err.code === "UNPREDICTABLE_GAS_LIMIT" || (err.data && err.data.code === -32000 && err.data.message && err.data.message.includes("insufficient funds for gas"))) {
        errorMessage = `전송 실패: ${network.symbol} 잔액이 부족하여 가스비를 지불할 수 없습니다.`;
      } else if (err.code === 4001) {
        errorMessage = "전송 취소됨: 사용자가 트랜잭션을 거절했습니다.";
      } else if (err.code === -32603 && err.message && err.message.includes("Internal JSON-RPC error")) {
        errorMessage = "전송 실패: 내부 RPC 오류가 발생했습니다. 네트워크 상태를 확인해주세요.";
      }
      setTransferFeedback(errorMessage);
    } finally {
      setTransferLoading(false);
    }
  };

  // ERC20 토큰 전송 함수
  const sendERC20Token = async (contractAddr: string) => {
    const recipient = erc20Recipients[contractAddr];
    const amount = erc20Amounts[contractAddr];
    if (!ethers.isAddress(recipient)) { setTransferFeedback("받는 주소가 유효하지 않습니다."); return; }
    if (!ethers.isAddress(contractAddr)) { setTransferFeedback("토큰 컨트랙트 주소가 유효하지 않습니다."); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setTransferFeedback("전송 수량이 유효하지 않습니다."); return; }

    const networkCheckPassed = await checkAndSwitchNetworkForTransfer();
    if (!networkCheckPassed) return;

    try {
      setTransferLoading(true);
      setTransferFeedback("ERC20 전송 중...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const erc20Abi = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
      ];

      const contract = new ethers.Contract(contractAddr, erc20Abi, signer);

      let decimals: number;
      let tokenSymbol: string = "토큰";
      try {
        decimals = await contract.decimals();
        tokenSymbol = await contract.symbol();
      } catch (decimalsErr: any) {
        let errorMessage = `ERC20 전송 실패: 토큰 컨트랙트(${contractAddr})에서 토큰 정보를 가져올 수 없습니다.`;
        if (decimalsErr.code === 'BAD_DATA' && decimalsErr.value === '0x') {
          errorMessage += ` (데이터 디코딩 실패: '0x' 반환. 컨트랙트가 해당 네트워크에 배포되었는지 확인)`;
        } else if (decimalsErr.code === 'CALL_EXCEPTION') {
          errorMessage += ` (컨트랙트 호출 실패. ERC20 표준 컨트랙트가 맞는지 확인)`;
        } else if (decimalsErr.message && decimalsErr.message.includes("invalid ENS name")) {
          errorMessage += ` (잘못된 RPC 또는 컨트랙트 주소 형식)`;
        }
        errorMessage += ` 네트워크와 컨트랙트 주소를 다시 확인해주세요. 오류: ${decimalsErr.message || decimalsErr}`;
        setTransferFeedback(errorMessage);
        setTransferLoading(false);
        return;
      }

      const parsedAmount = ethers.parseUnits(amount, decimals);

      const tx = await contract.transfer(recipient, parsedAmount);
      await tx.wait();
      setTransferFeedback(`${tokenSymbol} 토큰 전송 완료! TX: ${tx.hash}`);
      fetchAll(); // 전송 후 자산 업데이트
    } catch (err: any) {
      console.error("ERC20 토큰 전송 오류:", err);
      let errorMessage = `ERC20 전송 실패: ${err.message || err}`;
      if (err.code === "UNPREDICTABLE_GAS_LIMIT" || (err.data && err.data.code === -32000 && err.data.message && err.data.message.includes("insufficient funds for gas"))) {
        errorMessage = `ERC20 전송 실패: ${network.symbol} 잔액이 부족하여 가스비를 지불할 수 없습니다.`;
      } else if (err.code === 4001) {
        errorMessage = "ERC20 전송 취소됨: 사용자가 트랜잭션을 거절했습니다.";
      } else if (err.message && err.message.includes("missing revert data") && err.code === "CALL_EXCEPTION") {
        errorMessage = "ERC20 전송 실패: 컨트랙트 실행 중 오류가 발생했습니다. (충분한 토큰 잔액이 있는지 확인하거나, 받는 주소가 올바른지 확인해주세요.)";
      } else if (err.code === -32603 && err.message && err.message.includes("Internal JSON-RPC error")) {
        errorMessage = "ERC20 전송 실패: 내부 RPC 오류가 발생했습니다. 네트워크 상태를 확인해주세요.";
      }
      setTransferFeedback(errorMessage);
    } finally {
      setTransferLoading(false);
    }
  };

  // NFT 전송 함수
  const sendNFT = async (contractAddr: string, tokenId: string) => {
    const key = `${contractAddr}:${tokenId}`;
    const recipient = nftRecipients[key];
    if (!ethers.isAddress(recipient)) { setTransferFeedback("받는 주소가 유효하지 않습니다."); return; }
    if (!ethers.isAddress(contractAddr)) { setTransferFeedback("NFT 컨트랙트 주소가 유효하지 않습니다."); return; }
    if (!tokenId) { setTransferFeedback("토큰 ID가 유효하지 않습니다."); return; }

    const networkCheckPassed = await checkAndSwitchNetworkForTransfer();
    if (!networkCheckPassed) return;

    try {
      setTransferLoading(true);
      setTransferFeedback("NFT 전송 중...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const erc721Abi = [
        "function safeTransferFrom(address from, address to, uint256 tokenId) public",
        "function name() view returns (string)", // NFT 컬렉션 이름 가져오기
      ];
      const contract = new ethers.Contract(contractAddr, erc721Abi, signer);
      const nftCollectionName = await contract.name().catch(() => "NFT"); // 이름 조회 실패 시 "NFT"로 폴백

      const tx = await contract.safeTransferFrom(address, recipient, tokenId);
      await tx.wait();
      setTransferFeedback(`${nftCollectionName} NFT (ID: ${tokenId}) 전송 완료! TX: ${tx.hash}`);
      fetchAll(); // 전송 후 자산 업데이트
    } catch (err: any) {
      console.error("NFT 전송 오류:", err);
      let errorMessage = `NFT 전송 실패: ${err.message || err}`;
      if (err.code === "UNPREDICTABLE_GAS_LIMIT" || (err.data && err.data.code === -32000 && err.data.message && err.data.message.includes("insufficient funds for gas"))) {
        errorMessage = `NFT 전송 실패: ${network.symbol} 잔액이 부족하여 가스비를 지불할 수 없습니다.`;
      } else if (err.code === 4001) {
        errorMessage = "NFT 전송 취소됨: 사용자가 트랜잭션을 거절했습니다.";
      } else if (err.message && err.message.includes("missing revert data") && err.code === "CALL_EXCEPTION") {
        errorMessage = "NFT 전송 실패: 컨트랙트 실행 중 오류가 발생했습니다. (올바른 NFT ID인지 확인하거나, 보내는 주소가 NFT 소유자인지 확인해주세요.)";
      } else if (err.code === -32603 && err.message && err.message.includes("Internal JSON-RPC error")) {
        errorMessage = "NFT 전송 실패: 내부 RPC 오류가 발생했습니다. 네트워크 상태를 확인해주세요.";
      }
      setTransferFeedback(errorMessage);
    } finally {
      setTransferLoading(false);
    }
  };

  // --- UI 렌더링 ---
  return (
    <div style={{ maxWidth: 540, margin: "40px auto", padding: 24, background: "#222", borderRadius: 14, color: "#fff" }}>
      <h2>🦊 내 지갑 자산 대시보드</h2>
      <div style={{ margin: "10px 0" }}>
        <select
          value={network.key}
          onChange={(e) => onNetworkSelectChange(e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 7, border: "1px solid #555", background: "#333", color: "#fff" }}
        >
          {NETWORKS.map((n) => (
            <option key={n.key} value={n.key}>{n.name}</option>
          ))}
        </select>
      </div>
      <button onClick={connectMetaMask} style={{
        width: "100%", padding: "12px", margin: "8px 0", borderRadius: 7, fontWeight: 600,
        background: address ? "#4CAF50" : "#007bff", color: "#fff", border: "none", cursor: "pointer"
      }}>
        {address ? `지갑 연결됨: ${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "메타마스크 연결"}
      </button>
      <input
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
          localStorage.setItem(LOCAL_STORAGE_KEY_ADDRESS, e.target.value);
        }}
        style={{ width: "100%", margin: "12px 0", padding: 8, borderRadius: 7, border: "none", color: "#000", background: "#eee" }}
        placeholder="0x로 시작하는 내 지갑 주소"
        readOnly
      />
      <button onClick={fetchAll} style={{
        width: "100%", padding: 14, borderRadius: 9, marginBottom: 10, fontWeight: 700,
        background: "#6c757d", color: "#fff", border: "none", cursor: "pointer"
      }} disabled={loading}>
        {loading ? "조회 중..." : "자산 전체 조회"}
      </button>
      {loading && <div style={{ margin: 8, color: "#aaa" }}>자산 정보를 로딩 중입니다...</div>}

      <div style={{ margin: "22px 0", border: "1px solid #444", padding: 15, borderRadius: 10, background: "#2a2a2a" }}>
        <h3>네이티브 코인 잔액</h3>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 15 }}>
          {nativeBalance ? `${nativeBalance} ${network.symbol}` : "-"}
        </div>
        {/* 네이티브 전송폼 */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #444" }}>
          <h4>네이티브 코인 전송</h4>
          <input
            type="text"
            placeholder="받는 지갑 주소"
            value={nativeRecipient}
            onChange={e => setNativeRecipient(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 6, borderRadius: 5, border: "1px solid #666", background: "#444", color: "#fff" }}
          />
          <input
            type="number"
            placeholder="수량"
            step="any"
            value={nativeAmount}
            onChange={e => setNativeAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 6, borderRadius: 5, border: "1px solid #666", background: "#444", color: "#fff" }}
          />
          <button
            onClick={sendNativeCoin}
            disabled={transferLoading || !address || !nativeRecipient || !nativeAmount || isNaN(Number(nativeAmount)) || Number(nativeAmount) <= 0}
            style={{ width: "100%", padding: 10, borderRadius: 7, backgroundColor: "#007bff", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" }}>
            {transferLoading ? "전송 중..." : "전송"}
          </button>
        </div>
        {/* Amoy: LINK 전송 추가 (POL은 조회만) */}
        {network.key === "amoy" && (
          <div style={{ marginTop: 15, paddingTop: 10, borderTop: "1px dashed #444" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 7 }}>Amoy 주요 토큰 잔액</div>
            <div style={{ fontSize: 18, marginBottom: 4 }}>
              POL: <b>{polLinkBalances["POL"] || "0.0"}</b>
            </div>
            <div style={{ fontSize: 18, marginBottom: 10 }}>
              LINK: <b>{polLinkBalances["LINK"] || "0.0"}</b>
            </div>
            <h4>LINK 토큰 전송</h4>
            <input
              type="text"
              placeholder="받는 주소 (LINK)"
              value={erc20Recipients[AMOY_TOKENS[1].contractAddress] || ""}
              onChange={e => setErc20Recipients(r => ({ ...r, [AMOY_TOKENS[1].contractAddress]: e.target.value }))}
              style={{ width: "100%", padding: 8, marginBottom: 6, borderRadius: 5, border: "1px solid #666", background: "#444", color: "#fff" }}
            />
            <input
              type="number"
              placeholder="수량 (LINK)"
              step="any"
              value={erc20Amounts[AMOY_TOKENS[1].contractAddress] || ""}
              onChange={e => setErc20Amounts(r => ({ ...r, [AMOY_TOKENS[1].contractAddress]: e.target.value }))}
              style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 5, border: "1px solid #666", background: "#444", color: "#fff" }}
            />
            <button
              onClick={() => sendERC20Token(AMOY_TOKENS[1].contractAddress)}
              disabled={
                transferLoading ||
                !address ||
                !erc20Recipients[AMOY_TOKENS[1].contractAddress] ||
                !erc20Amounts[AMOY_TOKENS[1].contractAddress] ||
                isNaN(Number(erc20Amounts[AMOY_TOKENS[1].contractAddress])) ||
                Number(erc20Amounts[AMOY_TOKENS[1].contractAddress]) <= 0
              }
              style={{
                width: "100%", padding: 10, borderRadius: 7, backgroundColor: "#28a745",
                color: "#fff", fontWeight: 600, border: "none", cursor: "pointer"
              }}>
              {transferLoading ? "전송 중..." : "LINK 전송"}
            </button>
          </div>
        )}
      </div>

      {/* ERC-20 토큰 목록 (Kaia, Sepolia) */}
      {(network.key === "kaia" || network.key === "sepolia" || network.key === "amoy") && ( // Amoy는 polLinkBalances가 따로 있으므로 선택적
        <div style={{ margin: "22px 0", border: "1px solid #444", padding: 15, borderRadius: 10, background: "#2a2a2a" }}>
          <h3>ERC-20 토큰 목록</h3>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {erc20s.length === 0 && <li style={{ color: "#aaa" }}>표시할 토큰 없음</li>}
            {erc20s.map((t, i) => (
              <li key={i} style={{ borderBottom: "1px solid #333", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{t.name} ({t.symbol})</span>: <b>{t.balance}</b>
                    <span style={{ fontSize: 12, color: "#aaa", marginLeft: 10 }}>{t.contractAddress.substring(0, 8)}...</span>
                  </div>
                  <input
                    type="text"
                    placeholder="받는 주소"
                    value={erc20Recipients[t.contractAddress] || ""}
                    onChange={e => setErc20Recipients(r => ({ ...r, [t.contractAddress]: e.target.value }))}
                    style={{ width: "100%", padding: 8, marginTop: 5, borderRadius: 5, border: "1px solid #666", background: "#444", color: "#fff" }}
                  />
                  <input
                    type="number"
                    placeholder="수량"
                    value={erc20Amounts[t.contractAddress] || ""}
                    onChange={e => setErc20Amounts(r => ({ ...r, [t.contractAddress]: e.target.value }))}
                    style={{ width: "100%", padding: 8, marginBottom: 5, borderRadius: 5, border: "1px solid #666", background: "#444", color: "#fff" }}
                  />
                  <button
                    onClick={() => sendERC20Token(t.contractAddress)}
                    disabled={
                      transferLoading ||
                      !address ||
                      !erc20Recipients[t.contractAddress] ||
                      !erc20Amounts[t.contractAddress] ||
                      isNaN(Number(erc20Amounts[t.contractAddress])) ||
                      Number(erc20Amounts[t.contractAddress]) <= 0
                    }
                    style={{ width: "100%", padding: 10, borderRadius: 7, backgroundColor: "#28a745", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" }}>
                    {transferLoading ? "전송 중..." : "토큰 전송"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* NFT (ERC-721) 목록 */}
      <div style={{ margin: "22px 0", border: "1px solid #444", padding: 15, borderRadius: 10, background: "#2a2a2a" }}>
        <h3>NFT (ERC-721만 표시)</h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {nfts.length === 0 && <li style={{ color: "#aaa" }}>표시할 NFT 없음</li>}
          {nfts.map((nft, i) => {
            const nftKey = `${nft.contract.address}:${nft.tokenId}`;
            return (
              <li key={i} style={{ borderBottom: "1px solid #333", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{nft.title || "(이름 없음)"}</div>
                <div style={{ fontSize: 13, color: "#bbb" }}>컨트랙트: {nft.contract.address.substring(0, 8)}...</div>
                <div style={{ fontSize: 13, color: "#bbb" }}>토큰 ID: {nft.tokenId}</div>
                {nft.imageUrl && (
                  <img src={nft.imageUrl} alt={nft.title || "NFT"} width={100} style={{ marginTop: 8, borderRadius: 6 }} />
                )}
                <input
                  type="text"
                  placeholder="받는 지갑 주소"
                  value={nftRecipients[nftKey] || ""}
                  onChange={e => setNftRecipients(r => ({ ...r, [nftKey]: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 6, borderRadius: 5, border: "1px solid #666", background: "#444", color: "#fff" }}
                />
                <button
                  onClick={() => sendNFT(nft.contract.address, nft.tokenId)}
                  disabled={
                    transferLoading ||
                    !address ||
                    !nftRecipients[nftKey] ||
                    !ethers.isAddress(nft.contract.address) ||
                    !nft.tokenId
                  }
                  style={{ width: "100%", padding: 10, borderRadius: 7, backgroundColor: "#dc3545", color: "#fff", fontWeight: 600, marginTop: 5, border: "none", cursor: "pointer" }}>
                  {transferLoading ? "전송 중..." : "NFT 전송"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {transferFeedback && (
        <div style={{
          marginTop: 20,
          padding: 10,
          border: "1px solid",
          borderRadius: 6,
          backgroundColor: transferFeedback.includes("실패") ? "#550000" : "#003300",
          color: transferFeedback.includes("실패") ? "#ffaaaa" : "#aaffaa"
        }}>
          {transferFeedback}
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;