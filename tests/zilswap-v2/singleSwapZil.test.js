const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract, getBalance } = require('../../scripts/call.js')
const { getPoolContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');
const { param } = require("../../scripts/zilliqa");

let token0, token1, token, wZil, owner, feeAccount, tx, pool, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State, prevOwnerZilBalance, newOwnerZilBalance
const ONE_MILLION = 1_000_000
const init_liquidity = 10000
const ONE_THOUSAND = 1000
const ONE_HUNDRED = 100
let amountIn = 100;
let amountInMax = 1000;
let amountOut = 100;
let amountOutMin = 10;

describe('Zilswap swap exact zrc2/zil for zil/zrc2 (Non-amp pool)', () => {

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

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap exact token for ZIL (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapExactTokensForZILOnce", false)
    await validateBalances(token0, token1, "SwapExactTokensForZILOnce")
  })

  test('swap exact ZIL for token (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensOnce',
      [
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, token]
        })
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapExactZILForTokensOnce", false)
    await validateBalances(token0, token1, "SwapExactZILForTokensOnce")
  })
})

describe('Zilswap swap zrc2/zil for exact zil/zrc2 (Non-amp pool)', () => {

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

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap token for exact ZIL (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('amount_in_max', 'Uint128', `${new BigNumber(amountInMax).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapTokensForExactZILOnce", false)
    await validateBalances(token0, token1, "SwapTokensForExactZILOnce")
  })

  test('swap ZIL for exact token (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapZILForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, token]
        })
      ],
      amountInMax, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapZILForExactTokensOnce", false)
    await validateBalances(token0, token1, "SwapZILForExactTokensOnce")
  })
})

describe('Zilswap swap exact zrc2/zil for zil/zrc2 (Amp pool)', () => {

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

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap exact token for zil (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapExactTokensForZILOnce", true)
    await validateBalances(token0, token1, "SwapExactTokensForZILOnce")
  })

  test('swap exact ZIL for token (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensOnce',
      [
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, token]
        })
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(2)
    await validatePoolReserves(pool, "SwapExactZILForTokensOnce", true)
    await validateBalances(token0, token1, "SwapExactZILForTokensOnce")
  })
})

describe('Zilswap swap zrc2/zil for exact zilzrc2 (Amp pool)', () => {

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

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap token for exact ZIL (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('amount_in_max', 'Uint128', `${new BigNumber(amountInMax).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapTokensForExactZILOnce", true)
    await validateBalances(token0, token1, "SwapTokensForExactZILOnce")
  })

  test('swap ZIL for exact token (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapZILForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, token]
        })
      ],
      amountInMax, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapZILForExactTokensOnce", true)
    await validateBalances(token0, token1, "SwapZILForExactTokensOnce")
  })
})

describe('Zilswap erroneous single swap zil (Non-amp pool)', () => {

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

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('SwapExactTokensForZILOnce (Non-amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)
  })

  test('SwapExactZILForTokensOnce (Non-amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensOnce',
      [
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(3)
  })

  test('SwapTokensForExactZILOnce(Non-amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('amount_in_max', 'Uint128', `${new BigNumber(amountInMax).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)
  })

  test('SwapZILForExactTokensOnce (Non-amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapZILForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      amountInMax, false, true
    )
    expect(tx.status).toEqual(3)
  })
})

describe('Zilswap erroneous single swap zil (Amp pool)', () => {

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

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('SwapExactTokensForZILOnce (Amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)
  })

  test('SwapExactZILForTokensOnce (Amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensOnce',
      [
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(3)
  })

  test('SwapTokensForExactZILOnce(Amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('amount_in_max', 'Uint128', `${new BigNumber(amountInMax).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)
  })

  test('SwapZILForExactTokensOnce (Amp pool)(invalid path): Supposed to hit CodeInvalidWZIL(-8)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapZILForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [token, token]
        })
      ],
      amountInMax, false, true
    )
    expect(tx.status).toEqual(3)
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

  // Need to deploy wZIL first to deploy Router
  token0 = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  wZil = token0.address.toLowerCase()

  // Deploy Router
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil }))[0]

  // Deploy non-wZIL token
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 12, supply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  token = token1.address.toLowerCase()

  // Increase Allowance on wZIL
  tx = await callContract(
    owner.key, token0,
    'IncreaseAllowance',
    [
      param('spender', 'ByStr20', router.address.toLowerCase()),
      param('amount', 'Uint128', '100000000000000000000000000000000000000')
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

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

  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
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

  // AddLiquidity
  tx = await callContract(
    owner.key, router,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', token),
      param('pool', 'ByStr20', pool.address.toLowerCase()),
      param('amount_token_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
      })
    ],
    init_liquidity, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', token),
      param('pool', 'ByStr20', pool.address.toLowerCase()),
      param('amount_token_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
      })
    ],
    init_liquidity, false, true
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
validatePoolReserves = async (pool, transition, isAmpPool) => {
  newPoolState = await pool.getState()
  let newAmountIn = (new BigNumber(amountIn)).shiftedBy(12)
  let newAmountOut = (new BigNumber(amountOut)).shiftedBy(12)

  let poolPrevReserve0 = new BigNumber(prevPoolState.reserve0)
  let poolNewReserve0 = new BigNumber(newPoolState.reserve0)
  let poolPrevReserve1 = new BigNumber(prevPoolState.reserve1)
  let poolNewReserve1 = new BigNumber(newPoolState.reserve1)

  switch (transition) {
    case 'SwapExactTokensForZILOnce': {
      if (newPoolState.token0.toLowerCase() === token) {
        expect(poolNewReserve0).toEqual(poolPrevReserve0.plus(newAmountIn))
        expect(poolNewReserve1.lt(poolPrevReserve1)).toBeTruthy()
        break;
      } else {
        expect(poolNewReserve1).toEqual(poolPrevReserve1.plus(newAmountIn))
        expect(poolNewReserve0.lt(poolPrevReserve0)).toBeTruthy()
        break;
      }
    }

    case 'SwapExactZILForTokensOnce': {
      if (newPoolState.token0.toLowerCase() === token) {
        expect(poolNewReserve0.lt(poolPrevReserve0)).toBeTruthy()
        expect(poolNewReserve1).toEqual(poolPrevReserve1.plus(newAmountIn))
        break;
      } else {
        expect(poolNewReserve1.lt(poolPrevReserve1)).toBeTruthy()
        expect(poolNewReserve0).toEqual(poolPrevReserve0.plus(newAmountIn))
        break;
      }
    }

    case 'SwapTokensForExactZILOnce': {
      if (newPoolState.token0.toLowerCase() === token) {
        expect(poolPrevReserve0.lt(poolNewReserve0)).toBeTruthy()
        expect(poolPrevReserve1).toEqual(poolNewReserve1.plus(newAmountOut))
        break;
      } else {
        expect(poolPrevReserve1.lt(poolNewReserve1)).toBeTruthy()
        expect(poolPrevReserve0).toEqual(poolNewReserve0.plus(newAmountOut))
        break;
      }
    }

    case 'SwapZILForExactTokensOnce': {
      if (newPoolState.token0.toLowerCase() === token) {
        expect(poolPrevReserve0).toEqual(poolNewReserve0.plus(newAmountOut))
        expect(poolPrevReserve1.lt(poolNewReserve1)).toBeTruthy()
        break;
      } else {
        expect(poolPrevReserve1).toEqual(poolNewReserve1.plus(newAmountOut))
        expect(poolPrevReserve0.lt(poolNewReserve0)).toBeTruthy()
        break;
      }
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
validateBalances = async (token0, token1, transition) => {
  newToken0State = await token0.getState()
  newToken1State = await token1.getState()
  newOwnerZilBalance = await getBalance(owner.address)
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
    case 'SwapExactTokensForZILOnce': {
      if (token0.address.toLowerCase() === token) {
        newBalance = poolPrevToken0Balance.plus(newAmountIn)
        expect(poolNewToken0Balance).toEqual(newBalance)
        expect(newOwnerZilBalance.gt(prevOwnerZilBalance)).toBeTruthy()
        break;
      } else {
        newBalance = poolPrevToken1Balance.plus(newAmountIn)
        expect(poolNewToken1Balance).toEqual(newBalance)
        expect(newOwnerZilBalance.gt(prevOwnerZilBalance)).toBeTruthy()
        break;
      }
    }

    case 'SwapExactZILForTokensOnce': {
      if (token0.address.toLowerCase() === token) {
        newBalance = poolPrevToken1Balance.plus(newAmountIn)
        expect(poolNewToken1Balance).toEqual(newBalance)
        expect(ownerNewToken0Balance.gt(ownerPrevToken0Balance)).toBeTruthy()
        break;
      } else {
        newBalance = poolPrevToken0Balance.plus(newAmountIn)
        expect(poolNewToken0Balance).toEqual(newBalance)
        expect(ownerNewToken1Balance.gt(ownerPrevToken1Balance)).toBeTruthy()
        break;
      }
    }

    case 'SwapTokensForExactZILOnce': {
      if (token0.address.toLowerCase() === token) {
        newBalance = prevOwnerZilBalance.plus(newAmountOut)
        expect(newOwnerZilBalance.lte(newBalance)).toBeTruthy()
        expect(poolNewToken0Balance.gt(poolPrevToken0Balance)).toBeTruthy()
        break;
      } else {
        newBalance = (prevOwnerZilBalance).plus(newAmountOut)
        expect(newOwnerZilBalance.lte(newBalance)).toBeTruthy()
        expect(poolNewToken1Balance.gt(poolPrevToken1Balance)).toBeTruthy()
        break;
      }
    }

    case 'SwapZILForExactTokensOnce': {
      if (token0.address.toLowerCase() === token) {
        newBalance = ownerPrevToken0Balance.plus(newAmountOut)
        expect(ownerNewToken0Balance).toEqual(newBalance)
        expect(poolNewToken1Balance.gt(poolPrevToken1Balance)).toBeTruthy()
        break;
      } else {
        newBalance = ownerPrevToken1Balance.plus(newAmountOut)
        expect(ownerNewToken1Balance).toEqual(newBalance)
        expect(poolNewToken0Balance.gt(poolPrevToken0Balance)).toBeTruthy()
        break;
      }
    }
  }
}