const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');
const { param } = require("../../scripts/zilliqa");

let wZil, token0, token1, owner, feeAccount, tx, pool, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State
const init_liquidity = 100
let amountIn = 10
let amountInMax = 1000
let amountOut = 10
let amountOutMin = 1
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

describe('Zilswap swap exact zrc2 for zrc2 (Non-amp pool)', () => {

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

    // RemoveLiquidity
    tx = await callContract(
      owner.key, router,
      'RemoveLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
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
    // 3 isolated swap tests

    tx = await callContract(
      owner.key, router,
      'SwapExactTokensForTokensOnce',
      [
        param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
        param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
        })
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)
    let amountOut = tx.receipt.event_logs[1].params[5].value
    console.log(tx.receipt.event_logs[1].params)
    console.log(amountOut)

    // tx = await callContract(
    //   owner.key, router,
    //   'SwapExactTokensForTokensOnce',
    //   [
    //     param('amount_in', 'Uint128', amountOut),
    //     param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
    //     param('pool', 'ByStr20', pool.address.toLowerCase()),
    //     param('path', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
    //     })
    //   ],
    //   0, false, true
    // )
    // expect(tx.status).toEqual(2)
    // amountOut = tx.receipt.event_logs[1].params[4].value
    // console.log(tx.receipt.event_logs[1].params)
    // console.log(amountOut)

    // tx = await callContract(
    //   owner.key, router,
    //   'SwapExactTokensForTokensOnce',
    //   [
    //     param('amount_in', 'Uint128', amountOut),
    //     param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
    //     param('pool', 'ByStr20', pool.address.toLowerCase()),
    //     param('path', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
    //     })
    //   ],
    //   0, false, true
    // )
    // expect(tx.status).toEqual(2)

    // 2 double double swap test

    // tx = await callContract(
    //   owner.key, router,
    //   'SwapExactTokensForTokensTwice',
    //   [
    //     param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
    //     param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
    //     param('pool1', 'ByStr20', pool.address.toLowerCase()),
    //     param('pool2', 'ByStr20', pool.address.toLowerCase()),
    //     param('path1', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
    //     }),
    //     param('path2', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
    //     })
    //   ],
    //   0, false, true
    // )
    // expect(tx.status).toEqual(2)
    // let amountOut = tx.receipt.event_logs[5].params[4].value
    // console.log(amountOut)

    // tx = await callContract(
    //   owner.key, router,
    //   'SwapExactTokensForTokensTwice',
    //   [
    //     param('amount_in', 'Uint128', amountOut),
    //     param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
    //     param('pool1', 'ByStr20', pool.address.toLowerCase()),
    //     param('pool2', 'ByStr20', pool.address.toLowerCase()),
    //     param('path1', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
    //     }),
    //     param('path2', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
    //     })
    //   ],
    //   0, false, true
    // )
    // expect(tx.status).toEqual(2)

    // 1 single triple swap test

    // tx = await callContract(
    //   owner.key, router,
    //   'SwapExactTokensForTokensThrice',
    //   [
    //     param('amount_in', 'Uint128', `${(new BigNumber(amountIn)).shiftedBy(12)}`),
    //     param('amount_out_min', 'Uint128', `${(new BigNumber(amountOutMin)).shiftedBy(12)}`),
    //     param('pool1', 'ByStr20', pool.address.toLowerCase()),
    //     param('pool2', 'ByStr20', pool.address.toLowerCase()),
    //     param('pool3', 'ByStr20', pool.address.toLowerCase()),
    //     param('path1', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
    //     }),
    //     param('path2', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
    //     }),
    //     param('path3', 'Pair (ByStr20) (ByStr20)', {
    //       "constructor": "Pair",
    //       "argtypes": ["ByStr20", "ByStr20"],
    //       "arguments": [`${token0.address.toLowerCase()}`, `${token1.address.toLowerCase()}`]
    //     })
    //   ],
    //   0, false, true
    // )
    // expect(tx.status).toEqual(2)
  })
})

// Helper functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

setup = async (isAmpPool) => {
  owner = getDefaultAccount()
  feeAccount = process.env.FEE_ADDRESS
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0', decimals: 12 }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1', decimals: 12 }, router.address.toLowerCase(), null))[0]

  tx = await callContract(
    owner.key, router,
    'SetFeeConfiguration',
    [
      param('config', 'Pair ByStr20 Uint128', {
        "constructor": "Pair",
        "argtypes": ["ByStr20", "Uint128"],
        "arguments": [`${feeAccount}`, "1000"] // 10%
      })
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0]
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(isAmpPool) }))[0]

  // Add Pool
  tx = await callContract(owner.key, router, 'AddPool', [param('pool', 'ByStr20', pool.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)

  // Add Liquidity
  tx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
      param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
      param('amountA_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountB_desired', 'Uint128', `${(new BigNumber(init_liquidity)).shiftedBy(12).toString()}`),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
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
