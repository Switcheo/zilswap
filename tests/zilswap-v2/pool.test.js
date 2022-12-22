const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getContractCodeHash, ZERO_ADDRESS } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let wZil, token0, token1, owner, feeAccount, tx, pool, prevPoolState, newPoolState, router, routerState, amp
const BPS = 10000
const feeBps = 1000 // 10%
const minimumLiquidity = 1000
const amount0 = 100000
const amount1 = 100000
const token0AmtDesired = (new BigNumber(amount0)).shiftedBy(12)
const token1AmtDesired = (new BigNumber(amount1)).shiftedBy(12)
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");


beforeAll(async () => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
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

describe('zilswap ampPool AddLiquidity, RemoveLiquidty', async () => {
  beforeAll(async () => {
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
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    routerState = await pool.getState()
  })

  test('zilswap ampPool addLiquidity to pool with no liquidity', async () => {
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
          value: `${token0AmtDesired.toString()}`,
        },
        {
          vname: 'amountB_desired',
          type: 'Uint128',
          value: `${token1AmtDesired.toString()}`,
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
            "arguments": ["0", "0"]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState()
    expect(newPoolState).toEqual(expect.objectContaining({
      "reserve0": `${newReserve0.toString()}`,
      "reserve1": `${newReserve1.toString()}`,
      "v_reserve0": `${newVReserve0.toString()}`,
      "v_reserve1": `${newVReserve1.toString()}`,
      "k_last": `${newKLast.toString(10)}`,
      "balances": {
        "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.toString()}`,
      },
      "total_supply": `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap ampPool addLiquidity to pool with existing liquidity', async () => {
    // Only need to calculate when adding liquidity into amp pool with existing liquidity
    const { vReserveMin, vReserveMax } = getVReserveBound()

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
          value: `${token0AmtDesired.toString()}`,
        },
        {
          vname: 'amountB_desired',
          type: 'Uint128',
          value: `${token1AmtDesired.toString()}`,
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
            "arguments": [`${vReserveMin}`, `${vReserveMax}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState()
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ["0x0000000000000000000000000000000000000000"]: `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.plus(prevPoolState.balances[owner.address]).toString()}`,
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap ampPool Skim', async () => {
    tx = await callContract(
      owner.key, pool,
      'Skim',
      [
        {
          vname: 'to',
          type: 'ByStr20',
          value: `${owner.address.toLowerCase()}`,
        },
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool Sync', async () => {
    tx = await callContract(
      owner.key, pool,
      'Sync',
      [],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool removeLiquidity', async () => {
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
          value: `${prevPoolState.balances[owner.address.toLowerCase()]}`,
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
          value: `${prevPoolState.balances[owner.address.toLowerCase()]}`,
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
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getRemoveLiquidityState()
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })
})


describe('zilswap non-ampPool AddLiquidity, RemoveLiquidty', async () => {
  beforeAll(async () => {
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
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    routerState = await pool.getState()
  })

  test('zilswap non-ampPool addLiquidity to pool with no liquidity', async () => {
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
          value: `${token0AmtDesired.toString()}`,
        },
        {
          vname: 'amountB_desired',
          type: 'Uint128',
          value: `${token1AmtDesired.toString()}`,
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
            "arguments": ['0', '0']
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState()
    expect(newPoolState).toEqual(expect.objectContaining({
      "reserve0": `${newReserve0.toString()}`,
      "reserve1": `${newReserve1.toString()}`,
      "v_reserve0": `${newVReserve0.toString()}`,
      "v_reserve1": `${newVReserve1.toString()}`,
      "k_last": `${newKLast.toString(10)}`,
      "balances": {
        "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.toString()}`,
      },
      "total_supply": `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap non-ampPool addLiquidity to pool with existing liquidity', async () => {
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
          value: `${token0AmtDesired.toString()}`,
        },
        {
          vname: 'amountB_desired',
          type: 'Uint128',
          value: `${token1AmtDesired.toString()}`,
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
            "arguments": ['0', '0']
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState()
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ["0x0000000000000000000000000000000000000000"]: `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.plus(prevPoolState.balances[owner.address]).toString()}`,
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap non-ampPool Skim', async () => {
    tx = await callContract(
      owner.key, pool,
      'Skim',
      [
        {
          vname: 'to',
          type: 'ByStr20',
          value: `${owner.address.toLowerCase()}`,
        },
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap non-ampPool Sync', async () => {
    tx = await callContract(
      owner.key, pool,
      'Sync',
      [],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool removeLiquidity', async () => {
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
          value: `${prevPoolState.balances[owner.address.toLowerCase()]}`,
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
          value: `${prevPoolState.balances[owner.address.toLowerCase()]}`,
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
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getRemoveLiquidityState()
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })
})


// Helper Functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

getVReserveBound = () => {
  vReserveA = parseInt(prevPoolState.v_reserve0)
  vReserveB = parseInt(prevPoolState.v_reserve1)
  q112 = new BigNumber(2).pow(112)
  vReserveMin = new BigNumber((vReserveB / vReserveA) * q112 / 1.05).toString(10)
  vReserveMax = new BigNumber((vReserveB / vReserveA) * q112 * 1.05).toString(10)
  return { vReserveMin, vReserveMax }
}

getMintFee = (feeOn, isAmpPool, reserve0, reserve1, vReserve0, vReserve1, kLast, totalSupply) => {
  if (!feeOn) {
    return new BigNumber(0)
  }

  const r0 = isAmpPool ? vReserve0 : reserve0
  const r1 = isAmpPool ? vReserve1 : reserve1
  const tmp = kLast.multipliedBy(r0)

  let collectedFee;
  if ((tmp.dividedToIntegerBy(r0)).isEqualTo(kLast)) {
    const a = tmp.dividedToIntegerBy(r1)
    const sqrt = a.sqrt()
    collectedFee = r0.minus(sqrt)
  }
  else {
    const a = kLast.dividedToIntegerBy(r1).multipliedBy(r0)
    const sqrt = a.sqrt()
    collectedFee = r0.minus(sqrt)
  }
  const poolValueInToken0 = reserve0.plus(frac(reserve1, r0, r1))
  const numerator = totalSupply.multipliedBy(collectedFee).multipliedBy(feeBps)
  const denominator = (poolValueInToken0.minus(collectedFee)).multipliedBy(5000)
  const liquidity = numerator.dividedToIntegerBy(denominator)

  if (liquidity.gt(0)) {
    return liquidity
  } else {
    return new BigNumber(0)
  }
}

getAddLiquidityState = () => {
  let liquidity, newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast;

  const oldReserve0 = new BigNumber(prevPoolState.reserve0)
  const oldReserve1 = new BigNumber(prevPoolState.reserve1)
  const oldVReserve0 = new BigNumber(prevPoolState.v_reserve0)
  const oldVReserve1 = new BigNumber(prevPoolState.v_reserve1)
  const ampBps = new BigNumber(prevPoolState.amp_bps)
  const oldTotalSupply = new BigNumber(prevPoolState.total_supply)
  const oldKLast = new BigNumber(prevPoolState.k_last)

  const feeOn = !(routerState.fee_configuration === ZERO_ADDRESS)
  const isAmpPool = !(ampBps.isEqualTo(BPS))

  // AddLiquidity
  if (oldReserve0.isZero() && oldReserve1.isZero()) {
    newReserve0 = oldReserve0.plus(token0AmtDesired)
    newReserve1 = oldReserve1.plus(token1AmtDesired)
  }
  else {
    const token1AmtOptimal = quote(token0AmtDesired, oldReserve0, oldReserve1)
    if (token1AmtOptimal.lt(token1AmtDesired)) {
      newReserve0 = oldReserve0.plus(token0AmtDesired)
      newReserve1 = oldReserve1.plus(token1AmtOptimal)
    } else {
      const token0AmtOptimal = quote(token1AmtDesired, oldReserve1, oldReserve0)
      newReserve0 = oldReserve0.plus(token0AmtOptimal)
      newReserve1 = oldReserve1.plus(token1AmtDesired)
    }
  }

  // Mint
  const fee = getMintFee(feeOn, isAmpPool, oldReserve0, oldReserve1, oldVReserve0, oldVReserve1, oldKLast, oldTotalSupply)

  let intermediateTotalSupply = oldTotalSupply.plus(fee)

  if (intermediateTotalSupply.isZero()) {

    if (isAmpPool) {
      newVReserve0 = frac(newReserve0, ampBps, BPS)
      newVReserve1 = frac(newReserve1, ampBps, BPS)
    }
    else {
      newVReserve0 = new BigNumber(0)
      newVReserve1 = new BigNumber(0)
    }
    liquidity = (token0AmtDesired.multipliedBy(token1AmtDesired)).sqrt().minus(minimumLiquidity)
    intermediateTotalSupply = intermediateTotalSupply.plus(minimumLiquidity)
  }
  else {
    const a = frac(token0AmtDesired, intermediateTotalSupply, oldReserve0)
    const b = frac(token1AmtDesired, intermediateTotalSupply, oldReserve1)
    liquidity = BigNumber.min(a, b)

    if (isAmpPool) {
      const c = liquidity.plus(intermediateTotalSupply)

      // console.log("frac(oldVReserve0, c, intermediateTotalSupply)", frac(oldVReserve0, c, intermediateTotalSupply).toString(10))
      // console.log("new BigNumber(x).multipliedBy(y).dividedToIntegerBy(z).toString()", new BigNumber(oldVReserve0).multipliedBy(c).dividedBy(intermediateTotalSupply).toString(10))

      newVReserve0 = BigNumber.max(frac(oldVReserve0, c, intermediateTotalSupply), newReserve0)
      newVReserve1 = BigNumber.max(frac(oldVReserve1, c, intermediateTotalSupply), newReserve1)
    }
    else {
      newVReserve0 = new BigNumber(0)
      newVReserve1 = new BigNumber(0)
    }
  }

  const newTotalSupply = intermediateTotalSupply.plus(liquidity)
  if (feeOn) {
    newKLast = updateLastK(isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1)
  }

  console.log({ newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply })
  return { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply }
}

getRemoveLiquidityState = () => {
  let liquidity, newVReserve0, newVReserve1, newKLast;

  const oldReserve0 = new BigNumber(prevPoolState.reserve0)
  const oldReserve1 = new BigNumber(prevPoolState.reserve1)
  const oldVReserve0 = new BigNumber(prevPoolState.v_reserve0)
  const oldVReserve1 = new BigNumber(prevPoolState.v_reserve1)
  const ampBps = new BigNumber(prevPoolState.amp_bps)
  const oldTotalSupply = new BigNumber(prevPoolState.total_supply)
  const oldKLast = new BigNumber(prevPoolState.k_last)

  // console.log("oldReserve0", oldReserve0)
  // console.log("oldReserve1", oldReserve1)
  // console.log("oldVReserve0", oldVReserve0)
  // console.log("oldVReserve1", oldVReserve1)
  // console.log("ampBps", ampBps)
  // console.log("oldTotalSupply", oldTotalSupply)
  // console.log("oldKLast", oldKLast)

  const feeOn = !(routerState.fee_configuration === ZERO_ADDRESS)
  const isAmpPool = !(ampBps.isEqualTo(BPS))

  liquidity = prevPoolState.balances[owner.address.toLowerCase()]
  // console.log("liquidity", liquidity)

  // Mint
  const fee = getMintFee(feeOn, isAmpPool, oldReserve0, oldReserve1, oldVReserve0, oldVReserve1, oldKLast, oldTotalSupply)

  let intermediateTotalSupply = oldTotalSupply.plus(fee)

  const amount0 = frac(liquidity, oldReserve0, intermediateTotalSupply)
  const amount1 = frac(liquidity, oldReserve1, intermediateTotalSupply)

  const newTotalSupply = intermediateTotalSupply.minus(liquidity)

  const newReserve0 = oldReserve0.minus(amount0)
  const newReserve1 = oldReserve0.minus(amount1)

  if (isAmpPool) {
    const b = BigNumber.min(frac(newReserve0, intermediateTotalSupply, oldReserve0), frac(newReserve1, intermediateTotalSupply, oldReserve1))
    newVReserve0 = BigNumber.max(frac(oldVReserve0, b, intermediateTotalSupply), newReserve0)
    newVReserve1 = BigNumber.max(frac(oldVReserve1, b, intermediateTotalSupply), newReserve1)
  } else {
    newVReserve0 = new BigNumber(0)
    newVReserve1 = new BigNumber(0)
  }

  if (feeOn) {
    newKLast = updateLastK(isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1)
  }

  // console.log({ newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply })
  return { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply }
}

updateLastK = (isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1) => {
  if (isAmpPool) {
    return newVReserve0.multipliedBy(newVReserve1)
  } else {
    return newReserve0.multipliedBy(newReserve1)
  }
}

// return (x*y)/z
frac = (x, y, z) => {
  return new BigNumber(x).multipliedBy(y).dividedToIntegerBy(z)
}

quote = (amountA, reserveA, reserveB) => {
  return new BigNumber(amountA).multipliedBy(reserveB).dividedToIntegerBy(reserveA)
}