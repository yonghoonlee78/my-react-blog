import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
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
  etherscan: string;
  symbol: string; 
  alchemyNetworkString?: Network; 
  chainId: string; 
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

const KAIA_TOKENS = [
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

const AMOY_TOKENS = [
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

const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY;

const NETWORKS: NetworkConfig[] = [
  {
    key: "kaia",
    name: "Kaia Testnet",
    rpc: process.env.REACT_APP_KAIA_RPC_URL || "https://api.testnet.klaytn.foundation/v2/rpc",
    chainId: "1001", // ✅ 변경: 10진수 문자열
    rpcUrls: [process.env.REACT_APP_KAIA_RPC_URL || "https://api.testnet.klaytn.foundation/v2/rpc"],
    blockExplorerUrls: ["https://kaia-testnet.blockscout.com/"],
    nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
    etherscan: "https://kaia-testnet.blockscout.com/api",
    symbol: "KAIA",
  },
  {
    key: "sepolia",
    name: "Sepolia Testnet",
    rpc: `https://eth-sepolia.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`,
    chainId: "11155111", // ✅ 변경: 10진수 문자열
    rpcUrls: [`https://eth-sepolia.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`, "https://rpc.sepolia.org"],
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
    chainId: "80002", // ✅ 변경: 10진수 문자열
    rpcUrls: [process.env.REACT_APP_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    etherscan: "https://api-amoy.polygonscan.com/api",
    symbol: "POL",
  },
];

const LOCAL_STORAGE_KEY_NETWORK = "walletdashboard_selected_network";
const LOCAL_STORAGE_KEY_ADDRESS = "walletdashboard_connected_address";

// ✅ 변경: Chain ID 비교를 위한 유틸 함수 수정 (BigInt 생성자 인자 타입 명확화)
const isChainIdMatch = (chainIdA: string | number | BigInt, chainIdB: string | number | BigInt): boolean => {
  // `BigInt()` 생성자는 문자열, 숫자, 또는 BigInt 자체를 인자로 받을 수 있지만,
  // TypeScript가 특정 조합을 엄격하게 검사할 때 오류가 발생할 수 있습니다.
  // 가장 안전하게 문자열로 변환한 후 BigInt로 만드는 것이 좋습니다.
  return BigInt(chainIdA.toString()).toString() === BigInt(chainIdB.toString()).toString();
};


const WalletDashboard: React.FC = () => {
  const [network, setNetwork] = useState<NetworkConfig>(() => {
    // LOCAL_STORAGE_KEY_NETWORK는 파일 상단에 전역 상수로 선언되어 있으므로 문제없이 접근 가능합니다.
    const savedKey = localStorage.getItem(LOCAL_STORAGE_KEY_NETWORK);
    const found = NETWORKS.find((n) => n.key === savedKey);
    return found || NETWORKS[0];
  });

  const [address, setAddress] = useState<string>(() => {
    // LOCAL_STORAGE_KEY_ADDRESS도 파일 상단에 전역 상수로 선언되어 있으므로 문제없이 접근 가능합니다.
    return localStorage.getItem(LOCAL_STORAGE_KEY_ADDRESS) || "";
  });

  // ✅ 변경: network 상태 변화 시 DApp 네트워크 정보 로깅 및 UI 피드백
  useEffect(() => {
    console.log('--- DApp 현재 설정 네트워크 정보 ---');
    console.log('DApp Network Key:', network.key);
    console.log('DApp Network Name:', network.name);
    console.log('DApp Network ChainID:', network.chainId);
    console.log('------------------------------------');
    setTransferFeedback(`DApp 네트워크: ${network.name} (ChainID: ${network.chainId})`); 
  }, [network]); 
  
  const [nativeBalance, setNativeBalance] = useState<string>("");
  const [polLinkBalances, setPolLinkBalances] = useState<{ [symbol: string]: string }>({});
  const [erc20s, setERC20s] = useState<ERC20[]>([]);
  const [nfts, setNFTs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
 
  const [nativeRecipient, setNativeRecipient] = useState<string>("");
  const [nativeAmount, setNativeAmount] = useState<string>("");
  const [erc20Recipients, setErc20Recipients] = useState<{ [addr: string]: string }>({});
  const [erc20Amounts, setErc20Amounts] = useState<{ [addr: string]: string }>({});
  const [nftRecipients, setNftRecipients] = useState<{ [key: string]: string }>({});

  const [transferFeedback, setTransferFeedback] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState<boolean>(false);

  // Alchemy SDK 인스턴스 메모이제이션
  const alchemy = React.useMemo(() => {
    if (!network.alchemyNetworkString || !process.env.REACT_APP_ALCHEMY_API_KEY) return null;
    return new Alchemy({
      apiKey: process.env.REACT_APP_ALCHEMY_API_KEY,
      network: network.alchemyNetworkString,
    });
  }, [network.alchemyNetworkString]); 

  // MetaMask 네트워크 전환 로직을 useCallback으로 래핑
  const switchNetworkInMetaMask = useCallback(async (targetNetwork: NetworkConfig): Promise<boolean> => {
    if (!window.ethereum) {
      alert("메타마스크가 설치되어 있지 않습니다.");
      return false;
    }
    try {
      console.log(`MetaMask 네트워크를 ${targetNetwork.name} (DApp ChainID: ${targetNetwork.chainId})으로 전환 요청 중...`);
      // ✅ 변경: MetaMask는 wallet_switchEthereumChain에서 chainId를 16진수 문자열을 기대합니다.
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BigInt(targetNetwork.chainId).toString(16)}` }], 
      });
      console.log(`MetaMask 네트워크가 ${targetNetwork.name}으로 성공적으로 전환되었습니다.`);
      return true;
    } catch (switchError: any) {
      console.error(`네트워크 전환 실패 (${targetNetwork.name}):`, switchError);
      if (switchError.code === 4902) { 
        try {
          console.log(`${targetNetwork.name} 네트워크를 MetaMask에 추가 요청 중...`);
          // ✅ 변경: MetaMask는 wallet_addEthereumChain에서도 chainId를 16진수 문자열을 기대합니다.
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${BigInt(targetNetwork.chainId).toString(16)}`, 
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

  // --- 자산 조회 함수들 (useCallback으로 래핑하여 최적성 및 종속성 관리) ---
  const fetchNativeBalance = useCallback(async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const balance = await provider.getBalance(addr);
      setNativeBalance(ethers.formatEther(balance));
    } catch(err) {
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
    } catch(err) {
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
    } catch(err) {
      console.error("Amoy POL/LINK 잔액 조회 실패:", err);
      setPolLinkBalances({});
    }
  }, [network.rpc]); 

  const fetchDefaultERC20Tokens = useCallback(async (addr: string) => {
    try {
      const url = `${network.etherscan}?module=account&action=tokentx&address=${addr}&page=1&offset=100&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.result) { setERC20s([]); return; }
      const tokensMap: Map<string, Omit<ERC20, "balance">> = new Map();
      (data.result as any[]).forEach((tx) => {
        if (!tokensMap.has(tx.contractAddress)) {
          tokensMap.set(tx.contractAddress, {
            name: tx.tokenName,
            symbol: tx.tokenSymbol,
            decimals: Number(tx.tokenDecimal),
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
    } catch(err) {
      console.error("기본 ERC20 토큰 조회 실패:", err);
      setERC20s([]);
    }
  }, [network.etherscan]); 

  const fetchKaiaNFTs = useCallback(async (addr: string) => {
    setNFTs([]);
    if (addr.toLowerCase() === "0xf3a9d84e06363a251be733e8f2bfca1849b3c512")
      setNFTs(KAIA_NFTS);
  }, []); 

  const fetchAlchemyERC20Tokens = useCallback(async (addr: string) => {
    setERC20s([]);
    if (!alchemy || !network.alchemyNetworkString) {
      console.warn("Alchemy SDK가 Sepolia 네트워크에 설정되지 않았거나 API 키가 없습니다.");
      setERC20s([]);
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
  }, [alchemy, network.alchemyNetworkString]); 

  const fetchDefaultNFTs = useCallback(async (addr: string) => {
    setNFTs([]);
    if (!alchemy || !network.alchemyNetworkString) return;
    try {
      const nftsResponse = await alchemy.nft.getNftsForOwner(addr);
      const formattedNfts = nftsResponse.ownedNfts
        .filter((nft: any) => nft.tokenType === "ERC721")
        .map((nft: any) => {
          let imageUrl = nft.image?.originalUrl || nft.image?.cachedUrl || nft.image?.thumbnailUrl;
          if (!imageUrl && nft.raw?.metadata?.image) imageUrl = nft.raw.metadata.image;
          if (imageUrl && imageUrl.startsWith('ipfs://')) {
            imageUrl = `https://ipfs.io/ipfs/${imageUrl.substring(7)}`;
          }
          return {
            title: nft.title || nft.contract?.name || nft.raw?.metadata?.name || `NFT #${nft.tokenId}`,
            contract: { address: nft.contract.address },
            tokenId: nft.tokenId,
            imageUrl,
          };
        });
      setNFTs(formattedNfts);
    } catch(err) {
      console.error("기본 NFT 조회 실패:", err);
      setNFTs([]);
    }
  }, [alchemy, network.alchemyNetworkString]); 
  // --- 자산 조회 함수 끝 ---

  // 모든 자산을 조회하는 함수 (useCallback으로 래핑)
  const fetchAll = useCallback(async () => {
    // 주소가 유효하지 않으면 조회를 시도하지 않고 상태만 초기화 후 반환 (초기 로드 시 빈 주소일 수 있음)
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

    try {
      if (window.ethereum) {
        const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
        // ✅ 변경: isChainIdMatch 유틸 함수 사용
        if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) { 
          console.warn(`MetaMask 네트워크가 일치하지 않습니다. MetaMask: ${currentMetaMaskChainId}, DApp: ${network.chainId} (${network.name}). 표시되는 자산은 DApp 설정 네트워크 기준일 수 있습니다.`);
          setTransferFeedback(`경고: MetaMask가 ${network.name}이 아닌 다른 네트워크에 연결되어 있습니다. 자산 조회가 정확하지 않을 수 있습니다.`);
        } else {
          setTransferFeedback(""); 
        }
      }

      if (network.key === "kaia") {
        await Promise.all([
          fetchNativeBalance(address),
          fetchKaiaERC20Tokens(address),
          fetchKaiaNFTs(address),
        ]);
      } else if (network.key === "amoy") {
        await Promise.all([
          fetchNativeBalance(address),
          fetchAmoyPolLinkBalances(address),
        ]);
        setERC20s([]); 
        setNFTs([]);
      } else if (network.key === "sepolia") {
        await Promise.all([
          fetchNativeBalance(address),
          fetchAlchemyERC20Tokens(address),
          fetchDefaultNFTs(address),
        ]);
      } else {
        await Promise.all([
          fetchNativeBalance(address),
          fetchDefaultERC20Tokens(address),
          fetchDefaultNFTs(address),
        ]);
      }
    } catch (error) {
      console.error("자산 전체 조회 실패:", error);
      setTransferFeedback(`자산 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [
    address, network, alchemy, 
    fetchNativeBalance, fetchKaiaERC20Tokens, fetchKaiaNFTs, 
    fetchAmoyPolLinkBalances, fetchAlchemyERC20Tokens, fetchDefaultNFTs,
    fetchDefaultERC20Tokens 
  ]); 

  // MetaMask 계정 및 체인 변경 이벤트 리스너 설정 및 초기 동기화
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress("");
        localStorage.removeItem(LOCAL_STORAGE_KEY_ADDRESS); // ✅ 변경: LOCAL_STORAGE_KEY_ADDRESS는 전역 상수
        alert("메타마스크 계정 연결이 해제되었습니다.");
        setNativeBalance("");
        setERC20s([]);
        setNFTs([]);
        setPolLinkBalances({});
      } else {
        setAddress(accounts[0]);
        localStorage.setItem(LOCAL_STORAGE_KEY_ADDRESS, accounts[0]); // ✅ 변경: LOCAL_STORAGE_KEY_ADDRESS는 전역 상수
        fetchAll(); 
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log(`MetaMask에서 체인 변경 감지: ${chainId}`);
      // ✅ 변경: isChainIdMatch 유틸 함수 사용
      const matched = NETWORKS.find((n) => isChainIdMatch(n.chainId, chainId)); 
      if (matched) {
        setNetwork(matched);
        localStorage.setItem(LOCAL_STORAGE_KEY_NETWORK, matched.key); // ✅ 변경: LOCAL_STORAGE_KEY_NETWORK는 전역 상수
        console.log(`DApp 네트워크를 ${matched.name}으로 업데이트합니다.`);
        setERC20s([]); setNativeBalance(""); setPolLinkBalances({}); setNFTs([]);
        setNativeRecipient(""); setNativeAmount("");
        setErc20Recipients({}); setErc20Amounts({}); setNftRecipients({});

        if (address && ethers.isAddress(address)) {
          fetchAll(); 
        } else {
          setNativeBalance("");
          setERC20s([]);
          setNFTs([]);
          setPolLinkBalances({});
        }
      } else {
        console.warn(`알 수 없는 체인ID 감지됨: ${chainId}. DApp이 올바르게 작동하지 않을 수 있습니다.`);
        alert(`메타마스크에서 알 수 없는 네트워크(${chainId})로 변경되었습니다. 대시보드가 제대로 작동하지 않을 수 있습니다.`);
      }
    };

    window.ethereum.request({ method: "eth_accounts" })
      .then(handleAccountsChanged)
      .catch((err: any) => console.error("초기 계정 로드 실패:", err));

    window.ethereum.request({ method: "eth_chainId" })
      .then(handleChainChanged)
      .catch((err: any) => console.error("초기 체인 ID 로드 실패:", err));

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum && window.ethereum.removeListener) { 
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [fetchAll, address]);

  // address나 network가 변경될 때 fetchAll 호출 (이전 useEffect와 목적은 동일하나, 분리하여 관리)
  useEffect(() => {
    if (address && ethers.isAddress(address)) {
      fetchAll();
    }
  }, [address, network, fetchAll]);

  // 네트워크 선택 드롭다운 변경 핸들러 (사용자가 드롭다운을 변경할 때 호출됨)
  const onNetworkSelectChange = useCallback(async (key: string) => { 
    const selectedNetwork = NETWORKS.find((n) => n.key === key);
    if (!selectedNetwork) return;

    const switchedSuccessfully = await switchNetworkInMetaMask(selectedNetwork);
    if (switchedSuccessfully) {
      setNetwork(selectedNetwork);
      localStorage.setItem(LOCAL_STORAGE_KEY_NETWORK, selectedNetwork.key); // ✅ 변경: LOCAL_STORAGE_KEY_NETWORK는 전역 상수
      setERC20s([]);
      setNativeBalance("");
      setPolLinkBalances({});
      setNFTs([]);
      setNativeRecipient("");
      setNativeAmount("");
      setErc20Recipients({});
      setErc20Amounts({});
      setNftRecipients({});
    } else {
      alert("MetaMask에서 네트워크 전환에 실패했습니다. MetaMask에서 직접 해당 네트워크로 전환해 주세요.");
    }
  }, [switchNetworkInMetaMask]); 

  // MetaMask 연결 버튼 클릭 핸들러
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert("메타마스크가 설치되어 있지 않습니다. https://metamask.io/ 에서 설치해주세요.");
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        localStorage.setItem(LOCAL_STORAGE_KEY_ADDRESS, accounts[0]); // ✅ 변경: LOCAL_STORAGE_KEY_ADDRESS는 전역 상수
          
        const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
        // ✅ 변경: isChainIdMatch 유틸 함수 사용
        if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) { 
          const switched = await switchNetworkInMetaMask(network);
          if (!switched) {
            alert(`경고: MetaMask 네트워크가 DApp의 현재 설정(${network.name})과 다릅니다. MetaMask에서 직접 ${network.name}으로 전환하거나, DApp의 네트워크 선택 드롭다운을 사용하여 전환해주세요.`);
            return; 
          }
          await new Promise(resolve => setTimeout(resolve, 1500)); 
        }
        fetchAll(); 
      }
    } catch (err: any) {
      console.error("메타마스크 연결 실패:", err);
      alert(`메타마스크 연결 실패: ${err.message || err}`);
    }
  };
  
  // 네이티브 코인 전송 함수
  const sendNativeCoin = async () => {
    if (!address) return alert("지갑을 먼저 연결하세요.");
    if (!ethers.isAddress(nativeRecipient)) return alert("받는 주소가 유효하지 않습니다.");
    if (!nativeAmount || isNaN(Number(nativeAmount)) || Number(nativeAmount) <= 0) return alert("전송 수량이 유효하지 않습니다.");

    if (!window.ethereum) {
      setTransferFeedback("메타마스크가 설치되어 있지 않습니다.");
      return;
    }

    const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
    // ✅ 변경: isChainIdMatch 유틸 함수 사용
    if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) { 
        setTransferLoading(true);
        setTransferFeedback(`MetaMask 네트워크가 ${network.name}과(와) 다릅니다. 전환을 시도합니다. MetaMask 팝업을 확인해주세요.`);
        const switched = await switchNetworkInMetaMask(network);
        setTransferLoading(false);
        if (!switched) {
            setTransferFeedback(`네이티브 코인 전송 실패: MetaMask 네트워크를 ${network.name}으로 전환해야 합니다. 수동으로 전환 후 다시 시도해주세요.`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        const afterSwitchChainId = await window.ethereum.request({ method: 'eth_chainId' });
        // ✅ 변경: isChainIdMatch 유틸 함수 사용
        if (!isChainIdMatch(afterSwitchChainId, network.chainId)) { 
            setTransferFeedback(`네트워크 전환 실패: MetaMask가 여전히 ${network.name}으로 전환되지 않았습니다. 수동으로 전환 후 다시 시도해주세요.`);
            return;
        }
    }

    try {
      setTransferLoading(true);
      setTransferFeedback("전송 중...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // ✅ 변경: signer.provider?.getNetwork() 방식으로 변경 (ethers v6 호환)
      const networkInfo = await signer.provider?.getNetwork();
      const signerChainId = networkInfo?.chainId?.toString() ?? ""; // ChainId를 문자열로 가져옴
      
      // ✅ 변경: isChainIdMatch 유틸 함수 사용
      if (!isChainIdMatch(signerChainId, network.chainId)) { 
        console.error(`[Signer Check Failed] Final signerChainId: ${signerChainId}, DApp network.chainId: ${network.chainId}`);
        setTransferFeedback(`전송 실패: Signer의 네트워크가 ${network.name}과 일치하지 않습니다. MetaMask를 다시 확인하고 DApp을 새로고침해주세요.`);
        setTransferLoading(false);
        return;
      }

      const tx = await signer.sendTransaction({
        to: nativeRecipient,
        value: ethers.parseEther(nativeAmount),
      });
      await tx.wait();
      setTransferFeedback(`전송 완료! TX: ${tx.hash}`);
      fetchAll();
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
    if (!ethers.isAddress(recipient)) return alert("받는 주소가 유효하지 않습니다.");
    if (!ethers.isAddress(contractAddr)) return alert("토큰 주소가 유효하지 않습니다.");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return alert("수량을 입력해주세요.");

    if (!window.ethereum) {
      setTransferFeedback("메타마스크가 설치되어 있지 않습니다.");
      return;
    }

    const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
    // ✅ 변경: isChainIdMatch 유틸 함수 사용
    if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) {
        setTransferLoading(true);
        setTransferFeedback(`MetaMask 네트워크가 ${network.name}과(와) 다릅니다. 전환을 시도합니다. MetaMask 팝업을 확인해주세요.`);
        const switched = await switchNetworkInMetaMask(network);
        setTransferLoading(false);
        if (!switched) {
            setTransferFeedback(`ERC20 전송 실패: MetaMask 네트워크를 ${network.name}으로 전환해야 합니다. 수동으로 전환 후 다시 시도해주세요.`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        const afterSwitchChainId = await window.ethereum.request({ method: 'eth_chainId' });
        // ✅ 변경: isChainIdMatch 유틸 함수 사용
        if (!isChainIdMatch(afterSwitchChainId, network.chainId)) { 
            setTransferFeedback(`네트워크 전환 실패: MetaMask가 여전히 ${network.name}으로 전환되지 않았습니다. 수동으로 전환 후 다시 시도해주세요.`);
            return;
        }
    }

    try {
      setTransferLoading(true); setTransferFeedback("ERC20 전송 중...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // ✅ 변경: signer.provider?.getNetwork() 방식으로 변경 (ethers v6 호환)
      const networkInfo = await signer.provider?.getNetwork();
      const signerChainId = networkInfo?.chainId?.toString() ?? "";
      
      // ✅ 변경: isChainIdMatch 유틸 함수 사용
      if (!isChainIdMatch(signerChainId, network.chainId)) { 
        console.error(`[Signer Check Failed] Final signerChainId: ${signerChainId}, DApp network.chainId: ${network.chainId}`);
        setTransferFeedback(`ERC20 전송 실패: Signer의 네트워크가 ${network.name}과 일치하지 않습니다. MetaMask를 다시 확인하고 DApp을 새로고침해주세요.`);
        setTransferLoading(false);
        return;
      }
      
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
        console.log(`[ERC20] 토큰 decimals 조회 성공: ${decimals}, 심볼: ${tokenSymbol}`);
      } catch (decimalsErr: any) {
        console.error("[ERC20] decimals() 또는 symbol() 호출 실패:", decimalsErr);
        let decimalsErrorMessage = `ERC20 전송 실패: 토큰 컨트랙트(${contractAddr})에서 토큰 정보를 가져올 수 없습니다.`;
        if (decimalsErr.code === 'BAD_DATA' && decimalsErr.value === '0x') {
            decimalsErrorMessage += ` (데이터 디코딩 실패: '0x' 반환. 컨트랙트가 해당 네트워크에 배포되었는지 확인)`;
        } else if (decimalsErr.code === 'CALL_EXCEPTION') {
            decimalsErrorMessage += ` (컨트랙트 호출 실패. ERC20 표준 컨트랙트가 맞는지 확인)`;
        } else if (decimalsErr.message && decimalsErr.message.includes("invalid ENS name")) {
            decimalsErrorMessage += ` (잘못된 RPC 또는 컨트랙트 주소 형식)`;
        }
        decimalsErrorMessage += ` 네트워크와 컨트랙트 주소를 다시 확인해주세요. 오류: ${decimalsErr.message || decimalsErr}`;
        
        setTransferFeedback(decimalsErrorMessage);
        setTransferLoading(false);
        return;
      }
      
      const parsedAmount = ethers.parseUnits(amount, decimals);
      console.log(`[ERC20] 전송될 파싱된 수량: ${parsedAmount.toString()}`);
      
      const tx = await contract.transfer(recipient, parsedAmount);
      await tx.wait();
      setTransferFeedback(`${tokenSymbol} 토큰 전송 완료! TX: ${tx.hash}`); 
      fetchAll();
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
    if (!ethers.isAddress(recipient)) return alert("받는 주소가 유효하지 않습니다.");
    if (!ethers.isAddress(contractAddr)) return alert("NFT 주소가 유효하지 않습니다.");
    if (!tokenId) return alert("토큰 ID가 유효하지 않습니다.");

    if (!window.ethereum) {
      setTransferFeedback("메타마스크가 설치되어 있지 않습니다.");
      return;
    }

    const currentMetaMaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
    // ✅ 변경: isChainIdMatch 유틸 함수 사용
    if (!isChainIdMatch(currentMetaMaskChainId, network.chainId)) { 
        setTransferLoading(true);
        setTransferFeedback(`MetaMask 네트워크가 ${network.name}과(와) 다릅니다. 전환을 시도합니다. MetaMask 팝업을 확인해주세요.`);
        const switched = await switchNetworkInMetaMask(network);
        setTransferLoading(false);
        if (!switched) {
            setTransferFeedback(`NFT 전송 실패: MetaMask 네트워크를 ${network.name}으로 전환해야 합니다. 수동으로 전환 후 다시 시도해주세요.`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        const afterSwitchChainId = await window.ethereum.request({ method: 'eth_chainId' });
        // ✅ 변경: isChainIdMatch 유틸 함수 사용
        if (!isChainIdMatch(afterSwitchChainId, network.chainId)) { 
            setTransferFeedback(`네트워크 전환 실패: MetaMask가 여전히 ${network.name}으로 전환되지 않았습니다. 수동으로 전환 후 다시 시도해주세요.`);
            return;
        }
    }

    try {
      setTransferLoading(true); setTransferFeedback("NFT 전송 중...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // ✅ 변경: signer.provider?.getNetwork() 방식으로 변경 (ethers v6 호환)
      const networkInfo = await signer.provider?.getNetwork();
      const signerChainId = networkInfo?.chainId?.toString() ?? "";
      
      // ✅ 변경: isChainIdMatch 유틸 함수 사용
      if (!isChainIdMatch(signerChainId, network.chainId)) { 
        console.error(`[Signer Check Failed] Final signerChainId: ${signerChainId}, DApp network.chainId: ${network.chainId}`);
        setTransferFeedback(`NFT 전송 실패: Signer의 네트워크가 ${network.name}과 일치하지 않습니다. MetaMask를 다시 확인하고 DApp을 새로고침해주세요.`);
        setTransferLoading(false);
        return;
      }

      const erc721Abi = [
        "function safeTransferFrom(address from, address to, uint256 tokenId) public",
        "function name() view returns (string)", 
      ];
      const contract = new ethers.Contract(contractAddr, erc721Abi, signer);
      const nftCollectionName = await contract.name().catch(() => "NFT"); 
      const tx = await contract.safeTransferFrom(address, recipient, tokenId);
      await tx.wait();
      setTransferFeedback(`${nftCollectionName} NFT (ID: ${tokenId}) 전송 완료! TX: ${tx.hash}`); 
      fetchAll();
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
  
  return (
    <div style={{ maxWidth: 540, margin: "40px auto", padding: 24, background: "#222", borderRadius: 14, color: "#fff" }}>
      <h2>🦊 내 지갑 자산 대시보드</h2>
      <div style={{ margin: "10px 0" }}>
        <select
          value={network.key}
          onChange={(e) => {
            onNetworkSelectChange(e.target.value);
          }}
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

      {/* 네이티브 및 LINK 주요 토큰 그룹 */}
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
            style={{ width: "100%", padding: 8, marginBottom: 6 }}
          />
          <input
            type="number"
            placeholder="수량"
            step="any"
            value={nativeAmount}
            onChange={e => setNativeAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 6 }}
          />
          <button
            onClick={sendNativeCoin}
            disabled={transferLoading}
            style={{ width: "100%", padding: 10, backgroundColor: "#007bff", color: "#fff", fontWeight: 600 }}>
            전송
          </button>
        </div>
        {/* Amoy: LINK 전송 추가 */}
        {network.key === "amoy" && (
          <div style={{ marginTop: 15 }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 7 }}>주요 토큰 잔액</div>
            <div style={{ fontSize: 18, marginBottom: 4 }}>
              LINK: <b>{polLinkBalances["LINK"] || "0.0"}</b>
            </div>
            <input
             type="text"
             placeholder="받는 주소"
             value={erc20Recipients[AMOY_TOKENS[1].contractAddress] || ""}
             onChange={e => setErc20Recipients(r => ({ ...r, [AMOY_TOKENS[1].contractAddress]: e.target.value }))}
              style={{ width: "100%", padding: 8, marginBottom: 6 }}
            />
            <input
              type="number"
              placeholder="수량"
              step="any"
              value={erc20Amounts[AMOY_TOKENS[1].contractAddress] || ""}
              onChange={e => setErc20Amounts(r => ({ ...r, [AMOY_TOKENS[1].contractAddress]: e.target.value }))}
              style={{ width: "100%", padding: 8, marginBottom: 10 }}
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
                width: "100%",
                padding: 10,
                borderRadius: 7,
                backgroundColor: "#28a745",
                color: "#fff",
                fontWeight: 600,
                border: "none",
                cursor: "pointer"
              }}>
              {transferLoading ? "전송 중..." : "LINK 전송"}
            </button>
          </div>
        )}
      </div>

      {/* ERC-20 토큰 목록 (Kaia, Sepolia) */}
      {(network.key === "kaia" || network.key === "sepolia") && (
        <div style={{ margin: "22px 0", border: "1px solid #444", padding: 15, borderRadius: 10, background: "#2a2a2a" }}>
          <h3>ERC-20 토큰 목록</h3>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {erc20s.length === 0 && <li style={{ color: "#aaa" }}>표시할 토큰 없음</li>}
            {erc20s.map((t, i) => (
              <li key={i} style={{ borderBottom: "1px solid #333", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{
                  display: "flex", flexDirection: "column"
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{t.name} ({t.symbol})</span>: <b>{t.balance}</b>
                  </div>
                  <input
                    type="text"
                    placeholder="받는 주소"
                    value={erc20Recipients[t.contractAddress] || ""}
                    onChange={e => setErc20Recipients(r => ({ ...r, [t.contractAddress]: e.target.value }))}
                    style={{ width: "100%", padding: 8, marginTop: 5 }}
                  />
                  <input
                    type="number"
                    placeholder="수량"
                    value={erc20Amounts[t.contractAddress] || ""}
                    onChange={e => setErc20Amounts(r => ({ ...r, [t.contractAddress]: e.target.value }))}
                    style={{ width: "100%", padding: 8, marginBottom: 5 }}
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
                    style={{ width: "100%", padding: 10, backgroundColor: "#28a745", color: "#fff", fontWeight: 600 }}>
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
                <div style={{ fontSize: 13, color: "#bbb" }}>컨트랙트: {nft.contract.address}</div>
                <div style={{ fontSize: 13, color: "#bbb" }}>토큰 ID: {nft.tokenId}</div>
                {nft.imageUrl && (
                  <img src={nft.imageUrl} alt={nft.title || "NFT"} width={100} style={{ marginTop: 8, borderRadius: 6 }} />
                )}
                <input
                  type="text"
                  placeholder="받는 지갑 주소"
                  value={nftRecipients[nftKey] || ""}
                  onChange={e => setNftRecipients(r => ({ ...r, [nftKey]: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
                <button
                  onClick={() => {
                    sendNFT(nft.contract.address, nft.tokenId);
                  }}
                  disabled={
                    transferLoading ||
                    !address ||
                    !nftRecipients[nftKey] ||
                    !nft.contract.address ||
                    !nft.tokenId 
                  }
                  style={{ width: "100%", padding: 10, backgroundColor: "#dc3545", color: "#fff", fontWeight: 600, marginTop: 5 }}>
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