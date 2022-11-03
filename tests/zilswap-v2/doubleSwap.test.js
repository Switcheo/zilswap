const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let token0, token1, token2, owner, feeAccount, tx, pool1, pool2, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State
const minimumLiquidity = 1000
const init_liquidity = 1000000000
let amountIn = amountInMax = 100000;
let amountOutMin = amountOut = 10000;
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");


describe('Zilswap double-pool swap exact zrc2 for zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup()
  })

  // afterAll(async () => {
  //   // Increase Allowance for LP Token (to transfer LP token to Pool)
  //   tx = await callContract(
  //     owner.key, pool,
  //     'IncreaseAllowance',
  //     [
  //       {
  //         vname: 'spender',
  //         type: 'ByStr20',
  //         value: router.address.toLowerCase(),
  //       },
  //       {
  //         vname: 'amount',
  //         type: 'Uint128',
  //         value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
  //       },
  //     ],
  //     0, false, false
  //   )
  //   expect(tx.status).toEqual(2)

  //   // RemoveLiquidity
  //   tx = await callContract(
  //     owner.key, router,
  //     'RemoveLiquidity',
  //     [
  //       {
  //         vname: 'tokenA',
  //         type: 'ByStr20',
  //         value: `${token0.address.toLowerCase()}`,
  //       },
  //       {
  //         vname: 'tokenB',
  //         type: 'ByStr20',
  //         value: `${token1.address.toLowerCase()}`,
  //       },
  //       {
  //         vname: 'pool',
  //         type: 'ByStr20',
  //         value: `${pool.address.toLowerCase()}`,
  //       },
  //       {
  //         vname: 'liquidity',
  //         type: 'Uint128',
  //         value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
  //       },
  //       {
  //         vname: 'amountA_min',
  //         type: 'Uint128',
  //         value: '0',
  //       },
  //       {
  //         vname: 'amountB_min',
  //         type: 'Uint128',
  //         value: '0',
  //       },
  //       {
  //         vname: 'to',
  //         type: 'ByStr20',
  //         value: `${owner.address.toLowerCase()}`,
  //       },
  //     ],
  //     0, false, true
  //   )
  //   expect(tx.status).toEqual(2)
  // })

  // beforeEach(async () => {
  // })

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
  })
})


describe('Zilswap double-pool swap exact zrc2 for zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup()
  })

  // afterAll(async () => {
  //   // Increase Allowance for LP Token (to transfer LP token to Pool)
  //   tx = await callContract(
  //     owner.key, pool,
  //     'IncreaseAllowance',
  //     [
  //       {
  //         vname: 'spender',
  //         type: 'ByStr20',
  //         value: router.address.toLowerCase(),
  //       },
  //       {
  //         vname: 'amount',
  //         type: 'Uint128',
  //         value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
  //       },
  //     ],
  //     0, false, false
  //   )
  //   expect(tx.status).toEqual(2)

  //   // RemoveLiquidity
  //   tx = await callContract(
  //     owner.key, router,
  //     'RemoveLiquidity',
  //     [
  //       {
  //         vname: 'tokenA',
  //         type: 'ByStr20',
  //         value: `${token0.address.toLowerCase()}`,
  //       },
  //       {
  //         vname: 'tokenB',
  //         type: 'ByStr20',
  //         value: `${token1.address.toLowerCase()}`,
  //       },
  //       {
  //         vname: 'pool',
  //         type: 'ByStr20',
  //         value: `${pool.address.toLowerCase()}`,
  //       },
  //       {
  //         vname: 'liquidity',
  //         type: 'Uint128',
  //         value: `${newPoolState.balances[owner.address.toLowerCase()]}`,
  //       },
  //       {
  //         vname: 'amountA_min',
  //         type: 'Uint128',
  //         value: '0',
  //       },
  //       {
  //         vname: 'amountB_min',
  //         type: 'Uint128',
  //         value: '0',
  //       },
  //       {
  //         vname: 'to',
  //         type: 'ByStr20',
  //         value: `${owner.address.toLowerCase()}`,
  //       },
  //     ],
  //     0, false, true
  //   )
  //   expect(tx.status).toEqual(2)
  // })

  // beforeEach(async () => {
  // })

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

