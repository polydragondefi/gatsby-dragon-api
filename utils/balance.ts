import { Pair, TokenAmount } from "@pancakeswap-libs/sdk";
import BigNumber from "bignumber.js";
import bep20ABI from "./abis/bep20.json";
import pairABI from "./abis/pair.json";
import masterChefABI from "./abis/masterchef.json";
import smartChefABI from "./abis/smartchef.json";
import { getContract, getWeb3 } from "./web3";
import { FIRE, FIRE_MATIC_FARM, FIRE_MATIC_TOKEN, FIRE_TOKEN, MASTERCHEF_CONTRACT, WMATIC_TOKEN } from "./constants";
import { pools } from "./pools";
import { multicall } from "./multicall";

interface UserInfoResult {
  amount: BigNumber;
  rewardDebt: BigNumber;
}

export const getTotalStaked = async (address: string, block: string): Promise<number> => {
  const web3 = getWeb3();
  const blockNumber = block === undefined ? await web3.eth.getBlockNumber() : new BigNumber(block).toNumber();
  let balance = new BigNumber(0);

  try {
    // Cake balance in wallet.
    const cakeContract = getContract(bep20ABI, FIRE, true);
    const cakeBalance = await cakeContract.methods.balanceOf(address).call(undefined, blockNumber);
    balance = balance.plus(cakeBalance);
  } catch (error) {
    console.error(`CAKE balance error: ${error}`);
  }

  try {
    // CAKE-BNB farm.
    const masterContract = getContract(masterChefABI, MASTERCHEF_CONTRACT, true);
    const cakeBnbContract = getContract(pairABI, FIRE_MATIC_FARM, true);
    const totalSupplyLP = await cakeBnbContract.methods.totalSupply().call(undefined, blockNumber);
    const reservesLP = await cakeBnbContract.methods.getReserves().call(undefined, blockNumber);
    const cakeBnbBalance: UserInfoResult = await masterContract.methods
      .userInfo(1, address)
      .call(undefined, blockNumber);
    const pair: Pair = new Pair(
      new TokenAmount(FIRE_TOKEN, reservesLP._reserve0.toString()),
      new TokenAmount(WMATIC_TOKEN, reservesLP._reserve1.toString())
    );
    const cakeLPBalance = pair.getLiquidityValue(
      pair.token0,
      new TokenAmount(FIRE_MATIC_TOKEN, totalSupplyLP.toString()),
      new TokenAmount(FIRE_MATIC_TOKEN, cakeBnbBalance.amount.toString()),
      false
    );
    balance = balance.plus(new BigNumber(cakeLPBalance.toSignificant(18)).times(1e18));
  } catch (error) {
    console.error(`CAKE-BNB LP error: ${error}`);
  }

  try {
    // MasterChef contract.
    const masterContract = getContract(masterChefABI, MASTERCHEF_CONTRACT, true);
    const cakeMainStaking: UserInfoResult = await masterContract.methods
      .userInfo(0, address)
      .call(undefined, blockNumber);
    balance = balance.plus(cakeMainStaking.amount);
  } catch (error) {
    console.error(`MasterChef error: ${error}`);
  }

  try {
    // Pools balances.
    const poolsFiltered = pools.filter((pool) => blockNumber >= pool.startBlock && blockNumber <= pool.endBlock);
    const calls = poolsFiltered.map((pool) => ({
      address: pool.address,
      name: "userInfo",
      params: [address],
    }));
    const userInfo = await multicall(smartChefABI, calls, blockNumber);
    const balancesMapping = userInfo.reduce(
      (acc: BigNumber, result: UserInfoResult) => acc.plus(new BigNumber(result.amount._hex)),
      new BigNumber(0)
    );

    balance = balance.plus(balancesMapping);
  } catch (error) {
    console.error(`Pools error: ${error}`);
  }

  return balance.div(1e9).toNumber();
};
