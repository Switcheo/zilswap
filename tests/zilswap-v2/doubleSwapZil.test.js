const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract, getBalance, getContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');
const { param } = require("../../scripts/zilliqa");

let token0, token1, token2, bridgeTokenAddress, otherTokenAddress, wZil, owner, feeAccount, tx, pool1, pool2, router, prevPool1State, prevPool2State, newPool1State, newPool2State, prevOtherTokenState, prevBridgeTokenState, prevWZilState, prevOwnerZilBalance
const init_liquidity = 10000
let amountIn = 1000;
let amountInMax = 10000;
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
      owner.key, pool1,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', otherTokenAddress),
        param('tokenB', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool1.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool2.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    const otherToken = getContract(otherTokenAddress)
    const bridgeToken = getContract(bridgeTokenAddress)
    const wZilToken = getContract(wZil)
    prevOtherTokenState = await otherToken.getState()
    prevBridgeTokenState = await bridgeToken.getState()
    prevWZilState = await wZilToken.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap exact token for ZIL (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [otherTokenAddress, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    await validatePoolReserves("SwapExactTokensForZILTwice", false)
    await validateBalances("SwapExactTokensForZILTwice")
  })

  test('swap exact ZIL for token (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensTwice',
      [
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, otherTokenAddress]
        })
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    await validatePoolReserves("SwapExactZILForTokensTwice", false)
    await validateBalances("SwapExactZILForTokensTwice")
  })
})

describe('Zilswap swap zrc2/zil for exact zil/zrc2 (Non-amp pool)', () => {

  beforeAll(async () => {
    await setup(false)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool1,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', otherTokenAddress),
        param('tokenB', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool1.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool2.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    const otherToken = getContract(otherTokenAddress)
    const bridgeToken = getContract(bridgeTokenAddress)
    const wZilToken = getContract(wZil)
    prevOtherTokenState = await otherToken.getState()
    prevBridgeTokenState = await bridgeToken.getState()
    prevWZilState = await wZilToken.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap token for exact ZIL (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('amount_in_max', 'Uint128', `${new BigNumber(amountInMax).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [otherTokenAddress, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    await validatePoolReserves("SwapTokensForExactZILTwice", false)
    await validateBalances("SwapTokensForExactZILTwice")
  })

  test('swap ZIL for exact token (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapZILForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, otherTokenAddress]
        })
      ],
      amountInMax, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    await validatePoolReserves("SwapZILForExactTokensTwice", false)
    await validateBalances("SwapZILForExactTokensTwice")
  })
})

describe('Zilswap swap exact zrc2/zil for zil/zrc2 (Amp pool)', () => {

  beforeAll(async () => {
    await setup(true)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool1,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', otherTokenAddress),
        param('tokenB', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool1.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool2.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    const otherToken = getContract(otherTokenAddress)
    const bridgeToken = getContract(bridgeTokenAddress)
    const wZilToken = getContract(wZil)
    prevOtherTokenState = await otherToken.getState()
    prevBridgeTokenState = await bridgeToken.getState()
    prevWZilState = await wZilToken.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap exact token for zil (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForZILTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12).toString()}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [otherTokenAddress, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    await validatePoolReserves("SwapExactTokensForZILTwice", true)
    await validateBalances("SwapExactTokensForZILTwice")
  })

  test('swap exact ZIL for token (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactZILForTokensTwice',
      [
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, otherTokenAddress]
        })
      ],
      amountIn, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()
    await validatePoolReserves("SwapExactZILForTokensTwice", true)
    await validateBalances("SwapExactZILForTokensTwice")
  })
})

describe('Zilswap swap zrc2 for exact zrc2 (Amp pool)', () => {

  beforeAll(async () => {
    await setup(true)
  })

  afterAll(async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool1,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', otherTokenAddress),
        param('tokenB', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool1.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool1State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // RemoveLiquidityZIL
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', bridgeTokenAddress),
        param('pool', 'ByStr20', pool2.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPool1State = await pool1.getState()
    prevPool2State = await pool2.getState()
    const otherToken = getContract(otherTokenAddress)
    const bridgeToken = getContract(bridgeTokenAddress)
    const wZilToken = getContract(wZil)
    prevOtherTokenState = await otherToken.getState()
    prevBridgeTokenState = await bridgeToken.getState()
    prevWZilState = await wZilToken.getState()
    prevOwnerZilBalance = await getBalance(owner.address)
  })

  test('swap token for exact ZIL (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactZILTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('amount_in_max', 'Uint128', `${new BigNumber(amountInMax).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [otherTokenAddress, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, wZil]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    await validatePoolReserves("SwapTokensForExactZILTwice", true)
    await validateBalances("SwapTokensForExactZILTwice")
  })

  test('swap ZIL for exact token (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapZILForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12).toString()}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [wZil, bridgeTokenAddress]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [bridgeTokenAddress, otherTokenAddress]
        })
      ],
      amountInMax, false, true
    )
    expect(tx.status).toEqual(2)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
    newToken0State = await token0.getState()
    newToken1State = await token1.getState()
    newToken2State = await token2.getState()

    await validatePoolReserves("SwapZILForExactTokensTwice", true)
    await validateBalances("SwapZILForExactTokensTwice")
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

  // Need to deploy wZIL first to deploy Router
  token2 = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  wZil = token2.address.toLowerCase()

  // Deploy Router
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil }))[0]

  // Deploy non-wZIL tokens
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 12, supply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 12, supply: '100000000000000000000000000000000000000' }, router.address.toLowerCase(), null))[0]
  const token0Address = token0.address.toLowerCase()
  const token1Address = token1.address.toLowerCase()

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

  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1, token2] = [token1, token0, token2]
  pool1 = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  if (parseInt(token1.address, 16) > parseInt(token2.address, 16)) [token0, token1, token2] = [token0, token2, token1]
  pool2 = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token1, token1: token2, init_amp_bps: getAmpBps(isAmpPool) }))[0]
  bridgeTokenAddress = token2.address.toLowerCase() == wZil ? token1.address.toLowerCase() : token2.address.toLowerCase()
  otherTokenAddress = bridgeTokenAddress == token0Address ? token1Address : token0Address

  // Add Pool
  tx = await callContract(owner.key, router, 'AddPool', [param('pool', 'ByStr20', pool1.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)
  tx = await callContract(owner.key, router, 'AddPool', [param('pool', 'ByStr20', pool2.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', otherTokenAddress),
      param('tokenB', 'ByStr20', bridgeTokenAddress),
      param('pool', 'ByStr20', pool1.address.toLowerCase()),
      param('amountA_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountB_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool1)).vReserveMin}`, `${(await getVReserveBound(pool1)).vReserveMax}`]
      })
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', bridgeTokenAddress),
      param('pool', 'ByStr20', pool2.address.toLowerCase()),
      param('amount_token_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool2)).vReserveMin}`, `${(await getVReserveBound(pool2)).vReserveMax}`]
      })
    ],
    init_liquidity, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    owner.key, router,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', bridgeTokenAddress),
      param('pool', 'ByStr20', pool2.address.toLowerCase()),
      param('amount_token_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool2)).vReserveMin}`, `${(await getVReserveBound(pool2)).vReserveMax}`]
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
validatePoolReserves = async (transition, isAmpPool) => {
  newPool1State = await pool1.getState()
  newPool2State = await pool2.getState()
  let newAmountIn = (new BigNumber(amountIn)).shiftedBy(12)
  let newAmountOut = (new BigNumber(amountOut)).shiftedBy(12)

  let pool1PrevReserve0 = new BigNumber(prevPool1State.reserve0)
  let pool1NewReserve0 = new BigNumber(newPool1State.reserve0)
  let pool1PrevReserve1 = new BigNumber(prevPool1State.reserve1)
  let pool1NewReserve1 = new BigNumber(newPool1State.reserve1)

  let pool2PrevReserve0 = new BigNumber(prevPool2State.reserve0)
  let pool2NewReserve0 = new BigNumber(newPool2State.reserve0)
  let pool2PrevReserve1 = new BigNumber(prevPool2State.reserve1)
  let pool2NewReserve1 = new BigNumber(newPool2State.reserve1)

  switch (transition) {
    case 'SwapExactTokensForZILTwice': {
      if (newPool1State.token0.toLowerCase() == otherTokenAddress) {
        expect(pool1NewReserve0).toEqual(pool1PrevReserve0.plus(newAmountIn))
        expect(pool1NewReserve1.lt(pool1PrevReserve1)).toBeTruthy()
      } else {
        expect(pool1NewReserve1).toEqual(pool1PrevReserve1.plus(newAmountIn))
        expect(pool1NewReserve0.lt(pool1PrevReserve0)).toBeTruthy()
      }

      if (newPool2State.token0.toLowerCase() == wZil) {
        expect(pool2NewReserve1.gt(pool2PrevReserve1)).toBeTruthy()
        expect(pool2NewReserve0.lt(pool2PrevReserve0)).toBeTruthy()
      } else {
        expect(pool2NewReserve0.gt(pool2PrevReserve0)).toBeTruthy()
        expect(pool2NewReserve1.lt(pool2PrevReserve1)).toBeTruthy()
      }
      break;
    }

    case 'SwapExactZILForTokensTwice': {
      if (newPool2State.token0.toLowerCase() === wZil) {
        expect(pool2NewReserve0).toEqual(pool2PrevReserve0.plus(newAmountIn))
        expect(pool2NewReserve1.lt(pool2PrevReserve1)).toBeTruthy()
      } else {
        expect(pool2NewReserve1).toEqual(pool2PrevReserve1.plus(newAmountIn))
        expect(pool2NewReserve0.lt(pool2PrevReserve0)).toBeTruthy()
      }

      if (newPool1State.token0.toLowerCase() == otherTokenAddress) {
        expect(pool1NewReserve0.lt(pool1PrevReserve0)).toBeTruthy()
        expect(pool1NewReserve1.gt(pool1PrevReserve1)).toBeTruthy()
      } else {
        expect(pool1NewReserve1.lt(pool1PrevReserve1)).toBeTruthy()
        expect(pool1NewReserve0.gt(pool1PrevReserve0)).toBeTruthy()
      }
      break;
    }

    case 'SwapTokensForExactZILTwice': {
      if (newPool1State.token0.toLowerCase() == otherTokenAddress) {
        expect(pool1NewReserve0.gt(pool1PrevReserve0)).toBeTruthy()
        expect(pool1NewReserve1.lt(pool1PrevReserve1)).toBeTruthy()
      } else {
        expect(pool1NewReserve1.gt(pool1PrevReserve1)).toBeTruthy()
        expect(pool1NewReserve0.lt(pool1PrevReserve0)).toBeTruthy()
      }

      if (newPool2State.token0.toLowerCase() === wZil) {
        expect(pool2NewReserve1.gt(pool2PrevReserve1)).toBeTruthy()
        expect(pool2PrevReserve0).toEqual(pool2NewReserve0.plus(newAmountOut))
        break;
      } else {
        expect(pool2NewReserve0.gt(pool2PrevReserve0)).toBeTruthy()
        expect(pool2PrevReserve1).toEqual(pool2NewReserve1.plus(newAmountOut))
        break;
      }
    }

    case 'SwapZILForExactTokensTwice': {
      if (newPool2State.token0.toLowerCase() === wZil) {
        expect(pool2NewReserve0.gt(pool2PrevReserve0)).toBeTruthy()
        expect(pool2NewReserve1.lt(pool2PrevReserve1)).toBeTruthy()
      } else {
        expect(pool2NewReserve1.gt(pool2PrevReserve1)).toBeTruthy()
        expect(pool2NewReserve0.lt(pool2PrevReserve0)).toBeTruthy()
      }

      if (newPool1State.token0.toLowerCase() == otherTokenAddress) {
        expect(pool1PrevReserve0).toEqual(pool1NewReserve0.plus(newAmountOut))
        expect(pool1NewReserve1.gt(pool1PrevReserve1)).toBeTruthy()
      } else {
        expect(pool1PrevReserve1).toEqual(pool1NewReserve1.plus(newAmountOut))
        expect(pool1NewReserve0.gt(pool1PrevReserve0)).toBeTruthy()
      }
    }
  }

  if (isAmpPool) {
    expect(newPool1State.v_reserve0).toEqual((new BigNumber(prevPool1State.v_reserve0).plus(newPool1State.reserve0).minus(prevPool1State.reserve0)).toString())
    expect(newPool1State.v_reserve1).toEqual((new BigNumber(prevPool1State.v_reserve1).plus(newPool1State.reserve1).minus(prevPool1State.reserve1)).toString())
    expect(newPool2State.v_reserve0).toEqual((new BigNumber(prevPool2State.v_reserve0).plus(newPool2State.reserve0).minus(prevPool2State.reserve0)).toString())
    expect(newPool2State.v_reserve1).toEqual((new BigNumber(prevPool2State.v_reserve1).plus(newPool2State.reserve1).minus(prevPool2State.reserve1)).toString())
  }
  else {
    expect(newPool1State.v_reserve0).toEqual('0')
    expect(newPool1State.v_reserve1).toEqual('0')
    expect(newPool2State.v_reserve0).toEqual('0')
    expect(newPool2State.v_reserve1).toEqual('0')
  }
}

// validate if token balances are correct
validateBalances = async (transition) => {
  const otherTokenContract = getContract(otherTokenAddress)
  const bridgeTokenContract = getContract(bridgeTokenAddress)
  const wZilContract = getContract(wZil)

  const newOtherTokenState = await otherTokenContract.getState()
  const newBridgeTokenState = await bridgeTokenContract.getState()
  const newWZilState = await wZilContract.getState()
  const newOwnerZilBalance = await getBalance(owner.address)

  let newAmountIn = (new BigNumber(amountIn)).shiftedBy(12)
  let newAmountOut = (new BigNumber(amountOut)).shiftedBy(12)

  let pool1PrevOtherTokenBalance = new BigNumber(prevOtherTokenState.balances[pool1.address.toLowerCase()])
  let pool1PrevBridgeTokenBalance = new BigNumber(prevBridgeTokenState.balances[pool1.address.toLowerCase()])
  let pool1NewOtherTokenBalance = new BigNumber(newOtherTokenState.balances[pool1.address.toLowerCase()])
  let pool1NewBridgeTokenBalance = new BigNumber(newBridgeTokenState.balances[pool1.address.toLowerCase()])

  let pool2PrevBridgeTokenBalance = new BigNumber(prevBridgeTokenState.balances[pool2.address.toLowerCase()])
  let pool2PrevWZilBalance = new BigNumber(prevWZilState.balances[pool2.address.toLowerCase()])
  let pool2NewBridgeTokenBalance = new BigNumber(newBridgeTokenState.balances[pool2.address.toLowerCase()])
  let pool2NewWZilBalance = new BigNumber(newWZilState.balances[pool2.address.toLowerCase()])

  let ownerPrevOtherTokenBalance = new BigNumber(prevOtherTokenState.balances[owner.address.toLowerCase()])
  let ownerNewOtherTokenBalance = new BigNumber(newOtherTokenState.balances[owner.address.toLowerCase()])

  switch (transition) {
    case 'SwapExactTokensForZILTwice': {
      expect(ownerNewOtherTokenBalance).toEqual(ownerPrevOtherTokenBalance.minus(newAmountIn))
      expect(pool1NewOtherTokenBalance).toEqual(pool1PrevOtherTokenBalance.plus(newAmountIn))
      expect(pool1NewBridgeTokenBalance.lt(pool1PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool2NewBridgeTokenBalance.gt(pool2PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool2NewWZilBalance.lt(pool2PrevWZilBalance)).toBeTruthy()
      expect(newOwnerZilBalance.gt(prevOwnerZilBalance)).toBeTruthy()
      break;
    }

    case 'SwapExactZILForTokensTwice': {
      expect(newOwnerZilBalance.lt(prevOwnerZilBalance)).toBeTruthy()
      expect(pool2NewWZilBalance).toEqual(pool2PrevWZilBalance.plus(newAmountIn))
      expect(pool2NewBridgeTokenBalance.lt(pool2PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool1NewBridgeTokenBalance.gt(pool1PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool1NewOtherTokenBalance.lt(pool1PrevOtherTokenBalance)).toBeTruthy()
      expect(ownerNewOtherTokenBalance.gt(ownerPrevOtherTokenBalance)).toBeTruthy()
      break;
    }

    case 'SwapTokensForExactZILTwice': {
      expect(ownerNewOtherTokenBalance.lt(ownerPrevOtherTokenBalance)).toBeTruthy()
      expect(pool1NewOtherTokenBalance.gt(pool1PrevOtherTokenBalance)).toBeTruthy()
      expect(pool1NewBridgeTokenBalance.lt(pool1PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool2NewBridgeTokenBalance.gt(pool2PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool2NewWZilBalance).toEqual(pool2PrevWZilBalance.minus(newAmountOut))
      expect(newOwnerZilBalance.gt(prevOwnerZilBalance)).toBeTruthy()
      break;
    }

    case 'SwapZILForExactTokensTwice': {
      expect(newOwnerZilBalance.lt(prevOwnerZilBalance)).toBeTruthy()
      expect(pool2NewWZilBalance.gt(pool2PrevWZilBalance)).toBeTruthy()
      expect(pool2NewBridgeTokenBalance.lt(pool2PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool1NewBridgeTokenBalance.gt(pool1PrevBridgeTokenBalance)).toBeTruthy()
      expect(pool1NewOtherTokenBalance).toEqual(pool1PrevOtherTokenBalance.minus(newAmountOut))
      expect(ownerNewOtherTokenBalance).toEqual(ownerPrevOtherTokenBalance.plus(newAmountOut))
      break;
    }
  }
}