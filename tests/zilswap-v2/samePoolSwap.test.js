const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract, nextBlock } = require('../../scripts/call.js')
const { getPoolContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');
const { param } = require("../../scripts/zilliqa");

let wZil, token0, token1, owner, feeAccount, tx, pool, router, prevPoolState, newPoolState, prevToken0State, prevToken1State, newToken0State, newToken1State
const init_liquidity = 15
let amountIn = 14.999_999_999_999
let amountInMax = 100
let amountOut = 10
let amountOutMin = 0

describe('Zilswap swap exact zrc2 for zrc2 (Non-amp pool)', () => {

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
    console.log("INITIAL POOL STATE: \n")
    console.log("reserve0: ",prevPoolState.reserve0)
    console.log("reserve1: ", prevPoolState.reserve1)
    console.log("vreserve0: ",prevPoolState.v_reserve0)
    console.log("vreserve1: ", prevPoolState.v_reserve1)
    for (let i = 0; i < 10; i++) {
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
      console.log("amount out for token1: ", amountOut)
      let poolState = await pool.getState()
      console.log("reserve0: ",poolState.reserve0)
      console.log("reserve1: ", poolState.reserve1)
      console.log("vreserve0: ",poolState.v_reserve0)
      console.log("vreserve1: ", poolState.v_reserve1)

      for (let i = 0; i < 30; i++) {
        await nextBlock()
      }

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
            "arguments": [`${token1.address.toLowerCase()}`, `${token0.address.toLowerCase()}`]
          })
        ],
        0, false, true
      )
      expect(tx.status).toEqual(2)
      amountOut = tx.receipt.event_logs[1].params[4].value
      console.log(tx.receipt.event_logs[1].params)
      console.log("amount out for token0: ", amountOut)
      poolState = await pool.getState()
      console.log("reserve0: ",poolState.reserve0)
      console.log("reserve1: ", poolState.reserve1)
      console.log("vreserve0: ",poolState.v_reserve0)
      console.log("vreserve1: ", poolState.v_reserve1)
    }
  })
})

// Helper functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

setup = async (isAmpPool) => {
  owner = getDefaultAccount()
  const codehash = await getPoolContractCodeHash(owner)
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
        value: `${pool.address.toLowerCase()}`,
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

  // // transfer token0 and token1 to user
  // const transferToken0Tx = await callContract(owner.key, token0, "Transfer", [
  //   param('to', 'ByStr20', userAddress),
  //   param('amount', 'Uint128', `${(new BigNumber(100)).shiftedBy(12).toString()}`)
  // ], 0 , false, false)
  // console.log('transfer token0 from owner to user', transferToken0Tx.id)

  // const transferToken1Tx = await callContract(owner.key, token1, "Transfer", [
  //   param('to', 'ByStr20', userAddress),
  //   param('amount', 'Uint128', `${(new BigNumber(100)).shiftedBy(12).toString()}`)
  // ], 0 , false, false)
  // console.log('transfer token1 from owner to user', transferToken1Tx.id)

  // // increase allowance of router for userAddress on token0 and token1
  // const increaseAllowanceToken0Tx = await callContract(userPrivateKey, token0, "IncreaseAllowance", [
  //   param('spender', 'ByStr20', router.address),
  //   param('amount', 'Uint128', `${(new BigNumber(100000000)).shiftedBy(12).toString()}`)
  // ], 0, false, false)
  // console.log('increase allowance of token0 on router', increaseAllowanceToken0Tx.id)

  // const increaseAllowanceToken1Tx = await callContract(userPrivateKey, token1, "IncreaseAllowance", [
  //   param('spender', 'ByStr20', router.address),
  //   param('amount', 'Uint128', `${(new BigNumber(100000000)).shiftedBy(12).toString()}`)
  // ], 0, false, false)
  // console.log('increase allowance of token0 on router', increaseAllowanceToken1Tx.id)
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
