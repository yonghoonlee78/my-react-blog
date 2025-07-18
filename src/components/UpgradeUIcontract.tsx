import { useState } from 'react';
import { ethers } from 'ethers';
import MyTokenV1 from '../abi/MyTokenV1.json';
import MyTokenV2 from '../abi/MyTokenV2.json';
import MyProxy from '../abi/MyProxy.json';

function UpgradeManager() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [proxyAddress, setProxyAddress] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<string>('');
  const [status, setStatus] = useState<string>('아래 버튼을 눌러 지갑을 연결하세요.');
  const [actualAdmin, setActualAdmin] = useState<string>('');
  const [burnAmount, setBurnAmount] = useState<string>(''); // <-- (추가 1) 소각할 양 상태

  const connectWallet = async () => {
    if (!window.ethereum) return setStatus('메타마스크를 설치해주세요.');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const userSigner = await provider.getSigner();
      setSigner(userSigner);
      setStatus(`지갑 연결 완료: ${await userSigner.getAddress()}`);
    } catch (e) {
      console.error(e);
      setStatus('지갑 연결 실패');
    }
  };

  const deployV1 = async () => {
    if (!signer) return setStatus('지갑을 먼저 연결하세요.');
    try {
      setStatus('V1 로직 및 프록시 배포 중... (메타마스크 확인)');
      const V1Factory = new ethers.ContractFactory(MyTokenV1.abi, MyTokenV1.bytecode, signer);
      const v1 = await V1Factory.deploy();
      await v1.waitForDeployment();

      const ProxyFactory = new ethers.ContractFactory(MyProxy.abi, MyProxy.bytecode, signer);
      const proxy = await ProxyFactory.deploy(await v1.getAddress());
      await proxy.waitForDeployment();
      
      const deployedProxyAddress = await proxy.getAddress();
      setProxyAddress(deployedProxyAddress);
      
      setStatus('배포 완료! 토큰 초기화 중... (메타마스크 확인)');
      const proxyAsV1 = new ethers.Contract(deployedProxyAddress, MyTokenV1.abi, signer);
      const initialSupply = ethers.parseUnits("1000", 18);
      const tx = await proxyAsV1.initialize("My Web3 Token", "MWT", initialSupply);
      await tx.wait();

      const name = await proxyAsV1.name();
      const balance = await proxyAsV1.balanceOf(await signer.getAddress());
      const supply = await proxyAsV1.totalSupply();
      setTokenInfo(`토큰 "${name}" 배포 성공! | 총 발행량: ${ethers.formatUnits(supply, 18)} MWT | 내 잔액: ${ethers.formatUnits(balance, 18)} MWT`);
      setStatus('V1 배포 및 초기화 완료!');
    } catch (e: any) {
      setStatus(`배포 실패: ${e.message}`);
    }
  };

  const upgradeToV2 = async () => {
    if (!signer || !proxyAddress) return setStatus('V1 배포를 먼저 완료하세요.');
    try {
      setStatus('V2 로직 배포 및 업그레이드 중... (메타마스크 확인)');
      const V2Factory = new ethers.ContractFactory(MyTokenV2.abi, MyTokenV2.bytecode, signer);
      const v2 = await V2Factory.deploy();
      await v2.waitForDeployment();

      const proxy = new ethers.Contract(proxyAddress, MyProxy.abi, signer);
      const tx = await proxy.upgradeTo(await v2.getAddress());
      await tx.wait();

      setTokenInfo(prev => `${prev} -> V2 업그레이드 완료!`);
      setStatus('V2 업그레이드 성공! 이제 burn 함수를 사용할 수 있습니다.');
    } catch (e: any) {
      setStatus(`업그레이드 실패: ${e.message}`);
    }
  };

  const checkAdmin = async () => {
    if (!proxyAddress || !signer) return alert('V1 배포 및 지갑 연결을 먼저 하세요.');
    try {
        const proxyContract = new ethers.Contract(proxyAddress, MyProxy.abi, signer);
        const adminFromChain = await proxyContract.admin();
        setActualAdmin(adminFromChain);
    } catch (e: any) {
        alert(`관리자 조회 실패: ${e.message}`);
    }
  };
  
  // --- (추가 2) 소각 함수 실행 로직 ---
  const handleBurn = async () => {
    if (!signer || !proxyAddress || !burnAmount) {
      return alert('지갑 연결, V1 배포, 소각할 양을 모두 확인해주세요.');
    }
    try {
      setStatus(`토큰 ${burnAmount}개 소각 중... (메타마스크 확인)`);
      const proxyAsV2 = new ethers.Contract(proxyAddress, MyTokenV2.abi, signer);
      const tx = await proxyAsV2.burn(ethers.parseUnits(burnAmount, 18));
      await tx.wait();
      
      const name = await proxyAsV2.name();
      const balance = await proxyAsV2.balanceOf(await signer.getAddress());
      const supply = await proxyAsV2.totalSupply();
      
      setStatus(`${burnAmount} MWT 소각 성공!`);
      setTokenInfo(`토큰 "${name}" | 총 발행량: ${ethers.formatUnits(supply, 18)} MWT | 내 잔액: ${ethers.formatUnits(balance, 18)} MWT`);
      setBurnAmount('');
    } catch (e: any) {
      setStatus(`소각 실패: ${e.message}`);
    }
  };

  const buttonStyle = {
    background: "#7ee3ff",
    padding: "0.7rem 1.5rem",
    borderRadius: "6px",
    color: "#000",
    border: 'none',
    cursor: 'pointer',
    margin: '5px'
  };

  const inputStyle = {
    padding: '0.7rem',
    borderRadius: '6px',
    border: '1px solid #555',
    background: '#333',
    color: '#fff',
    marginRight: '10px'
  }

  return (
    <div>
      <h4>실행기</h4>
      <p style={{ color: '#999', fontSize: '0.9rem', border: '1px solid #333', padding: '10px', borderRadius: '4px' }}>
        <b>상태:</b> {status}
      </p>
      
      {!signer ? (
        <button style={buttonStyle} onClick={connectWallet}>메타마스크 지갑 연결</button>
      ) : (
        <div>
          <button style={buttonStyle} onClick={deployV1}>1. V1 토큰 배포하기</button>
          <button style={buttonStyle} onClick={upgradeToV2} disabled={!proxyAddress}>2. V2로 업그레이드하기</button>
        </div>
      )}
      
      <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '10px' }}>
        <p><b>프록시 주소:</b> {proxyAddress || 'N/A'}</p>
        <p><b>토큰 정보:</b> {tokenInfo || 'N/A'}</p>
        
        <hr style={{margin: '15px 0'}} />
        <button style={{...buttonStyle, background: '#ffc107'}} onClick={checkAdmin} disabled={!proxyAddress}>
          실제 관리자 주소 확인
        </button>
        <p><b>블록체인에 기록된 실제 관리자:</b> {actualAdmin || '아직 확인되지 않음'}</p>
        
        {/* --- (추가 3) 소각 기능 UI --- */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '10px' }}>
          <h4>V2 기능 테스트: 토큰 소각</h4>
          <input
            type="text"
            value={burnAmount}
            onChange={(e) => setBurnAmount(e.target.value)}
            placeholder="소각할 수량 입력"
            style={inputStyle}
          />
          <button style={{...buttonStyle, background: '#dc3545', color: '#fff'}} onClick={handleBurn} disabled={!proxyAddress}>
            Burn 실행
          </button>
        </div>

      </div>
    </div>
  );
}

export default UpgradeManager;