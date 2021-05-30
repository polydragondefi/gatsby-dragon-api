import Web3 from "web3";

const MATIC_NODE_RPC = [
  "https://rpc-mainnet.matic.quiknode.pro",
  "https://rpc-mainnet.maticvigil.com",
  "https://matic-mainnet-full-rpc.bwarelabs.com",
];

const MATIC_ARCHIVE_NODE_RPC = [
  "https://matic-mainnet-archive-rpc.bwarelabs.com",
  "https://rpc-mainnet.matic.quiknode.pro",
  "https://rpc-mainnet.maticvigil.com",
];

export const getWeb3 = (archive = false): Web3 => {
  const provider: string = archive
    ? MATIC_ARCHIVE_NODE_RPC[Math.floor(Math.random() * MATIC_ARCHIVE_NODE_RPC.length)]
    : MATIC_NODE_RPC[Math.floor(Math.random() * MATIC_NODE_RPC.length)];

  return new Web3(new Web3.providers.HttpProvider(provider, { timeout: 30000 }));
};

export const getContract = (abi: any, address: string, archive = false) => {
  const web3: Web3 = getWeb3(archive);

  return new web3.eth.Contract(abi, address);
};
