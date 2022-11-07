const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let owner, feeAccount, tx
let router, token0, token1, token2, pool1, pool2, prevPool1State, prevPool2State, newPool1State, newPool2State, prevToken0State, prevToken1State, prevToken2State, newToken0State, newToken1State, newToken2State;
const minimumLiquidity = 1000;
const init_liquidity = 1000000000;
let amountIn = amountInMax = 100000;
let amountOutMin = amountOut = 10000;
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");


describe('Zilswap double-pool swap exact zrc2 for zrc2 (Non-amp pool)', () => {

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
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevToken2State = await token2.getState()
  })

  test('swap exact token0 for token2 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
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
        }
      ],
      0, false, true
    )

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    // Validate for Pool1 and Pool2
    expect(newPool1State.reserve0).toEqual((new BigNumber(prevPool1State.reserve0).plus(amountIn)).toString())
    expect((new BigNumber(newPool1State.reserve1)).lt(prevPool1State.reserve1)).toBeTruthy()
    expect((new BigNumber(newPool2State.reserve0)).gt(prevPool2State.reserve0)).toBeTruthy()
    expect((new BigNumber(newPool2State.reserve1)).lt(prevPool2State.reserve1)).toBeTruthy()

    // Validate intermediate_amt_in = intermediate_amt_out
    const intermediate_amt_out = new BigNumber(prevPool1State.reserve1).minus(newPool1State.reserve1);
    const intermediate_amt_in = new BigNumber(newPool2State.reserve0).minus(prevPool2State.reserve0);
    expect(intermediate_amt_out.eq(intermediate_amt_in)).toBeTruthy()

    // Validate Token Balance
    const amt_in = new BigNumber(prevToken0State.balances[owner.address.toLowerCase()]).minus(newToken0State.balances[owner.address.toLowerCase()])
    expect(amt_in).toEqual(new BigNumber(amountIn))

    const Pool1Token0Balance = (new BigNumber(prevToken0State.balances[pool1.address.toLowerCase()])).plus(amountIn).toString()
    expect(newToken0State.balances[pool1.address.toLowerCase()]).toEqual(Pool1Token0Balance)

    const Pool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).minus(intermediate_amt_out).toString()
    expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(Pool1Token1Balance)

    const Pool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).plus(intermediate_amt_in).toString()
    expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(Pool2Token1Balance)

    expect(new BigNumber(newToken2State.balances[pool2.address.toLowerCase()]).lt(prevToken2State.balances[pool2.address.toLowerCase()])).toBeTruthy()

    const amt_out = new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()]).minus(newToken2State.balances[pool2.address.toLowerCase()])
    expect(new BigNumber(newToken2State.balances[owner.address.toLowerCase()]).minus(prevToken2State.balances[owner.address.toLowerCase()])).toEqual(amt_out)
  })

  test('swap exact token2 for token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
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
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
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

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    // Validate for Pool1 and Pool2
    expect(newPool2State.reserve1).toEqual((new BigNumber(prevPool2State.reserve1).plus(amountIn)).toString())
    expect((new BigNumber(newPool2State.reserve0)).lt(prevPool2State.reserve0)).toBeTruthy()
    expect((new BigNumber(newPool1State.reserve1)).gt(prevPool1State.reserve1)).toBeTruthy()
    expect((new BigNumber(newPool1State.reserve0)).lt(prevPool1State.reserve0)).toBeTruthy()

    // Validate intermediate_amt_in = intermediate_amt_out
    const intermediate_amt_out = new BigNumber(prevPool2State.reserve0).minus(newPool2State.reserve0);
    const intermediate_amt_in = new BigNumber(newPool1State.reserve1).minus(prevPool1State.reserve1);
    expect(intermediate_amt_out.eq(intermediate_amt_in)).toBeTruthy()

    // Validate Token Balance
    const amt_in = new BigNumber(prevToken2State.balances[owner.address.toLowerCase()]).minus(newToken2State.balances[owner.address.toLowerCase()])
    expect(amt_in).toEqual(new BigNumber(amountIn))

    const Pool2Token2Balance = (new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()])).plus(amountIn).toString()
    expect(newToken2State.balances[pool2.address.toLowerCase()]).toEqual(Pool2Token2Balance)

    const Pool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).minus(intermediate_amt_out).toString()
    expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(Pool2Token1Balance)

    const Pool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).plus(intermediate_amt_in).toString()
    expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(Pool1Token1Balance)

    expect(new BigNumber(newToken0State.balances[pool1.address.toLowerCase()]).lt(prevToken0State.balances[pool1.address.toLowerCase()])).toBeTruthy()

    const amt_out = new BigNumber(prevToken0State.balances[pool1.address.toLowerCase()]).minus(newToken0State.balances[pool1.address.toLowerCase()])
    expect(new BigNumber(newToken0State.balances[owner.address.toLowerCase()]).minus(prevToken0State.balances[owner.address.toLowerCase()])).toEqual(amt_out)
  })
})


describe('Zilswap double-pool swap zrc2 for exact zrc2 (Non-amp pool)', () => {

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
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
    prevToken2State = await token2.getState()
  })

  test('swap token0 for exact token2 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
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
        }
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    // Validate for Pool1 and Pool2
    expect((new BigNumber(newPool1State.reserve0)).gt(prevPool1State.reserve0)).toBeTruthy()
    expect((new BigNumber(newPool1State.reserve1)).lt(prevPool1State.reserve1)).toBeTruthy()
    expect((new BigNumber(newPool2State.reserve0)).gt(prevPool2State.reserve0)).toBeTruthy()
    expect(newPool2State.reserve1).toEqual((new BigNumber(prevPool2State.reserve1).minus(amountOut)).toString())

    // Validate intermediate_amt_in = intermediate_amt_out
    const intermediate_amt_out = new BigNumber(prevPool1State.reserve1).minus(newPool1State.reserve1);
    const intermediate_amt_in = new BigNumber(newPool2State.reserve0).minus(prevPool2State.reserve0);
    expect(intermediate_amt_out.eq(intermediate_amt_in)).toBeTruthy()

    // Validate Token Balance
    const amt_in = new BigNumber(prevToken0State.balances[owner.address.toLowerCase()]).minus(newToken0State.balances[owner.address.toLowerCase()])
    expect(new BigNumber(newToken0State.balances[pool1.address.toLowerCase()]).minus(prevToken0State.balances[pool1.address.toLowerCase()])).toEqual(amt_in)

    const Pool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).minus(intermediate_amt_out).toString()
    expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(Pool1Token1Balance)

    const Pool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).plus(intermediate_amt_in).toString()
    expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(Pool2Token1Balance)

    expect(new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()]).minus(newToken2State.balances[pool2.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
    expect(new BigNumber(newToken2State.balances[owner.address.toLowerCase()]).minus(prevToken2State.balances[owner.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
  })

  test('swap token2 for exact token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
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
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
          }
        },
        {
          vname: 'path2',
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
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()


    // Validate for Pool1 and Pool2
    expect(new BigNumber(newPool2State.reserve1).gt(prevPool2State.reserve1)).toBeTruthy()
    expect((new BigNumber(newPool2State.reserve0)).lt(prevPool2State.reserve0)).toBeTruthy()
    expect((new BigNumber(newPool1State.reserve1)).gt(prevPool1State.reserve1)).toBeTruthy()
    expect(new BigNumber(prevPool1State.reserve0).minus(newPool1State.reserve0)).toEqual(new BigNumber(amountOut))

    // Validate intermediate_amt_in = intermediate_amt_out
    const intermediate_amt_out = new BigNumber(prevPool2State.reserve0).minus(newPool2State.reserve0);
    const intermediate_amt_in = new BigNumber(newPool1State.reserve1).minus(prevPool1State.reserve1);
    expect(intermediate_amt_out.eq(intermediate_amt_in)).toBeTruthy()

    // Validate Token Balance
    const amt_in = new BigNumber(prevToken2State.balances[owner.address.toLowerCase()]).minus(newToken2State.balances[owner.address.toLowerCase()])
    expect(new BigNumber(newToken2State.balances[pool2.address.toLowerCase()]).minus(prevToken2State.balances[pool2.address.toLowerCase()])).toEqual(amt_in)

    const Pool2Token1Balance = (new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])).minus(intermediate_amt_out).toString()
    expect(newToken1State.balances[pool2.address.toLowerCase()]).toEqual(Pool2Token1Balance)

    const Pool1Token1Balance = (new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])).plus(intermediate_amt_in).toString()
    expect(newToken1State.balances[pool1.address.toLowerCase()]).toEqual(Pool1Token1Balance)

    expect(new BigNumber(prevToken0State.balances[pool1.address.toLowerCase()]).minus(newToken0State.balances[pool1.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
    expect(new BigNumber(newToken0State.balances[owner.address.toLowerCase()]).minus(prevToken0State.balances[owner.address.toLowerCase()])).toEqual(new BigNumber(amountOut))
  })
})

// Helper functions
// is_amp_pool = let is_eq = builtin eq amp bps in negb is_eq;
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

setup = async () => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 6 }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 18 }, router.address.toLowerCase(), null))[0]
  token2 = (await useFungibleToken(owner.key, { symbol: 'TKN2', decimals: 18 }, router.address.toLowerCase(), null))[0]

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

  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1, token2] = [token1, token0, token2]
  if (parseInt(token1.address, 16) > parseInt(token2.address, 16)) [token0, token1, token2] = [token0, token2, token1]
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1, token2] = [token1, token0, token2]

  pool1 = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(false) }))[0]
  pool2 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token1, token1: token2, init_amp_bps: getAmpBps(false) }))[0]

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