const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let owner, feeAccount, tx
let router, wZil, token0, token1, token2, token3, pool1, pool2, pool3, prevPool1State, prevPool2State, prevPool3State, newPool1State, newPool2State, newPool3State, prevToken0State, prevToken1State, prevToken2State, prevToken3State, newToken0State, newToken1State, newToken2State, newToken3State;
const init_liquidity = 1000000000;
let amountIn = amountInMax = 100000;
let amountOutMin = amountOut = 10000;
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

describe('Zilswap three-pool swap exact zrc2 for zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup(false)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool1,
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
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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
          value: `${pool1.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool2,
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
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token1.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool2.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool3,
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
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token3.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool3.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    prevPool3State = await pool3.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevToken2State = await token2.getState()
    prevToken3State = await token3.getState()
  })

  test('swap exact token0 for token3 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token3.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapExactTokensForTokensThrice", "Token0ToToken3", false)
    validateBalances("SwapExactTokensForTokensThrice", "Token0ToToken3")
  })

  test('swap exact token3 for token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token3.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapExactTokensForTokensThrice", "Token3ToToken0", false)
    validateBalances("SwapExactTokensForTokensThrice", "Token3ToToken0")
  })

})

describe('Zilswap three-pool swap zrc2 for exact zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup(false)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool1,
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
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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
          value: `${pool1.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool2,
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
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token1.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool2.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool3,
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
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token3.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool3.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    prevPool3State = await pool3.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevToken2State = await token2.getState()
    prevToken3State = await token3.getState()
  })

  test('swap token0 for exact token3 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token3.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapTokensForExactTokensThrice", "Token0ToToken3", false)
    await validateBalances("SwapTokensForExactTokensThrice", "Token0ToToken3")
  })

  test('swap token3 for exact token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token3.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapTokensForExactTokensThrice", "Token3ToToken0", false)
    await validateBalances("SwapTokensForExactTokensThrice", "Token3ToToken0")
  })
})

describe('Zilswap three-pool swap exact zrc2 for zrc2 (Amp pool)', () => {

  beforeAll(async () => {
    await setup(true)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool1,
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
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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
          value: `${pool1.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool2,
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
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token1.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool2.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool3,
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
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token3.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool3.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    prevPool3State = await pool3.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevToken2State = await token2.getState()
    prevToken3State = await token3.getState()
  })

  test('swap exact token0 for token3 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token3.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapExactTokensForTokensThrice", "Token0ToToken3", true)
    validateBalances("SwapExactTokensForTokensThrice", "Token0ToToken3")
  })

  test('swap exact token3 for token0 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token3.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapExactTokensForTokensThrice", "Token3ToToken0", true)
    validateBalances("SwapExactTokensForTokensThrice", "Token3ToToken0")
  })

})

describe('Zilswap three-pool swap zrc2 for exact zrc2 (Amp pool)', () => {

  beforeAll(async () => {
    await setup(true)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool1,
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
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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
          value: `${pool1.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool1State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool2,
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
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token1.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool2.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool2State.balances[owner.address.toLowerCase()]}`,
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

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool3,
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
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
          value: `${token2.address.toLowerCase()}`,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: `${token3.address.toLowerCase()}`,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool3.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool3State.balances[owner.address.toLowerCase()]}`,
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
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    prevPool3State = await pool3.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevToken2State = await token2.getState()
    prevToken3State = await token3.getState()
  })

  test('swap token0 for exact token3 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token3.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapTokensForExactTokensThrice", "Token0ToToken3", true)
    await validateBalances("SwapTokensForExactTokensThrice", "Token0ToToken3")
  })

  test('swap token3 for exact token0 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensThrice',
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
          vname: 'pool1',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token3.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
          }
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newPool3State = await pool3.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    newToken3State = await token3.getState()

    await validatePoolReserves("SwapTokensForExactTokensThrice", "Token3ToToken0", true)
    await validateBalances("SwapTokensForExactTokensThrice", "Token3ToToken0")
  })
})


// Helper functions
// is_amp_pool = let is_eq = builtin eq amp bps in negb is_eq;
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

setup = async (isAmpPool) => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 6 }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 18 }, router.address.toLowerCase(), null))[0]
  token2 = (await useFungibleToken(owner.key, { symbol: 'TKN2', decimals: 18 }, router.address.toLowerCase(), null))[0]
  token3 = (await useFungibleToken(owner.key, { symbol: 'TKN3', decimals: 18 }, router.address.toLowerCase(), null))[0]

  let tokenArray = [token0, token1, token2, token3];
  let temp;

  // bubble sort algo
  // sort token address in ascending order
  for (i = 0; i < tokenArray.length - 1; i++) {
    for (j = 0; j < tokenArray.length - i - 1; j++) {
      if (parseInt(tokenArray[j].address, 16) > parseInt(tokenArray[j + 1].address, 16)) {
        temp = tokenArray[j]
        tokenArray[j] = tokenArray[j + 1]
        tokenArray[j + 1] = temp
      }
    }
  }
  [token0, token1, token2, token3] = tokenArray

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


  pool1 = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(isAmpPool) }))[0]
  pool2 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token1, token1: token2, init_amp_bps: getAmpBps(isAmpPool) }))[0]
  pool3 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token2, token1: token3, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  tx = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: pool1.address.toLowerCase(),
      },
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: pool2.address.toLowerCase(),
      },
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: pool3.address.toLowerCase(),
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
        value: `${pool1.address.toLowerCase()}`,
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
      }
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${token2.address.toLowerCase()}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool2.address.toLowerCase()}`,
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
      }
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${token2.address.toLowerCase()}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${token3.address.toLowerCase()}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool3.address.toLowerCase()}`,
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
      }
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)
}

// validate pool reserves (both amp and non-amp pools)
validatePoolReserves = async (transition, direction, isAmpPool) => {
  switch (transition) {
    case 'SwapExactTokensForTokensThrice': {
      switch (direction) {
        case 'Token0ToToken3':
          expect(newPool1State.reserve0).toEqual((new BigNumber(prevPool1State.reserve0).plus(amountIn)).toString())
          expect((new BigNumber(newPool1State.reserve1)).lt(prevPool1State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool2State.reserve0)).gt(prevPool2State.reserve0)).toBeTruthy()
          expect((new BigNumber(newPool2State.reserve1)).lt(prevPool2State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool3State.reserve0)).gt(prevPool3State.reserve0)).toBeTruthy()
          expect((new BigNumber(newPool3State.reserve1)).lt(prevPool3State.reserve1)).toBeTruthy()
          break;

        case 'Token3ToToken0':
          expect(newPool3State.reserve1).toEqual((new BigNumber(prevPool3State.reserve1).plus(amountIn)).toString())
          expect((new BigNumber(newPool3State.reserve0)).lt(prevPool3State.reserve0)).toBeTruthy()
          expect((new BigNumber(newPool2State.reserve1)).gt(prevPool2State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool2State.reserve0)).lt(prevPool2State.reserve0)).toBeTruthy()
          expect((new BigNumber(newPool1State.reserve1)).gt(prevPool1State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool1State.reserve0)).lt(prevPool1State.reserve0)).toBeTruthy()
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokensThrice': {
      switch (direction) {
        case 'Token0ToToken3':
          expect((new BigNumber(newPool1State.reserve0)).gt(prevPool1State.reserve0)).toBeTruthy()
          expect((new BigNumber(newPool1State.reserve1)).lt(prevPool1State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool2State.reserve0)).gt(prevPool2State.reserve0)).toBeTruthy()
          expect((new BigNumber(newPool2State.reserve1)).lt(prevPool2State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool3State.reserve0)).gt(prevPool3State.reserve0)).toBeTruthy()
          expect(newPool3State.reserve1).toEqual((new BigNumber(prevPool3State.reserve1).minus(amountOut)).toString())
          break;

        case 'Token3ToToken0':
          expect(new BigNumber(newPool3State.reserve1).gt(prevPool3State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool3State.reserve0)).lt(prevPool3State.reserve0)).toBeTruthy()
          expect(new BigNumber(newPool2State.reserve1).gt(prevPool2State.reserve1)).toBeTruthy()
          expect((new BigNumber(newPool2State.reserve0)).lt(prevPool2State.reserve0)).toBeTruthy()
          expect((new BigNumber(newPool1State.reserve1)).gt(prevPool1State.reserve1)).toBeTruthy()
          expect(new BigNumber(prevPool1State.reserve0).minus(newPool1State.reserve0)).toEqual(new BigNumber(amountOut))
          break;
      }
      break;
    }
  }

  if (isAmpPool) {
    expect(newPool1State.v_reserve0).toEqual((new BigNumber(prevPool1State.v_reserve0).plus(newPool1State.reserve0).minus(prevPool1State.reserve0)).toString())
    expect(newPool1State.v_reserve1).toEqual((new BigNumber(prevPool1State.v_reserve1).plus(newPool1State.reserve1).minus(prevPool1State.reserve1)).toString())
    expect(newPool2State.v_reserve0).toEqual((new BigNumber(prevPool2State.v_reserve0).plus(newPool2State.reserve0).minus(prevPool2State.reserve0)).toString())
    expect(newPool2State.v_reserve1).toEqual((new BigNumber(prevPool2State.v_reserve1).plus(newPool2State.reserve1).minus(prevPool2State.reserve1)).toString())
    expect(newPool3State.v_reserve0).toEqual((new BigNumber(prevPool3State.v_reserve0).plus(newPool3State.reserve0).minus(prevPool3State.reserve0)).toString())
    expect(newPool3State.v_reserve1).toEqual((new BigNumber(prevPool3State.v_reserve1).plus(newPool3State.reserve1).minus(prevPool3State.reserve1)).toString())
  }
  else {
    expect(newPool1State.v_reserve0).toEqual('0')
    expect(newPool1State.v_reserve1).toEqual('0')
    expect(newPool2State.v_reserve0).toEqual('0')
    expect(newPool2State.v_reserve1).toEqual('0')
    expect(newPool3State.v_reserve0).toEqual('0')
    expect(newPool3State.v_reserve1).toEqual('0')
  }
}

validateBalances = async (transition, direction) => {
  let first_intermediate_amt_out, first_intermediate_amt_in, second_intermediate_amt_out, second_intermediate_amt_in, amt_in, amt_out;
  let newPool1Token0Balance, newPool1Token1Balance, newPool2Token1Balance, newPool2Token2Balance, newPool3Token2Balance, newPool3Token3Balance

  switch (transition) {
    case 'SwapExactTokensForTokensThrice': {
      switch (direction) {
        case 'Token0ToToken3':
          // Validate first_intermediate_amt_in = first_intermediate_amt_out
          first_intermediate_amt_out = new BigNumber(prevPool1State.reserve1).minus(newPool1State.reserve1);
          first_intermediate_amt_in = new BigNumber(newPool2State.reserve0).minus(prevPool2State.reserve0);
          expect(first_intermediate_amt_out.eq(first_intermediate_amt_in)).toBeTruthy()

          // Validate second_intermediate_amt_in = second_intermediate_amt_out
          second_intermediate_amt_out = new BigNumber(prevPool2State.reserve1).minus(newPool2State.reserve1);
          second_intermediate_amt_in = new BigNumber(newPool3State.reserve0).minus(prevPool3State.reserve0);
          expect(second_intermediate_amt_out.eq(second_intermediate_amt_in)).toBeTruthy()

          // Validate Token Balance
          amt_in = new BigNumber(prevToken0State.balances[owner.address.toLowerCase()]).minus(newToken0State.balances[owner.address.toLowerCase()])
          expect(amt_in).toEqual(new BigNumber(amountIn))

          newPool1Token0Balance = (new BigNumber(prevToken0State.balances[pool1.address.toLowerCase()])).plus(amountIn).toString()
          expect(newToken0State.balances[pool1.address.toLowerCase()]).toEqual(newPool1Token0Balance)

          newPool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).minus(first_intermediate_amt_out).toString()
          expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(newPool1Token1Balance)

          newPool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).plus(first_intermediate_amt_in).toString()
          expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token1Balance)

          newPool2Token2Balance = (new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()]).minus(second_intermediate_amt_out)).toString()
          expect(newToken2State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token2Balance)

          newPool3Token2Balance = new BigNumber(prevToken2State.balances[pool3.address.toLowerCase()]).plus(second_intermediate_amt_in).toString()
          expect(newToken2State.balances[pool3.address.toLowerCase()]).toEqual(newPool3Token2Balance)

          amt_out = new BigNumber(prevToken3State.balances[pool3.address.toLowerCase()]).minus(newToken3State.balances[pool3.address.toLowerCase()])
          expect(new BigNumber(newToken3State.balances[owner.address.toLowerCase()]).minus(prevToken3State.balances[owner.address.toLowerCase()])).toEqual(amt_out)
          break;

        case 'Token3ToToken0':
          // Validate first_intermediate_amt_in = first_intermediate_amt_out
          first_intermediate_amt_out = new BigNumber(prevPool3State.reserve0).minus(newPool3State.reserve0);
          first_intermediate_amt_in = new BigNumber(newPool2State.reserve1).minus(prevPool2State.reserve1);
          expect(first_intermediate_amt_out.eq(first_intermediate_amt_in)).toBeTruthy()

          // Validate second_intermediate_amt_in = second_intermediate_amt_out
          second_intermediate_amt_out = new BigNumber(prevPool2State.reserve0).minus(newPool2State.reserve0);
          second_intermediate_amt_in = new BigNumber(newPool1State.reserve1).minus(prevPool1State.reserve1);
          expect(second_intermediate_amt_out.eq(second_intermediate_amt_in)).toBeTruthy()

          // Validate Token Balance
          amt_in = new BigNumber(prevToken3State.balances[owner.address.toLowerCase()]).minus(newToken3State.balances[owner.address.toLowerCase()])
          expect(amt_in).toEqual(new BigNumber(amountIn))

          newPool3Token3Balance = (new BigNumber(prevToken3State.balances[pool3.address.toLowerCase()])).plus(amountIn).toString()
          expect(newToken3State.balances[pool3.address.toLowerCase()]).toEqual(newPool3Token3Balance)

          newPool3Token2Balance = (new BigNumber(prevToken2State.balances[pool3.address.toLowerCase()])).minus(first_intermediate_amt_out).toString()
          expect(newToken2State.balances[pool3.address.toLowerCase()]).toEqual(newPool3Token2Balance)

          newPool2Token2Balance = (new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()])).plus(first_intermediate_amt_in).toString()
          expect(newToken2State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token2Balance)

          newPool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).minus(second_intermediate_amt_out).toString()
          expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token1Balance)

          newPool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).plus(second_intermediate_amt_in).toString()
          expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(newPool1Token1Balance)

          amt_out = new BigNumber(prevToken0State.balances[pool1.address.toLowerCase()]).minus(newToken0State.balances[pool1.address.toLowerCase()])
          expect(new BigNumber(newToken0State.balances[owner.address.toLowerCase()]).minus(prevToken0State.balances[owner.address.toLowerCase()])).toEqual(amt_out)
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokensThrice': {
      switch (direction) {
        case 'Token0ToToken3':
          // Validate first_intermediate_amt_in = first_intermediate_amt_out
          first_intermediate_amt_out = new BigNumber(prevPool1State.reserve1).minus(newPool1State.reserve1);
          first_intermediate_amt_in = new BigNumber(newPool2State.reserve0).minus(prevPool2State.reserve0);
          expect(first_intermediate_amt_out.eq(first_intermediate_amt_in)).toBeTruthy()

          // Validate second_intermediate_amt_in = second_intermediate_amt_out
          second_intermediate_amt_out = new BigNumber(prevPool2State.reserve1).minus(newPool2State.reserve1);
          second_intermediate_amt_in = new BigNumber(newPool3State.reserve0).minus(prevPool3State.reserve0);
          expect(second_intermediate_amt_out.eq(second_intermediate_amt_in)).toBeTruthy()

          // Validate Token Balance
          amt_in = new BigNumber(prevToken0State.balances[owner.address.toLowerCase()]).minus(newToken0State.balances[owner.address.toLowerCase()])
          expect(new BigNumber(newToken0State.balances[pool1.address.toLowerCase()]).minus(prevToken0State.balances[pool1.address.toLowerCase()])).toEqual(amt_in)

          newPool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).minus(first_intermediate_amt_out).toString()
          expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(newPool1Token1Balance)

          newPool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).plus(first_intermediate_amt_in).toString()
          expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token1Balance)

          newPool2Token2Balance = (new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()])).minus(second_intermediate_amt_out).toString()
          expect(newToken2State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token2Balance)

          newPool3Token2Balance = (new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()])).plus(second_intermediate_amt_in).toString()
          expect(newToken2State.balances[pool3.address.toLowerCase()]).toEqual(newPool3Token2Balance)

          expect(new BigNumber(prevToken3State.balances[pool3.address.toLowerCase()]).minus(newToken3State.balances[pool3.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
          expect(new BigNumber(newToken3State.balances[owner.address.toLowerCase()]).minus(prevToken3State.balances[owner.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
          break;

        case 'Token3ToToken0':
          // Validate first_intermediate_amt_in = first_intermediate_amt_out
          first_intermediate_amt_out = new BigNumber(prevPool3State.reserve0).minus(newPool3State.reserve0);
          first_intermediate_amt_in = new BigNumber(newPool2State.reserve1).minus(prevPool2State.reserve1);
          expect(first_intermediate_amt_out.eq(first_intermediate_amt_in)).toBeTruthy()

          // Validate second_intermediate_amt_in = second_intermediate_amt_out
          second_intermediate_amt_out = new BigNumber(prevPool2State.reserve0).minus(newPool2State.reserve0);
          second_intermediate_amt_in = new BigNumber(newPool1State.reserve1).minus(prevPool1State.reserve1);
          expect(second_intermediate_amt_out.eq(second_intermediate_amt_in)).toBeTruthy()

          // Validate Token Balance
          amt_in = new BigNumber(prevToken3State.balances[owner.address.toLowerCase()]).minus(newToken3State.balances[owner.address.toLowerCase()])
          expect(new BigNumber(newToken3State.balances[pool3.address.toLowerCase()]).minus(prevToken3State.balances[pool3.address.toLowerCase()])).toEqual(amt_in)

          newPool3Token2Balance = (new BigNumber(prevToken2State.balances[pool3.address.toLowerCase()])).minus(first_intermediate_amt_out).toString()
          expect(newToken2State.balances[pool3.address.toLowerCase()]).toEqual(newPool3Token2Balance)

          newPool2Token2Balance = (new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()])).plus(first_intermediate_amt_in).toString()
          expect(newToken2State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token2Balance)

          newPool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).minus(second_intermediate_amt_out).toString()
          expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(newPool2Token1Balance)

          newPool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).plus(second_intermediate_amt_in).toString()
          expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(newPool1Token1Balance)

          expect(new BigNumber(prevToken0State.balances[pool1.address.toLowerCase()]).minus(newToken0State.balances[pool1.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
          expect(new BigNumber(newToken0State.balances[owner.address.toLowerCase()]).minus(prevToken0State.balances[owner.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
          break;
      }
      break;
    }
  }
}