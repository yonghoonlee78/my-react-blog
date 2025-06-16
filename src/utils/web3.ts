import Web3 from 'web3';
import { Numbers } from 'web3-types';

const web3 = new Web3('https://public-en-kairos.node.kaia.io');
export default web3;

export const getBlock = async (blockNumber?: number) => {
  const block = await web3.eth.getBlock(blockNumber ?? 'latest');
  return block;
};

export const getTransactionReceipt = async (txHash: string) => {
  const tx = await web3.eth.getTransactionReceipt(txHash);
  return tx;
};

export const getTransaction = async (txHash: string) => {
  const tx = await web3.eth.getTransaction(txHash);
  return tx;
};

export const getNetworkStatus = async () => {
  const isListening = await web3.eth.net.isListening();
  const peerCount = await web3.eth.net.getPeerCount();

  return isListening && Number(peerCount) > 2;
};

export const fromWei = (amount: Numbers) => {
  return web3.utils.fromWei(amount, 'ether');

  
};

export const getNetworkHealthy = async () => {
  const [ok, peers] = await Promise.all([
    web3.eth.net.isListening(),
    web3.eth.net.getPeerCount(),
  ]);
  return ok && peers > 2;
}