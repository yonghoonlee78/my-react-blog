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
];
