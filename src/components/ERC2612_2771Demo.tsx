import React, { useState, useEffect } from 'react';

// Window 타입 확장
declare global {
  interface Window {
    ethereum?: any;
  }
}

// ABI는 실제 프로젝트에서 import해야 합니다
const MyERC2612TokenABI = {
  abi: [
    "function name() view returns (string)",
    "function nonces(address) view returns (uint256)",
    "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function PERMIT_TYPEHASH() view returns (bytes32)"
  ]
};

const MinimalForwarderABI = {
  abi: [
    "function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) payable returns (bool, bytes)",
    "function verify(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) view returns (bool)",
    "function getNonce(address from) view returns (uint256)"
  ]
};

const MyERC2771RecipientABI = {
  abi: [
    "function isTrustedForwarder(address forwarder) view returns (bool)",
    "function doSomething() returns (string)",
    "function storeMessage(string message) returns (string)",
    "function getStoredMessage() view returns (string)"
  ]
};

interface Log {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
}

const ERC2612_2771Demo: React.FC = () => {
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [account, setAccount] = useState<string>('');
  const [contracts, setContracts] = useState<any>({});
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [network, setNetwork] = useState<any>(null);

  const [status, setStatus] = useState<{type: 'success' | 'error' | '', message: string}>({type: '', message: ''});

  // 배포된 컨트랙트 주소들 (2025-08-21 업데이트)
  const CONTRACT_ADDRESSES = {
    MyERC2612Token: "0x7e8158150296AB91DD10c7b2e5711A1Ed4928db4",
    MinimalForwarder: "0x587E8F8eBf93F85E0af354a5F9459d0c39F339A0",
    MyERC2771Recipient: "0xce9e378317d83af116BEa3911e7d0dAd754B3fB3"
  };

  // ERC-2612 상태
  const [permitData, setPermitData] = useState({
    spender: CONTRACT_ADDRESSES.MinimalForwarder,
    amount: '0.01',
    deadline: ''
  });

  // ERC-2771 상태
  const [metaTxData, setMetaTxData] = useState({
    message: 'Hello MetaTransaction!'
  });

  // 계정 정보
  const [accountInfo, setAccountInfo] = useState({
    balance: '0',
    tokenBalance: '0',
    nonce: '0',
    allowance: '0'
  });

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }].slice(-10));
  };

  const showStatus = (message: string, type: 'success' | 'error') => {
    setStatus({type, message});
    setTimeout(() => setStatus({type: '', message: ''}), 5000); // 5초 후 자동 사라짐
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        addLog('MetaMask가 설치되지 않았습니다', 'error');
        return;
      }

      const { ethers } = await import('ethers');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const network = await provider.getNetwork();
      
      // Sepolia 네트워크 확인
      if (network.chainId !== 11155111n) {
        addLog('⚠️ Sepolia 네트워크로 변경해주세요 (Chain ID: 11155111)', 'warning');
        
        // 네트워크 자동 전환 시도
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
          });
          addLog('✅ Sepolia 네트워크로 전환되었습니다', 'success');
          // 네트워크 전환 후 재연결
          const newNetwork = await provider.getNetwork();
          setNetwork(newNetwork);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            addLog('Sepolia 네트워크를 MetaMask에 추가해주세요', 'error');
            // Sepolia 네트워크 추가 시도
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Test Network',
                  nativeCurrency: {
                    name: 'SepoliaETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://sepolia.infura.io/v3/'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
              });
            } catch (addError) {
              console.error('네트워크 추가 실패:', addError);
            }
          }
          return;
        }
      }
      
      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setNetwork(network);
      
      const contracts = {
        erc2612Token: new ethers.Contract(CONTRACT_ADDRESSES.MyERC2612Token, MyERC2612TokenABI.abi, signer),
        forwarder: new ethers.Contract(CONTRACT_ADDRESSES.MinimalForwarder, MinimalForwarderABI.abi, signer),
        recipient: new ethers.Contract(CONTRACT_ADDRESSES.MyERC2771Recipient, MyERC2771RecipientABI.abi, signer)
      };
      
      setContracts(contracts);
      addLog(`지갑 연결: ${account.slice(0,6)}...${account.slice(-4)} (Chain: ${network.name})`, 'success');
      
      // 계정 정보 업데이트
      await updateAccountInfo(provider, signer, contracts);
      
    } catch (error: any) {
      console.error('연결 오류:', error);
      addLog(`연결 실패: ${error.message}`, 'error');
    }
  };

  const updateAccountInfo = async (provider: any, signer: any, contracts: any) => {
    try {
      const { ethers } = await import('ethers');
      const account = await signer.getAddress();
      const balance = await provider.getBalance(account);
      const tokenBalance = await contracts.erc2612Token.balanceOf(account);
      const nonce = await contracts.erc2612Token.nonces(account);
      const allowance = await contracts.erc2612Token.allowance(account, CONTRACT_ADDRESSES.MinimalForwarder);
      
      setAccountInfo({
        balance: ethers.formatEther(balance),
        tokenBalance: ethers.formatEther(tokenBalance),
        nonce: nonce.toString(),
        allowance: ethers.formatEther(allowance)
      });
    } catch (error: any) {
      console.error('계정 정보 업데이트 오류:', error);
      addLog(`계정 정보 업데이트 실패: ${error.message}`, 'warning');
    }
  };

  const checkContractStatus = async () => {
    if (!contracts.erc2612Token || !contracts.forwarder || !contracts.recipient || !provider) {
      addLog('컨트랙트나 프로바이더가 초기화되지 않았습니다', 'error');
      return false;
    }

    try {
      addLog('컨트랙트 상태 확인 중...', 'info');
      
      // 컨트랙트 코드 존재 여부 확인
      const [tokenCode, forwarderCode, recipientCode] = await Promise.all([
        provider.getCode(CONTRACT_ADDRESSES.MyERC2612Token),
        provider.getCode(CONTRACT_ADDRESSES.MinimalForwarder),
        provider.getCode(CONTRACT_ADDRESSES.MyERC2771Recipient)
      ]);

      if (tokenCode === '0x') {
        addLog('❌ ERC2612 Token 컨트랙트가 배포되지 않았습니다', 'error');
        return false;
      }
      if (forwarderCode === '0x') {
        addLog('❌ MinimalForwarder 컨트랙트가 배포되지 않았습니다', 'error');
        return false;
      }
      if (recipientCode === '0x') {
        addLog('❌ ERC2771 Recipient 컨트랙트가 배포되지 않았습니다', 'error');
        return false;
      }

      // 기본 함수 호출 테스트
      try {
        const tokenName = await contracts.erc2612Token.name();
        const domainSeparator = await contracts.erc2612Token.DOMAIN_SEPARATOR();
        addLog(`✅ 토큰 이름: ${tokenName}`, 'success');
        addLog(`✅ Domain Separator: ${domainSeparator.slice(0,10)}...`, 'success');
        
        // PERMIT_TYPEHASH 확인 (있는 경우)
        try {
          const permitTypehash = await contracts.erc2612Token.PERMIT_TYPEHASH();
          addLog(`✅ Permit Typehash: ${permitTypehash.slice(0,10)}...`, 'success');
        } catch {
          // PERMIT_TYPEHASH가 없을 수도 있음
        }
      } catch (error: any) {
        addLog('❌ ERC2612 Token 호출 실패 - ABI 불일치 가능성', 'error');
        console.error('Token 호출 오류:', error);
        return false;
      }

      // Forwarder가 Recipient에서 신뢰받는지 확인
      try {
        const isTrusted = await contracts.recipient.isTrustedForwarder(CONTRACT_ADDRESSES.MinimalForwarder);
        if (!isTrusted) {
          addLog('⚠️ Forwarder가 Recipient에서 신뢰받지 않습니다', 'warning');
        } else {
          addLog('✅ Forwarder가 Recipient에서 신뢰받습니다', 'success');
        }
      } catch (error: any) {
        addLog('Forwarder 신뢰 상태 확인 실패', 'warning');
      }

      // 현재 allowance 확인
      const { ethers } = await import('ethers');
      const currentAllowance = await contracts.erc2612Token.allowance(account, CONTRACT_ADDRESSES.MinimalForwarder);
      addLog(`현재 Allowance: ${ethers.formatEther(currentAllowance)} ETH`, 'info');

      // Forwarder nonce 확인
      const forwarderNonce = await contracts.forwarder.getNonce(account);
      addLog(`Forwarder Nonce: ${forwarderNonce.toString()}`, 'info');

      addLog('✅ 컨트랙트 상태 확인 완료', 'success');
      return true;
    } catch (error: any) {
      console.error('컨트랙트 상태 확인 오류:', error);
      addLog(`컨트랙트 상태 확인 실패: ${error.message}`, 'error');
      return false;
    }
  };

  const createPermitSignature = async () => {
    if (!contracts.erc2612Token || !signer || !permitData.spender || !permitData.amount) {
      addLog('필수 정보를 입력해주세요', 'error');
      showStatus('필수 정보를 입력해주세요', 'error'); // 추가
      return;
    }
  

    setLoading(true);
    try {
      const { ethers } = await import('ethers');
      

      if (!(await checkContractStatus())) {
        setLoading(false);
        return;
      }

      // 입력값 검증
      let value;
      try {
        value = ethers.parseEther(permitData.amount);
      } catch (error) {
        addLog('올바른 숫자를 입력해주세요', 'error');
        setLoading(false);
        return;
      }

      // 주소 검증
      if (!ethers.isAddress(permitData.spender)) {
        addLog('올바른 spender 주소를 입력해주세요', 'error');
        setLoading(false);
        return;
      }

      // deadline 설정 (더 긴 시간으로)
      const deadline = permitData.deadline ? 
        Math.floor(new Date(permitData.deadline).getTime() / 1000) :
        Math.floor(Date.now() / 1000) + 86400; // 24시간

      // 현재 시간보다 미래인지 확인
      if (deadline <= Math.floor(Date.now() / 1000)) {
        addLog('Deadline은 현재 시간보다 미래여야 합니다', 'error');
        setLoading(false);
        return;
      }

      // 잔고 확인
      const balance = await contracts.erc2612Token.balanceOf(account);
      if (balance < value) {
        addLog(`토큰 잔고 부족: 현재 ${ethers.formatEther(balance)} ETH`, 'error');
        setLoading(false);
        return;
      }

      // 도메인 설정
      const domain = {
        name: await contracts.erc2612Token.name(),
        version: '1',
        chainId: 11155111n, // Sepolia chainId 고정
        verifyingContract: await contracts.erc2612Token.getAddress()
      };

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      };

      const nonce = await contracts.erc2612Token.nonces(account);
      const message = {
        owner: account,
        spender: permitData.spender,
        value: value,
        nonce: nonce,
        deadline: BigInt(deadline)
      };

      addLog(`Permit 준비: ${ethers.formatEther(value)} ETH to ${permitData.spender.slice(0,6)}...`, 'info');
      addLog(`Deadline: ${new Date(deadline * 1000).toLocaleString()}`, 'info');
      addLog('서명 요청 중... MetaMask를 확인하세요', 'info');
      
      // 서명 생성
      const signature = await signer.signTypedData(domain, types, message);
      const sig = ethers.Signature.from(signature);

      addLog('서명 생성 완료, 트랜잭션 준비 중...', 'info');

      // 먼저 시뮬레이션 시도 (staticCall 사용)
      try {
        await contracts.erc2612Token.permit.staticCall(
          account, 
          permitData.spender, 
          value, 
          deadline, 
          sig.v, 
          sig.r, 
          sig.s
        );
        addLog('✅ Permit 시뮬레이션 성공', 'success');
      } catch (simulationError: any) {
        console.error('Permit 시뮬레이션 실패:', simulationError);
        addLog(`❌ 시뮬레이션 실패: ${simulationError.reason || simulationError.message}`, 'error');
        
        // 더 자세한 디버깅 정보
        if (simulationError.data) {
          console.error('Error data:', simulationError.data);
        }
        
        setLoading(false);
        return;
      }

      // 실제 트랜잭션 실행
      addLog('트랜잭션 전송 중...', 'info');
      const tx = await contracts.erc2612Token.permit(
        account, 
        permitData.spender, 
        value, 
        deadline, 
        sig.v, 
        sig.r, 
        sig.s,
        { 
          gasLimit: 150000n, // 충분한 gas limit
          maxFeePerGas: ethers.parseUnits('50', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
        }
      );
      
      addLog(`트랜잭션 전송됨: ${tx.hash.slice(0,10)}...`, 'info');
      addLog('트랜잭션 확인 대기 중... (최대 1분 소요)', 'info');
      
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        addLog('✅ Permit 성공! Allowance가 설정되었습니다', 'success');
        addLog(`트랜잭션 해시: ${receipt.hash}`, 'success');
        addLog(`Gas 사용량: ${receipt.gasUsed.toString()}`, 'info');

        showStatus('🎉 Permit 서명이 성공적으로 생성되었습니다!', 'success'); // 이 줄 추가
        
        await updateAccountInfo(provider, signer, contracts);
      } else {
        addLog('❌ Permit 실패 (트랜잭션 상태: 0)', 'error');
        showStatus('Permit 실행에 실패했습니다', 'error'); 
      }
      
    } catch (error: any) {
      console.error('Permit 전체 오류:', error);
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001 || error.message?.includes('user rejected')) {
        addLog('사용자가 서명을 거부했습니다', 'warning');
        showStatus('서명이 취소되었습니다', 'error'); // 이 줄 추가
      } else if (error.reason) {
        addLog(`Permit 실패: ${error.reason}`, 'error');
        showStatus('Permit 실행 중 오류가 발생했습니다', 'error'); // 이 줄 추가
        
        // 일반적인 오류 원인 제안
        if (error.reason.includes('ERC20Permit: expired deadline')) {
          addLog('💡 해결방법: Deadline을 더 미래로 설정하세요', 'info');
        } else if (error.reason.includes('ERC20Permit: invalid signature')) {
          addLog('💡 해결방법: 네트워크와 컨트랙트 주소를 확인하세요', 'info');
        }
      } else if (error.message?.includes('insufficient funds')) {
        addLog('가스비 부족: ETH가 필요합니다', 'error');
        addLog('💡 Sepolia Faucet에서 테스트 ETH를 받으세요', 'info');
      } else if (error.message?.includes('nonce')) {
        addLog('Nonce 오류: 이미 사용된 nonce입니다', 'error');
        addLog('💡 잠시 후 다시 시도하세요', 'info');
      } else {
        addLog(`Permit 실패: ${error.message || '알 수 없는 오류'}`, 'error');
      }
      
      // 디버깅을 위한 추가 정보
      if (error.transaction) {
        console.error('실패한 트랜잭션:', error.transaction);
      }
      if (error.receipt) {
        console.error('트랜잭션 영수증:', error.receipt);
      }
    }
    setLoading(false);
  };

  const executeMetaTransaction = async () => {
    if (!contracts.forwarder || !contracts.recipient || !signer) {
      addLog('컨트랙트가 초기화되지 않았습니다', 'error');
      showStatus('컨트랙트가 초기화되지 않았습니다', 'error'); 
      return;
    }

    setLoading(true);
    try {
      const { ethers } = await import('ethers');
      
      // 컨트랙트 상태 확인
      if (!(await checkContractStatus())) {
        setLoading(false);
        return;
      }

      // ETH 잔고 확인 (가스비용)
      const balance = await provider.getBalance(account);
      const minBalance = ethers.parseEther('0.001');
      if (balance < minBalance) {
        addLog(`ETH 잔고 부족: 현재 ${ethers.formatEther(balance)} ETH`, 'error');
        addLog('💡 Sepolia Faucet에서 테스트 ETH를 받으세요', 'info');
        setLoading(false);
        return;
      }
      
      const functionData = metaTxData.message ? 
        contracts.recipient.interface.encodeFunctionData('storeMessage', [metaTxData.message]) :
        contracts.recipient.interface.encodeFunctionData('doSomething', []);

      const request = {
        from: account,
        to: await contracts.recipient.getAddress(),
        value: 0n,
        gas: 500000n, // 충분한 gas
        nonce: await contracts.forwarder.getNonce(account),
        data: functionData
      };

      addLog(`Meta TX 준비: nonce=${request.nonce.toString()}, gas=${request.gas.toString()}`, 'info');

      const domain = {
        name: 'MinimalForwarder',
        version: '0.0.1',
        chainId: 11155111n, // Sepolia chainId 고정
        verifyingContract: await contracts.forwarder.getAddress()
      };

      const types = {
        ForwardRequest: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gas', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'data', type: 'bytes' }
        ]
      };

      addLog('메타 트랜잭션 서명 중... MetaMask를 확인하세요', 'info');
      const signature = await signer.signTypedData(domain, types, request);

      // 서명 검증
      addLog('서명 검증 중...', 'info');
      try {
        const isValid = await contracts.forwarder.verify(request, signature);
        if (!isValid) {
          addLog('❌ 서명 검증 실패', 'error');
          setLoading(false);
          return;
        }
        addLog('✅ 서명 검증 성공', 'success');
      } catch (verifyError: any) {
        console.error('서명 검증 오류:', verifyError);
        addLog(`서명 검증 오류: ${verifyError.reason || verifyError.message}`, 'error');
        setLoading(false);
        return;
      }

      // 실제 트랜잭션 실행
      addLog('메타 트랜잭션 전송 중...', 'info');
      const tx = await contracts.forwarder.execute(request, signature, {
        gasLimit: 200000n,
        maxFeePerGas: ethers.parseUnits('50', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
      });
      
      addLog(`트랜잭션 전송됨: ${tx.hash.slice(0,10)}...`, 'info');
      addLog('트랜잭션 확인 대기 중... (최대 1분 소요)', 'info');
      
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        addLog('✅ 메타 트랜잭션 성공!', 'success');
        addLog(`트랜잭션 해시: ${receipt.hash}`, 'success');
        addLog(`Gas 사용량: ${receipt.gasUsed.toString()}`, 'info');

        showStatus('🚀 메타 트랜잭션이 성공적으로 실행되었습니다!', 'success');
        
        // 저장된 메시지 확인 (있는 경우)
        if (metaTxData.message) {
          try {
            const storedMessage = await contracts.recipient.getStoredMessage();
            addLog(`저장된 메시지: "${storedMessage}"`, 'success');
          } catch {
            // 메시지 조회 실패 무시
          }
        }
      } else {
        addLog('❌ 메타 트랜잭션 실패 (트랜잭션 상태: 0)', 'error');
      }
      
    } catch (error: any) {
      console.error('메타 트랜잭션 전체 오류:', error);

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}></div>

      {status.message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: status.type === 'success' ? '#16a34a' : '#ef4444',
          color: '#ffffff',
          padding: '1rem 2rem',
          border: '4px solid #000000',
          fontWeight: '900',
          fontSize: '1.125rem',
          zIndex: 1000,
          maxWidth: '400px',
          borderRadius: '8px'
        }}>
          {status.message}
        </div>
      )}

      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001 || error.message?.includes('user rejected')) {
        addLog('사용자가 서명을 거부했습니다', 'warning');
        showStatus('서명이 취소되었습니다', 'error'); 
      } else if (error.reason) {
        addLog(`메타 트랜잭션 실패: ${error.reason}`, 'error');
        showStatus('메타 트랜잭션 실행 중 오류가 발생했습니다', 'error');
        
        // 일반적인 오류 원인 제안
        if (error.reason.includes('MinimalForwarder: signature does not match request')) {
          addLog('💡 해결방법: 서명이 올바른지 확인하세요', 'info');
        } else if (error.reason.includes('MinimalForwarder: signature expired')) {
          addLog('💡 해결방법: 새로운 서명을 생성하세요', 'info');
        }
      } else if (error.message?.includes('insufficient funds')) {
        addLog('가스비 부족: ETH가 필요합니다', 'error');
        addLog('💡 Sepolia Faucet에서 테스트 ETH를 받으세요', 'info');
      } else if (error.message?.includes('nonce')) {
        addLog('Nonce 오류: 이미 사용된 nonce입니다', 'error');
        addLog('💡 잠시 후 다시 시도하세요', 'info');
      } else {
        addLog(`메타 트랜잭션 실패: ${error.message || '알 수 없는 오류'}`, 'error');
      }
    }
    setLoading(false);
  };

  // deadline 기본값 설정 (24시간 후)
  useEffect(() => {
    if (!permitData.deadline) {
      const oneDayLater = new Date(Date.now() + 86400000);
      const isoString = oneDayLater.toISOString().slice(0, 16);
      setPermitData(prev => ({ ...prev, deadline: isoString }));
    }
  }, []);

  // 주기적으로 계정 정보 업데이트
  useEffect(() => {
    if (provider && signer && contracts.erc2612Token) {
      const interval = setInterval(() => {
        updateAccountInfo(provider, signer, contracts);
      }, 30000); // 30초마다 업데이트

      return () => clearInterval(interval);
    }
  }, [provider, signer, contracts]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      color: '#000000',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
       <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}></div>
        
        {/* 헤더 */}
        <div style={{
          borderBottom: '8px solid #000000',
          paddingBottom: '2rem',
          marginBottom: '3rem'
        }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            margin: '0 0 0.5rem 0'
          }}>
            ERC-2612 & 2771 DEMO
          </h1>
          <p style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            color: '#666666',
            margin: '0'
          }}>
            Permit & Meta Transaction
          </p>
        </div>

        {/* 지갑 상태 */}
        <div style={{
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#999999'
              }}>
                Wallet Status
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>
                {account || 'DISCONNECTED'}
              </div>
            </div>
            <button
              onClick={connectWallet}
              style={{
                backgroundColor: '#fbbf24',
                color: '#000000',
                padding: '1.25rem 2.5rem',
                fontWeight: '900',
                fontSize: '1.5rem',
                border: '4px solid #ffffff',
                cursor: 'pointer'
              }}
            >
              CONNECT WALLET
            </button>
          </div>
        </div>

        {/* ERC-2612 섹션 */}
        <div style={{
          backgroundColor: '#2563eb',
          border: '8px solid #000000',
          padding: '2rem',
          marginBottom: '2rem',
          transform: 'rotate(-1deg)'
        }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '900',
            color: '#ffffff',
            marginBottom: '2rem'
          }}>
            ERC-2612 PERMIT
          </h2>
          
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            border: '4px solid #000000'
          }}>
            <button
              onClick={createPermitSignature}
              style={{
                width: '100%',
                backgroundColor: '#fbbf24',
                color: '#000000',
                padding: '2rem',
                fontWeight: '900',
                fontSize: '1.5rem',
                border: '4px solid #000000',
                cursor: 'pointer'
              }}
            >
              ⚡ SIGN PERMIT
            </button>
          </div>
        </div>

        {/* ERC-2771 섹션 */}
        <div style={{
          backgroundColor: '#16a34a',
          border: '8px solid #000000',
          padding: '2rem',
          marginBottom: '2rem',
          transform: 'rotate(1deg)'
        }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '900',
            color: '#ffffff',
            marginBottom: '2rem'
          }}>
            ERC-2771 META TX
          </h2>
          
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            border: '4px solid #000000'
          }}>
            <button
              onClick={executeMetaTransaction}
              style={{
                width: '100%',
                backgroundColor: '#fbbf24',
                color: '#000000',
                padding: '2rem',
                fontWeight: '900',
                fontSize: '1.5rem',
                border: '4px solid #000000',
                cursor: 'pointer'
              }}
            >
              🚀 EXECUTE META TX
            </button>
          </div>
        </div>

       {/* 로그 */}
       <div style={{
          backgroundColor: '#111827',
          border: '8px solid #000000',
          padding: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.875rem',
              fontWeight: '900',
              color: '#ffffff',
              margin: '0'
            }}>
              ACTIVITY LOG
            </h2>
            <button
              onClick={() => setLogs([])}
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                fontWeight: '900',
                border: '2px solid #ffffff',
                cursor: 'pointer'
              }}
            >
              CLEAR
            </button>
          </div>
          <div style={{
            backgroundColor: '#ffffff',
            border: '4px solid #000000',
            padding: '1rem',
            height: '12rem',
            overflowY: 'auto'
          }}>
            {logs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                paddingTop: '3rem',
                fontSize: '1.5rem',
                fontWeight: '900',
                color: '#999999'
              }}>
                NO ACTIVITY YET
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  borderLeft: `4px solid ${
                    log.type === 'success' ? '#16a34a' : 
                    log.type === 'error' ? '#ef4444' : 
                    log.type === 'warning' ? '#f59e0b' : '#2563eb'
                  }`
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#666666' }}>
                    [{log.timestamp}]
                  </span>
                  <span style={{
                    marginLeft: '0.5rem',
                    fontWeight: 'bold',
                    color: log.type === 'success' ? '#16a34a' : 
                           log.type === 'error' ? '#ef4444' : 
                           log.type === 'warning' ? '#f59e0b' : '#2563eb'
                  }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
        </div>                                    
        </div>                                     
      </div>                                       
  );
};      
export default ERC2612_2771Demo;