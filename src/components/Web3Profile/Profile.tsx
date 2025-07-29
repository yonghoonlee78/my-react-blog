import React from 'react';
import { useAccount, useBalance } from 'wagmi';

const Profile = () => {
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading, error } = useBalance({ address });

  if (!isConnected) return null;

  return (
    <section style={{ marginBottom: '1rem' }}>
      <h3>👤 내 프로필</h3>
      <p><strong>지갑 주소:</strong> {address}</p>
      <p>
        <strong>잔액:</strong>{' '}
        {isLoading ? '조회 중...' : error ? '불러오기 실패' : `${balance?.formatted} ${balance?.symbol}`}
      </p>
    </section>
  );
};

export default Profile;


