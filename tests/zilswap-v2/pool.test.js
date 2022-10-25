const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');

let token0, token1, owner, feeAccount, tx, pool, poolState, router, routerState
const minimumLiquidity = 1000
const token0Amt = "100000"
const token1Amt = "100000"
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

// Issue: When addLiquidity to pool with liquidity (ie second and subsequent addLiquidity attempts), 
// CodeOutOfBoundVReserve error is always thrown

beforeAll(async () => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0' }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1' }, router.address.toLowerCase(), null))[0]

  tx = await callContract(
    owner.key, router,
    'SetFeeConfiguration',
    [
      {
        vname: 'config',
        type: 'Pair ByStr20 Uint128',
        value: {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "Uint128"],
          "arguments": [`${feeAccount.address}`, "1000"] // 10%
        }
      },
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)
})

test('zilswap ampPool addLiquidity and removeLiquidity', async () => {
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(true) }))[0]

  poolState = await pool.getState()

  tx = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  // AddLiquidity to new Pool
  // amountA = amountA_desired; amountB = amountB_desired;
  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${token0.address.toLowerCase()}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
      {
        vname: 'amountA_desired',
        type: 'Uint128',
        value: `${token0Amt}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${token1Amt}`,
      },
      {
        vname: 'amountA_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'amountB_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'v_reserve_ratio_bounds',
        type: 'Pair (Uint256) (Uint256)',
        value: {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": ["0", "1000000000000"]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      },
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  // Increase Allowance for LP Token (to transfer LP token to Pool)
  tx = await callContract(
    owner.key, pool,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: router.address.toLowerCase(),
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${getLiquidity()}`,
      },
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  // RemoveLiquidity
  tx = await callContract(
    owner.key, router,
    'RemoveLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${token0.address.toLowerCase()}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
      {
        vname: 'liquidity',
        type: 'Uint128',
        value: `${getLiquidity()}`,
      },
      {
        vname: 'amountA_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'amountB_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      },
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)
  poolState = await pool.getState()

  expect(poolState).toEqual(expect.objectContaining({
    "reserve0": `${getAmount(getLiquidity(), token0Amt, `${minimumLiquidity + getLiquidity()}`)}`,
    "reserve1": `${getAmount(getLiquidity(), token1Amt, `${minimumLiquidity + getLiquidity()}`)}`,
    "balances": {
      "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
      [`${owner.address}`]: '0',
      [`${pool.address.toLowerCase(0)}`]: '0'
    },
    "total_supply": `${minimumLiquidity}`
  }))
})

test('zilswap notAmpPool addLiquidity and removeLiquidity', async () => {
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(false) }))[0]
  poolState = await pool.getState()

  tx = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  // AddLiquidity to new Pool
  // amountA = amountA_desired; amountB = amountB_desired;
  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${token0.address.toLowerCase()}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
      {
        vname: 'amountA_desired',
        type: 'Uint128',
        value: `${token0Amt}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${token1Amt}`,
      },
      {
        vname: 'amountA_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'amountB_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'v_reserve_ratio_bounds',
        type: 'Pair (Uint256) (Uint256)',
        value: {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": ["0", "1000000000000"]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      },
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  // Increase Allowance for LP Token
  tx = await callContract(
    owner.key, pool,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: router.address.toLowerCase(),
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${getLiquidity()}`,
      },
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  // RemoveLiquidity
  tx = await callContract(
    owner.key, router,
    'RemoveLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${token0.address.toLowerCase()}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
      {
        vname: 'liquidity',
        type: 'Uint128',
        value: `${getLiquidity()}`,
      },
      {
        vname: 'amountA_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'amountB_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      },
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)
  poolState = await pool.getState()

  expect(poolState).toEqual(expect.objectContaining({
    "reserve0": `${getAmount(getLiquidity(), token0Amt, `${minimumLiquidity + getLiquidity()}`)}`,
    "reserve1": `${getAmount(getLiquidity(), token1Amt, `${minimumLiquidity + getLiquidity()}`)}`,
    "balances": {
      "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
      [`${owner.address}`]: '0',
      [`${pool.address.toLowerCase(0)}`]: '0'
    },
    "total_supply": `${minimumLiquidity}`
  }))
})

// is_amp_pool = let is_eq = builtin eq amp bps in negb is_eq;
const getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

// obtain amt of LP tokens minted; new pool 
const getLiquidity = () => {
  return (Math.sqrt(token0Amt * token1Amt) - minimumLiquidity);
}

const getAmount = (liquidity, balance, supply) => {
  return balance - ((liquidity / balance) * supply);
}
