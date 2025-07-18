import { Post } from './types/Post';

export const initialPosts: Post[] = [
  {
    id: 'getting-started-with-react-typescript',
    title: 'React와 TypeScript로 블로그 시작하기',
    content: `
## 왜 React와 TypeScript인가?
---
**React**는 컴포넌트 기반 UI를 쉽고 효율적으로 개발할 수 있는 라이브러리입니다. 재사용성, 상태 관리, 생태계가 모두 강력하죠.  
**TypeScript**는 코드에 타입을 더해 안정성을 올려줍니다. 대규모 프로젝트/협업에서 특히 강력합니다.
- **컴포넌트 재사용**: 버튼, 카드 등 UI를 조각으로 만들어 여러 곳에서 반복 사용 가능  
- **상태 관리**: \`useState\`, \`useReducer\`, Redux, recoil 등 다양한 패턴 활용  
- **타입 안전성**: 코드 자동완성, 런타임 오류 감소, 유지보수 극강  
- **테스트/CI/CD**: 자동화에 최적화된 구조 설계
---
 ### TypeScript로 Counter 컴포넌트 예시
\`\`\`tsx
import React, { useState } from 'react';
type Props = { step?: number; };
const Counter: React.FC<Props> = ({ step = 1 }) => {
  const [count, setCount] = useState<number>(0);
  return (
    <div>
      <p>카운트: {count}</p>
      <button onClick={() => setCount(count + step)}>+{step}</button>
    </div>
  );
};
\`\`\`
---
### 실제 블로그 기능
- **다크 모드 지원**: Tailwind, Emotion 등으로 라이트/다크 테마 전환  
- **마크다운 문법 지원**: 개발 노트, 코드 하이라이트 포함  
- **라우팅: React Router**  
- **컨트랙트/지갑 등 Web3 기능 연동**  
- **컴포넌트 단위 분리 및 코드 재사용**  
- **TypeScript 기반 정적 타입 체크**: 타입 오류를 개발 중 바로 캐치  
- **모듈별 타입 선언(.d.ts)**: 서드파티 라이브러리, 커스텀 훅 등  
- **자동 코드포맷팅 & 린트**: Prettier, ESLint와 TS 규칙 조합  
- **테스트 작성**: Jest, React Testing Library, 타입 추론 테스트
---
### 앞으로 다룰 내용 예고
- **실무형 React 상태관리**: Context, Zustand, Redux Toolkit에서 타입 세이프 패턴  
- **마크다운 에디터/프리뷰**: 커스텀 컴포넌트 + 타입 가드  
- **컴포넌트 스타일링**: Tailwind, Emotion + 타입드 스타일 프롭스  
- **블록체인 지갑 연동**: ethers.js 타입 활용, 트랜잭션 구조 타입 명세  
- **오픈 API/GraphQL**: 타입 추론으로 안전한 API 연동, 성능 최적화  
- **유틸 함수 분리와 타입**: 커스텀 타입, 제네릭 유틸  
- **실전 배포/CI**: TS 기반 빌드, 타입 체크 자동화, GitHub Actions 연동  
`,
    date: '2025-06-09',
    tags: ['React', 'TypeScript', '블로그', '시작'],
    route: '/post/getting-started-with-react-typescript',
    category: '개발',
  },
  {
    id: 'understanding-react-state',
    title: 'React에서 State를 제대로 다루는 법 (실전 패턴 포함)',
    content: `
# React State란?
- React에서 **State**는 UI가 변화하는 핵심 데이터입니다.  
- 컴포넌트별로 분리/조합하여 복잡한 앱도 쉽게 관리할 수 있죠.
### UseState와 불변성
- 가장 기본적인 상태 관리 훅. 값이 바뀌면 해당 컴포넌트와 하위 UI가 자동 리렌더링됩니다.
- 상태값은 직접 수정하지 않고, **setCount**와 같이 함수로만 변경합니다.  
- 배열/객체를 수정할 때는 ...스프레드 문법으로 "새로운 값"을 만들어야 React가 변화를 감지합니다.
\`\`\`tsx
import React, { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>카운트: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
\`\`\`
### 여러 상태 묶어서 관리 (객체/배열 활용)
\`\`\`tsx
const [user, setUser] = useState({ name: '', age: 0 });
setUser(prev => ({ ...prev, name: '홍길동' })); // 항상 불변성 유지!
\`\`\`
### 커스텀 훅 (실전 패턴)
- 반복되는 상태 로직은 **커스텀 훅**으로 분리해서 코드 재사용성을 높일 수 있습니다.
\`\`\`tsx
function useInput(initialValue: string) {
  const [value, setValue] = useState(initialValue);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValue(e.target.value);
  return { value, onChange, setValue };
}
// 사용 예시
const { value, onChange } = useInput('');
<input value={value} onChange={onChange} />;
\`\`\`
### 리액트 상태 관리 실전 팁
- **Context**와 **useReducer**로 전역 상태/복잡한 상태 분리
- 상태 변화 시 Side Effect는 useEffect에 위임
- 대규모 프로젝트에서는 Redux/Zustand 같은 외부 상태관리 라이브러리도 적극 활용
---
이 블로그의 **지갑/컨트랙트/익스플로러** 페이지들도 React 상태관리 패턴을 바탕으로 만들어졌습니다.
    `,
    date: '2025-06-08',
    tags: ['React', 'State', 'useState', '훅', '커스텀훅', '패턴'],
    category: '프론트엔드',
    route: '/post/understanding-react-state',
  },
  {
    id: 'kaia-wallet',
    title: '나만의 Kaia 블록체인 지갑 만들기',
    content: `
### Kaia 테스트넷 월렛
이 프로젝트는 **Kaia 테스트넷 블록체인**에서 동작하는 월렛을 구현합니다.
---
###  주요 기능
- Kaia RPC 연동  
- 계정 생성 및 프라이빗키 관리  
- 토큰 전송 및 잔액 조회  
- Web3.js 연동을 통한 인터랙션
---
### 유저 인터페이스
React 기반 UI를 구성하고 있으며 사용자 인터페이스를 개선해 나가고 있습니다.
지갑을 생성하면 주소 및 프라이빗키가 화면에 표시되며 localStorage에 저장됩니다.
` ,
    date: '2025-06-14',
    tags: ['Blockchain', 'Kaia', 'Wallet', 'Web3.js'],
    category: '블록체인',
    route: '/wallet'
  },
  {
    id: 'kaia-mnemonic-wallet',
    title: '니모닉 기반 Kaia 결정형 지갑 만들기',
    content: `
### Kaia testnet Mnemonic Wallet
니모닉 생성과 복구가능한 니모닉 지갑 
- 12/24 단어 니모닉 생성  
- 니모닉 복구로 동일 지갑 접근  
- ethers.js로 HD Wallet 구현
`,
    date: '2025-06-15',
    tags: ['Kaia', 'Wallet', 'Mnemonic', 'ethers.js'],
    category: '블록체인',
    route: '/mnemonic-wallet',
  },
  {
    id: 'explorer',
    title: 'Kaia 블록체인 익스플로러',
    content: `
### Kaia Testnet Explorer
 카이아 테스트넷 온체인 트랜잭션 및 블록 데이터를 조회하는 React 기반의 Explorer.
- 오직 테스트넷만 조회 가능
- 오직 BlockNumber 와 Txhash만 조회 가능
- Parent Hash등 그외 입력값은 에러발생
`,
    date: '2025-06-16',
    tags: ['Kaia', 'explorer', 'testnet'],
    category: '블록체인',
    route: '/explorer',
  },
  {
    id: "contract-info",
    title: "Kaia 테스트넷에 배포된 스마트 컨트랙트 정보",
    content: `
  ## Kaia 테스트넷 컨트랙트 정보
  아래 버튼을 눌러 ABI와 배포 정보를 확인하세요.
  `,
    date: "2025-06-17",
    tags: ["SmartContract", "Kaia", "ABI"],
    category: "블록체인",
    type: "contract-info",
    route: "/contract-info"
  },
  {
    id: "nft-explorer",
    title: "NFT 조회 (ERC721)",
    content: `
## Kaia Testnet NFT 컨트랙트 실시간 조회
- NFT 컨트랙트 주소, 토큰ID로 **오너, 메타데이터, 이미지**를 바로 확인하세요!
- 아래 폼에 입력 후 [조회]를 누르세요.
    `,
    date: "2025-07-07",
    tags: ["NFT", "ERC721", "Sepolia", "메타데이터"],
    category: "블록체인",
    route: "/nft-explorer",
    type: "nft-explorer",
  },
  {
    id: "nft-transfer",
    title: "NFT 전송 (Kaia 테스트넷)",
    content: `
## Kaia Testnet NFT Transfer
컨트랙트 주소, 토큰ID, 받는 주소, 프라이빗키를 입력하고 NFT를 전송하세요.
전송 성공시 트랜잭션 해시가 바로 출력됩니다.
테스트넷에서만 사용하세요!
    `,
    date: "2025-07-08",
    tags: ["NFT", "ERC721", "Kaia", "Transfer"],
    category: "블록체인",
    route: "/nft-transfer",
    type: "nft-transfer"
  },

  {

    id: "sepolia-nft-listener",   
    title: "Sepolia NFT 이벤트 리스너", 
    date: "2025-07-09", 
    tags: ["NFT", "ERC721", "Ethereum", "Sepolia", "Event", "Listener"], 
    category: "블록체인",
    route: "/sepolia-nft-listener", 
    type: "nft-event-listening", 
    content: `
 이더리움 세폴리아 테스트넷에서 특정 ERC721 컨트랙트 
 https://sepolia.etherscan.io/address/0xf8841f261f2fCed4688B13f1D3AFED244F6EC384 
 Transfer 실시간으로 감지하고 표시.
`.trim() 
  },
  {
    id: "wallet-dashboard",
    title: "메타마스크 자산 대시보드 (토큰/NFT 조회 & 전송)",
    content: `
  ### 메타마스크 연동 자산 조회 대시보드
  - 메타마스크 연결 후, 내 지갑의 **모든 ERC-20 토큰 및 NFT**를 자동으로 조회합니다.
  - 앞으로 NFT/토큰 전송 기능도 추가 예정!
  `,
    date: "2025-07-10",
    tags: ["MetaMask", "Dashboard", "Token", "NFT", "Kaia", "Ethereum", "Sepolia"],
    category: "지갑",
    type: "wallet-dashboard",
    route: "/wallet-dashboard"
  },
  {
    id: "erc1155-all-assets-dashboard",
    title: "ERC1155 Multisearch & All-Event Asset Dashboard",
    content: `
### 과제 목표

내가 배포한 커스텀 ERC1155 스마트컨트랙트에서
- **민트, 강화, 합성 등 여러가지 이벤트로 생성된 토큰** 전부
- **토큰ID, 토큰별 수량(balance), 모든 변화 이력**
- **ERC-20, ERC-721, ERC-1155까지**실시간으로 한 번에 조회.

    `,
    date: "2025-07-11",
    tags: [
      "ERC1155", "EventLog", "Mint", "Combine", "Upgrade",
      "AssetDashboard", "Token", "Kaia", "Sepolia", "MetaMask", "ERC20", "ERC721"
    ],
    category: "지갑",
    route: "/erc1155-all-assets-dashboard",
    type: "feature",
  },
  {
    id: "upgradeable-contract-manager",
    title: "업그레이더블 컨트랙트 매니저 (Proxy Pattern)",
    content: `
## 업그레이더블 컨트랙트 배포 및 관리
React UI에서 버튼 클릭만으로 **프록시 패턴** 기반의 업그레이더블 컨트랙트를 **배포**하고 **업그레이드**하는 과정을 구현합니다.

- **V1 배포**: ERC20 토큰의 첫 번째 버전을 배포하고 프록시와 연결합니다.
- **V2 업그레이드**: 새로운 기능(예: 소각)이 추가된 V2 로직으로 교체합니다.
- **상태 보존 및 변경 확인**
  1. 업그레이드 직후에는 기존 잔고가 **보존**되는 것을 확인합니다.
  2. V2의 새로운 burn 함수를 호출하여 잔고가 의도대로 **변경**되는 것을 확인합니다.
    `,
    date: "2025-07-15",
    tags: ["Upgrade", "Proxy", "React", "Ethers", "Solidity", "Sepolia"],
    category: "블록체인",
    route: "/upgrade-manager",
    type: "feature",
  },

  {
    id: "token-bet-mini-game",
    title: "베팅 숫자 맞히기: 토큰 랜덤 게임",
    content: `
  ### 규칙
  - 1~99 중 내가 숫자 하나를 골라 베팅!
  - 컨트랙트가 랜덤 숫자를 뽑음.
  - 내가 고른 숫자보다 작은 숫자가 나오면 토큰 & 배당금 획득!
  - 높거나 같은 숫자가 나오면 베팅한 토큰은 소실.
  
  ### 배당 설명
  - **높은 숫자를 고를수록**: 이길 확률은 높지만 배당은 낮음.
  - **낮은 숫자를 고를수록**: 이길 확률은 낮지만 배당이 커짐.
  
  지갑 연동, 스마트컨트랙트 트랜잭션, 토큰 입출금 등 Web3 실전 경험을 쌓아보세요!
    `,
    date: "2025-07-17",
    tags: ["미니게임", "베팅", "ERC20", "블록체인", "스마트컨트랙트"],
    category: "미니게임",
    route: "/mini-game",
    type: "feature"
  }





];





