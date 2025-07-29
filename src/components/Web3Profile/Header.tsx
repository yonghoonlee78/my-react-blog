import React from 'react';
import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi';

const Header = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });

  if (!isConnected) {
    return (
      <section style={{ marginBottom: '1rem' }}>
        <h3>🦊 지갑 연결</h3>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={status === 'pending'}
            style={{ margin: '0.25rem' }}
          >
            {connector.name} {status === 'pending' ? '⌛ 연결 중...' : ''}
          </button>
        ))}
        {error && <p style={{ color: 'red' }}>❌ {error.message}</p>}
      </section>
    );
  }

  const shortAddress = `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  const displayName = ensName ?? shortAddress;

  return (
    <section style={{ marginBottom: '1rem' }}>
      <h3>✅ 연결된 지갑</h3>
      <p><strong>{displayName}</strong></p>
      <button onClick={() => disconnect()}>연결 해제</button>
    </section>
  );
};

export default Header;

