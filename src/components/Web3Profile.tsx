// src/components/Web3Profile.tsx
import React from 'react'
import Header from './Web3Profile/Header'
import Profile from './Web3Profile/Profile'
import Tipping from './Web3Profile/Tipping'
import SwitchChain from './Web3Profile/SwitchChain'

const Web3Profile = () => {
  return (
    <div style={{ padding: '2rem', border: '1px solid #555', borderRadius: '12px' }}>
      <Header />
      <hr style={{ margin: '1rem 0' }} />
      <SwitchChain />
      <hr style={{ margin: '1rem 0' }} />
      <Profile />
      <hr style={{ margin: '1rem 0' }} />
      <Tipping />
    </div>
  )
}

export default Web3Profile
