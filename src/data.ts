import { Post } from './types/Post';

export const initialPosts: Post[] = [
  {
    id: 'getting-started-with-react-typescript',
    title: 'React와 TypeScript로 블로그 시작하기',
    
    content: `
# 첫 번째 React + TypeScript 블로그 글

안녕하세요! React와 TypeScript를 사용하여 블로그를 만드는 여정에 오신 것을 환영합니다.

## 왜 React와 TypeScript인가?

* **React**: UI를 구축하기 위한 강력한 JavaScript 라이브러리입니다. 컴포넌트 기반으로 재사용성을 높이고 유지보수를 용이하게 합니다.
* **TypeScript**: JavaScript에 타입을 추가하여 코드의 안정성과 가독성을 높여줍니다. 개발 과정에서 발생할 수 있는 잠재적인 오류를 미리 방지할 수 있습니다.

## 이 블로그의 특징

이 블로그는 GitHub Pages에 배포되며, React의 상태 관리(useState)와 라우팅(React Router)을 사용하여 동적인 블로그 경험을 제공합니다.

## 다음 단계

다음 글에서는 블로그에 새로운 기능을 추가하거나 디자인을 개선하는 방법에 대해 이야기해볼 예정입니다. 기대해주세요!
        `, 
    date: '2025-06-09', 
    tags: ['React', 'TypeScript', '블로그', '시작'], 
    category: '개발', 
  },
  {
    id: 'understanding-react-state',
    title: 'React에서 State를 이해하는 방법',
    
    content: `
# React State 심층 이해

React에서 State는 컴포넌트 내부에서 동적으로 변경될 수 있는 데이터를 의미합니다. 사용자와의 상호작용이나 시간에 따라 변하는 데이터를 관리하는 데 사용됩니다.

## useState 훅

함수형 컴포넌트에서 State를 사용하기 위해 'useState' 훅을 사용합니다.
\`\`\`typescript
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0); // 초기값은 0

  return (
    <div>
      <p>현재 카운트: {count}</p>
      <button onClick={() => setCount(count + 1)}>증가</button>
    </div>
  );
}
\`\`\`
'useState'는 두 개의 요소를 가진 배열을 반환합니다: 현재 상태 값과 상태를 업데이트하는 함수.

## State의 불변성

React에서 State를 업데이트할 때는 항상 새로운 객체나 배열을 생성하여 변경해야 합니다. 직접 State 객체를 수정하는 것은 좋지 않은 패턴이며, 예상치 못한 동작을 유발할 수 있습니다.

이 블로그의 게시물 목록도 'useState'를 사용하여 관리되고 있으며, 게시물 필터링이나 검색 시 State가 변경되는 것을 확인할 수 있습니다.
        `, 
    date: '2025-06-08', // 
    tags: ['React', 'State', 'useState', '훅'], // 
    category: '프론트엔드', // 
  },
  
  {
    id: 'kaia-wallet',
    title: '나만의 Kaia 블록체인 지갑 만들기',
    content: `# Kaia 지갑 데모 …`,
    date: '2025-06-14',
    tags: ['Blockchain', 'Kaia', 'Wallet', 'Web3.js'],  // 태그도 추가 가능
    category: '블록체인',
    route: '/wallet'
  }
];