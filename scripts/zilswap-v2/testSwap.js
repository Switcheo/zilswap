const { deployZilswapV2Router, deployZilswapV2Pool } = require('../deploy.js');
const { callContract } = require('../call.js')
const { getContractCodeHash } = require('../../tests/zilswap-v2/helper.js');
const { default: BigNumber } = require('bignumber.js');
const { getPrivateKey, zilliqa, param, useKey } = require("../zilliqa");
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');

// Helper functions
getVReserveBound = async (pool) => {
  const poolState = await pool.getState()
  const vReserveB = parseInt(poolState.v_reserve1)
  const vReserveA = parseInt(poolState.v_reserve0)
  if (vReserveA === 0 || vReserveB === 0) {
    return { vReserveMin: new BigNumber(0).toString(), vReserveMax: new BigNumber(0).toString() }
  }
  const q112 = new BigNumber(2).pow(112)
  const vReserveMin = new BigNumber((vReserveB / vReserveA) * q112 / 1.05).toString(10)
  const vReserveMax = new BigNumber((vReserveB / vReserveA) * q112 * 1.05).toString(10)
  return { vReserveMin, vReserveMax }
}

;
(async () => {
  const privateKey = getPrivateKey()
  const ownerAddress = getAddressFromPrivateKey(privateKey);
  const wZilAddress = process.env.WZIL_CONTRACT_HASH;
  const wZilContract = zilliqa.contracts.at(wZilAddress);
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;
  const hunyContract = zilliqa.contracts.at(hunyAddress);
  const routerAddress = process.env.ROUTER_CONTRACT_HASH;
  const routerContract = zilliqa.contracts.at(routerAddress);
  const poolAddress = process.env.POOL_CONTRACT_HASH;
  const poolContract = zilliqa.contracts.at(poolAddress);

  // Increase Allowance for Huny Token (for router to transfer huny to pool)
  const txIncreaseAllowanceHuny = await callContract(
    privateKey, hunyContract,
    'IncreaseAllowance',
    [
      param('spender', 'ByStr20', routerAddress.toLowerCase()),
      param('amount', 'Uint128', `100000000000000000000000000000000`)
    ],
    0, false, false
  )
  console.log(`increasing allowance for spender: ${routerAddress}, on huny: ${hunyAddress}`, txIncreaseAllowanceHuny.id);

  // Increase Allowance for WZIL Token (for router to transfer WZIL to pool)
  const txIncreaseAllowanceWZIL = await callContract(
    privateKey, wZilContract,
    'IncreaseAllowance',
    [
      param('spender', 'ByStr20', routerAddress.toLowerCase()),
      param('amount', 'Uint128', `100000000000000000000000000000000`)
    ],
    0, false, false
  )
  console.log(`increasing allowance for spender: ${routerAddress}, on huny: ${wZilAddress}`, txIncreaseAllowanceWZIL.id);

  // Add Liquidity
  const txAddLiquidity = await callContract(
    privateKey, routerContract,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', `${hunyAddress.toLowerCase()}`),
      param('pool', 'ByStr20', `${poolAddress.toLowerCase()}`),
      param('amount_token_desired', 'Uint128', `${(new BigNumber(100)).shiftedBy(12).toString()}`),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(poolContract)).vReserveMin}`, `${(await getVReserveBound(poolContract)).vReserveMax}`]
      })
    ],
    100, false, true
  )
  console.log(`adding liquidity to pool: ${poolAddress}`, txAddLiquidity.id);

  // Swap tokens once within pool
  const txSwapTokensOnce = await callContract(
    privateKey, routerContract,
    'SwapExactTokensForTokensOnce',
    [
      param('amount_in', 'Uint128', `${(new BigNumber(10)).shiftedBy(12)}`),
      param('amount_out_min', 'Uint128', `${(new BigNumber(1)).shiftedBy(12)}`),
      param('pool', 'ByStr20', poolAddress.toLowerCase()),
      param('path', 'Pair (ByStr20) (ByStr20)', {
        "constructor": "Pair",
        "argtypes": ["ByStr20", "ByStr20"],
        "arguments": [`${hunyAddress.toLowerCase()}`, `${wZilAddress.toLowerCase()}`]
      })
    ],
    0, false, true
  )
  console.log(`swapping once from pool: ${poolAddress}`, txSwapTokensOnce.id);

  const newPoolState = await poolContract.getState()

  // // Increase Allowance for LP Token (to transfer LP token to Pool)
  // const txIncreaseAllowance = await callContract(
  //   privateKey, poolContract,
  //   'IncreaseAllowance',
  //   [
  //     param('spender', 'ByStr20', routerAddress.toLowerCase()),
  //     param('amount', 'Uint128', `${newPoolState.balances[ownerAddress.toLowerCase()]}`)
  //   ],
  //   0, false, false
  // )
  // console.log(`increasing allowance for spender: ${routerAddress}, on pool: ${poolAddress}`, txIncreaseAllowance.id);

  // // Remove Liquidity
  // const txRemoveLiquidity = await callContract(
  //   privateKey, routerContract,
  //   'RemoveLiquidityZIL',
  //   [
  //     param('token', 'ByStr20', `${hunyAddress.toLowerCase()}`),
  //     param('pool', 'ByStr20', `${poolAddress.toLowerCase()}`),
  //     param('liquidity', 'Uint128', `${newPoolState.balances[ownerAddress.toLowerCase()]}`),
  //     param('amount_token_min', 'Uint128', '0'),
  //     param('amount_wZIL_min', 'Uint128', '0'),
  //   ],
  //   0, false, true
  // )
  // console.log(`removing liquidity from pool: ${poolAddress}`, txRemoveLiquidity.id);
})();
