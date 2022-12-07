const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, useWrappedZIL } = require('../../scripts/deploy.js');
const { callContract, getBalance } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let token0, token1, token, wZil, owner, feeAccount, tx, pool, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State, prevOwnerZilBalance, newOwnerZilBalance
const ONE_MILLION = 1_000_000
const init_liquidity = 10000
const ONE_THOUSAND = 1000
const ONE_HUNDRED = 100
let amountIn = 100;
let amountInMax = 1000;
let amountOut = 100;
let amountOutMin = 10;
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

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
        {
          vname: 'spender',
          type: 'ByStr20',
          value: router.address.toLowerCase(),
        },
        {
          vname: 'amount',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        {
          vname: 'token',
          type: 'ByStr20',
          value: token,
        },
        {
          vname: 'wZIL',
          type: 'ByStr20',
          value: wZil,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
        {
          vname: 'amount_token_min',
          type: 'Uint128',
          value: '0',
        },
        {
          vname: 'amount_wZIL_min',
          type: 'Uint128',
          value: '0',
        }
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

  test('swap exact ZIL for token (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensOnce',
      [
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [wZil, token]
          }
        }
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapExactZILForTokensOnce", false)
    await validateBalances(token0, token1, "SwapExactZILForTokensOnce")
  })

  test('swap exact token for ZIL (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILOnce',
      [
        {
          vname: 'amount_in',
          type: 'Uint128',
          value: `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token, wZil]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapExactTokensForZILOnce", false)
    await validateBalances(token0, token1, "SwapExactTokensForZILOnce")
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
        {
          vname: 'spender',
          type: 'ByStr20',
          value: router.address.toLowerCase(),
        },
        {
          vname: 'amount',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        {
          vname: 'token',
          type: 'ByStr20',
          value: token,
        },
        {
          vname: 'wZIL',
          type: 'ByStr20',
          value: wZil,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
        {
          vname: 'amount_token_min',
          type: 'Uint128',
          value: '0',
        },
        {
          vname: 'amount_wZIL_min',
          type: 'Uint128',
          value: '0',
        }
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
        {
          vname: 'amount_out',
          type: 'Uint128',
          value: `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'amount_in_max',
          type: 'Uint128',
          value: `${new BigNumber(amountInMax).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token, wZil]
          }
        }
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
        {
          vname: 'amount_out',
          type: 'Uint128',
          value: `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [wZil, token]
          }
        }
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
        {
          vname: 'spender',
          type: 'ByStr20',
          value: router.address.toLowerCase(),
        },
        {
          vname: 'amount',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        {
          vname: 'token',
          type: 'ByStr20',
          value: token,
        },
        {
          vname: 'wZIL',
          type: 'ByStr20',
          value: wZil,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
        {
          vname: 'amount_token_min',
          type: 'Uint128',
          value: '0',
        },
        {
          vname: 'amount_wZIL_min',
          type: 'Uint128',
          value: '0',
        }
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
        {
          vname: 'amount_in',
          type: 'Uint128',
          value: `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token, wZil]
          }
        }
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
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [wZil, token]
          }
        }
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(2)
    await validatePoolReserves(pool, "SwapExactZILForTokensOnce", true)
    await validateBalances(token0, token1, "SwapExactZILForTokensOnce")
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
        {
          vname: 'spender',
          type: 'ByStr20',
          value: router.address.toLowerCase(),
        },
        {
          vname: 'amount',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        {
          vname: 'token',
          type: 'ByStr20',
          value: token,
        },
        {
          vname: 'wZIL',
          type: 'ByStr20',
          value: wZil,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
        },
        {
          vname: 'amount_token_min',
          type: 'Uint128',
          value: '0',
        },
        {
          vname: 'amount_wZIL_min',
          type: 'Uint128',
          value: '0',
        }
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
        {
          vname: 'amount_out',
          type: 'Uint128',
          value: `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'amount_in_max',
          type: 'Uint128',
          value: `${(new BigNumber(amountInMax)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token, wZil]
          }
        }
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
        {
          vname: 'amount_out',
          type: 'Uint128',
          value: `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [wZil, token]
          }
        }
      ],
      amountInMax, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapZILForExactTokensOnce", true)
    await validateBalances(token0, token1, "SwapZILForExactTokensOnce")
  })
})

// Helper functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

setup = async (isAmpPool) => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 12, supply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  token1 = (await useWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  token = token0.address.toLowerCase()
  wZil = token1.address.toLowerCase()

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

  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(isAmpPool) }))[0]

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

  tx = await callContract(
    owner.key, router,
    'AddLiquidityZIL',
    [
      {
        vname: 'token',
        type: 'ByStr20',
        value: token,
      },
      {
        vname: 'wZIL',
        type: 'ByStr20',
        value: wZil,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
      {
        vname: 'amount_token_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
      },
      {
        vname: 'amount_token_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'amount_wZIL_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'v_reserve_ratio_bounds',
        type: 'Pair (Uint256) (Uint256)',
        value: {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": ["0", "100000000000000000000000000000000000"]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      }
    ],
    init_liquidity, false, true
  )
  expect(tx.status).toEqual(2)
  console.log(tx.receipt.event_logs)

  tx = await callContract(
    owner.key, router,
    'AddLiquidityZIL',
    [
      {
        vname: 'token',
        type: 'ByStr20',
        value: token,
      },
      {
        vname: 'wZIL',
        type: 'ByStr20',
        value: wZil,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
      {
        vname: 'amount_token_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
      },
      {
        vname: 'amount_token_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'amount_wZIL_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'v_reserve_ratio_bounds',
        type: 'Pair (Uint256) (Uint256)',
        value: {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": ["0", "100000000000000000000000000000000000"]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      }
    ],
    init_liquidity, false, true
  )
  expect(tx.status).toEqual(2)
  console.log(tx.receipt.event_logs[7])
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