const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let token0, token1, owner, feeAccount, tx, pool, prevPoolState, newPoolState, router, amp
const bps = 10000
const minimumLiquidity = 1000
const token0Amt = 100000
const token1Amt = 100000
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");


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

    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(expect.objectContaining({
      "reserve0": `${token0Amt}`,
      "reserve1": `${token1Amt}`,
      "v_reserve0": `${getInitVReserve(token0Amt)}`,
      "v_reserve1": `${getInitVReserve(token1Amt)}`,
      "balances": {
        "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
        [`${owner.address}`]: `${getInitLiquidity()}`,
      },
      "total_supply": `${getInitLiquidity() + minimumLiquidity}`
    }))
  })

  test('zilswap ampPool addLiquidity to pool with existing liquidity', async () => {
    const v_reserve_a = parseInt(prevPoolState.v_reserve0)
    const v_reserve_b = parseInt(prevPoolState.v_reserve1)
    const q112 = new BigNumber(2).pow(112)
    const v_reserve_min = new BigNumber((v_reserve_b / v_reserve_a) * q112 / 1.05).toString(10)
    const v_reserve_max = new BigNumber((v_reserve_b / v_reserve_a) * q112 * 1.05).toString(10)

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
            "arguments": [`${v_reserve_min}`, `${v_reserve_max}`]
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

    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${parseInt(prevPoolState.reserve0) + token0Amt}`,
      reserve1: `${parseInt(prevPoolState.reserve1) + token0Amt}`,
      v_reserve0: `${getIntermediateVReserve('reserve0')}`,
      v_reserve1: `${getIntermediateVReserve('reserve1')}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: `${parseInt(prevPoolState.balances[owner.address]) + getIntermediateLiquidity()}`,
      },
      total_supply: `${parseInt(prevPoolState.total_supply) + getIntermediateLiquidity()}`
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
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${getFinalReserve("reserve0")}`,
      reserve1: `${getFinalReserve("reserve1")}`,
      v_reserve0: `${getFinalVReserve()[0]}`,
      v_reserve1: `${getFinalVReserve()[1]}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${minimumLiquidity}`
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
            "arguments": ['0', '0']
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

    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${token0Amt}`,
      reserve1: `${token1Amt}`,
      v_reserve0: '0',
      v_reserve1: '0',
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: `${getInitLiquidity()}`,
      },
      total_supply: `${getInitLiquidity() + minimumLiquidity}`
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
            "arguments": ['0', '0']
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

    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${parseInt(prevPoolState.reserve0) + token0Amt}`,
      reserve1: `${parseInt(prevPoolState.reserve1) + token0Amt}`,
      v_reserve0: '0',
      v_reserve1: '0',
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: `${parseInt(prevPoolState.balances[owner.address]) + getIntermediateLiquidity()}`,
      },
      total_supply: `${parseInt(prevPoolState.total_supply) + getIntermediateLiquidity()}`
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
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${getFinalReserve("reserve0")}`,
      reserve1: `${getFinalReserve("reserve1")}`,
      v_reserve0: '0',
      v_reserve1: '0',
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${minimumLiquidity}`
    }))
  })
})


// Helper Functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

// init v_reserve for amp pool
getInitVReserve = (newReserve) => {
  amp = getAmpBps(true)
  return newReserve * amp / bps
}

// intermediate v_reserve for amp pool
getIntermediateVReserve = (reserve) => {
  amp = getAmpBps(true)
  switch (reserve) {
    case "reserve0":
      return newPoolState.reserve0 * amp / bps
    case "reserve1":
      return newPoolState.reserve1 * amp / bps
  }
}

// final v_reserve for amp pool
getFinalVReserve = () => {
  let x = new BigNumber(newPoolState.reserve0 * newPoolState.total_supply / prevPoolState.reserve0)
  let y = new BigNumber(newPoolState.reserve1 * newPoolState.total_supply / prevPoolState.reserve1)
  let b = BigNumber.min(x, y)
  let vx = new BigNumber(prevPoolState.v_reserve0 * b / newPoolState.total_supply)
  let vy = new BigNumber(prevPoolState.v_reserve1 * b / newPoolState.total_supply)
  let v_r0 = BigNumber.max(vx, newPoolState.reserve0).toString()
  let v_r1 = BigNumber.max(vy, newPoolState.reserve1).toString()
  return [v_r0, v_r1]
}

// final reserves for non-amp pool
getFinalReserve = (reserve) => {
  let balance
  let liquidity = newPoolState.balances[pool.address.toLowerCase()]
  let supply = parseInt(newPoolState.total_supply)
  switch (reserve) {
    case "reserve0":
      balance = parseInt(newPoolState.reserve0)
      break;
    case "reserve1":
      balance = parseInt(newPoolState.reserve1)
      break;
  }
  return balance - ((liquidity / balance) * supply);
}

// init LP tokens minted for user
getInitLiquidity = () => {
  return (Math.sqrt(token0Amt * token1Amt) - minimumLiquidity);
}

// intermediate LP tokens minted when adding liquidity to pool with existing liquidity
const getIntermediateLiquidity = () => {
  const a = token0Amt * prevPoolState.total_supply / prevPoolState.reserve0
  const b = token1Amt * prevPoolState.total_supply / prevPoolState.reserve1
  return Math.min(a, b)
}
