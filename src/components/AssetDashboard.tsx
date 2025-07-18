import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";


const SEPOLIA_RPC_URL = process.env.REACT_APP_SEPOLIA_RPC_URL || "https://rpc.ankr.com/eth_sepolia";
const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY || "YOUR_ETHERSCAN_API_KEY_HERE";


const CUSTOM_ERC1155_CONTRACT_ADDRESS = "0x8E80149464698aF458bB266A55EA41Ded087B9F0";


const ERC20_LIST: Omit<ERC20Asset, "balance">[] = [
{ symbol: "GAMET", name: "Game Asset Token", address: CUSTOM_ERC1155_CONTRACT_ADDRESS, decimals: 18 },

];


const ERC721_LIST: Omit<ERC721Asset, "count" | "tokenIds">[] = [
{ symbol: "GNFT", name: "GameNFT", address: "0x8E80149464698aF458bB266A55EA41Ded087B9F0" },
{ symbol: "Gsmw", name: "GoseumW", address: "0xf8841f261f2fced4688b13f1d3afed244f6ec384" },
];


const ERC20_ABI = [
"function balanceOf(address) view returns (uint256)",
"function transfer(address to, uint256 amount) returns (bool)",
"function symbol() view returns (string)",
"function decimals() view returns (uint8)",
"function name() view returns (string)"
];

const ERC721_ABI = [
"function balanceOf(address) view returns (uint256)",
"function ownerOf(uint256 tokenId) view returns (address)",
"function safeTransferFrom(address from, address to, uint256 tokenId)",
"function name() view returns (string)",
"function symbol() view returns (string)",
"function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)", // ERC721Enumerable 용
];


const ERC1155_ABI = [

{
"inputs": [
{ "internalType": "string", "name": "_uri", "type": "string" }
],
"stateMutability": "nonpayable",
"type": "constructor"
},
{
"anonymous": false,
"inputs": [
{ "indexed": true, "internalType": "address", "name": "account", "type": "address" },
{ "indexed": true, "internalType": "address", "name": "operator", "type": "address" },
{ "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }
],
"name": "ApprovalForAll",
"type": "event"
},
{
"anonymous": false,
"inputs": [
{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
{ "indexed": true, "internalType": "address", "name": "to", "type": "address" },
{ "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
],
"name": "ERC20Transfer",
"type": "event"
},
{
"anonymous": false,
"inputs": [
{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
{ "indexed": true, "internalType": "address", "name": "to", "type": "address" },
{ "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
],
"name": "ERC721Transfer",
"type": "event"
},
{
"anonymous": false,
"inputs": [
{ "indexed": true, "internalType": "address", "name": "operator", "type": "address" },
{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
{ "indexed": true, "internalType": "address", "name": "to", "type": "address" },
{ "indexed": false, "internalType": "uint256[]", "name": "ids", "type": "uint256[]" },
{ "indexed": false, "internalType": "uint256[]", "name": "values", "type": "uint256[]" }
],
"name": "TransferBatch",
"type": "event"
},
{
"anonymous": false,
"inputs": [
{ "indexed": true, "internalType": "address", "name": "operator", "type": "address" },
{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
{ "indexed": true, "internalType": "address", "name": "to", "type": "address" },
{ "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
{ "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
],
"name": "TransferSingle",
"type": "event"
},
{
"inputs": [
{ "internalType": "address", "name": "account", "type": "address" },
{ "internalType": "uint256", "name": "id", "type": "uint256" }
],
"name": "balanceOf1155",
"outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "uint256", "name": "id1", "type": "uint256" },
{ "internalType": "uint256", "name": "id2", "type": "uint256" },
{ "internalType": "uint256", "name": "newId", "type": "uint256" }
],
"name": "combineItems",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "", "type": "address" }
],
"name": "erc20BalanceOf",
"outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "erc20Decimals",
"outputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "erc20Name",
"outputs": [ { "internalType": "string", "name": "", "type": "string" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "erc20Symbol",
"outputs": [ { "internalType": "string", "name": "", "type": "string" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "erc20TotalSupply",
"outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "to", "type": "address" },
{ "internalType": "uint256", "name": "value", "type": "uint256" }
],
"name": "erc20Transfer",
"outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "", "type": "address" }
],
"name": "erc721BalanceOf",
"outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "erc721Name",
"outputs": [ { "internalType": "string", "name": "", "type": "string" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "uint256", "name": "", "type": "uint256" }
],
"name": "erc721OwnerOf",
"outputs": [ { "internalType": "address", "name": "", "type": "address" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "erc721Symbol",
"outputs": [ { "internalType": "string", "name": "", "type": "string" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "erc721TotalSupply",
"outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "account", "type": "address" },
{ "internalType": "address", "name": "operator", "type": "address" }
],
"name": "isApprovedForAll1155",
"outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "to", "type": "address" },
{ "internalType": "uint256", "name": "id", "type": "uint256" },
{ "internalType": "uint256", "name": "amount", "type": "uint256" }
],
"name": "mint1155",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "to", "type": "address" },
{ "internalType": "uint256[]", "name": "ids", "type": "uint256[]" },
{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
],
"name": "mintBatch1155",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "owner",
"outputs": [ { "internalType": "address", "name": "", "type": "address" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }
],
"name": "ownerOf",
"outputs": [ { "internalType": "address", "name": "", "type": "address" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "from", "type": "address" },
{ "internalType": "address", "name": "to", "type": "address" },
{ "internalType": "uint256", "name": "id", "type": "uint256" },
{ "internalType": "uint256", "name": "amount", "type": "uint256" },
{ "internalType": "bytes", "name": "data", "type": "bytes" }
],
"name": "safeTransferFrom1155",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "operator", "type": "address" },
{ "internalType": "bool", "name": "approved", "type": "bool" }
],
"name": "setApprovalForAll1155",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{ "internalType": "uint256", "name": "id", "type": "uint256" }
],
"name": "totalMinted1155",
"outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "uint256", "name": "", "type": "uint256" }
],
"name": "totalSupply1155",
"outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{ "internalType": "address", "name": "from", "type": "address" },
{ "internalType": "address", "name": "to", "type": "address" },
{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }
],
"name": "transferFrom",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{ "internalType": "uint256", "name": "baseId", "type": "uint256" },
{ "internalType": "uint256", "name": "upgradedId", "type": "uint256" }
],
"name": "upgradeItem",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "uri",
"outputs": [ { "internalType": "string", "name": "", "type": "string" } ],
"stateMutability": "view",
"type": "function"
}
];


interface ERC20Asset {
symbol: string;
name: string;
address: string;
decimals: number;
balance: string;
}

interface ERC721Asset {
symbol: string;
name: string;
address: string;
count: number;
tokenIds: string[];
}

interface ERC1155Balance {
id: string; 
balance: number; 
}

interface ERC1155EventLog {
eventType: string;
description: string;
blockNumber: number;
transactionHash: string;
from?: string;
to?: string;
id?: string;
value?: number;
ids?: string[];
values?: number[];
}


export default function AssetDashboard() {
const [address, setAddress] = useState("");
const [wallet, setWallet] = useState("");
const [erc20Assets, setErc20Assets] = useState<ERC20Asset[]>([]);
const [erc721Assets, setErc721Assets] = useState<ERC721Asset[]>([]);
const [erc1155Balances, setErc1155Balances] = useState<ERC1155Balance[]>([]);
const [erc1155EventLogs, setErc1155EventLogs] = useState<ERC1155EventLog[]>([]);

const [nativeBalance, setNativeBalance] = useState<string>("");
const [status, setStatus] = useState("지갑을 연결해주세요.");
const [loading, setLoading] = useState(false);
const [txHash, setTxHash] = useState("");

// 전송 관련 상태
const [toAddress, setToAddress] = useState("");
const [erc20SendAmount, setErc20SendAmount] = useState("");
const [erc721SendTokenId, setErc721SendTokenId] = useState("");
const [erc1155SendId, setErc1155SendId] = useState("");
const [erc1155SendAmount, setErc1155SendAmount] = useState("");
const [erc1155BatchSendIds, setErc1155BatchSendIds] = useState("");
const [erc1155BatchSendAmounts, setErc1155BatchSendAmounts] = useState("");

const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
const [networkSymbol, setNetworkSymbol] = useState<string>('SepoliaETH');

const provider = React.useMemo(() => new ethers.JsonRpcProvider(SEPOLIA_RPC_URL), [SEPOLIA_RPC_URL]);


const connectMetamask = async () => {
if (!(window as any).ethereum) {
alert("메타마스크를 설치하세요!");
return;
}
try {
const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
const accounts = await browserProvider.send("eth_requestAccounts", []);
setWallet(accounts[0]);
setAddress(accounts[0]);
setStatus("메타마스크 연결 성공!");

const network = await provider.getNetwork();
setNetworkSymbol(network.name === "sepolia" ? "SepoliaETH" : network.name);
} catch (error: any) {
alert(`메타마스크 연결 실패: ${error.message}`);
setStatus(`메타마스크 연결 실패: ${error.message}`);
}
};



const fetchNativeBalance = useCallback(async () => {
if (!address) return;
try {
const balance = await provider.getBalance(address);
setNativeBalance(ethers.formatEther(balance));
const network = await provider.getNetwork();
setNetworkSymbol(network.name === "sepolia" ? "SepoliaETH" : network.name);
} catch (err) {
console.error("네이티브 잔액 조회 실패:", err);
setNativeBalance("조회 실패");
}
}, [address, provider]);

const fetchERC20 = useCallback(async () => {
if (!address) return;
setStatus("ERC-20 토큰 조회 중...");
try {
const txsUrl = `https://api-sepolia.etherscan.io/api?module=account&action=tokentx&address=${address}&page=1&offset=1000&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
const txsRes = await fetch(txsUrl);
const txsData = await txsRes.json();

const tokensMap: Map<string, Omit<ERC20Asset, "balance">> = new Map();
if (txsData.result && Array.isArray(txsData.result)) {
(txsData.result as any[]).forEach((tx: any) => {
if (tx.tokenSymbol && tx.contractAddress && !tokensMap.has(tx.contractAddress)) {
tokensMap.set(tx.contractAddress, {
name: tx.tokenName || tx.tokenSymbol,
symbol: tx.tokenSymbol,
decimals: Number(tx.tokenDecimal),
address: tx.contractAddress,
});
}
});
}

ERC20_LIST.forEach((token: Omit<ERC20Asset, "balance">) => {
if (!tokensMap.has(token.address)) {
tokensMap.set(token.address, token);
}
});

const results = await Promise.all(
Array.from(tokensMap.values()).map(async (tokenInfo) => {
try {

if (tokenInfo.address.toLowerCase() === CUSTOM_ERC1155_CONTRACT_ADDRESS.toLowerCase()) {
const gameAssetContract = new ethers.Contract(CUSTOM_ERC1155_CONTRACT_ADDRESS, ERC1155_ABI, provider);
const balance = await gameAssetContract.erc20BalanceOf(address);
const decimals = await gameAssetContract.erc20Decimals();
const name = await gameAssetContract.erc20Name();
const symbol = await gameAssetContract.erc20Symbol();
return {
address: tokenInfo.address,
name: name,
symbol: symbol,
decimals: Number(decimals),
balance: ethers.formatUnits(balance, Number(decimals)),
};
} else { 
const contract = new ethers.Contract(tokenInfo.address, ERC20_ABI, provider);
const balance = await contract.balanceOf(address);
return {
...tokenInfo,
balance: ethers.formatUnits(balance, tokenInfo.decimals),
};
}
} catch (e) {
console.error(`ERC-20 ${tokenInfo.symbol} (${tokenInfo.address}) 잔액 조회 실패:`, e);
return { ...tokenInfo, balance: "조회 실패" };
}
})
);
setErc20Assets(results.filter(Boolean) as ERC20Asset[]);
} catch (err) {
console.error("ERC-20 토큰 조회 실패:", err);
setErc20Assets([]);
}
}, [address, provider, ETHERSCAN_API_KEY, CUSTOM_ERC1155_CONTRACT_ADDRESS]);

const fetchERC721 = useCallback(async () => {
if (!address) return;
setStatus("ERC-721 토큰 조회 중...");
try {
const txsUrl = `https://api-sepolia.etherscan.io/api?module=account&action=tokennfttx&address=${address}&page=1&offset=1000&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
const txsRes = await fetch(txsUrl);
const txsData = await txsRes.json();

const nftContractsToQuery: Map<string, Omit<ERC721Asset, "count" | "tokenIds">> = new Map();
if (txsData.result && Array.isArray(txsData.result)) {
(txsData.result as any[]).forEach((tx: any) => {
if (tx.tokenSymbol && tx.contractAddress && !nftContractsToQuery.has(tx.contractAddress)) {
nftContractsToQuery.set(tx.contractAddress, {
symbol: tx.tokenSymbol,
name: tx.tokenName || tx.tokenSymbol,
address: tx.contractAddress,
});
}
});
}

ERC721_LIST.forEach((nft: Omit<ERC721Asset, "count" | "tokenIds">) => {
if (!nftContractsToQuery.has(nft.address)) {
nftContractsToQuery.set(nft.address, nft);
}
});

const results = await Promise.all(
Array.from(nftContractsToQuery.values()).map(async (nftConfig) => {
try {

if (nftConfig.address.toLowerCase() === CUSTOM_ERC1155_CONTRACT_ADDRESS.toLowerCase()) {
const gameAssetContract = new ethers.Contract(CUSTOM_ERC1155_CONTRACT_ADDRESS, ERC1155_ABI, provider);
const countBigInt = await gameAssetContract.erc721BalanceOf(address);
const name = await gameAssetContract.erc721Name();
const symbol = await gameAssetContract.erc721Symbol();


const hardhatKnownTokenIds = ["1", "10", "2"];
let tokenIds: string[] = [];
for(const id of hardhatKnownTokenIds) {
try {
const owner = await gameAssetContract.ownerOf(id); 
if(owner.toLowerCase() === address.toLowerCase()) {
tokenIds.push(id.toString());
}
} catch(e) { /* ownerOf 실패 시 무시 */ }
}

return {
address: nftConfig.address,
name: name,
symbol: symbol,
count: Number(countBigInt),
tokenIds: tokenIds,
};

} else { // 일반 ERC721 컨트랙트 잔액 조회 (GoseumW 등)
const contract = new ethers.Contract(nftConfig.address, ERC721_ABI, provider);
const countBigInt = await contract.balanceOf(address);
const count = Number(countBigInt);

let tokenIds: string[] = [];
if (count > 0 && typeof contract.tokenOfOwnerByIndex === 'function') {
for (let i = 0; i < count; i++) {
try {
const tokenId = await contract.tokenOfOwnerByIndex(address, i);
tokenIds.push(tokenId.toString());
} catch (e) {
console.warn(`ERC721 ${nftConfig.symbol} (Index ${i}) tokenOfOwnerByIndex 조회 실패:`, e);
}
}
} else if (count > 0) {
console.warn(`컨트랙트 ${nftConfig.symbol} (${nftConfig.address})는 ERC721Enumerable을 구현하지 않아 모든 토큰ID를 조회할 수 없습니다. (총 ${count}개 보유)`);
}

return {
...nftConfig,
count: count,
tokenIds: tokenIds,
};
}
} catch(e) {
console.error(`ERC-721 ${nftConfig.symbol} (${nftConfig.address}) 조회 실패:`, e);
return null;
}
})
);
setErc721Assets(results.filter(Boolean) as ERC721Asset[]);
} catch (err) {
console.error("ERC-721 토큰 조회 실패:", err);
setErc721Assets([]);
}
}, [address, provider, ETHERSCAN_API_KEY, CUSTOM_ERC1155_CONTRACT_ADDRESS]);

const fetchERC1155 = useCallback(async () => {
if (!address || !CUSTOM_ERC1155_CONTRACT_ADDRESS || !ethers.isAddress(CUSTOM_ERC1155_CONTRACT_ADDRESS)) {
setErc1155Balances([]);
setErc1155EventLogs([]);
setStatus("⚠️ ERC1155 컨트랙트 주소를 설정해주세요.");
return;
}
setStatus("ERC-1155 토큰 및 이벤트 조회 중...");
try {
const contract = new ethers.Contract(CUSTOM_ERC1155_CONTRACT_ADDRESS, ERC1155_ABI, provider);


const knownTokenIds = new Set<string>();
const pastTransferSingleLogs = await contract.queryFilter(contract.filters.TransferSingle(), 0);
const pastTransferBatchLogs = await contract.queryFilter(contract.filters.TransferBatch(), 0);

pastTransferSingleLogs.forEach((log:any) => {
if (log.args?.id) knownTokenIds.add(log.args.id.toString());
});
pastTransferBatchLogs.forEach((log:any) => {
if (log.args?.ids && Array.isArray(log.args.ids)) {
log.args.ids.forEach((id:any) => knownTokenIds.add(id.toString()));
}
});

const idsToQuery = Array.from(knownTokenIds);
["1", "2", "10", "11"].forEach(id => knownTokenIds.add(id));


const balances = await Promise.all(
Array.from(knownTokenIds.values()).map(async (id) => {
try {
const bal = await contract.balanceOf1155(address, id);
return { id, balance: Number(bal) };
} catch(e) {
console.warn(`ERC1155 TokenID ${id} 잔액 조회 실패:`, e);
return null;
}
})
);
setErc1155Balances(balances.filter(Boolean) as ERC1155Balance[]);


const allFilters = [
contract.filters.TransferSingle(),
contract.filters.TransferBatch(),
contract.filters.ApprovalForAll(),
contract.filters.ERC20Transfer(),
contract.filters.ERC721Transfer(),
];

let allLogs: any[] = [];
for(const filter of allFilters) {
try {
allLogs = allLogs.concat(await contract.queryFilter(filter, 0));
} catch(e) {
console.error(`ERROR: 이벤트 필터 (${filter?.fragment?.name || filter}) 조회 실패:`, e);
}
}

allLogs.sort((a, b) => b.blockNumber - a.blockNumber);

const formattedEvents: ERC1155EventLog[] = allLogs.map((log: any) => {
const eventType = log.eventName || "Unknown Event";
const from = log.args?.from || log.args?._from;
const to = log.args?.to || log.args?._to;
const id = log.args?.id || log.args?._id;
const value = log.args?.value || log.args?._value;
const ids = (log.args?.ids && Array.isArray(log.args.ids)) ? log.args.ids : [];
const values = (log.args?.values && Array.isArray(log.args.values)) ? log.args.values : [];
const account = log.args?.account || log.args?._account;
const operator = log.args?.operator || log.args?._operator;
const baseId = log.args?.baseId || log.args?._baseId;
const upgradedId = log.args?.upgradedId || log.args?._upgradedId;
const newId = log.args?.newId || log.args?._newId;
const oldTokenId1 = log.args?.oldTokenId1 || log.args?._oldTokenId1;
const oldTokenId2 = log.args?.oldTokenId2 || log.args?._oldTokenId2;


let description = "";
if (eventType === "TransferSingle") {
if (from === ethers.ZeroAddress) {
description = `[Mint] TokenID ${id?.toString() || 'N/A'} 수량 ${value?.toString() || 'N/A'} | To ${to?.slice(0,6)}...`;
}

else if (from?.toLowerCase() === address.toLowerCase() && to === ethers.ZeroAddress) { 
if (value?.toString() === '3') {
description = `[강화 재료 소각 추정] TokenID ${id?.toString() || 'N/A'} (3개 소각) by ${from?.slice(0,6)}...`;
} else if (value?.toString() === '1') {
description = `[합성 재료 소각 추정] TokenID ${id?.toString() || 'N/A'} (1개 소각) by ${from?.slice(0,6)}...`;
} else { 
description = `소각 | TokenID ${id?.toString() || 'N/A'} 수량 ${value?.toString() || 'N/A'} | From ${from?.slice(0,6)}...`;
}
} else if (from === ethers.ZeroAddress && to?.toLowerCase() === address.toLowerCase()) { 
description = `[생성/합성 추정] TokenID ${id?.toString() || 'N/A'} 수량 ${value?.toString() || 'N/A'} | To ${to?.slice(0,6)}...`;
}
else {
description = `전송 | TokenID ${id?.toString() || 'N/A'} 수량 ${value?.toString() || 'N/A'} | From ${from?.slice(0,6)}... To ${to?.slice(0,6)}...`;
}
} else if (eventType === "TransferBatch") {
if (from === ethers.ZeroAddress) {
const batchDetails = (ids.length > 0 && values.length > 0) ? ids.map((item: any, idx: number) => `ID ${item?.toString() || 'N/A'} Qty ${values[idx]?.toString() || 'N/A'}`).join(", ") : 'N/A';
description = `[Batch Mint] To ${to?.slice(0,6)}... | ${batchDetails}`;
} else {
const batchDetails = (ids.length > 0 && values.length > 0) ? ids.map((item: any, idx: number) => `ID ${item?.toString()} Qty ${values[idx]?.toString() || 'N/A'}`).join(", ") : 'N/A';
description = `배치 전송 | From ${from?.slice(0,6)}... To ${to?.slice(0,6)}... | ${batchDetails}`;
}
} else if (eventType === "ERC20Transfer") {
const erc20Value = value ? ethers.formatUnits(value, 18) : 'N/A';
description = `[ERC20 Transfer] ${erc20Value} GAMET | From ${from?.slice(0,6)}... To ${to?.slice(0,6)}...`;
} else if (eventType === "ERC721Transfer") {
description = `[ERC721 Transfer] TokenID ${id?.toString() || 'N/A'} | From ${from?.slice(0,6)}... To ${to?.slice(0,6)}...`;
} else if (eventType === "ApprovalForAll") {
description = `[ApprovalForAll] 계정 ${account?.slice(0,6)}... 에게 operator ${operator?.slice(0,6)}... ${log.args?.approved ? '승인' : '취소'}`;
} else {
const funcArgs = log.args ? Object.values(log.args).map((arg:any) => {
if (typeof arg === 'object' && 'toString' in arg) return arg.toString();
return String(arg);
}).join(', ') : '';
description = `[${eventType}] | 상세: ${funcArgs || '없음'}`;
}

return {
eventType: eventType,
description: description,
blockNumber: log.blockNumber,
transactionHash: log.transactionHash,
from: from, to: to,
id: id ? id.toString() : undefined,
value: value ? Number(value) : undefined,
ids: ids ? ids.map((x:any) => x.toString()) : undefined,
values: values ? values.map(Number) : undefined,
};
});
setErc1155EventLogs(formattedEvents);
} catch (e: any) {
setStatus("에러: ERC-1155 조회 및 이벤트 로드 실패: " + e.message);
console.error(e);
setErc1155Balances([]);
setErc1155EventLogs([]);
}
}, [address, provider, CUSTOM_ERC1155_CONTRACT_ADDRESS]);

const sendNativeCoin = async () => {
if (!address) { alert("먼저 지갑을 연결하세요."); return; }
if (!ethers.isAddress(toAddress)) { alert("올바른 받는 주소를 입력하세요."); return; }
if (isNaN(Number(erc20SendAmount)) || Number(erc20SendAmount) <= 0) { alert("올바른 전송 금액을 입력하세요."); return; }

setLoading(true);
setStatus("ETH 전송 중...");
try {
const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
const signer = await browserProvider.getSigner();

const tx = await signer.sendTransaction({
to: toAddress,
value: ethers.parseEther(erc20SendAmount),
});

setTxHash(tx.hash);
setStatus("ETH 전송 성공! 트랜잭션 전송됨. 확인 중...");
await tx.wait();
setStatus("ETH 전송 확인 완료!");
await fetchAll();
} catch (err: any) {
setStatus(`에러: ETH 전송 실패: ${err.message || err}`);
console.error(err);
} finally {
setLoading(false);
}
};

const sendERC20 = async (tokenAddress: string, to: string, amount: string, decimals: number) => {
if (!address) { alert("먼저 지갑을 연결하세요."); return; }
if (!ethers.isAddress(to)) { alert("올바른 받는 주소를 입력하세요."); return; }
if (isNaN(Number(amount)) || Number(amount) <= 0) { alert("올바른 전송 금액을 입력하세요."); return; }
if (!ethers.isAddress(tokenAddress)) { alert("올바른 ERC-20 토큰 컨트랙트 주소를 입력하세요."); return; }

setLoading(true);
setStatus("ERC-20 토큰 전송 중...");
try {
const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
const signer = await browserProvider.getSigner();

if (tokenAddress.toLowerCase() === CUSTOM_ERC1155_CONTRACT_ADDRESS.toLowerCase()) {
const gameAssetContract = new ethers.Contract(CUSTOM_ERC1155_CONTRACT_ADDRESS, ERC1155_ABI, signer);
const amountToSend = ethers.parseUnits(amount, decimals);
const tx = await gameAssetContract.erc20Transfer(to, amountToSend);
setTxHash(tx.hash);
setStatus("GAMET 전송 성공! 트랜잭션 전송됨. 확인 중...");
await tx.wait();
setStatus("GAMET 전송 확인 완료!");
await fetchAll();
} else { 
const erc20AbiTransfer = [
"function transfer(address to, uint256 amount) returns (bool)",
];
const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
const amountToSend = ethers.parseUnits(amount, decimals);

const tx = await tokenContract.transfer(to, amountToSend);
setTxHash(tx.hash);
setStatus("ERC-20 토큰 전송 성공! 트랜잭션 전송됨. 확인 중...");
await tx.wait();
setStatus("ERC-20 토큰 전송 확인 완료!");
await fetchAll();
}
} catch (err: any) {
setStatus(`에러: ERC-20 전송 실패: ${err.message || err}`);
console.error(err);
} finally {
setLoading(false);
}
};

const sendERC721 = async (tokenAddress: string, to: string, tokenId: string) => {
if (!address) { alert("먼저 지갑을 연결하세요."); return; }
if (!ethers.isAddress(to)) { alert("올바른 받는 주소를 입력하세요."); return; }
if (!ethers.isAddress(tokenAddress)) { alert("올바른 NFT 컨트랙트 주소를 입력하세요."); return; }
if (isNaN(Number(tokenId)) || Number(tokenId) < 0) { alert("올바른 토큰 ID를 입력하세요."); return; }

setLoading(true);
setStatus("ERC-721 NFT 전송 중...");
try {
const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
const signer = await browserProvider.getSigner();

// GameAssetsAll 컨트랙트 자체 ERC721 전송
if (tokenAddress.toLowerCase() === CUSTOM_ERC1155_CONTRACT_ADDRESS.toLowerCase()) {
const gameAssetContract = new ethers.Contract(CUSTOM_ERC1155_CONTRACT_ADDRESS, ERC1155_ABI, signer);
const tx = await gameAssetContract.transferFrom(address, to, tokenId);
setTxHash(tx.hash);
setStatus("GameAssetsAll ERC721 전송 성공! 트랜잭션 전송됨. 확인 중...");
await tx.wait();
setStatus("GameAssetsAll ERC721 전송 확인 완료!");
await fetchAll();
} else { 
const erc721AbiTransfer = [
"function safeTransferFrom(address from, address to, uint256 tokenId) public",
];
const nftContract = new ethers.Contract(tokenAddress, ERC721_ABI, signer);

const tx = await nftContract.safeTransferFrom(address, to, tokenId);
setTxHash(tx.hash);
setStatus("ERC-721 NFT 전송 성공! 트랜잭션 전송됨. 확인 중...");
await tx.wait();
setStatus("ERC-721 NFT 전송 확인 완료!");
await fetchAll();
}
} catch (err: any) {
setStatus(`에러: ERC-721 전송 실패: ${err.message || err}`);
console.error(err);
} finally {
setLoading(false);
}
};

const sendERC1155 = async (id: string, to: string, amount: string) => {
if (!address) { alert("먼저 지갑을 연결하세요."); return; }
if (!ethers.isAddress(to)) { alert("올바른 받는 주소를 입력하세요."); return; }
if (!CUSTOM_ERC1155_CONTRACT_ADDRESS || !ethers.isAddress(CUSTOM_ERC1155_CONTRACT_ADDRESS)) {
alert("ERC1155 컨트랙트 주소를 설정해주세요."); return;
}
if (isNaN(Number(id)) || Number(id) < 0) { alert("올바른 토큰 ID를 입력하세요."); return; }
if (isNaN(Number(amount)) || Number(amount) <= 0) { alert("올바른 전송 수량을 입력하세요."); return; }

setLoading(true);
setStatus("ERC-1155 단일 전송 중...");
try {
const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
const signer = await browserProvider.getSigner();

const contract = new ethers.Contract(CUSTOM_ERC1155_CONTRACT_ADDRESS, ERC1155_ABI, signer);

const tx = await contract.safeTransferFrom1155(address, to, id, amount, "0x"); 
setTxHash(tx.hash);
setStatus("ERC-1155 단일 전송 성공! 트랜잭션 전송됨. 확인 중...");
await tx.wait();
setStatus("ERC-1155 단일 전송 확인 완료!");
await fetchAll();
} catch (err: any) {
setStatus(`에러: ERC-1155 단일 전송 실패: ${err.message || err}`);
console.error(err);
} finally {
setLoading(false);
}
};

const sendERC1155Batch = async () => {
if (!address) { alert("먼저 지갑을 연결하세요."); return; }
if (!ethers.isAddress(toAddress)) { alert("올바른 받는 주소를 입력하세요."); return; }
if (!CUSTOM_ERC1155_CONTRACT_ADDRESS || !ethers.isAddress(CUSTOM_ERC1155_CONTRACT_ADDRESS)) {
alert("ERC1155 컨트랙트 주소를 설정해주세요."); return;
}
const idsArray = erc1155BatchSendIds.split(',').map(id => id.trim());
const amountsArray = erc1155BatchSendAmounts.split(',').map(amount => amount.trim());

if (idsArray.length === 0 || amountsArray.length === 0 || idsArray.length !== amountsArray.length) {
alert("토큰 ID와 수량의 개수가 일치해야 하며 비어있을 수 없습니다.");
return;
}
if (idsArray.some(id => isNaN(Number(id)) || Number(id) < 0) || amountsArray.some(amount => isNaN(Number(amount)) || Number(amount) <= 0)) {
alert("토큰 ID와 수량은 유효한 숫자여야 합니다.");
return;
}

setLoading(true);
setStatus("ERC-1155 배치 전송 중...");
try {
const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
const signer = await browserProvider.getSigner();

const contract = new ethers.Contract(CUSTOM_ERC1155_CONTRACT_ADDRESS, ERC1155_ABI, signer);

const tx = await contract.safeBatchTransferFrom(address, toAddress, idsArray, amountsArray, "0x");
setTxHash(tx.hash);
setStatus("ERC-1155 배치 전송 성공! 트랜잭션 전송됨. 확인 중...");
await tx.wait();
setStatus("ERC-1155 배치 전송 확인 완료!");
await fetchAll();
} catch (err: any) {
setStatus(`에러: ERC-1155 배치 전송 실패: ${err.message || err}`);
console.error(err);
} finally {
setLoading(false);
}
};



const fetchAll = useCallback(async () => {
if (!address) {
setStatus("지갑 주소를 먼저 연결하거나 입력하세요.");
return;
}
setLoading(true);
setTxHash("");
setStatus("자산 조회 중...");

await Promise.all([
fetchNativeBalance(),
fetchERC20(),
fetchERC721(),
fetchERC1155(),
]);
setStatus("자산 조회 완료!");
setLoading(false);
}, [address, fetchNativeBalance, fetchERC20, fetchERC721, fetchERC1155]);


// ---------------------- 컴포넌트 라이프사이클 및 실시간 업데이트 (폴링) ----------------------
useEffect(() => {
if (pollingIntervalRef.current) {
clearInterval(pollingIntervalRef.current);
pollingIntervalRef.current = null;
}

if (address) {
fetchAll();

const id = setInterval(fetchAll, 5000);
pollingIntervalRef.current = id;

return () => {
if (pollingIntervalRef.current) {
clearInterval(pollingIntervalRef.current as NodeJS.Timeout);
pollingIntervalRef.current = null;
}
};
} else {
setErc20Assets([]);
setErc721Assets([]);
setErc1155Balances([]);
setErc1155EventLogs([]);
setNativeBalance("");
setStatus("메타마스크를 연결해주세요.");
}
}, [address, fetchAll]);


return (
<div className="max-w-3xl mx-auto p-8 bg-[#232732] rounded-2xl shadow-md text-white">
<h1 className="text-cyan-400 text-2xl font-bold mb-4">ERC1155 Multisearch & All-Event Asset Dashboard</h1>
<div className="flex gap-2 mb-4">
<input type="text" className="border p-2 rounded text-black flex-1" value={address}
onChange={e => setAddress(e.target.value)} placeholder="지갑 주소 (0x...)" />
<button className="bg-cyan-500 px-4 py-1 rounded" onClick={connectMetamask} disabled={loading}>메타마스크 연결</button>
<button className="bg-blue-500 px-4 py-1 rounded" onClick={fetchAll} disabled={loading || !address}>전체조회</button>
</div>
{wallet && <div className="text-xs text-cyan-300 mb-4">내 지갑: {wallet}</div>}
<div className="mb-2 text-sm text-yellow-300">{status}</div> {/* 상태 메시지 */}

{/* === 전송 입력 필드 (모든 전송에 공통 사용) === */}
<div className="mb-4 p-4 border border-gray-600 rounded-lg">
<h3 className="text-lg font-semibold mb-2">전송 설정</h3>
<input type="text" className="border p-2 rounded text-black w-full mb-2" value={toAddress}
onChange={e => setToAddress(e.target.value)} placeholder="받는 주소 (0x...)" />
{loading && <div className="text-sm text-gray-400">트랜잭션 처리 중...</div>}
</div>

{/* === 네이티브 코인 잔액 === */}
<h2 className="text-yellow-400 mt-6 mb-2">네이티브 코인 잔액</h2>
<div className="text-2xl font-bold mb-4">
{nativeBalance ? `${nativeBalance} ${networkSymbol}` : "-"}
</div>
<div className="mt-4 p-4 border border-gray-700 rounded-lg">
<h4 className="text-lg font-semibold mb-2">네이티브 코인 전송</h4>
<input type="number" min={0} step={0.0001} placeholder="전송 금액 (ETH/SepoliaETH)" className="text-black p-2 rounded w-full mb-2" value={erc20SendAmount} onChange={e => setErc20SendAmount(e.target.value)} />
<button onClick={sendNativeCoin} disabled={loading || !address || !toAddress || !erc20SendAmount} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg w-full">
전송 ({networkSymbol})
</button>
</div>

{/* === ERC20 === */}
<h2 className="text-yellow-400 mt-6 mb-2">ERC-20 토큰</h2>
<ul className="space-y-4">
{erc20Assets.length === 0 && <li className="text-gray-400">표시할 토큰 없음</li>}
{erc20Assets.map((t) => (
<li key={t.address} className="border border-gray-700 p-4 rounded-lg">
<div className="flex justify-between items-center mb-2">
<span className="font-bold">{t.symbol}</span>: {t.balance}
<span className="text-sm text-gray-400 ml-2">({t.name})</span>
</div>
<span className="text-xs text-gray-500 break-all">Contract: {t.address}</span>
<div className="mt-2 pt-2 border-t border-gray-600">
<input type="number" min={0} step={0.0001} placeholder="전송 수량" className="text-black p-2 rounded w-full mb-2" value={erc20SendAmount} onChange={e => setErc20SendAmount(e.target.value)} />
<button onClick={() => sendERC20(t.address, toAddress, erc20SendAmount, t.decimals)} disabled={loading || !address || !toAddress || !erc20SendAmount} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg w-full">
전송 ({t.symbol})
</button>
</div>
</li>
))}
</ul>

{/* === ERC721 === */}
<h2 className="text-pink-400 mt-6 mb-2">ERC-721 (NFT)</h2>
<ul className="space-y-4">
{erc721Assets.length === 0 && <li className="text-gray-400">표시할 NFT 없음</li>}
{erc721Assets.map((n) => (
<li key={n.address} className="border border-gray-700 p-4 rounded-lg">
<div className="flex justify-between items-center mb-2">
<span className="font-bold">{n.name} ({n.symbol})</span>: 보유 {n.count}개
</div>
<span className="text-xs text-gray-500 break-all">Contract: {n.address}</span>
<ul className="ml-4 mt-2 space-y-1 border-t border-gray-600 pt-2">
{n.tokenIds.length === 0 ? (
<li className="text-gray-500">
보유 토큰 ID 없음 (ERC721Enumerable 미구현 또는 RPC 한도)
</li>
) : (
n.tokenIds.map((tokenId: string) => (
<li key={tokenId} className="flex items-center justify-between py-1">
<span>TokenID: {tokenId}</span>
{/* GoseumW 컨트랙트에는 전송 버튼 비활성화, GameAssetsAll의 ERC721(GNFT)에만 전송 버튼 활성화 */}
{n.address.toLowerCase() === CUSTOM_ERC1155_CONTRACT_ADDRESS.toLowerCase() && ( // GameAssetsAll 컨트랙트인 경우
<button onClick={() => sendERC721(n.address, toAddress, tokenId)} disabled={loading || !address || !toAddress} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm">
전송
</button>
)}
{n.address.toLowerCase() !== CUSTOM_ERC1155_CONTRACT_ADDRESS.toLowerCase() && ( // GoseumW 등 다른 ERC721 컨트랙트인 경우
<button disabled={true} className="bg-gray-500 text-white px-3 py-1 rounded-lg text-sm cursor-not-allowed">
전송 (불가)
</button>
)}
</li>
))
)}
</ul>
</li>
))}
</ul>

{/* === ERC1155 === */}
<h2 className="text-green-400 mt-6 mb-2">ERC-1155 (멀티토큰)</h2>
<ul className="space-y-4">
{erc1155Balances.length === 0 && <li className="text-gray-400">표시할 ERC-1155 토큰 없음</li>}
{erc1155Balances.map((t) => (
<li key={t.id} className="border border-gray-700 p-4 rounded-lg">
<span className="font-bold">TokenID {t.id}</span>: {t.balance}
{/* ERC1155 단일 전송 */}
<div className="mt-2 pt-2 border-t border-gray-600">
<input type="number" min={1} placeholder="전송 수량" className="text-black p-2 rounded w-full mb-2" value={erc1155SendAmount} onChange={e => setErc1155SendAmount(e.target.value)} />
<button onClick={() => sendERC1155(t.id, toAddress, erc1155SendAmount)} disabled={loading || !address || !toAddress || !erc1155SendAmount} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg w-full">
단일 전송 (ID: {t.id})
</button>
</div>
</li>
))}
</ul>

{/* ERC1155 배치 전송 섹션 */}
<div className="mt-6 p-4 border border-gray-600 rounded-lg bg-gray-800">
<h3 className="text-lg font-semibold mb-2">ERC-1155 배치 전송</h3>
<input type="text" className="border p-2 rounded text-black w-full mb-2" value={erc1155BatchSendIds}
onChange={e => setErc1155BatchSendIds(e.target.value)} placeholder="토큰 ID들 (쉼표로 구분: 1,2,3)" />
<input type="text" className="border p-2 rounded text-black w-full mb-2" value={erc1155BatchSendAmounts}
onChange={e => setErc1155BatchSendAmounts(e.target.value)} placeholder="수량들 (쉼표로 구분: 5,1,10)" />
<button onClick={sendERC1155Batch} disabled={loading || !address || !toAddress || !erc1155BatchSendIds || !erc1155BatchSendAmounts} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg w-full">
배치 전송
</button>
</div>

{/* === ERC1155 이벤트 로그 === */}
<h2 className="text-gray-300 mt-8 mb-2">ERC1155 이벤트 내역 (모든 변화 이력)</h2>
<p className="text-sm text-gray-500 mb-2">
⚠️ 주의: 컨트랙트 배포부터 모든 이력을 조회하므로, 블록 수가 많으면 매우 느리거나 오류가 발생할 수 있습니다.<br/>
(실제 서비스에서는 블록 범위 제한 또는 인덱싱 서비스 사용 필수)
</p>
<ul className="space-y-2 text-sm break-all">
{erc1155EventLogs.length === 0 && <li className="text-gray-400">이벤트 없음</li>}
{erc1155EventLogs.map((evt, i) => (
<li key={evt.transactionHash + i} className="border border-gray-700 p-2 rounded-lg">
<div className="font-bold text-cyan-300">이벤트: {evt.eventType}</div>
<div>{evt.description}</div>
<div className="text-xs text-gray-500 mt-1">
블록: {evt.blockNumber} | 트랜잭션: <a href={`https://sepolia.etherscan.io/tx/${evt.transactionHash}`} target="_blank" rel="noreferrer" className="underline text-blue-400">{evt.transactionHash.slice(0, 10)}...{evt.transactionHash.slice(-8)}</a>
</div>
</li>
))}
</ul>

{/* === 트랜잭션 해시/상태 === */}
{txHash && (
<div style={{ marginTop: 20, padding: 10, borderRadius: 7, background: status.includes("실패") ? "#dc354533" : "#28a74533", color: status.includes("실패") ? "#dc3545" : "#28a745", border: `1px solid ${status.includes("실패") ? "#dc3545" : "#28a745"}` }}>
Tx Hash: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline text-blue-400">{txHash}</a>
</div>
)}
</div>
);
} 
