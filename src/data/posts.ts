import { Post } from '../types/Post';

export const posts: Post[] = [
  {
    id: 'getting-started',
    title: 'React와 TypeScript로 블로그 시작하기',
    content: `# 첫 번째 글\n\nReact + TS 블로그 만들기!`,
    date: '2025-06-09',
    tags: ['React', 'TypeScript'],
    category: '개발',
  },
  {
    id: 'state-in-react',
    title: 'React에서 State를 이해하는 방법',
    content: `# State 심층 이해\n\nuseState 훅 사용 예시…`,
    date: '2025-06-08',
    tags: ['React', 'State'],
    category: '프론트엔드',
  },
  {
    id: 'kaia-wallet-demo',
    title: 'Kaia 지갑 체험하기',
    content: `# Kaia 지갑 데모\n\n이곳에서 실제 지갑을 만들어 봅시다!`,
    date: '2025-06-14',
    tags: ['Kaia', 'Wallet'],
    category: '블록체인',
    route: '/wallet',          
  },

  {
    id: 'kaia-mnemonic-wallet',
    title: '니모닉 기반 Kaia 결정형 지갑 만들기',
    content: `# Mnemonic Wallet\n\n니모닉 생성과 복구를 지원하는 결정형 지갑을 만들어봅니다.`,
    date: '2025-06-15',
    tags: ['Kaia', 'Wallet', 'Mnemonic', 'ethers.js'],
    category: '블록체인',
    route: '/mnemonic-wallet' 
  },

  {
    id: 'explorer',
    title: 'Kaia 블록체인 익스플로러',
    content: '온체인 트랜잭션 및 블록 데이터를 조회하는 React 기반 Explorer',
    date: '2025-06-16',
    tags: ['Kaia', 'Explorer', 'testnet'],
    category: '블록체인',
    route: '/explorer',   
    
  }
];
