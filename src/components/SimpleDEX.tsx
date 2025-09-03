import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import './SimpleDex.css';
import deploymentInfo from '../deploy-output.json';

// ABI imports - .abi 속성만 사용
import RouterABIFile from '../abi/SimpleDEXRouter.json';
import FactoryABIFile from '../abi/SimpleDEXFactory.json';
import TokenABIFile from '../abi/TT.json';

// ABI 추출
const RouterABI = RouterABIFile.abi;
const FactoryABI = FactoryABIFile.abi;
const TokenABI = TokenABIFile.abi;

const SimpleDEX: React.FC = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<any>(null);
  const [account, setAccount] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  
  // Contract instances
  const [routerContract, setRouterContract] = useState<Contract | null>(null);
  const [factoryContract, setFactoryContract] = useState<Contract | null>(null);
  
  // UI states
  const [activeTab, setActiveTab] = useState('swap');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Token states
  const [tokenIn, setTokenIn] = useState('');
  const [tokenOut, setTokenOut] = useState('');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  
  // User balances
  const [userBalances, setUserBalances] = useState<{[key: string]: string}>({});
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  
  // Liquidity states
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  
  // Admin states
  const [collectedFees, setCollectedFees] = useState<{[key: string]: string}>({});
  
  // Contract addresses from deployment
  const ROUTER_ADDRESS = deploymentInfo.contracts.router;
  const FACTORY_ADDRESS = deploymentInfo.contracts.factory;
  const tokens = deploymentInfo.contracts.tokens;

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Provider = new BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        const address = await web3Signer.getAddress();
        
        // Check network
        const network = await web3Provider.getNetwork();
        if (network.chainId !== 11155111n) { // Sepolia chainId
          setMessage('Please switch to Sepolia testnet!');
          return;
        }
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(address);
        
        // Initialize contracts
        const router = new Contract(ROUTER_ADDRESS, RouterABI, web3Signer);
        const factory = new Contract(FACTORY_ADDRESS, FactoryABI, web3Signer);
        
        setRouterContract(router);
        setFactoryContract(factory);
        
        // Check if owner
        const owner = await router.owner();
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
        
        setMessage('Wallet connected successfully!');
      } else {
        setMessage('Please install MetaMask!');
      }
    } catch (error) {
      console.error(error);
      setMessage('Failed to connect wallet');
    }
  };

  // Fetch user balances
  const fetchUserBalances = async () => {
    if (!routerContract || !account) return;
    
    try {
      const balances: {[key: string]: string} = {};
      for (const [symbol, address] of Object.entries(tokens)) {
        const balance = await routerContract.getUserBalance(account, address);
        balances[symbol] = formatUnits(balance, symbol === 'DAI' || symbol === 'WETH' ? 18 : 6);
      }
      setUserBalances(balances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Get token decimals
  const getDecimals = (tokenSymbol: string) => {
    return tokenSymbol === 'DAI' || tokenSymbol === 'WETH' ? 18 : 6;
  };

  // Deposit tokens
  const handleDeposit = async () => {
    if (!routerContract || !signer || !selectedToken || !depositAmount) return;
    
    setLoading(true);
    try {
      const tokenAddress = tokens[selectedToken as keyof typeof tokens];
      const decimals = getDecimals(selectedToken);
      const amount = parseUnits(depositAmount, decimals);
      
      // Approve token
      const tokenContract = new Contract(tokenAddress, TokenABI, signer);
      const approveTx = await tokenContract.approve(ROUTER_ADDRESS, amount);
      setMessage('Approving tokens...');
      await approveTx.wait();
      
      // Deposit
      const depositTx = await routerContract.deposit(tokenAddress, amount);
      setMessage('Depositing tokens...');
      await depositTx.wait();
      
      setMessage(`Successfully deposited ${depositAmount} ${selectedToken}`);
      setDepositAmount('');
      await fetchUserBalances();
    } catch (error: any) {
      console.error(error);
      setMessage('Deposit failed: ' + error.message);
    }
    setLoading(false);
  };

  // Withdraw tokens
  const handleWithdraw = async () => {
    if (!routerContract || !selectedToken || !withdrawAmount) return;
    
    setLoading(true);
    try {
      const tokenAddress = tokens[selectedToken as keyof typeof tokens];
      const decimals = getDecimals(selectedToken);
      const amount = parseUnits(withdrawAmount, decimals);
      
      const withdrawTx = await routerContract.withdraw(tokenAddress, amount);
      setMessage('Withdrawing tokens...');
      await withdrawTx.wait();
      
      setMessage(`Successfully withdrew ${withdrawAmount} ${selectedToken}`);
      setWithdrawAmount('');
      await fetchUserBalances();
    } catch (error: any) {
      console.error(error);
      setMessage('Withdrawal failed: ' + error.message);
    }
    setLoading(false);
  };

  // Swap tokens
  const handleSwap = async () => {
    if (!routerContract || !tokenIn || !tokenOut || !amountIn) return;
    
    setLoading(true);
    try {
      const tokenInAddress = tokens[tokenIn as keyof typeof tokens];
      const tokenOutAddress = tokens[tokenOut as keyof typeof tokens];
      const decimals = getDecimals(tokenIn);
      const amount = parseUnits(amountIn, decimals);
      
      const swapTx = await routerContract.swapTokens(tokenInAddress, tokenOutAddress, amount);
      setMessage('Swapping tokens...');
      const receipt = await swapTx.wait();
      
      // Parse events to get output amount
      const swapEvent = receipt.logs?.find((log: any) => {
        try {
          const parsed = routerContract.interface.parseLog(log);
          return parsed?.name === 'TokenSwap';
        } catch {
          return false;
        }
      });
      
      if (swapEvent) {
        const parsed = routerContract.interface.parseLog(swapEvent);
        const outDecimals = getDecimals(tokenOut);
        const outputAmount = formatUnits(parsed?.args.amountOut, outDecimals);
        setAmountOut(outputAmount);
        setMessage(`Swapped ${amountIn} ${tokenIn} for ${outputAmount} ${tokenOut}`);
      }
      
      await fetchUserBalances();
    } catch (error: any) {
      console.error(error);
      setMessage('Swap failed: ' + error.message);
    }
    setLoading(false);
  };

  // Add liquidity
  const handleAddLiquidity = async () => {
    if (!routerContract || !tokenA || !tokenB || !amountA || !amountB) return;
    
    setLoading(true);
    try {
      const tokenAAddress = tokens[tokenA as keyof typeof tokens];
      const tokenBAddress = tokens[tokenB as keyof typeof tokens];
      const decimalsA = getDecimals(tokenA);
      const decimalsB = getDecimals(tokenB);
      const amountAWei = parseUnits(amountA, decimalsA);
      const amountBWei = parseUnits(amountB, decimalsB);
      
      const addLiqTx = await routerContract.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountAWei,
        amountBWei
      );
      setMessage('Adding liquidity...');
      await addLiqTx.wait();
      
      setMessage(`Successfully added liquidity: ${amountA} ${tokenA} + ${amountB} ${tokenB}`);
      setAmountA('');
      setAmountB('');
      await fetchUserBalances();
    } catch (error: any) {
      console.error(error);
      setMessage('Add liquidity failed: ' + error.message);
    }
    setLoading(false);
  };

  // Fetch collected fees (admin only)
  const fetchCollectedFees = async () => {
    if (!routerContract || !isOwner) return;
    
    try {
      const fees: {[key: string]: string} = {};
      for (const [symbol, address] of Object.entries(tokens)) {
        const fee = await routerContract.getCollectedFees(address);
        const decimals = getDecimals(symbol);
        fees[symbol] = formatUnits(fee, decimals);
      }
      setCollectedFees(fees);
    } catch (error) {
      console.error('Error fetching fees:', error);
    }
  };

  // Withdraw fees (admin only)
  const handleWithdrawFees = async (tokenSymbol: string) => {
    if (!routerContract || !isOwner) return;
    
    setLoading(true);
    try {
      const tokenAddress = tokens[tokenSymbol as keyof typeof tokens];
      const withdrawFeesTx = await routerContract.withdrawFees(tokenAddress);
      await withdrawFeesTx.wait();
      
      setMessage(`Successfully withdrew ${tokenSymbol} fees`);
      await fetchCollectedFees();
    } catch (error: any) {
      console.error(error);
      setMessage('Fee withdrawal failed: ' + error.message);
    }
    setLoading(false);
  };

  // Auto-fetch data
  useEffect(() => {
    if (account && routerContract) {
      fetchUserBalances();
      if (isOwner) {
        fetchCollectedFees();
      }
    }
  }, [account, isOwner, routerContract]);

  return (
    <div className="simple-dex-container">
      {/* Header */}
      <div className="dex-header">
        <h2>Simple DEX - Sepolia</h2>
        {!account ? (
          <button onClick={connectWallet} className="connect-button">
            Connect Wallet
          </button>
        ) : (
          <div className="account-info">
            <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
            {isOwner && <span className="admin-badge">Admin</span>}
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="message-box">
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {['deposit', 'withdraw', 'swap', 'liquidity', ...(isOwner ? ['admin'] : [])].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="dex-content">
        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <div className="tab-content">
            <h3>Deposit Tokens</h3>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="input-select"
            >
              <option value="">Select Token</option>
              {Object.keys(tokens).map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="input-field"
            />
            <button
              onClick={handleDeposit}
              disabled={loading}
              className="action-button"
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="tab-content">
            <h3>Withdraw Tokens</h3>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="input-select"
            >
              <option value="">Select Token</option>
              {Object.keys(tokens).map(symbol => (
                <option key={symbol} value={symbol}>
                  {symbol} (Balance: {userBalances[symbol] || '0'})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="input-field"
            />
            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="action-button"
            >
              {loading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        )}

        {/* Swap Tab */}
        {activeTab === 'swap' && (
          <div className="tab-content">
            <h3>Swap Tokens</h3>
            <div className="swap-section">
              <label>From</label>
              <select
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                className="input-select"
              >
                <option value="">Select Token</option>
                {Object.keys(tokens).map(symbol => (
                  <option key={symbol} value={symbol}>
                    {symbol} (Balance: {userBalances[symbol] || '0'})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="input-field"
              />
            </div>
            
            <div className="swap-arrow">↓</div>
            
            <div className="swap-section">
              <label>To</label>
              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                className="input-select"
              >
                <option value="">Select Token</option>
                {Object.keys(tokens).map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
              {amountOut && (
  <div className="output-amount">
    <span className="output-label">Expected:</span>
    <span className="output-value">{amountOut} {tokenOut}</span>
  </div>
)}

            </div>
            
            <button
              onClick={handleSwap}
              disabled={loading}
              className="action-button"
            >
              {loading ? 'Processing...' : 'Swap'}
            </button>
          </div>
        )}

        {/* Liquidity Tab */}
        {activeTab === 'liquidity' && (
          <div className="tab-content">
            <h3>Add Liquidity</h3>
            <div className="liquidity-section">
              <label>Token A</label>
              <select
                value={tokenA}
                onChange={(e) => setTokenA(e.target.value)}
                className="input-select"
              >
                <option value="">Select Token</option>
                {Object.keys(tokens).map(symbol => (
                  <option key={symbol} value={symbol}>
                    {symbol} (Balance: {userBalances[symbol] || '0'})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount A"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="input-field"
              />
            </div>
            
            <div className="liquidity-section">
              <label>Token B</label>
              <select
                value={tokenB}
                onChange={(e) => setTokenB(e.target.value)}
                className="input-select"
              >
                <option value="">Select Token</option>
                {Object.keys(tokens).map(symbol => (
                  <option key={symbol} value={symbol}>
                    {symbol} (Balance: {userBalances[symbol] || '0'})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount B"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="input-field"
              />
            </div>
            
            <button
              onClick={handleAddLiquidity}
              disabled={loading}
              className="action-button"
            >
              {loading ? 'Processing...' : 'Add Liquidity'}
            </button>
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isOwner && (
          <div className="tab-content">
            <h3>Admin Panel</h3>
            <div className="admin-section">
              <h4>Collected Fees</h4>
              <div className="fees-grid">
                {Object.entries(collectedFees).map(([symbol, amount]) => (
                  <div key={symbol} className="fee-item">
                    <div className="fee-info">
                      <span className="fee-symbol">{symbol}</span>
                      <span className="fee-amount">{amount} tokens</span>
                    </div>
                    <button
                      onClick={() => handleWithdrawFees(symbol)}
                      disabled={loading || parseFloat(amount) === 0}
                      className="withdraw-fee-button"
                    >
                      Withdraw
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Balances */}
      {account && (
        <div className="balances-section">
          <h3>Your DEX Balances</h3>
          <div className="balance-grid">
            {Object.entries(userBalances).map(([symbol, balance]) => (
              <div key={symbol} className="balance-item">
                <span className="token-symbol">{symbol}</span>
                <span className="token-balance">{balance}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDEX;