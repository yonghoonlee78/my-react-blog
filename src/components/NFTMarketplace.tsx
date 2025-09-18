import React, { useState, useEffect } from 'react';
import { ethers, BrowserProvider, JsonRpcSigner, parseEther, EventLog } from 'ethers';
import './NFTMarketplace.css';

// Enhanced ABI import
import EnhancedNFTMarketplaceABI from '../abi/EnhancedNFTMarketplace.json';
import MyNFTABI from '../abi/MyNFT.json';

interface NFTItem {
  listingId: number;
  tokenId: number;
  name: string;
  description: string;
  image: string;
  price: string;
  seller: string;
  isAuction: boolean;
  minBid?: string;
  auctionEndTime?: number;
  auctionStartTime?: number;
  highestBid?: string;
  highestBidder?: string;
  bidCount?: number;
  isListed?: boolean;
  actualListingId?: number;
}

interface BidHistoryItem {
  bidder: string;
  amount: string;
  timestamp: number;
  blockNumber: number;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface AdminStats {
  totalListings: number;
  activeListings: number;
  totalVolume: string;
  totalFees: string;
  pendingWithdrawal: string;
  cancelledBids: number;
}

interface FeeStructure {
  buyNowFee: string;
  bidFee: string;
  cancelBidFee: string;
  auctionWinFee: string;
}

const NFTMarketplace: React.FC = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string>('');
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'marketplace' | 'admin'>('marketplace');
  const [marketplaceTab, setMarketplaceTab] = useState<'all' | 'sale' | 'auction'>('all');
  const [adminTab, setAdminTab] = useState<'overview' | 'listings' | 'settings' | 'fees'>('overview');
  const [bidAmounts, setBidAmounts] = useState<{ [key: number]: string }>({});
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [bidHistory, setBidHistory] = useState<{ [key: number]: BidHistoryItem[] }>({});
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);

  const [stats, setStats] = useState<AdminStats>({
    totalListings: 0,
    activeListings: 0,
    totalVolume: "0",
    totalFees: "0",
    pendingWithdrawal: "0",
    cancelledBids: 0
  });
  
  const [listingForm, setListingForm] = useState({
    tokenId: '',
    price: '',
    isAuction: false,
    minBid: '',
    auctionDuration: '24'
  });
  
  const [feeStructure, setFeeStructure] = useState<FeeStructure>({
    buyNowFee: "2.5",
    bidFee: "1.0",
    cancelBidFee: "0.5",
    auctionWinFee: "3.0"
  });

  const NFT_ADDRESS = process.env.REACT_APP_NFT_ADDRESS || '0x5d84a217Cc17b89a2FcB1DC02331663CA722d761';
  const MARKETPLACE_ADDRESS = process.env.REACT_APP_MARKETPLACE_ADDRESS || '0x928113Da9b82A3f78F2e4B40186A4389FeE610C5';
  const OWNER_ADDRESS = process.env.REACT_APP_OWNER_ADDRESS || '0xC5368a09BB0aa8B6AFaEEe6A5F84873A070aD7a1';

  const getAuctionProgress = (auctionStartTime?: number, auctionEndTime?: number): number => {
    if (!auctionEndTime || !auctionStartTime) return 0;
    
    const now = Date.now();
    
    if (now >= auctionEndTime) return 100;
    if (now <= auctionStartTime) return 0;
    
    const totalDuration = auctionEndTime - auctionStartTime;
    const elapsed = now - auctionStartTime;
    const progress = (elapsed / totalDuration) * 100;
    
    return Math.min(100, Math.max(0, Math.round(progress)));
  };

  const openExplorer = (address: string, type: 'address' | 'tx' = 'address') => {
    const baseUrl = 'https://sepolia.etherscan.io';
    const url = type === 'tx' ? `${baseUrl}/tx/${address}` : `${baseUrl}/address/${address}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const closeModal = () => {
    setShowModal(false);
    document.body.classList.remove('modal-open');
  };

  const resetApprovalAndApprove = async (tokenId: number) => {
    if (!signer) return false;
    
    try {
      const nftContract = new ethers.Contract(NFT_ADDRESS, MyNFTABI, signer);
      
      console.log("기존 승인 초기화 중...");
      const resetTx = await nftContract.approve(ethers.ZeroAddress, tokenId);
      await resetTx.wait();
      console.log("승인 초기화 완료");
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("새 마켓플레이스로 승인 중...");
      const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, tokenId);
      await approveTx.wait();
      console.log("재승인 완료");
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newApproved = await nftContract.getApproved(tokenId);
      console.log("최종 승인된 주소:", newApproved);
      
      return newApproved.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase();
    } catch (error) {
      console.error("승인 리셋 실패:", error);
      return false;
    }
  };

  const setApprovalForAll = async () => {
    if (!signer) return false;
    
    try {
      const nftContract = new ethers.Contract(NFT_ADDRESS, MyNFTABI, signer);
      
      console.log("setApprovalForAll 진행 중...");
      const setApprovalTx = await nftContract.setApprovalForAll(MARKETPLACE_ADDRESS, true);
      await setApprovalTx.wait();
      console.log("setApprovalForAll 완료");
      
      const signerAddress = await signer.getAddress();
      const isApproved = await nftContract.isApprovedForAll(signerAddress, MARKETPLACE_ADDRESS);
      console.log("ApprovalForAll 상태:", isApproved);
      
      return isApproved;
    } catch (error) {
      console.error("setApprovalForAll 실패:", error);
      return false;
    }
  };

  const getBidHistory = async (listingId: number): Promise<BidHistoryItem[]> => {
    if (!provider) return [];
    
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, provider);
      const filter = marketplace.filters.BidPlaced(listingId);
      const events = await marketplace.queryFilter(filter);
      
      const bidHistory: BidHistoryItem[] = [];
      
      for (const event of events) {
        if ('args' in event && event.args) {
          const block = await provider.getBlock(event.blockNumber);
          bidHistory.push({
            bidder: event.args.bidder,
            amount: ethers.formatEther(event.args.amount),
            timestamp: block ? block.timestamp : 0,
            blockNumber: event.blockNumber
          });
        }
      }
      
      return bidHistory.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('입찰 내역 로드 실패:', error);
      return [];
    }
  };

  const getHighestBidInfo = async (listingId: number) => {
    if (!provider) return { bidder: '', amount: '0', bidCount: 0 };
    
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, provider);
      const listing = await marketplace.listings(listingId);
      const bidHistory = await getBidHistory(listingId);
      
      return {
        bidder: listing.highestBidder || '',
        amount: listing.highestBid ? ethers.formatEther(listing.highestBid) : '0',
        bidCount: bidHistory.length || 0
      };
    } catch (error) {
      console.error('최고 입찰 정보 로드 실패:', error);
      return { bidder: '', amount: '0', bidCount: 0 };
    }
  };

  const loadFeeStructure = async () => {
    if (!provider) return;
    
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, provider);
      
      const [buyNowFee, bidFee, cancelBidFee, auctionWinFee] = await Promise.all([
        marketplace.buyNowFeePercentage(),
        marketplace.bidFeePercentage(),
        marketplace.cancelBidFeePercentage(),
        marketplace.auctionWinFeePercentage()
      ]);
      
      setFeeStructure({
        buyNowFee: (Number(buyNowFee) / 100).toFixed(1),
        bidFee: (Number(bidFee) / 100).toFixed(1),
        cancelBidFee: (Number(cancelBidFee) / 100).toFixed(1),
        auctionWinFee: (Number(auctionWinFee) / 100).toFixed(1)
      });
    } catch (error) {
      console.error('수수료 구조 로드 실패:', error);
    }
  };

  const checkOwnership = async (signer: JsonRpcSigner) => {
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const owner = await marketplace.owner();
      const currentAccount = await signer.getAddress();
      
      setIsOwner(owner.toLowerCase() === currentAccount.toLowerCase());
    } catch (error) {
      console.error('소유권 확인 실패:', error);
      setIsOwner(false);
    }
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const web3Provider = new BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = await web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(signer);
        setAccount(await signer.getAddress());
        
        await checkOwnership(signer);
        
        const network = await web3Provider.getNetwork();
        if (network.chainId !== 11155111n) {
          alert('Sepolia 테스트넷으로 변경해주세요!');
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        }
      }
    } catch (error) {
      console.error('지갑 연결 실패:', error);
      alert('지갑 연결에 실패했습니다.');
    }
  };

  const findActiveListingByTokenId = async (tokenId: number, marketplace: ethers.Contract) => {
    try {
      for (let listingId = 1; listingId < 100; listingId++) {
        try {
          const listing = await marketplace.listings(listingId);
          
          if (listing && 
              listing.tokenId !== undefined &&
              listing.tokenId.toString() === tokenId.toString() && 
              listing.active === true) {
            return { 
              listingId: listingId.toString(), 
              listing: {
                seller: listing.seller,
                nftContract: listing.nftContract,
                tokenId: listing.tokenId,
                price: listing.price,
                minBid: listing.minBid || listing.price,
                isAuction: listing.isAuction,
                auctionEndTime: listing.auctionEndTime,
                active: listing.active
              }
            };
          }
        } catch (err) {
          break;
        }
      }
    } catch (error) {
      console.error('리스팅 검색 실패:', error);
    }
    return null;
  };

  const loadNFTs = async () => {
    if (!provider) return;
    
    setLoading(true);
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, provider);
      const nftContract = new ethers.Contract(NFT_ADDRESS, MyNFTABI, provider);
      
      const dragonNFTs: NFTItem[] = [];
      
      for (let tokenId = 6; tokenId < 9; tokenId++) { 
        try {
          const owner = await nftContract.ownerOf(tokenId);
          
          const dragonNames = ["Fire Armor Dragon", "Fire Sword Dragon", "Ice Armor Dragon"];
          const dragonDescriptions = [
            "A legendary fire dragon with mystical armor. This powerful creature guards ancient treasures with its blazing flames.",
            "A fierce fire dragon wielding the power of ancient flames. Its dual heads breathe devastating fire that can melt any armor.",
            "A majestic ice dragon protected by frozen armor. This arctic beast commands the power of eternal winter and frozen storms."
          ];
          const dragonImages = [
            "https://gateway.pinata.cloud/ipfs/QmSLpwRusFmKexiak6hXB8gGNXSMSKqSLAZa6Fyv6biiLB",
            "https://gateway.pinata.cloud/ipfs/QmNPEtFP6Xn5DkoX9Z3JW82eQXPq1SviedTSFWt1sPapuL", 
            "https://gateway.pinata.cloud/ipfs/QmZYcicTnNCv7S6jKHjkampRoaqivKBBEgcKgXfSRPJ7Cq"
          ];
          const dragonPrices = ["0.01", "0.02", "0.015"];
          
          const index = tokenId % 3;
          
          const nftData: NFTItem = {
            listingId: tokenId,
            tokenId: tokenId,
            name: dragonNames[index],
            description: dragonDescriptions[index],
            image: dragonImages[index],
            price: dragonPrices[index],
            seller: owner,  // 현재 소유자
            isAuction: false,
            isListed: false,
            minBid: "0.01",
            actualListingId: undefined
          };
          
          const activeListing = await findActiveListingByTokenId(tokenId, marketplace);
          if (activeListing) {
            nftData.isListed = true;
            nftData.actualListingId = parseInt(activeListing.listingId);
            nftData.isAuction = activeListing.listing.isAuction;
            
            if (activeListing.listing.isAuction) {
              nftData.minBid = ethers.formatEther(activeListing.listing.minBid);
              nftData.auctionEndTime = Number(activeListing.listing.auctionEndTime) * 1000;
              
              const currentTime = Date.now();
              const endTime = nftData.auctionEndTime;
              
              if (endTime > currentTime) {
                nftData.auctionStartTime = endTime - (24 * 60 * 60 * 1000);
              } else {
                nftData.auctionStartTime = endTime - (24 * 60 * 60 * 1000);
              }
              
              const bidInfo = await getHighestBidInfo(parseInt(activeListing.listingId));
              nftData.highestBid = bidInfo.amount;
              nftData.highestBidder = bidInfo.bidder;
              nftData.bidCount = bidInfo.bidCount;
            } else {
              nftData.price = ethers.formatEther(activeListing.listing.price);
            }
          }
          
          dragonNFTs.push(nftData);
        } catch (error) {
          console.log(`Token ${tokenId} not found, skipping...`);
          continue;
        }
      }

      setNfts(dragonNFTs);
    } catch (error) {
      console.error('NFT 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!provider || !signer) return;
    
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      
      let totalCount = 0;
      let activeCount = 0;
      
      for (let i = 1; i < 100; i++) {
        try {
          const listing = await marketplace.listings(i);
          if (listing && listing.seller && listing.seller !== ethers.ZeroAddress) {
            totalCount++;
            if (listing.active) {
              activeCount++;
            }
          }
        } catch {
          break;
        }
      }

          // 실제 컨트랙트에서 수수료 잔액 가져오기
    const contractBalance = await provider.getBalance(MARKETPLACE_ADDRESS);
    
    // 거래 이벤트에서 총 거래량 계산
    const soldFilter = marketplace.filters.NFTSold();
    const soldEvents = await marketplace.queryFilter(soldFilter);
    
    let totalVolumeWei = 0n;
    for (const event of soldEvents) {
      if ('args' in event && event.args) {
        totalVolumeWei += event.args.price;
      }
    }

    setStats({
      totalListings: totalCount,
      activeListings: activeCount,
      totalVolume: ethers.formatEther(totalVolumeWei),
      totalFees: ethers.formatEther(contractBalance),  // 컨트랙트 잔액 = 누적 수수료
      pendingWithdrawal: ethers.formatEther(contractBalance),  // 인출 가능 금액
      cancelledBids: 0
    });
  } catch (error) {
    console.error('통계 로딩 실패:', error);
  }
};

  const createFixedPriceListing = async (tokenId: number, price: string) => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");
    
    // 가격 유효성 검사
    if (!price || parseFloat(price) <= 0) {
      return alert("올바른 가격을 입력해주세요!");
    }

    console.log(`[재판매] Token #${tokenId}를 ${price} ETH로 등록 시작`);

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const nftContract = new ethers.Contract(NFT_ADDRESS, MyNFTABI, signer);

      // 소유권 확인
      const owner = await nftContract.ownerOf(tokenId);
      const signerAddress = await signer.getAddress();
      
      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        return alert("이 NFT의 소유자가 아닙니다!");
      }

      console.log(`[재판매] 소유권 확인 완료. 소유자: ${owner}`);

      // 승인 처리
      const currentApproved = await nftContract.getApproved(tokenId);
      const isApprovedForAll = await nftContract.isApprovedForAll(signerAddress, MARKETPLACE_ADDRESS);

      if (!isApprovedForAll && currentApproved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        console.log("[재판매] NFT 승인 필요...");
        const approvalForAllSuccess = await setApprovalForAll();
        if (!approvalForAllSuccess) {
          const resetSuccess = await resetApprovalAndApprove(tokenId);
          if (!resetSuccess) {
            alert("NFT 승인에 실패했습니다.");
            return;
          }
        }
      }

      console.log(`[재판매] 가격 ${price} ETH로 리스팅 생성 중...`);
      
      const createTx = await marketplace.createListing(
        NFT_ADDRESS,
        tokenId,
        parseEther(price),  // 사용자가 입력한 가격
        0,
        false,
        0,
        false,
        { gasLimit: 600000 }
      );

      console.log("[재판매] 트랜잭션 전송:", createTx.hash);
      await createTx.wait();
      
      alert(`성공! NFT가 ${price} ETH로 판매 등록되었습니다!`);
      await loadNFTs();
      await loadStats();
    } catch (error: any) {
      console.error("[재판매] 등록 실패:", error);
      alert(`등록 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const createAuctionListing = async (tokenId: number, minBid: string, duration: number = 24) => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const nftContract = new ethers.Contract(NFT_ADDRESS, MyNFTABI, signer);

      const currentApproved = await nftContract.getApproved(tokenId);
      const signerAddress = await signer.getAddress();
      const isApprovedForAll = await nftContract.isApprovedForAll(signerAddress, MARKETPLACE_ADDRESS);

      if (!isApprovedForAll && currentApproved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        const approvalForAllSuccess = await setApprovalForAll();
        if (!approvalForAllSuccess) {
          const resetSuccess = await resetApprovalAndApprove(tokenId);
          if (!resetSuccess) {
            alert("NFT 승인에 실패했습니다.");
            return;
          }
        }
      }

      const createTx = await marketplace.createListing(
        NFT_ADDRESS,
        tokenId,
        0,
        parseEther(minBid),
        true,
        duration * 3600,
        false,
        { gasLimit: 600000 }
      );

      console.log("경매 등록 트랜잭션:", createTx.hash);
      await createTx.wait();
      
      alert("경매로 등록되었습니다!");
      await loadNFTs();
      await loadStats();
    } catch (error: any) {
      console.error("경매 등록 실패:", error);
      alert(`경매 등록 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const buyNFT = async (tokenId: number) => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");
  
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const activeListing = await findActiveListingByTokenId(tokenId, marketplace);
      
      if (!activeListing) {
        alert("이 NFT는 판매 중이 아닙니다.");
        return;
      }
      
      if (activeListing.listing.isAuction) {
        alert("이 NFT는 경매 전용입니다. 입찰을 통해 구매해주세요.");
        return;
      }
  
      const tx = await marketplace.buyNFT(activeListing.listingId, {
        value: activeListing.listing.price
      });
      console.log("구매 트랜잭션:", tx.hash);
      await tx.wait();
  
      alert("NFT 구매 완료!");
      await loadNFTs();
      
      // 관리자인 경우에만 통계 업데이트
      if (isOwner) {
        await loadStats();
      }
    } catch (error: any) {
      console.error("구매 실패:", error);
      alert(`구매 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const placeBid = async (tokenId: number, bidAmount: string) => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");
    
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      return alert("올바른 입찰 금액을 입력해주세요!");
    }

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const activeListing = await findActiveListingByTokenId(tokenId, marketplace);
      
      if (!activeListing) {
        alert("이 NFT는 경매가 진행 중이지 않습니다.");
        return;
      }
      
      if (!activeListing.listing.isAuction) {
        alert("이 NFT는 즉시 구매 전용입니다.");
        return;
      }

      if (isOwner) {
        await loadStats();
      }


      const tx = await marketplace.placeBid(activeListing.listingId, {
        value: parseEther(bidAmount),
      });
      await tx.wait();

      alert("입찰 성공!");
      await loadNFTs();
    } catch (error: any) {
      console.error("입찰 실패:", error);
      alert(`입찰 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const cancelBid = async (tokenId: number) => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");
  
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const signerAddress = await signer.getAddress();
      
      const activeListing = await findActiveListingByTokenId(tokenId, marketplace);
      if (!activeListing) {
        alert("이 NFT는 경매가 진행 중이지 않습니다.");
        return;
      }
      
      const listingId = parseInt(activeListing.listingId);
      const listing = await marketplace.listings(listingId);

      const auctionEndTime = Number(listing.auctionEndTime) * 1000;
      if (Date.now() >= auctionEndTime) {
        alert("경매가 이미 종료되었습니다. 입찰을 취소할 수 없습니다.");
        return;
      }
      
      const bidHistoryData = await getBidHistory(listingId);
      const myBid = bidHistoryData.find(bid => 
        bid.bidder.toLowerCase() === signerAddress.toLowerCase()
      );
      
      if (!myBid) {
        alert("이 경매에 입찰한 기록이 없습니다.");
        return;
      }
      
      if (listing.highestBidder && listing.highestBidder.toLowerCase() === signerAddress.toLowerCase()) {
        alert("최고 입찰자는 입찰을 취소할 수 없습니다.");
        return;
      }
      
      const confirmed = window.confirm(
        `입찰을 취소하시겠습니까?\n` +
        `취소 수수료가 차감될 수 있습니다.`
      );
      
      if (confirmed) {
        const tx = await marketplace.cancelBid(listingId, {
          gasLimit: 500000
        });
        console.log("입찰 취소 트랜잭션:", tx.hash);
        await tx.wait();
        
        alert("입찰을 취소했습니다!");
        await loadNFTs();
      }
    } catch (error: any) {
      console.error("입찰 취소 실패:", error);
      
      if (error.message && error.message.includes("Auction ended")) {
        alert("경매가 이미 종료되었습니다.");
      } else {
        alert(`입찰 취소 실패: ${error.reason || error.message || '알 수 없는 오류'}`);
      }
    }
  };

  const cancelNFTListing = async (tokenId: number, listingId: number) => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      
      const tx = await marketplace.cancelListing(listingId);
      console.log("리스팅 취소 트랜잭션:", tx.hash);
      await tx.wait();

      alert("리스팅이 취소되었습니다!");
      await loadNFTs();
      await loadStats();
    } catch (error: any) {
      console.error("리스팅 취소 실패:", error);
      alert(`리스팅 취소 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const convertToAuction = async (tokenId: number, minBidAmount: string) => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      
      const activeListing = await findActiveListingByTokenId(tokenId, marketplace);
      if (activeListing) {
        const cancelTx = await marketplace.cancelListing(activeListing.listingId);
        await cancelTx.wait();
      }

      await createAuctionListing(tokenId, minBidAmount);
    } catch (error: any) {
      console.error("경매 전환 실패:", error);
      alert(`경매 전환 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const updateFee = async (feeType: string, newFee: string) => {
    if (!signer || !isOwner) {
      alert('관리자 권한이 필요합니다.');
      return;
    }
  
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const feeValue = Math.floor(parseFloat(newFee) * 100);
      
      let tx;
      switch (feeType) {
        case 'buyNow':
          tx = await marketplace.setBuyNowFee(feeValue);  // 수정됨
          break;
        case 'bid':
          tx = await marketplace.setBidFee(feeValue);  // 수정됨
          break;
        case 'cancelBid':
          tx = await marketplace.setCancelBidFee(feeValue);  // 수정됨
          break;
        case 'auctionWin':
          tx = await marketplace.setAuctionWinFee(feeValue);  // 수정됨
          break;
        default:
          alert('알 수 없는 수수료 타입입니다.');
          return;
      }
      
      if (tx) {
        console.log("수수료 업데이트 트랜잭션:", tx.hash);
        await tx.wait();
        
        alert(`${feeType} 수수료가 ${newFee}%로 업데이트되었습니다!`);
        await loadFeeStructure();
      }
    } catch (error: any) {
      console.error('수수료 업데이트 실패:', error);
      alert(`수수료 업데이트 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };


  const createListing = async () => {
    if (!signer || !isOwner) {
      alert('관리자 권한이 필요합니다.');
      return;
    }

      // 입력값 검증 추가
  if (!listingForm.tokenId || listingForm.tokenId === '') {
    alert('토큰 ID를 입력해주세요.');
    return;
  }

  if (!listingForm.isAuction) {
    if (!listingForm.price || listingForm.price === '') {
      alert('판매 가격을 입력해주세요.');
      return;
    }
  } else {
    if (!listingForm.minBid || listingForm.minBid === '') {
      alert('최소 입찰가를 입력해주세요.');
      return;
    }
  }

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const nftContract = new ethers.Contract(NFT_ADDRESS, MyNFTABI, signer);
      
      const tokenIdNum = parseInt(listingForm.tokenId);
    
      const currentOwner = await nftContract.ownerOf(tokenIdNum);
      const signerAddress = await signer.getAddress();
  
      
      if (currentOwner.toLowerCase() !== signerAddress.toLowerCase()) {
        alert(`Token #${listingForm.tokenId}의 소유자가 아닙니다.`);
        return;
      }
      
      const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, tokenIdNum);
      await approveTx.wait();
      
      let tx;
      if (listingForm.isAuction) {
        const auctionDurationSeconds = parseInt(listingForm.auctionDuration || '24') * 3600;
        tx = await marketplace.createListing(
          NFT_ADDRESS,
          tokenIdNum,  // 숫자로 변환된 tokenId 사용
          0,
          parseEther(listingForm.minBid),
          true,
          auctionDurationSeconds,
          false
        );
      } else {
        tx = await marketplace.createListing(
          NFT_ADDRESS,
          tokenIdNum,  // 숫자로 변환된 tokenId 사용
          parseEther(listingForm.price),
          0,
          false,
          0,
          false
        );
      }
      
      alert('리스팅 생성 트랜잭션이 전송되었습니다.');
      await tx.wait();
      alert('NFT 리스팅이 생성되었습니다!');
      
      setListingForm({
        tokenId: '',
        price: '',
        isAuction: false,
        minBid: '',
        auctionDuration: '24'
      });
      
      await loadNFTs();
      await loadStats();
    } catch (error: any) {
      console.error('리스팅 생성 실패:', error);
      alert(`리스팅 생성 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const cancelListing = async (nft: NFTItem) => {
    if (!signer || !isOwner) {
      alert('관리자 권한이 필요합니다.');
      return;
    }

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      
      if (nft.actualListingId === undefined) {
        alert('취소할 리스팅이 없습니다.');
        return;
      }
      
      const tx = await marketplace.cancelListing(nft.actualListingId);
      alert('리스팅 취소 트랜잭션이 전송되었습니다.');
      await tx.wait();
      alert('리스팅이 취소되었습니다!');
      
      await loadNFTs();
      await loadStats();
    } catch (error: any) {
      console.error('리스팅 취소 실패:', error);
      alert(`리스팅 취소 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const withdrawFees = async () => {
    if (!signer || !isOwner) {
      alert('관리자 권한이 필요합니다.');
      return;
    }

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      const tx = await marketplace.withdrawFees();
      
      alert('수수료 인출 트랜잭션이 전송되었습니다.');
      await tx.wait();
      alert('수수료 인출이 완료되었습니다!');
      
      await loadStats();
    } catch (error: any) {
      console.error('수수료 인출 실패:', error);
      alert(`수수료 인출 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const withdrawFunds = async () => {
    if (!signer) return alert("먼저 지갑을 연결해주세요!");

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, EnhancedNFTMarketplaceABI, signer);
      
      const signerAddress = await signer.getAddress();
      const pendingAmount = await marketplace.pendingWithdrawals(signerAddress);
      
      if (pendingAmount === 0n) {
        alert("인출 가능한 금액이 없습니다.");
        return;
      }
      
      const tx = await marketplace.withdrawFunds();
      console.log("환불 인출 트랜잭션:", tx.hash);
      await tx.wait();

      alert(`${ethers.formatEther(pendingAmount)} ETH가 인출되었습니다!`);
    } catch (error: any) {
      console.error("환불 인출 실패:", error);
      alert(`환불 인출 실패: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const handleNFTClick = async (nft: NFTItem) => {
    setSelectedNFT(nft);
    document.body.classList.add('modal-open');

    if (nft.isAuction && nft.actualListingId) {
      const history = await getBidHistory(nft.actualListingId);
      setBidHistory({ [nft.tokenId]: history });
    }
    
    try {
      if (provider) {
        const nftContract = new ethers.Contract(NFT_ADDRESS, MyNFTABI, provider);
        const tokenURI = await nftContract.tokenURI(nft.tokenId);
        
        const ipfsGateway = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        const response = await fetch(ipfsGateway);
        const fetchedMetadata = await response.json();
        
        setMetadata(fetchedMetadata);
      }
    } catch (error) {
      console.error('메타데이터 로드 실패:', error);
      const mockMetadata: NFTMetadata = {
        name: nft.name,
        description: nft.description,
        image: nft.image,
        attributes: [
          { trait_type: "Type", value: nft.name.includes("Fire") ? "Fire Dragon" : "Ice Dragon" },
          { trait_type: "Class", value: nft.name.includes("Armor") ? "Armor" : "Warrior" },
          { trait_type: "Rarity", value: "Legendary" },
          { trait_type: "Attack Power", value: 85 },
          { trait_type: "Defense Power", value: 95 },
          { trait_type: "Speed", value: 65 },
          { trait_type: "Special Ability", value: nft.name.includes("Fire") ? "Flame Shield" : "Frost Barrier" }
        ]
      };
      setMetadata(mockMetadata);
    }
    
    setShowModal(true);
  };

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (provider) {
      loadNFTs();
      loadFeeStructure();
      if (isOwner) loadStats();
    }
  }, [provider, isOwner]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNfts(prevNfts => [...prevNfts]);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (provider && isOwner) {
      loadStats();
      
      // 30초마다 통계 업데이트
      const statsInterval = setInterval(() => {
        loadStats();
      }, 30000);
      
      return () => clearInterval(statsInterval);
    }
  }, [provider, isOwner]);

  const filteredNFTs = nfts.filter(nft => {
    if (marketplaceTab === 'all') return true;
    if (marketplaceTab === 'sale') return !nft.isAuction;
    if (marketplaceTab === 'auction') return nft.isAuction;
    return true;
  });

  return (
    <div className="nft-marketplace">
      <div className="marketplace-header">
        <h1>NFT Marketplace</h1>
        <div className="wallet-info">
          {account ? (
            <div className="account-info">
              <span className="account-badge">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              {isOwner && <span className="owner-badge">ADMIN</span>}
            </div>
          ) : (
            <button className="btn-connect" onClick={connectWallet}>
              지갑 연결
            </button>
          )}
        </div>
      </div>

      <div className="main-tab-navigation">
        <button 
          className={selectedTab === 'marketplace' ? 'active' : ''}
          onClick={() => setSelectedTab('marketplace')}
        >
          NFT 마켓
        </button>
        {isOwner && (
          <button 
            className={selectedTab === 'admin' ? 'active' : ''}
            onClick={() => setSelectedTab('admin')}
          >
            관리자
          </button>
        )}
      </div>

      {selectedTab === 'marketplace' && (
        <>
          <div className="tab-navigation">
            <button 
              className={marketplaceTab === 'all' ? 'active' : ''}
              onClick={() => setMarketplaceTab('all')}
            >
              전체
            </button>
            <button 
              className={marketplaceTab === 'sale' ? 'active' : ''}
              onClick={() => setMarketplaceTab('sale')}
            >
              즉시 구매
            </button>
            <button 
              className={marketplaceTab === 'auction' ? 'active' : ''}
              onClick={() => setMarketplaceTab('auction')}
            >
              경매
            </button>
          </div>

          {loading ? (
            <div className="loading">NFT 로딩중...</div>
          ) : (
            <div className="nft-grid">
              {filteredNFTs.map((nft) => (
                <div key={nft.tokenId} className="nft-card" onClick={() => handleNFTClick(nft)} style={{ cursor: 'pointer' }}>
                  <div className="nft-image">
                    <img src={nft.image} alt={nft.name} />
                    
                    {nft.isListed && !nft.isAuction && (
                      <div className="sale-badge" style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#22c55e',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>판매중</div>
                    )}
                    
                    {nft.isAuction && (
                      <div className="auction-badge" style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#f59e0b',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>경매</div>
                    )}
                  </div>

                  <div className="nft-info">
                    <h3>{nft.name}</h3>
                    <p className="description">{nft.description}</p>
                    <div className="nft-meta">
                      <span className="token-id">Token #{nft.tokenId}</span>
                      <span className="seller">
                        소유자: {nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}
                      </span>
                    </div>

                    <div className="hybrid-section">
                      {nft.isAuction ? (
                        <>
                          <div className="price-info">
                            <span>최소 입찰가: {nft.minBid} ETH</span>
                            {nft.highestBid && parseFloat(nft.highestBid) > 0 && (
                              <span>현재 최고가: {nft.highestBid} ETH</span>
                            )}
                          </div>

                          {nft.bidCount && nft.bidCount > 0 ? (
                            <>
                              <div style={{
                                height: '4px',
                                background: '#374151',
                                borderRadius: '2px',
                                marginBottom: '8px',
                                marginTop: '10px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%',
                                  width: `${getAuctionProgress(nft.auctionStartTime, nft.auctionEndTime)}%`,
                                  background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                                  borderRadius: '2px',
                                  transition: 'width 0.3s ease'
                                }}></div>
                              </div>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '12px',
                                marginBottom: '8px'
                              }}>
                                <span style={{ color: '#ef4444', fontWeight: '600' }}>
                                  🔥 활성 경매
                                </span>
                              </div>
                            </>
                          ) : (
                            <div style={{
                              marginTop: '10px',
                              padding: '8px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              borderRadius: '6px',
                              textAlign: 'center',
                              fontSize: '12px',
                              color: '#ef4444'
                            }}>
                              🔔 첫 입찰을 기다리는 중
                            </div>
                          )}
                          
                          {account && nft.seller.toLowerCase() === account.toLowerCase() ? (
                            <button onClick={(e) => {
                              e.stopPropagation();
                              if (nft.actualListingId !== undefined) {
                                cancelNFTListing(nft.tokenId, nft.actualListingId);
                              }
                            }} style={{
                              width: '100%',
                              padding: '8px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}>경매 취소</button>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input
                                type="number"
                                step="0.001"
                                placeholder="입찰 금액"
                                value={bidAmounts[nft.tokenId] || ''}
                                onChange={(e) => setBidAmounts({
                                  ...bidAmounts,
                                  [nft.tokenId]: e.target.value
                                })}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  flex: 2.5,
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                  boxSizing: 'border-box',
                                  textAlign: 'center'
                                }}
                              />
                              <button onClick={(e) => {
                                e.stopPropagation();
                                placeBid(nft.tokenId, bidAmounts[nft.tokenId] || '');
                              }} style={{
                                padding: '8px 12px',
                                background: 'white',
                                color: 'black',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px',
                                minWidth: '60px',
                                maxWidth: '80px',
                                cursor: 'pointer'
                              }}>입찰</button>
                              
                              {account && nft.highestBidder?.toLowerCase() !== account.toLowerCase() ? (
                                <button 
                                  className="btn-bid-cancel"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelBid(nft.tokenId);
                                  }}
                                >
                                  취소
                                </button>
                              ) : (
                                <span className="highest-bidder-badge">최고입찰</span>
                              )}
                            </div>
                          )}
                          
                          {nft.auctionEndTime && (
                            <div style={{ 
                              marginTop: '8px', 
                              fontSize: '12px', 
                              color: '#6b7280',
                              textAlign: 'center' 
                            }}>
                              {Date.now() < nft.auctionEndTime ? (
                                `경매 종료: ${new Date(nft.auctionEndTime).toLocaleString()}`
                              ) : (
                                '경매 종료'
                              )}
                            </div>
                          )}
                        </>

) : (
  <>
    <div className="price-info">
      <span>판매가: {nft.price} ETH</span>
    </div>
    
    {/* 현재 계정이 NFT 소유자인지 확인 */}
    {account && nft.seller.toLowerCase() === account.toLowerCase() ? (
      nft.isListed ? (
        <>
          <button onClick={(e) => {
            e.stopPropagation();
            if (nft.actualListingId !== undefined) {
              cancelNFTListing(nft.tokenId, nft.actualListingId);
            }
          }} style={{
            width: '100%',
            marginBottom: '8px',
            padding: '8px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}>리스팅 취소</button>
          
          <button onClick={(e) => {
            e.stopPropagation();
            const minBid = window.prompt("최소 입찰가를 입력하세요 (ETH):", "0.01");
            if (minBid) {
              convertToAuction(nft.tokenId, minBid);
            }
          }} style={{
            width: '100%',
            padding: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}>경매로 전환</button>
        </>
      ) : (
        <>
         
          
          <button onClick={(e) => {
            e.stopPropagation();
            
            const userInput = window.prompt(
              "원하시는 판매 가격을 입력하세요 (ETH)\n\n" +
              "예시: 0.05, 0.1, 1.0 등\n" +
              `현재 시장 참고가: ${nft.price} ETH`,
              (parseFloat(nft.price) * 2).toFixed(3)
            );
            
            if (userInput !== null) {
              const newPrice = userInput.trim();
              
              if (newPrice && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0) {
                console.log(`[재판매] Token #${nft.tokenId}, 가격: ${newPrice} ETH`);
                createFixedPriceListing(nft.tokenId, newPrice);
              } else {
                alert("올바른 숫자를 입력해주세요. (예: 0.05)");
              }
            }
          }} style={{
            width: '100%',
            height: '40px',
            marginBottom: '8px',
            padding: '0 16px', 
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            display: 'flex',
           alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            원하는가격에 판매
          </button>
          
          <button onClick={(e) => {
            e.stopPropagation();
            const minBid = window.prompt("최소 입찰가를 입력하세요 (ETH):", "0.01");
            const duration = window.prompt("경매 기간을 입력하세요 (시간):", "24");
            if (minBid && duration) {
              createAuctionListing(nft.tokenId, minBid, parseInt(duration));
            }
          }} style={{
            width: '100%',
            height: '40px',
            padding: '0 16px',  
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            경매 등록
          </button>
        </>
      )
    ) : (
      // 다른 사용자가 보는 화면
      nft.isListed ? (
        <button onClick={(e) => {
          e.stopPropagation();
          buyNFT(nft.tokenId);
        }} style={{
          width: '100%',
          padding: '8px',
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px'
        }}>구매하기</button>
      ) : (
        <div style={{
          padding: '8px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          판매 중이 아님
        </div>
      )
    )}
  </>
)}
</div>
</div>
</div>
))}
</div>
)}
</>
)}

{selectedTab === 'admin' && isOwner && (
        <div className="admin-section">
          <div className="admin-tabs">
            <button 
              className={adminTab === 'overview' ? 'active' : ''}
              onClick={() => setAdminTab('overview')}
            >
              통계
            </button>
            <button 
              className={adminTab === 'listings' ? 'active' : ''}
              onClick={() => setAdminTab('listings')}
            >
              리스팅 관리
            </button>
            <button 
              className={adminTab === 'fees' ? 'active' : ''}
              onClick={() => setAdminTab('fees')}
            >
              수수료 관리
            </button>
            <button 
              className={adminTab === 'settings' ? 'active' : ''}
              onClick={() => setAdminTab('settings')}
            >
              컨트랙트
            </button>
          </div>

          <div className="admin-content">
            {adminTab === 'overview' && (
              <div className="overview-section">
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>총 NFT</h3>
                    <div className="stat-value">{nfts.length}</div>
                  </div>
                  <div className="stat-card">
                    <h3>활성리스팅</h3>
                    <div className="stat-value">{stats.activeListings}</div>
                  </div>
                  <div className="stat-card">
                    <h3>총 입찰</h3>
                    <div className="stat-value">{stats.cancelledBids}</div>
                  </div>
                  <div className="stat-card">
                    <h3>총 거래량</h3>
                    <div className="stat-value">{stats.totalVolume} ETH</div>
                  </div>
                </div>

                <div className="withdrawal-section">
                  <div className="withdrawal-card">
                    <h3>인출 가능 수수료</h3>
                    <div className="withdrawal-amount">{stats.pendingWithdrawal} ETH</div>
                    <button 
                      className="btn-withdraw"
                      onClick={withdrawFees}
                      disabled={stats.pendingWithdrawal === "0"}
                    >
                      수수료 인출
                    </button>
                  </div>
                </div>
              </div>
            )}

                {adminTab === 'fees' && (
              <div className="fees-section">
                <h3>수수료 관리</h3>
                <div className="fee-grid">
                  {Object.entries(feeStructure).map(([key, value]) => (
                    <div key={key} className="fee-item">
                      <label>{
                        key === 'buyNowFee' ? '구매' :
                        key === 'bidFee' ? '입찰 참여' :
                        key === 'cancelBidFee' ? '입찰 취소' :
                        key === 'auctionWinFee' ? '낙찰' : key
                      } 수수료:</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={value}
                          onChange={(e) => setFeeStructure({
                            ...feeStructure,
                            [key]: e.target.value
                          })}
                          style={{
                            width: '80px',
                            padding: '4px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px'
                          }}
                        />
                        <span>%</span>
                        <button
                          onClick={() => updateFee(key.replace('Fee', ''), value)}
                          style={{
                            padding: '4px 8px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          업데이트
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


                {adminTab === 'listings' && (
  <div className="listings-section">
    {/* 새 리스팅 생성 폼 삭제 - 활성 리스팅 관리만 유지 */}
                <div className="listings-table">
                  <h3>활성 리스팅 관리</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Token ID</th>
                        <th>이름</th>
                        <th>타입</th>
                        <th>상태</th>
                        <th>가격/입찰가</th>
                        <th>입찰수</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nfts.map((nft) => (
                        <tr key={nft.tokenId}>
                          <td>#{nft.tokenId}</td>
                          <td>{nft.name}</td>
                          <td>
                            <span className={`type-badge ${
                              nft.isAuction ? 'auction' : 'fixed'
                            }`}>
                              {nft.isAuction ? '경매' : '즉시판매'}
                            </span>
                          </td>
                          <td>
                            <span className={nft.isListed ? 'active-status' : 'inactive-status'}>
                              {nft.isListed ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td>
                            {nft.isAuction ? 
                              `${nft.minBid || nft.highestBid} ETH` : 
                              `${nft.price} ETH`
                            }
                          </td>
                          <td>
                            {nft.isAuction ? 
                              `${nft.bidCount || 0}건` : 
                              '즉시구매'
                            }
                          </td>
                          <td>
                            <button 
                              className="btn-cancel"
                              onClick={() => cancelListing(nft)}
                              disabled={!nft.isListed}
                            >
                              취소
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="settings-section">
                <div className="settings-card">
                  <h3>Enhanced 컨트랙트 정보</h3>
                  <div className="contract-info">
                    <div className="info-row">
                      <span>NFT Contract:</span>
                      <span 
                        className="contract-address"
                        onClick={() => openExplorer(NFT_ADDRESS)}
                      >
                        {NFT_ADDRESS}
                      </span>
                    </div>
                    <div className="info-row">
                      <span>Enhanced Marketplace:</span>
                      <span 
                        className="contract-address"
                        onClick={() => openExplorer(MARKETPLACE_ADDRESS)}
                      >
                        {MARKETPLACE_ADDRESS}
                      </span>
                    </div>
                    <div className="info-row">
                      <span>Version:</span>
                      <span>2.0.0 (Enhanced)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

{showModal && selectedNFT && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            
            <div className="modal-header">
              <h2>{selectedNFT.name}</h2>
            </div>
            
            <div className="modal-body">
              <div className="modal-image">
                <img src={selectedNFT.image} alt={selectedNFT.name} />
              </div>
              
              <div className="modal-details">
                <div className="detail-section">
                  <h3>설명</h3>
                  <p>{selectedNFT.description}</p>
                </div>
                
                <div className="detail-section">
                  <h3>기본 정보</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Token ID:</span>
                      <span className="value">#{selectedNFT.tokenId}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Type:</span>
                      <span className="value">
                        {selectedNFT.isAuction ? 'Auction' : 'Fixed Price'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">Owner:</span>
                      <span 
                        className="value clickable-address"
                        onClick={() => openExplorer(selectedNFT.seller)}
                      >
                        {selectedNFT.seller.slice(0, 6)}...{selectedNFT.seller.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedNFT.isAuction && bidHistory[selectedNFT.tokenId] && bidHistory[selectedNFT.tokenId].length > 0 && (
                  <div className="detail-section">
                    <h3>입찰 내역</h3>
                    <div className="bid-history-list">
                      {bidHistory[selectedNFT.tokenId].map((bid, idx) => (
                        <div key={idx} className="bid-history-item" style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px',
                          borderBottom: '1px solid #374151',
                          marginBottom: '8px'
                        }}>
                          <div>
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                              {idx === 0 ? '🏆 최고 입찰자' : `#${idx + 1}`}
                            </span>
                            <div style={{ fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                              {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', color: idx === 0 ? '#f59e0b' : '#fff' }}>
                              {bid.amount} ETH
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                              {new Date(bid.timestamp * 1000).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNFT.isAuction && !bidHistory[selectedNFT.tokenId]?.length && (
                  <div className="detail-section">
                    <h3>입찰 내역</h3>
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#9ca3af'
                    }}>
                      아직 입찰이 없습니다
                    </div>
                  </div>
                )}

                {metadata && (
                  <div className="detail-section">
                    <h3>속성</h3>
                    <div className="attributes-grid">
                      {metadata.attributes.map((attr, index) => (
                        <div key={index} className="attribute-card">
                          <div className="attr-type">{attr.trait_type}</div>
                          <div className="attr-value">{attr.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

export default NFTMarketplace;