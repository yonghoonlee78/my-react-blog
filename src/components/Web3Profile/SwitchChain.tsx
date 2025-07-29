import React from 'react';
import { useSwitchChain } from 'wagmi';

const SwitchChain = () => {
  const { chains, switchChain, isPending } = useSwitchChain();

  return (
    <section style={{ marginBottom: '1rem' }}>
      <h3>🌐 네트워크 전환</h3>
      {chains.map((chain) => (
        <button
          key={chain.id}
          onClick={() => switchChain({ chainId: chain.id })}
          disabled={isPending}
          style={{ marginRight: '0.5rem' }}
        >
          {chain.name}
        </button>
      ))}
    </section>
  );
};

export default SwitchChain;

