const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getPoolContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');
const { param } = require("../../scripts/zilliqa");

let owner, feeAccount, tx
let router, wZil, token0, token1, token2, pool1, pool2, prevPool1State, prevPool2State, newPool1State, newPool2State, prevToken0State, prevToken1State, prevToken2State, newToken0State, newToken1State, newToken2State;
const init_liquidity = 10000
let amountIn = 100
let amountInMax = 1000
let amountOut = 100
let amountOutMin = 10


describe('Zilswap double-pool swap exact zrc2 for zrc2 (Non-amp pool)', () => {

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
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool1.address.toLowerCase()}`),
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

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool2.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
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
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapExactTokensForTokensTwice", "Token0ToToken2", false)
    await validateBalances("SwapExactTokensForTokensTwice", "Token0ToToken2")
  })

  test('swap exact token2 for token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapExactTokensForTokensTwice", "Token2ToToken0", false)
    await validateBalances("SwapExactTokensForTokensTwice", "Token2ToToken0")
  })
})

describe('Zilswap double-pool swap zrc2 for exact zrc2 (Non-amp pool)', () => {

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
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool1.address.toLowerCase()}`),
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

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool2.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
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
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapTokensForExactTokensTwice", "Token0ToToken2", false)
    await validateBalances("SwapTokensForExactTokensTwice", "Token0ToToken2")
  })

  test('swap token2 for exact token0 (Non-amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapTokensForExactTokensTwice", "Token2ToToken0", false)
    await validateBalances("SwapTokensForExactTokensTwice", "Token2ToToken0")
  })
})

describe('Zilswap double-pool swap exact zrc2 for zrc2 (Amp pool)', () => {

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
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool1.address.toLowerCase()}`),
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

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool2.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
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

  test('swap exact token0 for token2 (Amp pool)', async () => {

    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapExactTokensForTokensTwice", "Token0ToToken2", true)
    await validateBalances("SwapExactTokensForTokensTwice", "Token0ToToken2")
  })

  test('swap exact token2 for token0 (Amp pool)', async () => {

    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapExactTokensForTokensTwice", "Token2ToToken0", true)
    await validateBalances("SwapExactTokensForTokensTwice", "Token2ToToken0")
  })
})

describe('Zilswap double-pool swap zrc2 for exact zrc2 (Amp pool)', () => {

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
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool1.address.toLowerCase()}`),
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

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool2.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
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

  test('swap token0 for exact token2 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token2.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapTokensForExactTokensTwice", "Token0ToToken2", true)
    await validateBalances("SwapTokensForExactTokensTwice", "Token0ToToken2")
  })

  test('swap token2 for exact token0 (Amp pool)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool2.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    await validatePoolReserves("SwapTokensForExactTokensTwice", "Token2ToToken0", true)
    await validateBalances("SwapTokensForExactTokensTwice", "Token2ToToken0")
  })
})

describe('Zilswap double-pool erroneous swap (Non-amp pool)', () => {

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
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool1.address.toLowerCase()}`),
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

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool2.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
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

  test('SwapTokensForExactTokensTwice (Non-amp pool)(same pool): Supposed to hit CodeSamePools error (-6)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
  })

  test('SwapExactTokensForTokensTwice (Non-amp pool)(same pool): Supposed to hit CodeSamePools error (-6)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
  })

  test('SwapTokensForExactTokensTwice (Non-amp pool)(invalid path): Supposed to hit CodeInvalidPaths error (-7)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
  })

  test('SwapExactTokensForTokensTwice (Non-amp pool)(invalid path): Supposed to hit CodeInvalidPaths error (-7)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
  })
})

describe('Zilswap double-pool erroneous swap (Amp pool)', () => {

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
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool1.address.toLowerCase()}`),
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

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool2.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPool2State.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
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

  test('SwapTokensForExactTokensTwice (Non-amp pool)(same pool): Supposed to hit CodeSamePools error (-6)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
  })

  test('SwapExactTokensForTokensTwice (Non-amp pool)(same pool): Supposed to hit CodeSamePools error (-6)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool1.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
  })

  test('SwapTokensForExactTokensTwice (Non-amp pool)(invalid path): Supposed to hit CodeInvalidPaths error (-7)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${(new BigNumber(amountOut)).shiftedBy(12)}`),
        param('amount_in_max', 'Uint128', `${(new BigNumber(amountInMax)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
  })

  test('SwapExactTokensForTokensTwice (Non-amp pool)(invalid path): Supposed to hit CodeInvalidPaths error (-7)', async () => {
    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool1', 'ByStr20', pool1.address.toLowerCase()),
        param('pool2', 'ByStr20', pool2.address.toLowerCase()),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token2.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(3)

    newPool1State = await pool1.getState()
    newPool2State = await pool2.getState()
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
  const codehash = await getPoolContractCodeHash(owner)
  feeAccount = await createRandomAccount(owner.key)
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 6 }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 18 }, router.address.toLowerCase(), null))[0]
  token2 = (await useFungibleToken(owner.key, { symbol: 'TKN2', decimals: 18 }, router.address.toLowerCase(), null))[0]

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
  if (parseInt(token1.address, 16) > parseInt(token2.address, 16)) [token0, token1, token2] = [token0, token2, token1]
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1, token2] = [token1, token0, token2]

  pool1 = (await deployZilswapV2Pool(owner.key))[0]
  pool2 = (await deployZilswapV2Pool(owner.key))[0]

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
        value: `${pool1.address.toLowerCase()}`,
      },
    ], 0, false, false)
  expect(tx.status).toEqual(2)

  // Add Pool
  tx = await callContract(
    owner.key,
    router,
    'AddPool',
    [
      {
        vname: 'init_token0',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'init_token1',
        type: 'ByStr20',
        value: `${token2.address.toLowerCase()}`,
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
        value: `${pool2.address.toLowerCase()}`,
      },
    ], 0, false, false)
  expect(tx.status).toEqual(2)

  // Add Liquidity
  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
      param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${pool1.address.toLowerCase()}`),
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
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
      param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${pool2.address.toLowerCase()}`),
      param('amountA_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountB_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool2)).vReserveMin}`, `${(await getVReserveBound(pool2)).vReserveMax}`]
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
    case 'SwapExactTokensForTokensTwice': {
      switch (direction) {
        case 'Token0ToToken2':
          expect(pool1NewReserve0).toEqual(pool1PrevReserve0.plus(newAmountIn))
          expect(pool1NewReserve1.lt(pool1PrevReserve1)).toBeTruthy()
          expect(pool2NewReserve0.gt(pool2PrevReserve0)).toBeTruthy()
          expect(pool2NewReserve1.lt(pool2PrevReserve1)).toBeTruthy()
          break;

        case 'Token2ToToken0':
          expect(pool2NewReserve1).toEqual(pool2PrevReserve1.plus(newAmountIn))
          expect(pool2NewReserve0.lt(pool2PrevReserve0)).toBeTruthy()
          expect(pool1NewReserve1.gt(pool1PrevReserve1)).toBeTruthy()
          expect(pool1NewReserve0.lt(pool1PrevReserve0)).toBeTruthy()
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokensTwice': {
      switch (direction) {
        case 'Token0ToToken2':
          expect(pool1NewReserve0.gt(pool1PrevReserve0)).toBeTruthy()
          expect(pool1NewReserve1.lt(pool1PrevReserve1)).toBeTruthy()
          expect(pool2NewReserve0.gt(pool2PrevReserve0)).toBeTruthy()
          expect(pool2NewReserve1).toEqual(pool2PrevReserve1.minus(newAmountOut))
          break;

        case 'Token2ToToken0':
          expect(pool2NewReserve1.gt(pool2PrevReserve1)).toBeTruthy()
          expect(pool2NewReserve0.lt(pool2PrevReserve0)).toBeTruthy()
          expect(pool1NewReserve1.gt(pool1PrevReserve1)).toBeTruthy()
          expect(pool1PrevReserve0.minus(pool1NewReserve0)).toEqual(newAmountOut)
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
  }
  else {
    expect(newPool1State.v_reserve0).toEqual('0')
    expect(newPool1State.v_reserve1).toEqual('0')
    expect(newPool2State.v_reserve0).toEqual('0')
    expect(newPool2State.v_reserve1).toEqual('0')
  }
}

validateBalances = async (transition, direction) => {
  newToken0State = await token0.getState()
  newToken1State = await token1.getState()
  newToken2State = await token2.getState()

  let newAmountIn = (new BigNumber(amountIn)).shiftedBy(12)
  let newAmountOut = (new BigNumber(amountOut)).shiftedBy(12)

  let pool1PrevToken0Balance = new BigNumber(prevToken0State.balances[pool1.address.toLowerCase()])
  let pool1PrevToken1Balance = new BigNumber(prevToken1State.balances[pool1.address.toLowerCase()])
  let pool1NewToken0Balance = new BigNumber(newToken0State.balances[pool1.address.toLowerCase()])
  let pool1NewToken1Balance = new BigNumber(newToken1State.balances[pool1.address.toLowerCase()])

  let pool2PrevToken1Balance = new BigNumber(prevToken1State.balances[pool2.address.toLowerCase()])
  let pool2PrevToken2Balance = new BigNumber(prevToken2State.balances[pool2.address.toLowerCase()])
  let pool2NewToken1Balance = new BigNumber(newToken1State.balances[pool2.address.toLowerCase()])
  let pool2NewToken2Balance = new BigNumber(newToken2State.balances[pool2.address.toLowerCase()])

  let ownerPrevToken0Balance = new BigNumber(prevToken0State.balances[owner.address.toLowerCase()])
  let ownerNewToken0Balance = new BigNumber(newToken0State.balances[owner.address.toLowerCase()])
  let ownerPrevToken2Balance = new BigNumber(prevToken2State.balances[owner.address.toLowerCase()])
  let ownerNewToken2Balance = new BigNumber(newToken2State.balances[owner.address.toLowerCase()])

  switch (transition) {
    case 'SwapExactTokensForTokensTwice': {
      switch (direction) {
        case 'Token0ToToken2':
          expect(ownerNewToken0Balance).toEqual(ownerPrevToken0Balance.minus(newAmountIn))
          expect(pool1NewToken0Balance).toEqual(pool1PrevToken0Balance.plus(newAmountIn))
          expect((pool1NewToken1Balance).lt(pool1PrevToken1Balance)).toBeTruthy()
          expect((pool2NewToken1Balance).gt(pool2PrevToken2Balance)).toBeTruthy()
          expect(pool2NewToken2Balance.lt(pool2PrevToken2Balance)).toBeTruthy()
          expect(ownerNewToken2Balance.gt(ownerPrevToken2Balance)).toBeTruthy()
          break;

        case 'Token2ToToken0':
          expect(ownerNewToken2Balance).toEqual(ownerPrevToken2Balance.minus(newAmountIn))
          expect(pool2NewToken2Balance).toEqual(pool2PrevToken2Balance.plus(newAmountIn))
          expect(pool2NewToken1Balance.lt(pool2PrevToken1Balance)).toBeTruthy()
          expect((pool1NewToken1Balance).gt(pool1PrevToken1Balance)).toBeTruthy()
          expect((pool1NewToken0Balance).lt(pool1PrevToken0Balance)).toBeTruthy()
          expect(ownerNewToken0Balance.gt(ownerPrevToken0Balance)).toBeTruthy()
          break;
      }
      break;
    }

    case 'SwapTokensForExactTokensTwice': {
      switch (direction) {
        case 'Token0ToToken2':
          expect(ownerNewToken0Balance.lt(ownerPrevToken0Balance)).toBeTruthy()
          expect(pool1NewToken0Balance.gt(pool1PrevToken0Balance)).toBeTruthy()
          expect(pool1NewToken1Balance.lt(pool1PrevToken1Balance)).toBeTruthy()
          expect(pool2NewToken1Balance.gt(pool2PrevToken1Balance)).toBeTruthy()
          expect(pool2NewToken2Balance).toEqual(pool2PrevToken2Balance.minus(newAmountOut))
          expect(ownerNewToken2Balance).toEqual(ownerPrevToken2Balance.plus(newAmountOut))
          break;

        case 'Token2ToToken0':
          expect(ownerNewToken2Balance.lt(ownerPrevToken2Balance)).toBeTruthy()
          expect(pool2NewToken2Balance.gt(pool2PrevToken2Balance)).toBeTruthy()
          expect(pool2NewToken1Balance.lt(pool2PrevToken1Balance)).toBeTruthy()
          expect(pool1NewToken1Balance.gt(pool1PrevToken1Balance)).toBeTruthy()
          expect(pool1NewToken0Balance).toEqual(pool1PrevToken0Balance.minus(newAmountOut))
          expect(ownerNewToken0Balance).toEqual(ownerPrevToken0Balance.plus(newAmountOut))
          break;
      }
      break;
    }
  }
}