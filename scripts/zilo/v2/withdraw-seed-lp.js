const { default: BigNumber } = require('bignumber.js')
const { getDefaultAccount } = require('../../account')
const { getZilliqaInstance, param, callContract } = require('../../utils')

const deploy = async () => {
  const owner = getDefaultAccount()

  console.log("withdraw from", owner.address)
  const zilliqa = getZilliqaInstance();

  const zilswapAddress = '0x1a62dd9c84b0c8948cb51fc664ba143e7a34985c';
  const tokenAddress = '0x0c66dfdb08dbffc686ab15400c09edef2d96412b';
  const seedLpAddress = '0xcc1ef4c4e2123c26fa4799c9476dbcef7409c9b6';
  const seedLpContract = zilliqa.contracts.at(seedLpAddress);

  const removeLiquidity = 1; // 1 for 100%, 0.255 for 25.5%

  const { result } = await zilliqa.blockchain.getSmartContractState(zilswapAddress);

  if (!result?.balances)
    throw new Error("cannot retrieve zilswap pool state");

  const liquidtyBalanceTkn = result.balances[tokenAddress]?.[seedLpAddress];
  if (liquidtyBalanceTkn) {
    const removeAmt = new BigNumber(liquidtyBalanceTkn).times(removeLiquidity).dp(0).toString();
    const tx = await callContract(key, seedLpContract, "RemoveLiquidity", [
      param("contribution_amount", "Uint128", removeAmt),
      param("min_zil_amount", "Uint128", "1"),
      param("min_token_amount", "Uint128", "1"),
    ]);
    console.log("remove liquidity tx", tx.hash);
  }

  const { result: seedLpState } = await zilliqa.blockchain.getSmartContractState(seedLpAddress);
  const seedLpBalanceZil = seedLpState._balance;
  const { result: tokenState } = await zilliqa.blockchain.getSmartContractSubState(tokenAddress, "balances", [seedLpAddress]);
  const seedLpBalanceTkn = tokenState?.balances?.[seedLpAddress]

  if (new BigNumber(seedLpBalanceZil).gt(0)) {
    const tx = await callContract(owner.key, seedLpContract, "Withdraw", [
      param("coin", `${seedLpAddress}.Coin`, {
        constructor: `${seedLpAddress}.Coin`,
        argtypes: [],
        arguments: [{
          constructor: `${seedLpAddress}.Zil`,
          argtypes: [],
          arguments: [],
        }, seedLpBalanceZil],
      }),
    ]);
    console.log("withdraw zil tx", tx.hash);
  }

  if (new BigNumber(seedLpBalanceTkn).gt(0)) {
    const tx = await callContract(owner.key, seedLpContract, "Withdraw", [
      param("coin", `${seedLpAddress}.Coin`, {
        constructor: `${seedLpAddress}.Coin`,
        argtypes: [],
        arguments: [{
          constructor: `${seedLpAddress}.Token`,
          argtypes: [],
          arguments: [tokenAddress],
        }, seedLpBalanceTkn],
      }),
    ]);
    console.log("withdraw tkn tx", tx.hash);
  }
}

deploy().then(() => console.log('Done.'))
