import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ethers, JsonRpcProvider } from 'ethers';
import contractAbi from '../abi/ERC721.json'; 

interface NftAsset {
  tokenId: string;
  name: string;
  description: string;
  image: string;
}

const USER_ADDRESS_TO_TRACK = process.env.REACT_APP_USER_ADDRESS_TO_TRACK || "0xf3a9d84E06363a251bE733E8F2bFCa1849b3c512";
const CONTRACT_ADDRESS = process.env.REACT_APP_NFT_CONTRACT_ADDRESS!;
const SEPOLIA_RPC_URL = process.env.REACT_APP_SEPOLIA_RPC_URL;


const IPFS_GATEWAYS = [
  'https://dweb.link/ipfs/',           
  'https://ipfs.io/ipfs/',             
  'https://cloudflare-ipfs.com/ipfs/', 
  'https://gateway.pinata.cloud/ipfs/', 
  'https://nftstorage.link/ipfs/',     
];

const NFTEventListener: React.FC = () => {
  const [liveNfts, setLiveNfts] = useState<NftAsset[]>([]);
  // eventLogs 초기값을 localStorage에서 로드하도록 변경
  const [eventLogs, setEventLogs] = useState<string[]>(() => {
    try {
      const storedLogs = localStorage.getItem('nftEventLogs');
      return storedLogs ? JSON.parse(storedLogs) : [];
    } catch (error) {
      console.error("Failed to parse event logs from localStorage:", error);
      return [];
    }
  }); 
  const [status, setStatus] = useState<string>('초기화 중...');
  const lastBlockChecked = useRef(0);
  const initialLoadBlockCount = 100;
  const [currentOwnedNfts, setCurrentOwnedNfts] = useState<{ count: number; nfts: NftAsset[] | null }>({ count: 0, nfts: null });
  // 새로 추가: 컨트랙트의 총 NFT 발행량을 저장할 상태
  const [totalNftsInContract, setTotalNftsInContract] = useState<number | null>(null);

 
  const convertIpfsToHttp = useCallback((ipfsUri: string): string | null => {
    if (!ipfsUri) return null;
    if (ipfsUri.startsWith('http://') || ipfsUri.startsWith('https://')) {
      return ipfsUri;
    }

    for (const gateway of IPFS_GATEWAYS) {
      if (ipfsUri.startsWith('ipfs://')) {
        return gateway + ipfsUri.substring(7);
      }
    }
    return null;
  }, []);

  const processToken = useCallback(async (tokenId: string) => {
    try {
      if (!SEPOLIA_RPC_URL) {
        console.error("REACT_APP_SEPOLIA_RPC_URL이 .env 파일에 설정되지 않았습니다.");
        return null;
      }
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);

      const tokenURI = await contract.tokenURI(tokenId);
      if (!tokenURI || typeof tokenURI !== 'string') {
        console.warn(`WARN: TokenURI for TokenID ${tokenId} is invalid or null.`, tokenURI);
        return null;
      }

      let metadataUrl: string | null = convertIpfsToHttp(tokenURI);
      if (!metadataUrl) {
        console.error(`ERROR: Failed to convert tokenURI to valid URL for TokenID ${tokenId}:`, tokenURI);
        return null;
      }
      console.log(`DEBUG: Fetching metadata from: ${metadataUrl}`); // 디버깅용 로그

      let metadata: any;
      let metadataResponse: Response | null = null;
      const proxyUrl = 'https://api.allorigins.win/raw?url='; // CORS 프록시

      try {
   
        metadataResponse = await fetch(metadataUrl);
        if (!metadataResponse.ok) {
          console.warn(`WARN: Direct fetch for metadata failed (TokenID: ${tokenId}, URL: ${metadataUrl}). Trying CORS proxy.`);
          metadataResponse = await fetch(`${proxyUrl}${encodeURIComponent(metadataUrl)}`);
        }
      } catch (fetchError) {
  
        console.warn(`WARN: Direct fetch for metadata encountered network error (TokenID: ${tokenId}, URL: ${metadataUrl}):`, fetchError, `. Trying CORS proxy.`);
        metadataResponse = await fetch(`${proxyUrl}${encodeURIComponent(metadataUrl)}`);
      }

      if (!metadataResponse || !metadataResponse.ok) {
        console.error(`메타데이터 가져오기 최종 실패 (TokenID: ${tokenId}, URL: ${metadataUrl}): ${metadataResponse ? metadataResponse.status + ' ' + metadataResponse.statusText : 'Network Error'}`);
        return null;
      }
      metadata = await metadataResponse.json();

      let imageUrl: string | null = null;
      if (metadata.image) {
        imageUrl = convertIpfsToHttp(metadata.image); // 이미지 URL 변환
        if (!imageUrl) {
            console.warn(`WARN: Failed to convert image URL for TokenID ${tokenId}:`, metadata.image);
            imageUrl = ''; 
        }
      } else {
        imageUrl = ''; 
      }
      
      return {
        tokenId: tokenId,
        name: metadata.name || `NFT #${tokenId}`, 
        description: metadata.description || '', 
        image: imageUrl,
      };
    } catch (e) {
      console.error(`실시간 토큰 처리 오류 (TokenID: ${tokenId}):`, e);
      return null;
    }
  }, [CONTRACT_ADDRESS, contractAbi, convertIpfsToHttp, SEPOLIA_RPC_URL]);


  const loadInitialOwnedNfts = useCallback(async () => {
    setStatus('🟢 보유 NFT를 조회 중...');
    try {
      if (!SEPOLIA_RPC_URL) {
        console.error("RPC URL이 없습니다. 보유 NFT 조회를 건너뜜.");
        setCurrentOwnedNfts({ count: 0, nfts: null });
        return;
      }
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);

      // 총 발행량 조회 및 상태 업데이트
      try {
        const totalSupplyBigInt = await contract.totalSupply();
        setTotalNftsInContract(Number(totalSupplyBigInt));
      } catch (supplyError) {
        console.error("ERROR: 컨트랙트 총 발행량 조회 실패:", supplyError);
        setTotalNftsInContract(null); // 실패 시 null 또는 0으로 설정
      }

      const balanceBigInt = await contract.balanceOf(USER_ADDRESS_TO_TRACK);
      const balance = Number(balanceBigInt);

      const ownedNftList: NftAsset[] = [];
      for (let i = 0; i < balance; i++) {
        try {
          const tokenIdBigInt = await contract.tokenOfOwnerByIndex(USER_ADDRESS_TO_TRACK, i);
          const tokenId = tokenIdBigInt.toString();
          const nftAsset = await processToken(tokenId); 
          
          if (nftAsset) {
            ownedNftList.push(nftAsset); 
          } else {
           
            console.warn(`WARN: TokenID ${tokenId}의 메타데이터 조회에 실패하여 기본 정보로 보유 목록에 추가합니다.`);
            ownedNftList.push({ 
                tokenId: tokenId, 
                name: `NFT #${tokenId} (메타데이터 로드 실패)`, 
                description: '', 
                image: '' 
            });
          }
        } catch (innerError) {
          console.error(`ERROR: Index ${i}의 tokenOfOwnerByIndex 조회 실패 (해당 컨트랙트가 ERC721Enumerable이 아닐 수 있음):`, innerError);
          // tokenOfOwnerByIndex 자체가 실패하면, 알 수 없는 토큰으로 추가하여 총 수량을 맞춤
          ownedNftList.push({ 
              tokenId: `Unknown-${i}`, 
              name: `알 수 없는 NFT (오류)`, 
              description: '', 
              image: '' 
          });
        }
      }

      setCurrentOwnedNfts({ count: balance, nfts: ownedNftList }); // balance 기준으로 count 설정
      setLiveNfts(ownedNftList); 
      setStatus(`🟢 ${USER_ADDRESS_TO_TRACK.substring(0, 6)}... 주소의 보유 NFT ${ownedNftList.length}개 조회 완료 (총 ${balance}개 중).`);

    } catch (error) {
      console.error("ERROR: 초기 보유 NFT 조회 중 오류 발생:", error);
      setStatus(`🔴 보유 NFT 조회 오류: ${error instanceof Error ? error.message : String(error)}`);
      setCurrentOwnedNfts({ count: 0, nfts: [] });
      setLiveNfts([]);
    }
  }, [processToken, USER_ADDRESS_TO_TRACK, CONTRACT_ADDRESS, contractAbi, SEPOLIA_RPC_URL]);

  // 컴포넌트 라이프사이클 및 폴링 로직
  useEffect(() => {
    if (!SEPOLIA_RPC_URL) {
      setStatus('🔴 .env 파일에 REACT_APP_SEPOLIA_RPC_URL이 없습니다.');
      return;
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);

    const POLLING_INTERVAL = 5000; // 5초마다 폴링
    let intervalId: NodeJS.Timeout;

    const fetchEvents = async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        let startBlock = lastBlockChecked.current;

        if (startBlock === 0) {
            // 처음 로드 시에는 최근 100 블록부터 시작
            startBlock = Math.max(0, currentBlock - initialLoadBlockCount);
            lastBlockChecked.current = startBlock;
            console.log(`INFO: Initializing polling from block ${startBlock} to ${currentBlock}`);
            setStatus('🟢 초기 이벤트 조회 중...');
        } else if (currentBlock <= lastBlockChecked.current) {
            // 현재 블록이 마지막으로 확인한 블록보다 작거나 같으면 새로운 블록이 없다는 의미
            setStatus(`🟢 최신 블록 확인 중... (현재 블록: ${currentBlock})`);
            return;
        }

        // Transfer 이벤트 필터링
        const transferFilter = contract.filters.Transfer();
        const transferLogs = await contract.queryFilter(transferFilter, lastBlockChecked.current + 1, currentBlock);
        
        if (transferLogs.length > 0) {
          setStatus(`✨ ${transferLogs.length}개의 새로운 NFT Transfer 감지!`);
          for (const log of transferLogs) {
            if ('args' in log && log.args) {
              const from = log.args[0];
              const to = log.args[1];
              const tokenIdBigInt = log.args[2];
              const tokenId = tokenIdBigInt.toString();

              const logMessage = `[Transfer] From ${from} To ${to} TokenID ${tokenId}`; 
              console.log(`Polling 감지: ${logMessage}`);
              setEventLogs(prevLogs => [logMessage, ...prevLogs]); // 로그 추가


              if (to.toLowerCase() === USER_ADDRESS_TO_TRACK.toLowerCase()) {
                setStatus(`✨ 새로운 NFT(${tokenId}) 수신! 메타데이터 조회 중...`);
                const newNft = await processToken(tokenId);
                if (newNft) {
                  setLiveNfts(prevNfts => [newNft, ...prevNfts]);
                  // 현재 보유 NFT 목록 업데이트 (수신 시)
                  setCurrentOwnedNfts(prev => ({
                    count: prev.count + 1,
                    nfts: prev.nfts ? [newNft, ...prev.nfts.filter(nft => nft.tokenId !== newNft.tokenId)] : [newNft]
                  }));
                } else { // 메타데이터 로드 실패 시에도 빈 정보로 추가
                    setCurrentOwnedNfts(prev => ({
                        count: prev.count + 1,
                        nfts: prev.nfts ? [{ tokenId, name: `NFT #${tokenId} (로드 실패)`, description: '', image: '' }, ...prev.nfts] : [{ tokenId, name: `NFT #${tokenId} (로드 실패)`, description: '', image: '' }]
                    }));
                }
              } else if (from.toLowerCase() === USER_ADDRESS_TO_TRACK.toLowerCase()) {
                setStatus(`💨 NFT(${tokenId}) 전송! 목록에서 제거합니다.`);
                setLiveNfts(prevNfts => prevNfts.filter(nft => nft.tokenId !== tokenId));
                setCurrentOwnedNfts(prev => ({
                  count: Math.max(0, prev.count - 1),
                  nfts: prev.nfts ? prev.nfts.filter(nft => nft.tokenId !== tokenId) : []
                }));
              }
            }
          }
        }

        // Approval 이벤트 필터링 (선택 사항이지만 포함)
        const approvalFilter = contract.filters.Approval(); 
        const approvalLogs = await contract.queryFilter(approvalFilter, lastBlockChecked.current + 1, currentBlock);

        if (approvalLogs.length > 0) {
          setStatus(`✨ ${approvalLogs.length}개의 새로운 NFT Approval 감지!`);
          for (const log of approvalLogs) {
            if ('args' in log && log.args) {
              const owner = log.args[0];
              const approved = log.args[1];
              const tokenIdBigInt = log.args[2];
              const tokenId = tokenIdBigInt.toString();

              const logMessage = `[Approval] Owner ${owner} approved ${approved} for TokenID ${tokenId}`; 
              setEventLogs(prevLogs => [logMessage, ...prevLogs]); // 로그 추가
            }
          }
        }
        
        // 새로운 이벤트가 없으면 상태 메시지 업데이트
        if (transferLogs.length === 0 && approvalLogs.length === 0) {
            if (currentOwnedNfts.nfts !== null) { // 초기 로드가 완료된 후에만 "변동 없음" 표시
                setStatus(`🟢 새로운 NFT 변동 없음. (현재 블록: ${currentBlock})`);
            }
        } else {
            setStatus(`🟢 이벤트 처리 완료. 다음 폴링 대기 중... (현재 블록: ${currentBlock})`);
        }

        lastBlockChecked.current = currentBlock; // 마지막으로 확인한 블록 업데이트

      } catch (error) {
        console.error("Polling 중 오류 발생:", error);
        setStatus(`🔴 Polling 오류: ${error instanceof Error ? error.message : String(error)}`);
        clearInterval(intervalId); // 오류 발생 시 폴링 중단
      }
    };

    // 컴포넌트 마운트 시 초기 보유 NFT 로드
    loadInitialOwnedNfts();
    
    // 폴링 인터벌 시작
    intervalId = setInterval(fetchEvents, POLLING_INTERVAL);

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      clearInterval(intervalId);
      console.log("Polling 인터벌을 정리합니다.");
    };
  }, [processToken, loadInitialOwnedNfts, CONTRACT_ADDRESS, USER_ADDRESS_TO_TRACK, contractAbi, SEPOLIA_RPC_URL]); // 의존성 배열에 필요한 값들 포함

  // eventLogs 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('nftEventLogs', JSON.stringify(eventLogs));
  }, [eventLogs]); // eventLogs가 변경될 때마다 이 useEffect가 실행됩니다.


  return (
    <div>
      <h3>실시간 NFT 변동 목록 (Polling 방식)</h3>
      <p>상태: {status}</p>
      {/* 총 발행량 표시 추가 */}
      {totalNftsInContract !== null && (
        <p>컨트랙트 총 발행량: {totalNftsInContract}개</p>
      )}
      <hr style={{ margin: '1rem 0', borderColor: '#444' }} />

      <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #777', borderRadius: '8px', background: '#3a3a3a' }}>
        <h4>현재 보유 NFT ({USER_ADDRESS_TO_TRACK.substring(0, 6)}...)</h4>
        {currentOwnedNfts.nfts === null ? (
          <p>보유 NFT 정보를 로드 중입니다...</p>
        ) : (
          <>
            <p>총 수량: {currentOwnedNfts.count}개</p>
            {currentOwnedNfts.nfts.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                {currentOwnedNfts.nfts.map((nft) => (
                  <div key={`owned-${nft.tokenId}`} style={{ border: '1px solid #666', borderRadius: '4px', padding: '0.5rem', background: '#4a4a4a', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                    {nft.image ? 
                      <img src={nft.image} alt={nft.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '2px', marginRight: '0.5rem' }} />
                      : <div style={{ width: '40px', height: '40px', background: '#1c1c1c', borderRadius: '2px', marginRight: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '1.5em' }}>?</div>
                    }
                    <span>{nft.name} (ID: {nft.tokenId.substring(0,4)}...)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>보유한 NFT가 없습니다. (총 수량: {currentOwnedNfts.count}개)</p>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '1rem', border: '1px solid #555', borderRadius: '8px', background: '#2a2a2a', maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
        <h4>이벤트 로그 (최신순)</h4>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {eventLogs.length === 0 ? (
            <li>로그된 이벤트가 없습니다.</li>
          ) : (
            eventLogs.map((log, index) => (
              <li key={index} style={{ marginBottom: '0.3rem', fontSize: '0.9rem', color: '#ccc' }}>{log}</li>
            ))
          )}
        </ul>
      </div>
      
      <h4>실시간 감지된 NFT 변동</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {liveNfts.length === 0 ? (
          <p>이 페이지를 연 후 발생한 NFT 변동이 없습니다. (최근 100 블록 조회 중)</p>
        ) : (
          liveNfts.map((nft) => (
            <div key={`live-${nft.tokenId}`} style={{ border: '1px solid #555', borderRadius: '8px', padding: '1rem', background: '#2a2a2a' }}>
              {nft.image ? 
                <img src={nft.image} alt={nft.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px', background: '#1c1c1c' }} />
                : <div style={{ width: '100%', height: '200px', background: '#1c1c1c', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No Image</div>
              }
              <h4 style={{ marginTop: '0.5rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nft.name}</h4>
              <p style={{ fontSize: '0.8rem', color: '#999' }}>Token ID: {nft.tokenId}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NFTEventListener;