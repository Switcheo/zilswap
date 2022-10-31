const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let token0, token1, owner, feeAccount, tx, pool, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State
const minimumLiquidity = 1000
const init_liquidity = 1000000000
let amountIn = amountInMax = 100000;
let amountOutMin = amountOut = 10000;
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");


describe('Zilswap swap exact zrc2 for zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup()
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
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
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
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('swap exact token0 for token1 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokens',
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
          vname: 'pool_path',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'to',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapExactTokensForTokens", "Token0ToToken1")
    await validateBalances(token0, token1, "SwapExactTokensForTokens", "Token0ToToken1")
  })

  test('swap exact token1 for token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokens',
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
          vname: 'pool_path',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
          }
        },
        {
          vname: 'to',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
      ],
      0, false, true
    )
    await validatePoolReserves(pool, "SwapExactTokensForTokens", "Token1ToToken0")
    await validateBalances(token0, token1, "SwapExactTokensForTokens", "Token1ToToken0")
  })
})


describe('Zilswap swap zrc2 for exact zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup()
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
          value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
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
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('swap token0 for exact token1 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokens',
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
          vname: 'pool_path',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'to',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapTokensForExactTokens", "Token0ToToken1")
    await validateBalances(token0, token1, "SwapTokensForExactTokens", "Token0ToToken1")
  })

  test('swap token1 for exact token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokens',
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
          vname: 'pool_path',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
        {
          vname: 'path',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
          }
        },
        {
          vname: 'to',
          type: 'ByStr20',
          value: pool.address.toLowerCase(),
        },
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves(pool, "SwapTokensForExactTokens", "Token1ToToken0")
    await validateBalances(token0, token1, "SwapTokensForExactTokens", "Token1ToToken0")
  })
})


// Helper functions
setup = async () => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 6 }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 18 }, router.address.toLowerCase(), null))[0]

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

  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0]
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1 }))[0]

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
        value: `${init_liquidity}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${init_liquidity}`,
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
}

// validate pool reserves
validatePoolReserves = async (pool, transition, direction) => {
  newPoolState = await pool.getState()
  console.log("newPoolState", newPoolState)
  switch (transition) {
    case 'SwapExactTokensForTokens': {
      switch (direction) {
        case 'Token0ToToken1':
          expect(newPoolState.reserve0).toEqual((parseInt(prevPoolState.reserve0) + amountIn).toString())
          expect(parseInt(newPoolState.reserve1)).toBeLessThan(parseInt(prevPoolState.reserve1))
          break;

        case 'Token1ToToken0':
          expect(parseInt(newPoolState.reserve0)).toBeLessThan(parseInt(prevPoolState.reserve0))
          expect(newPoolState.reserve1).toEqual((parseInt(prevPoolState.reserve1) + amountIn).toString())
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokens': {
      switch (direction) {
        case 'Token0ToToken1':
          expect(parseInt(prevPoolState.reserve0)).toBeLessThan(parseInt(newPoolState.reserve0))
          expect(prevPoolState.reserve1).toEqual((parseInt(newPoolState.reserve1) + amountOut).toString())
          break;

        case 'Token1ToToken0':
          expect(prevPoolState.reserve0).toEqual((parseInt(newPoolState.reserve0) + amountOut).toString())
          expect(parseInt(prevPoolState.reserve1)).toBeLessThan(parseInt(newPoolState.reserve1))
          break;
      }
      break;
    }
  }
}

// validate if token balances are correct
validateBalances = async (token0, token1, transition, direction) => {
  newToken0State = await token0.getState()
  newToken1State = await token1.getState()
  let newBalance;
  switch (transition) {
    case 'SwapExactTokensForTokens': {
      switch (direction) {
        case 'Token0ToToken1':
          newBalance = (new BigNumber(prevToken0State.balances[pool.address.toLowerCase()])).plus(new BigNumber(amountIn)).toString()
          expect(newToken0State.balances[pool.address.toLowerCase()]).toEqual(newBalance)
          expect(new BigNumber(newToken1State.balances[owner.address.toLowerCase()]).gt(prevToken1State.balances[owner.address.toLowerCase()])).toBeTruthy()
          break;

        case 'Token1ToToken0':
          newBalance = (new BigNumber(prevToken1State.balances[pool.address.toLowerCase()])).plus(new BigNumber(amountIn)).toString()
          expect(newToken1State.balances[pool.address.toLowerCase()]).toEqual(newBalance)
          expect(new BigNumber(newToken0State.balances[owner.address.toLowerCase()]).gt(prevToken0State.balances[owner.address.toLowerCase()])).toBeTruthy()
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokens': {
      switch (direction) {
        case 'Token0ToToken1':
          newBalance = (new BigNumber(prevToken1State.balances[owner.address.toLowerCase()])).plus(new BigNumber(amountOut)).toString()
          expect(newToken1State.balances[owner.address.toLowerCase()]).toEqual(newBalance)
          expect(new BigNumber(newToken0State.balances[pool.address.toLowerCase()]).gt(prevToken0State.balances[pool.address.toLowerCase()])).toBeTruthy()
          break;
        case 'Token1ToToken0':
          newBalance = (new BigNumber(prevToken0State.balances[owner.address.toLowerCase()])).plus(new BigNumber(amountOut)).toString()
          expect(newToken0State.balances[owner.address.toLowerCase()]).toEqual(newBalance)
          expect(new BigNumber(newToken1State.balances[pool.address.toLowerCase()]).gt(prevToken1State.balances[pool.address.toLowerCase()])).toBeTruthy()
          break;
      }
      break;
    }
  }
}