const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, useWrappedZIL } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let token0, token1, token, wZil, owner, feeAccount, tx, pool, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State
const init_liquidity = 100000000
let amountIn = 100;
let amountInMax = 100000;
let amountOut = 100;
let amountOutMin = 1;
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
  })

  test('swap exact ZIL for token (Non-amp pool)', async () => {
    console.log('TOKEN 0 STATE: ', prevToken0State)
    console.log('TOKEN 1 STATE: ', prevToken1State)
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensOnce',
      [
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${amountOutMin}`,
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
    console.log("BEFORE", await router.getState())
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILOnce',
      [
        {
          vname: 'amount_in',
          type: 'Uint128',
          value: `${amountIn}`,
        },
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${amountOutMin}`,
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
    console.log("AFTER", await router.getState())
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
  })

  test('swap token for exact ZIL (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILOnce',
      [
        {
          vname: 'amount_out',
          type: 'Uint128',
          value: `${amountOut}`,
        },
        {
          vname: 'amount_in_max',
          type: 'Uint128',
          value: `${amountInMax}`,
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
          value: `${amountOut}`,
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
  })

  test('swap exact token for zil (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILOnce',
      [
        {
          vname: 'amount_in',
          type: 'Uint128',
          value: `${amountIn}`,
        },
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${amountOutMin}`,
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
          value: `${amountOutMin}`,
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
  })

  test('swap token for exact ZIL (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILOnce',
      [
        {
          vname: 'amount_out',
          type: 'Uint128',
          value: `${amountOut}`,
        },
        {
          vname: 'amount_in_max',
          type: 'Uint128',
          value: `${amountInMax}`,
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
          value: `${amountOut}`,
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
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 12 }, router.address.toLowerCase(), null))[0]
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
        value: `${init_liquidity}`,
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
        type: 'Pair (Uint128) (Uint128)',
        value: {
          "constructor": "Pair",
          "argtypes": ["Uint128", "Uint128"],
          "arguments": ["0", "1000000000000"]
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
}

// validate pool reserves (both amp and non-amp pools)
validatePoolReserves = async (pool, transition, isAmpPool) => {
  newPoolState = await pool.getState()
  switch (transition) {
    case 'SwapExactTokensForZILOnce': {
      expect(newPoolState.reserve0).toEqual((new BigNumber(prevPoolState.reserve0).plus(amountIn)).toString())
      expect((new BigNumber(newPoolState.reserve1)).lt(new BigNumber(prevPoolState.reserve1))).toBeTruthy()
      break;
    }

    case 'SwapExactZILForTokensOnce': {
      expect((new BigNumber(newPoolState.reserve0)).lt(new BigNumber(prevPoolState.reserve0))).toBeTruthy()
      expect(newPoolState.reserve1).toEqual((new BigNumber(prevPoolState.reserve1).plus(amountIn)).toString())
      break;
    }

    case 'SwapTokensForExactZILOnce': {
      expect((new BigNumber(prevPoolState.reserve0)).lt(new BigNumber(newPoolState.reserve0))).toBeTruthy()
      expect(prevPoolState.reserve1).toEqual((new BigNumber(newPoolState.reserve1).plus(amountOut)).toString())
      break;
    }

    case 'SwapZILForExactTokensOnce': {
      expect(prevPoolState.reserve0).toEqual((new BigNumber(newPoolState.reserve0).plus(amountOut)).toString())
      expect((new BigNumber(prevPoolState.reserve1)).lt(new BigNumber(newPoolState.reserve1))).toBeTruthy()
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
validateBalances = async (token0, token1, transition) => {
  newToken0State = await token0.getState()
  newToken1State = await token1.getState()
  let newBalance;
  switch (transition) {
    case 'SwapExactTokensForZILOnce': {
      newBalance = (new BigNumber(prevToken0State.balances[pool.address.toLowerCase()])).plus(new BigNumber(amountIn)).toString()
      expect(newToken0State.balances[pool.address.toLowerCase()]).toEqual(newBalance)
      expect(new BigNumber(newToken1State.balances[owner.address.toLowerCase()]).gt(prevToken1State.balances[owner.address.toLowerCase()])).toBeTruthy()
      break;
    }
    
    case 'SwapExactZILForTokensOnce': {
      newBalance = (new BigNumber(prevToken1State.balances[pool.address.toLowerCase()])).plus(new BigNumber(amountIn)).toString()
      expect(newToken1State.balances[pool.address.toLowerCase()]).toEqual(newBalance)
      expect(new BigNumber(newToken0State.balances[owner.address.toLowerCase()]).gt(prevToken0State.balances[owner.address.toLowerCase()])).toBeTruthy()
      break;
    }

    case 'SwapTokensForExactZILOnce': {
      newBalance = (new BigNumber(prevToken1State.balances[owner.address.toLowerCase()])).plus(new BigNumber(amountOut)).toString()
      expect(newToken1State.balances[owner.address.toLowerCase()]).toEqual(newBalance)
      expect(new BigNumber(newToken0State.balances[pool.address.toLowerCase()]).gt(prevToken0State.balances[pool.address.toLowerCase()])).toBeTruthy()
      break;
    }

    case 'SwapZILForExactTokensOnce': {
      newBalance = (new BigNumber(prevToken0State.balances[owner.address.toLowerCase()])).plus(new BigNumber(amountOut)).toString()
      expect(newToken0State.balances[owner.address.toLowerCase()]).toEqual(newBalance)
      expect(new BigNumber(newToken1State.balances[pool.address.toLowerCase()]).gt(prevToken1State.balances[pool.address.toLowerCase()])).toBeTruthy()
      break;
    }
  }
}