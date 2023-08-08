const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getPoolContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');
const { param } = require("../../scripts/zilliqa");

let wZil, token0, token1, owner, feeAccount, tx, pool, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State
const init_liquidity = 10000
let amountIn = 100
let amountInMax = 1000
let amountOut = 100
let amountOutMin = 10

describe('Zilswap swap exact zrc2 for zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup(false)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('swap exact token0 for token1 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapExactTokensForTokensOnce", "Token0ToToken1", false)
    await validateBalances(token0, token1, "SwapExactTokensForTokensOnce", "Token0ToToken1")
  })

  test('swap exact token1 for token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    await validatePoolReserves("SwapExactTokensForTokensOnce", "Token1ToToken0", false)
    await validateBalances(token0, token1, "SwapExactTokensForTokensOnce", "Token1ToToken0")
  })
})

describe('Zilswap swap zrc2 for exact zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup(false)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      aowner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('swap token0 for exact token1 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapTokensForExactTokensOnce", "Token0ToToken1")
    await validateBalances(token0, token1, "SwapTokensForExactTokensOnce", "Token0ToToken1")
  })

  test('swap token1 for exact token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapTokensForExactTokensOnce", "Token1ToToken0", false)
    await validateBalances(token0, token1, "SwapTokensForExactTokensOnce", "Token1ToToken0")
  })
})

describe('Zilswap swap exact zrc2 for zrc2 (Amp pool)', () => {

  beforeAll(async () => {
    await setup(true)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('swap exact token0 for token1 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapExactTokensForTokensOnce", "Token0ToToken1", true)
    await validateBalances(token0, token1, "SwapExactTokensForTokensOnce", "Token0ToToken1")
  })

  test('swap exact token1 for token0 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    await validatePoolReserves("SwapExactTokensForTokensOnce", "Token1ToToken0", true)
    await validateBalances(token0, token1, "SwapExactTokensForTokensOnce", "Token1ToToken0")
  })
})

describe('Zilswap swap zrc2 for exact zrc2 (Amp pool)', () => {

  beforeAll(async () => {
    await setup(true)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('swap token0 for exact token1 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensOnce',
      [
        param('amount_out', 'Uint128',`${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapTokensForExactTokensOnce", "Token0ToToken1", true)
    await validateBalances(token0, token1, "SwapTokensForExactTokensOnce", "Token0ToToken1")
  })

  test('swap token1 for exact token0 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensOnce',
      [
        param('amount_out', 'Uint128',`${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapTokensForExactTokensOnce", "Token1ToToken0", true)
    await validateBalances(token0, token1, "SwapTokensForExactTokensOnce", "Token1ToToken0")
  })
})

// Helper functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

setup = async (isAmpPool) => {
  owner = getDefaultAccount()
  const codehash = await getPoolContractCodeHash(owner)
  feeAccount = await createRandomAccount(owner.key)
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 12 }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 12 }, router.address.toLowerCase(), null))[0]

  tx = await callContract(
    owner.key, router,
    'SetFeeConfiguration',
    [
      param('config', 'Pair ByStr20 Uint128', {
        "constructor": "Pair",
        "argtypes": ["ByStr20", "Uint128"],
        "arguments": [`${feeAccount.address}`, "1000"] // 10%
      })
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0]
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  // Add Pool
  tx = await callContract(
    owner.key,
    router,
    'AddPool',
    [
      {
        vname: 'init_token0',
        type: 'ByStr20',
        value: `${token0.address.toLowerCase()}`,
      },
      {
        vname: 'init_token1',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'init_amp_bps',
        type: 'Uint128',
        value: getAmpBps(isAmpPool),
      },
      {
        vname: 'init_name',
        type: 'String',
        value: `test-pool`,
      },
      {
        vname: 'init_symbol',
        type: 'String',
        value: `TEST`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
    ],
     0, false, false)
  expect(tx.status).toEqual(2)

  // Add Liquidity
  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
      param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
      param('amountA_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountB_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
      })
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)
}

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

// validate pool reserves (both amp and non-amp pools)
validatePoolReserves = async (transition, direction, isAmpPool) => {
  newPoolState = await pool.getState()
  let newAmountIn = (new BigNumber(amountIn)).shiftedBy(12)
  let newAmountOut = (new BigNumber(amountOut)).shiftedBy(12)

  let poolPrevReserve0 = new BigNumber(prevPoolState.reserve0)
  let poolNewReserve0 = new BigNumber(newPoolState.reserve0)
  let poolPrevReserve1 = new BigNumber(prevPoolState.reserve1)
  let poolNewReserve1 = new BigNumber(newPoolState.reserve1)

  switch (transition) {
    case 'SwapExactTokensForTokensOnce': {
      switch (direction) {
        case 'Token0ToToken1':
          expect(poolNewReserve0).toEqual(poolPrevReserve0.plus(newAmountIn))
          expect(poolNewReserve1.lt(poolPrevReserve1)).toBeTruthy()
          break;

        case 'Token1ToToken0':
          expect(poolNewReserve1).toEqual(poolPrevReserve1.plus(newAmountIn))
          expect(poolNewReserve0.lt(poolPrevReserve0)).toBeTruthy()
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokensOnce': {
      switch (direction) {
        case 'Token0ToToken1':
          expect(poolPrevReserve1).toEqual(poolNewReserve1.plus(newAmountOut))
          expect(poolPrevReserve0.lt(poolNewReserve0)).toBeTruthy()
          break;

        case 'Token1ToToken0':
          expect(poolPrevReserve0).toEqual(poolNewReserve0.plus(newAmountOut))
          expect(poolPrevReserve1.lt(poolNewReserve1)).toBeTruthy()
          break;
      }
      break;
    }
  }

  if (isAmpPool) {
    expect(newPoolState.v_reserve0).toEqual((new BigNumber(prevPoolState.v_reserve0).plus(newPoolState.reserve0).minus(prevPoolState.reserve0)).toString())
    expect(newPoolState.v_reserve1).toEqual((new BigNumber(prevPoolState.v_reserve1).plus(newPoolState.reserve1).minus(prevPoolState.reserve1)).toString())
  }
  else {
    expect(newPoolState.v_reserve0).toEqual('0')
    expect(newPoolState.v_reserve1).toEqual('0')
  }
}

// validate if token balances are correct
validateBalances = async (token0, token1, transition, direction) => {
  newToken0State = await token0.getState()
  newToken1State = await token1.getState()

  let newBalance;
  let newAmountIn = (new BigNumber(amountIn)).shiftedBy(12)
  let newAmountOut = (new BigNumber(amountOut)).shiftedBy(12)

  let poolPrevToken0Balance = new BigNumber(prevToken0State.balances[pool.address.toLowerCase()])
  let poolPrevToken1Balance = new BigNumber(prevToken1State.balances[pool.address.toLowerCase()])
  let poolNewToken0Balance = new BigNumber(newToken0State.balances[pool.address.toLowerCase()])
  let poolNewToken1Balance = new BigNumber(newToken1State.balances[pool.address.toLowerCase()])

  let ownerPrevToken0Balance = new BigNumber(prevToken0State.balances[owner.address.toLowerCase()])
  let ownerPrevToken1Balance = new BigNumber(prevToken1State.balances[owner.address.toLowerCase()])
  let ownerNewToken0Balance = new BigNumber(newToken0State.balances[owner.address.toLowerCase()])
  let ownerNewToken1Balance = new BigNumber(newToken1State.balances[owner.address.toLowerCase()])

  switch (transition) {
    case 'SwapExactTokensForTokensOnce': {
      switch (direction) {
        case 'Token0ToToken1':
          newBalance = poolPrevToken0Balance.plus(newAmountIn)
          expect(poolNewToken0Balance).toEqual(newBalance)
          expect((ownerNewToken1Balance).gt(ownerPrevToken1Balance)).toBeTruthy()
          break;

        case 'Token1ToToken0':
          newBalance = poolPrevToken1Balance.plus(newAmountIn)
          expect(poolNewToken1Balance).toEqual(newBalance)
          expect((ownerNewToken0Balance).gt(ownerPrevToken0Balance)).toBeTruthy()
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokensOnce': {
      switch (direction) {
        case 'Token0ToToken1':
          newBalance = ownerPrevToken1Balance.plus(newAmountOut)
          expect(ownerNewToken1Balance).toEqual(newBalance)
          expect(poolNewToken0Balance.gt(poolPrevToken0Balance)).toBeTruthy()
          break;

        case 'Token1ToToken0':
          newBalance = ownerPrevToken0Balance.plus(newAmountOut)
          expect(ownerNewToken0Balance).toEqual(newBalance)
          expect(poolNewToken1Balance.gt(poolPrevToken1Balance)).toBeTruthy()
          break;
      }
      break;
    }
  }
}