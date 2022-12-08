const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, useWrappedZIL } = require('../../scripts/deploy.js');
const { callContract, getBalance, getContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');

let token0, token1, token2, token3, token4, owner, feeAccount, pool1, pool2, pool3, pool4, router
const init_liquidity = 10000
let amountIn = 1000;
let amountOutMin = 10;
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

describe('Zilswap swap exact zrc2/zil for zil/zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup(false)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool) for non ZIL pool
    const txIncreaseAllowancePool1 = await callContract(
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
    expect(txIncreaseAllowancePool1.status).toEqual(2)

    // RemoveLiquidity
    const txRemoveLiquidityPool1 = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        {
          vname: 'tokenA',
          type: 'ByStr20',
          value: token0.address,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: token1.address,
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
    expect(txRemoveLiquidityPool1.status).toEqual(2)

    // Increase Allowance for LP Token (to transfer LP token to Pool) for non ZIL pool
    const txIncreaseAllowancePool2 = await callContract(
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
    expect(txIncreaseAllowancePool2.status).toEqual(2)

    // RemoveLiquidity
    const txRemoveLiquidityPool2 = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        {
          vname: 'tokenA',
          type: 'ByStr20',
          value: token1.address,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: token2.address,
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
    expect(txRemoveLiquidityPool2.status).toEqual(2)

    // Increase Allowance for LP Token (to transfer LP token to Pool) for non ZIL pool
    const txIncreaseAllowancePool3 = await callContract(
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
    expect(txIncreaseAllowancePool3.status).toEqual(2)

    // RemoveLiquidity
    const txRemoveLiquidityPool3 = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        {
          vname: 'tokenA',
          type: 'ByStr20',
          value: token2.address,
        },
        {
          vname: 'tokenB',
          type: 'ByStr20',
          value: token3.address,
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
    expect(txRemoveLiquidityPool3.status).toEqual(2)

    // Increase Allowance for LP Token (to transfer LP token to Pool) for ZIL pool
    const txIncreaseAllowancePool4 = await callContract(
      owner.key, pool4,
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
          value: `${newPool4State.balances[owner.address.toLowerCase()]}`,
        },
      ],
      0, false, false
    )
    expect(txIncreaseAllowancePool4.status).toEqual(2)

    // RemoveLiquidityZIL
    const txRemoveLiquidityPool4 = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        {
          vname: 'token',
          type: 'ByStr20',
          value: token3.address,
        },
        {
          vname: 'wZIL',
          type: 'ByStr20',
          value: token4.address,
        },
        {
          vname: 'pool',
          type: 'ByStr20',
          value: `${pool4.address.toLowerCase()}`,
        },
        {
          vname: 'liquidity',
          type: 'Uint128',
          value: `${newPool4State.balances[owner.address.toLowerCase()]}`,
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
    expect(txRemoveLiquidityPool4.status).toEqual(2)
  })

  test('swap exact ZIL for token (Non-amp pool)', async () => {
    const txSwapExactZilForTokensQuad = await callContract(
      owner.key, router,
      'SwapExactZILForTokensQuad',
      [
        {
          vname: 'amount_out_min',
          type: 'Uint128',
          value: `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`,
        },
        {
          vname: 'pool1',
          type: 'ByStr20',
          value: pool4.address.toLowerCase(),
        },
        {
          vname: 'pool2',
          type: 'ByStr20',
          value: pool3.address.toLowerCase(),
        },
        {
          vname: 'pool3',
          type: 'ByStr20',
          value: pool2.address.toLowerCase(),
        },
        {
          vname: 'pool4',
          type: 'ByStr20',
          value: pool1.address.toLowerCase(),
        },
        {
          vname: 'path1',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token4.address.toLowerCase(), token3.address.toLowerCase()]
          }
        },
        {
          vname: 'path2',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token3.address.toLowerCase(), token2.address.toLowerCase()]
          }
        },
        {
          vname: 'path3',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token2.address.toLowerCase(), token1.address.toLowerCase()]
          }
        },
        {
          vname: 'path4',
          type: 'Pair (ByStr20) (ByStr20)',
          value: {
            "constructor": "Pair",
            "argtypes": ["ByStr20", "ByStr20"],
            "arguments": [token1.address.toLowerCase(), token0.address.toLowerCase()]
          }
        },
      ],
      amountIn, false, true
    )
    expect(txSwapExactZilForTokensQuad.status).toEqual(2)
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
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 12, supply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  token2 = (await useFungibleToken(owner.key, { symbol: 'TKN2', decimals: 12, supply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  token3 = (await useFungibleToken(owner.key, { symbol: 'TKN2', decimals: 12, supply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  token4 = (await useWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]

  const txSetFeeConfig = await callContract(
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
  expect(txSetFeeConfig.status).toEqual(2)

  if (parseInt(token0.address, 16) < parseInt(token1.address, 16))
    pool1 = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(isAmpPool) }))[0]
  else
    pool1 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token1, token1: token0, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  if (parseInt(token1.address, 16) < parseInt(token2.address, 16))
    pool2 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token1, token1: token2, init_amp_bps: getAmpBps(isAmpPool) }))[0]
  else
    pool2 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token2, token1: token1, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  if (parseInt(token2.address, 16) < parseInt(token3.address, 16))
    pool3 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token2, token1: token3, init_amp_bps: getAmpBps(isAmpPool) }))[0]
  else
    pool3 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token3, token1: token2, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  if (parseInt(token3.address, 16) < parseInt(token4.address, 16))
    pool4 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token3, token1: token4, init_amp_bps: getAmpBps(isAmpPool) }))[0]
  else
    pool4 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token4, token1: token3, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  const txAddPool1 = await callContract(
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
  expect(txAddPool1.status).toEqual(2)

  const txAddPool2 = await callContract(
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
  expect(txAddPool2.status).toEqual(2)

  const txAddPool3 = await callContract(
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
  expect(txAddPool3.status).toEqual(2)

  const txAddPool4 = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: pool4.address.toLowerCase(),
      },
    ],
    0, false, false
  )
  expect(txAddPool4.status).toEqual(2)

  const txAddLiquidity1 = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: token0.address,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: token1.address,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool1.address.toLowerCase()}`,
      },
      {
        vname: 'amountA_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
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
  expect(txAddLiquidity1.status).toEqual(2)

  const txAddLiquidity2 = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: token1.address,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: token2.address,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool2.address.toLowerCase()}`,
      },
      {
        vname: 'amountA_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
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
  expect(txAddLiquidity2.status).toEqual(2)

  const txAddLiquidity3 = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: token2.address,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: token3.address,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool3.address.toLowerCase()}`,
      },
      {
        vname: 'amountA_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`,
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
  expect(txAddLiquidity3.status).toEqual(2)

  const txAddLiquidity4 = await callContract(
    owner.key, router,
    'AddLiquidityZIL',
    [
      {
        vname: 'token',
        type: 'ByStr20',
        value: token3.address,
      },
      {
        vname: 'wZIL',
        type: 'ByStr20',
        value: token4.address,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool4.address.toLowerCase()}`,
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
  expect(txAddLiquidity4.status).toEqual(2)
}
