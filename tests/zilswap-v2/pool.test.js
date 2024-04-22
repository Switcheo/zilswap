const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getContractCodeHash } = require('./helper.js');
const { default: BigNumber } = require('bignumber.js');
const { param } = require("../../scripts/zilliqa");
const { ZERO_ADDRESS } = require("../../scripts/utils");

let wZil, token0, token1, owner, feeAccount, tx, pool, prevPoolState, newPoolState, router, routerState, prevToken0State, prevToken1State
const BPS = 10000
const feeBps = 1000 // 10%
const minimumLiquidity = 1000
const amount0 = 100000
const amount1 = 100000
const token0AmtDesired = (new BigNumber(amount0)).shiftedBy(12)
const token1AmtDesired = (new BigNumber(amount1)).shiftedBy(12)
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");


beforeAll(async () => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0' }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1' }, router.address.toLowerCase(), null))[0]

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

  tx = await callContract(
    owner.key, wZil,
    'IncreaseAllowance',
    [
      param('spender', 'ByStr20', router.address.toLowerCase()),
      param('amount', 'Uint128', '100000000000000000000000000000000000000')
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)
})

describe('zilswap ampPool AddLiquidity, RemoveLiquidty', async () => {
  beforeAll(async () => {
    if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
    pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(true) }))[0]
    poolState = await pool.getState()

    tx = await callContract(owner.key, router, 'AddPool', [param('pool', 'ByStr20', pool.address.toLowerCase())], 0, false, false)
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    routerState = await router.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('zilswap ampPool addLiquidity to pool with no liquidity', async () => {
    tx = await callContract(
      owner.key, router,
      'AddLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('amountA_desired', 'Uint128', `${token0AmtDesired.toString()}`),
        param('amountB_desired', 'Uint128', `${token1AmtDesired.toString()}`),
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

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState(prevPoolState, routerState)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ["0x0000000000000000000000000000000000000000"]: `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.toString()}`,
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap ampPool addLiquidity to pool with existing liquidity', async () => {
    tx = await callContract(
      owner.key, router,
      'AddLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('amountA_desired', 'Uint128', `${token0AmtDesired.toString()}`),
        param('amountB_desired', 'Uint128', `${token1AmtDesired.toString()}`),
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

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState(prevPoolState, routerState)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ["0x0000000000000000000000000000000000000000"]: `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.plus(prevPoolState.balances[owner.address]).toString()}`,
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap ampPool Skim', async () => {
    tx = await callContract(
      owner.key, pool,
      'Skim',
      [
        param('to', 'ByStr20', `${owner.address.toLowerCase()}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool Sync', async () => {
    tx = await callContract(
      owner.key, pool,
      'Sync',
      [],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool removeLiquidity', async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${prevPoolState.balances[owner.address.toLowerCase()]}`)
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
        param('liquidity', 'Uint128', `${prevPoolState.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = await getRemoveLiquidityState(prevPoolState, routerState, prevToken0State, prevToken1State)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })
})

describe('zilswap non-amp pool AddLiquidity, RemoveLiquidty', async () => {
  beforeAll(async () => {
    if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
    pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(true) }))[0]
    poolState = await pool.getState()

    tx = await callContract(owner.key, router, 'AddPool', [param('pool', 'ByStr20', pool.address.toLowerCase())], 0, false, false)
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    routerState = await router.getState()
    prevToken0State = await token0.getState()
    prevToken1State = await token1.getState()
  })

  test('zilswap non-amp pool addLiquidity to pool with no liquidity', async () => {
    tx = await callContract(
      owner.key, router,
      'AddLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('amountA_desired', 'Uint128', `${token0AmtDesired.toString()}`),
        param('amountB_desired', 'Uint128', `${token1AmtDesired.toString()}`),
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

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState(prevPoolState, routerState)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ["0x0000000000000000000000000000000000000000"]: `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.toString()}`,
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap non-amp pool addLiquidity to pool with existing liquidity', async () => {
    tx = await callContract(
      owner.key, router,
      'AddLiquidity',
      [
        param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
        param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
        param('pool', 'ByStr20', `${pool.address.toLowerCase()}`),
        param('amountA_desired', 'Uint128', `${token0AmtDesired.toString()}`),
        param('amountB_desired', 'Uint128', `${token1AmtDesired.toString()}`),
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

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityState(prevPoolState, routerState)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ["0x0000000000000000000000000000000000000000"]: `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.plus(prevPoolState.balances[owner.address]).toString()}`,
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap non-amp pool Skim', async () => {
    tx = await callContract(
      owner.key, pool,
      'Skim',
      [
        param('to', 'ByStr20', `${owner.address.toLowerCase()}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap non-amp pool Sync', async () => {
    tx = await callContract(
      owner.key, pool,
      'Sync',
      [],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool removeLiquidity', async () => {
    // Increase Allowance for LP Token (to transfer LP token to Pool)
    tx = await callContract(
      owner.key, pool,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', `${prevPoolState.balances[owner.address.toLowerCase()]}`)
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
        param('liquidity', 'Uint128', `${prevPoolState.balances[owner.address.toLowerCase()]}`),
        param('amountA_min', 'Uint128', '0'),
        param('amountB_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = await getRemoveLiquidityState(prevPoolState, routerState, prevToken0State, prevToken1State)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })
})

describe('zilswap ampPool AddLiquidityZIL, RemoveLiquidtyZIL', async () => {
  beforeAll(async () => {
    token = token1
    if (parseInt(token.address, 16) > parseInt(wZil.address, 16)) {
      pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0: wZil, token1: token, init_amp_bps: getAmpBps(true) }))[0]
    }
    else {
      pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token, token1: wZil, init_amp_bps: getAmpBps(true) }))[0]
    }

    tx = await callContract(owner.key, router, 'AddPool', [param('pool', 'ByStr20', pool.address.toLowerCase())], 0, false, false)
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    routerState = await router.getState()
    if (parseInt(token.address, 16) > parseInt(wZil.address, 16)) {
      prevToken0State = await wZil.getState()
      prevToken1State = await token1.getState()
    }
    else {
      prevToken0State = await token1.getState()
      prevToken1State = await wZil.getState()
    }
  })

  test('zilswap ampPool addLiquidityZIL to pool with no liquidity', async () => {
    const zilAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? amount0 : amount1
    const tokenAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? token1AmtDesired : token0AmtDesired

    tx = await callContract(
      owner.key, router,
      'AddLiquidityZIL',
      [
        param('token', 'ByStr20', token.address.toLowerCase()),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('amount_token_desired', 'Uint128', `${tokenAmtDesired}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
        param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
        })
      ],
      zilAmtDesired, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityZILState(prevPoolState, routerState, token.address.toLowerCase(), wZil.address.toLowerCase(), tokenAmtDesired, new BigNumber(zilAmtDesired).shiftedBy(12))
    expect(newPoolState).toEqual(expect.objectContaining({
      "reserve0": `${newReserve0.toString()}`,
      "reserve1": `${newReserve1.toString()}`,
      "v_reserve0": `${newVReserve0.toString()}`,
      "v_reserve1": `${newVReserve1.toString()}`,
      "k_last": `${newKLast.toString(10)}`,
      "balances": {
        "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.toString()}`,
      },
      "total_supply": `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap ampPool addLiquidityZIL to pool with existing liquidity', async () => {
    const zilAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? amount0 : amount1
    const tokenAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? token1AmtDesired : token0AmtDesired

    tx = await callContract(
      owner.key, router,
      'AddLiquidityZIL',
      [
        param('token', 'ByStr20', token.address.toLowerCase()),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('amount_token_desired', 'Uint128', `${tokenAmtDesired}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
        param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
        })
      ],
      zilAmtDesired, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityZILState(prevPoolState, routerState, token.address.toLowerCase(), wZil.address.toLowerCase(), tokenAmtDesired, new BigNumber(zilAmtDesired).shiftedBy(12))
    expect(newPoolState).toEqual(expect.objectContaining({
      "reserve0": `${newReserve0.toString()}`,
      "reserve1": `${newReserve1.toString()}`,
      "v_reserve0": `${newVReserve0.toString()}`,
      "v_reserve1": `${newVReserve1.toString()}`,
      "k_last": `${newKLast.toString(10)}`,
      "balances": {
        "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.plus(prevPoolState.balances[owner.address]).toString()}`,
      },
      "total_supply": `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap ampPool Skim', async () => {
    tx = await callContract(
      owner.key, pool,
      'Skim',
      [
        param('to', 'ByStr20', `${owner.address.toLowerCase()}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool Sync', async () => {
    tx = await callContract(
      owner.key, pool,
      'Sync',
      [],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap ampPool removeLiquidityZIL', async () => {
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

    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token.address.toLowerCase()),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = await getRemoveLiquidityZILState(prevPoolState, routerState, prevToken0State, prevToken1State)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })
})


describe('zilswap non-amp pool AddLiquidityZIL, RemoveLiquidtyZIL', async () => {
  beforeAll(async () => {
    token = token1
    if (parseInt(token.address, 16) > parseInt(wZil.address, 16)) {
      pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0: wZil, token1: token, init_amp_bps: getAmpBps(false) }))[0]
    }
    else {
      pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0: token, token1: wZil, init_amp_bps: getAmpBps(false) }))[0]
    }

    tx = await callContract(owner.key, router, 'AddPool', [param('pool', 'ByStr20', pool.address.toLowerCase())], 0, false, false)
    expect(tx.status).toEqual(2)
  })

  beforeEach(async () => {
    prevPoolState = await pool.getState()
    routerState = await router.getState()
    if (parseInt(token.address, 16) > parseInt(wZil.address, 16)) {
      prevToken0State = await wZil.getState()
      prevToken1State = await token1.getState()
    }
    else {
      prevToken0State = await token1.getState()
      prevToken1State = await wZil.getState()
    }
  })

  test('zilswap non-amp pool addLiquidityZIL to pool with no liquidity', async () => {
    const zilAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? amount0 : amount1
    const tokenAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? token1AmtDesired : token0AmtDesired

    tx = await callContract(
      owner.key, router,
      'AddLiquidityZIL',
      [
        param('token', 'ByStr20', token.address.toLowerCase()),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('amount_token_desired', 'Uint128', `${tokenAmtDesired}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
        param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
        })
      ],
      zilAmtDesired, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityZILState(prevPoolState, routerState, token.address.toLowerCase(), wZil.address.toLowerCase(), tokenAmtDesired, new BigNumber(zilAmtDesired).shiftedBy(12))
    expect(newPoolState).toEqual(expect.objectContaining({
      "reserve0": `${newReserve0.toString()}`,
      "reserve1": `${newReserve1.toString()}`,
      "v_reserve0": `${newVReserve0.toString()}`,
      "v_reserve1": `${newVReserve1.toString()}`,
      "k_last": `${newKLast.toString(10)}`,
      "balances": {
        "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.toString()}`,
      },
      "total_supply": `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap non-amp pool addLiquidityZIL to pool with existing liquidity', async () => {
    const zilAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? amount0 : amount1
    const tokenAmtDesired = (parseInt(token.address, 16) > parseInt(wZil.address, 16)) ? token1AmtDesired : token0AmtDesired

    tx = await callContract(
      owner.key, router,
      'AddLiquidityZIL',
      [
        param('token', 'ByStr20', token.address.toLowerCase()),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('amount_token_desired', 'Uint128', `${tokenAmtDesired}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
        param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
          "constructor": "Pair",
          "argtypes": ["Uint256", "Uint256"],
          "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
        })
      ],
      zilAmtDesired, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = getAddLiquidityZILState(prevPoolState, routerState, token.address.toLowerCase(), wZil.address.toLowerCase(), tokenAmtDesired, new BigNumber(zilAmtDesired).shiftedBy(12))
    expect(newPoolState).toEqual(expect.objectContaining({
      "reserve0": `${newReserve0.toString()}`,
      "reserve1": `${newReserve1.toString()}`,
      "v_reserve0": `${newVReserve0.toString()}`,
      "v_reserve1": `${newVReserve1.toString()}`,
      "k_last": `${newKLast.toString(10)}`,
      "balances": {
        "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
        [`${owner.address}`]: `${liquidity.plus(prevPoolState.balances[owner.address]).toString()}`,
      },
      "total_supply": `${newTotalSupply.toString()}`
    }))
  })

  test('zilswap non-amp pool Skim', async () => {
    tx = await callContract(
      owner.key, pool,
      'Skim',
      [
        param('to', 'ByStr20', `${owner.address.toLowerCase()}`)
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap non-amp pool Sync', async () => {
    tx = await callContract(
      owner.key, pool,
      'Sync',
      [],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    // Should not have any change to state
    newPoolState = await pool.getState()
    expect(newPoolState).toEqual(prevPoolState)
  })

  test('zilswap non-amp pool removeLiquidityZIL', async () => {
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

    tx = await callContract(
      owner.key, router,
      'RemoveLiquidityZIL',
      [
        param('token', 'ByStr20', token.address.toLowerCase()),
        param('pool', 'ByStr20', pool.address.toLowerCase()),
        param('liquidity', 'Uint128', `${newPoolState.balances[owner.address.toLowerCase()]}`),
        param('amount_token_min', 'Uint128', '0'),
        param('amount_wZIL_min', 'Uint128', '0'),
      ],
      0, false, true
    )
    expect(tx.status).toEqual(2)

    newPoolState = await pool.getState()
    const { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply } = await getRemoveLiquidityZILState(prevPoolState, routerState, prevToken0State, prevToken1State)
    expect(newPoolState).toEqual(expect.objectContaining({
      reserve0: `${newReserve0.toString()}`,
      reserve1: `${newReserve1.toString()}`,
      v_reserve0: `${newVReserve0.toString()}`,
      v_reserve1: `${newVReserve1.toString()}`,
      k_last: `${newKLast.toString(10)}`,
      balances: {
        ['0x0000000000000000000000000000000000000000']: `${minimumLiquidity}`,
        [`${owner.address}`]: '0',
        [`${pool.address.toLowerCase(0)}`]: '0'
      },
      total_supply: `${newTotalSupply.toString()}`
    }))
  })
})

// Helper Functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
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

getMintFee = (feeOn, isAmpPool, reserve0, reserve1, vReserve0, vReserve1, kLast, totalSupply) => {
  if (!feeOn) {
    return new BigNumber(0)
  }

  const r0 = isAmpPool ? vReserve0 : reserve0
  const r1 = isAmpPool ? vReserve1 : reserve1
  const tmp = kLast.multipliedBy(r0)

  let collectedFee;
  if ((tmp.dividedToIntegerBy(r0)).isEqualTo(kLast)) {
    const a = tmp.dividedToIntegerBy(r1)
    const sqrt = a.sqrt()
    collectedFee = r0.minus(sqrt)
  }
  else {
    const a = kLast.dividedToIntegerBy(r1).multipliedBy(r0)
    const sqrt = a.sqrt()
    collectedFee = r0.minus(sqrt)
  }
  const poolValueInToken0 = reserve0.plus(frac(reserve1, r0, r1))
  const numerator = totalSupply.multipliedBy(collectedFee).multipliedBy(feeBps)
  const denominator = (poolValueInToken0.minus(collectedFee)).multipliedBy(5000)
  const liquidity = numerator.dividedToIntegerBy(denominator)

  if (liquidity.gt(0)) {
    return liquidity
  } else {
    return new BigNumber(0)
  }
}

getAddLiquidityState = (prevPoolState, routerState) => {
  let liquidity, newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast;

  const oldReserve0 = new BigNumber(prevPoolState.reserve0)
  const oldReserve1 = new BigNumber(prevPoolState.reserve1)
  const oldVReserve0 = new BigNumber(prevPoolState.v_reserve0)
  const oldVReserve1 = new BigNumber(prevPoolState.v_reserve1)
  const ampBps = new BigNumber(prevPoolState.amp_bps)
  const oldTotalSupply = new BigNumber(prevPoolState.total_supply)
  const oldKLast = new BigNumber(prevPoolState.k_last)

  const feeOn = !(routerState.fee_configuration === ZERO_ADDRESS)
  const isAmpPool = !(ampBps.isEqualTo(BPS))

  let amount0, amount1;
  // AddLiquidity
  if (oldReserve0.isZero() && oldReserve1.isZero()) {
    amount0 = token0AmtDesired
    amount1 = token1AmtDesired
    newReserve0 = oldReserve0.plus(amount0)
    newReserve1 = oldReserve1.plus(amount1)
  }
  else {
    const token1AmtOptimal = quote(token0AmtDesired, oldReserve0, oldReserve1)
    if (token1AmtOptimal.lte(token1AmtDesired)) {
      amount0 = token0AmtDesired
      amount1 = token1AmtOptimal
      newReserve0 = oldReserve0.plus(amount0)
      newReserve1 = oldReserve1.plus(amount1)
    } else {
      const token0AmtOptimal = quote(token1AmtDesired, oldReserve1, oldReserve0)
      amount0 = token0AmtOptimal
      amount1 = token1AmtDesired
      newReserve0 = oldReserve0.plus(amount0)
      newReserve1 = oldReserve1.plus(amount1)
    }
  }

  // Mint
  const fee = getMintFee(feeOn, isAmpPool, oldReserve0, oldReserve1, oldVReserve0, oldVReserve1, oldKLast, oldTotalSupply)

  let intermediateTotalSupply = oldTotalSupply.plus(fee)

  if (intermediateTotalSupply.isZero()) {
    // New pool
    if (isAmpPool) {
      newVReserve0 = frac(newReserve0, ampBps, BPS)
      newVReserve1 = frac(newReserve1, ampBps, BPS)
    }
    else {
      newVReserve0 = new BigNumber(0)
      newVReserve1 = new BigNumber(0)
    }
    liquidity = ((amount0.multipliedBy(amount1)).sqrt().dp(0)).minus(minimumLiquidity)
    intermediateTotalSupply = intermediateTotalSupply.plus(minimumLiquidity)
  }
  else {
    // Existing pool
    const a = frac(amount0, intermediateTotalSupply, oldReserve0)
    const b = frac(amount1, intermediateTotalSupply, oldReserve1)
    liquidity = BigNumber.min(a, b)

    if (isAmpPool) {
      const ls = liquidity.plus(intermediateTotalSupply)
      newVReserve0 = BigNumber.max(frac(oldVReserve0, ls, intermediateTotalSupply), newReserve0)
      newVReserve1 = BigNumber.max(frac(oldVReserve1, ls, intermediateTotalSupply), newReserve1)
    }
    else {
      newVReserve0 = new BigNumber(0)
      newVReserve1 = new BigNumber(0)
    }
  }

  const newTotalSupply = intermediateTotalSupply.plus(liquidity)
  if (feeOn) {
    newKLast = updateLastK(isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1)
  }

  // console.log({ newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply })
  return { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply }
}

getAddLiquidityZILState = (prevPoolState, routerState, tokenAddress, wZilAddress, tokenAmtDesired, zilAmtDesired) => {
  let liquidity, newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast;

  const oldReserve0 = new BigNumber(prevPoolState.reserve0)
  const oldReserve1 = new BigNumber(prevPoolState.reserve1)
  const oldVReserve0 = new BigNumber(prevPoolState.v_reserve0)
  const oldVReserve1 = new BigNumber(prevPoolState.v_reserve1)
  const ampBps = new BigNumber(prevPoolState.amp_bps)
  const oldTotalSupply = new BigNumber(prevPoolState.total_supply)
  const oldKLast = new BigNumber(prevPoolState.k_last)

  const feeOn = !(routerState.fee_configuration === ZERO_ADDRESS)
  const isAmpPool = !(ampBps.isEqualTo(BPS))

  let tokenAmt, zilAmt;
  // AddLiquidity
  if (oldReserve0.isZero() && oldReserve1.isZero()) {
    tokenAmt = tokenAmtDesired
    zilAmt = zilAmtDesired

  }
  else {
    const zilAtOptimal = quote(tokenAmtDesired, oldReserve0, oldReserve1)
    if (zilAtOptimal.lte(zilAmtDesired)) {
      tokenAmt = tokenAmtDesired
      zilAmt = zilAtOptimal
    } else {
      const tokenAmtOptimal = quote(zilAmtDesired, oldReserve1, oldReserve0)
      tokenAmt = tokenAmtOptimal
      zilAmt = zilAmtDesired
    }
  }

  newReserve0 = (parseInt(tokenAddress, 16) > parseInt(wZilAddress, 16)) ? oldReserve0.plus(zilAmt) : oldReserve0.plus(tokenAmt)
  newReserve1 = (parseInt(tokenAddress, 16) > parseInt(wZilAddress, 16)) ? oldReserve1.plus(tokenAmt) : oldReserve1.plus(zilAmt)

  const amount0 = newReserve0.minus(oldReserve0)
  const amount1 = newReserve1.minus(oldReserve1)

  // Mint
  const fee = getMintFee(feeOn, isAmpPool, oldReserve0, oldReserve1, oldVReserve0, oldVReserve1, oldKLast, oldTotalSupply)

  let intermediateTotalSupply = oldTotalSupply.plus(fee)

  if (intermediateTotalSupply.isZero()) {
    // New pool
    if (isAmpPool) {
      newVReserve0 = frac(newReserve0, ampBps, BPS)
      newVReserve1 = frac(newReserve1, ampBps, BPS)
    }
    else {
      newVReserve0 = new BigNumber(0)
      newVReserve1 = new BigNumber(0)
    }
    liquidity = ((amount0.multipliedBy(amount1)).sqrt().dp(0)).minus(minimumLiquidity)
    intermediateTotalSupply = intermediateTotalSupply.plus(minimumLiquidity)
  }
  else {
    // Existing pool
    const a = frac(amount0, intermediateTotalSupply, oldReserve0)
    const b = frac(amount1, intermediateTotalSupply, oldReserve1)
    liquidity = BigNumber.min(a, b)

    if (isAmpPool) {
      const ls = liquidity.plus(intermediateTotalSupply)
      newVReserve0 = BigNumber.max(frac(oldVReserve0, ls, intermediateTotalSupply), newReserve0)
      newVReserve1 = BigNumber.max(frac(oldVReserve1, ls, intermediateTotalSupply), newReserve1)
    }
    else {
      newVReserve0 = new BigNumber(0)
      newVReserve1 = new BigNumber(0)
    }
  }

  const newTotalSupply = intermediateTotalSupply.plus(liquidity)
  if (feeOn) {
    newKLast = updateLastK(isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1)
  }

  // console.log({ newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply })
  return { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply }
}

getRemoveLiquidityState = async (prevPoolState, routerState, prevToken0State, prevToken1State) => {
  let liquidity, newVReserve0, newVReserve1, newKLast;

  const oldReserve0 = new BigNumber(prevPoolState.reserve0)
  const oldReserve1 = new BigNumber(prevPoolState.reserve1)
  const oldVReserve0 = new BigNumber(prevPoolState.v_reserve0)
  const oldVReserve1 = new BigNumber(prevPoolState.v_reserve1)
  const ampBps = new BigNumber(prevPoolState.amp_bps)
  const oldTotalSupply = new BigNumber(prevPoolState.total_supply)
  const oldKLast = new BigNumber(prevPoolState.k_last)

  const feeOn = !(routerState.fee_configuration === ZERO_ADDRESS)
  const isAmpPool = !(ampBps.isEqualTo(BPS))

  // User's liquidity
  liquidity = prevPoolState.balances[owner.address.toLowerCase()]

  // Mint
  const fee = getMintFee(feeOn, isAmpPool, oldReserve0, oldReserve1, oldVReserve0, oldVReserve1, oldKLast, oldTotalSupply)

  let intermediateTotalSupply = oldTotalSupply.plus(fee)

  let balance0 = prevToken0State.balances[pool.address.toLowerCase()]
  let balance1 = prevToken1State.balances[pool.address.toLowerCase()]

  const amount0 = frac(liquidity, balance0, intermediateTotalSupply)
  const amount1 = frac(liquidity, balance1, intermediateTotalSupply)

  const newTotalSupply = intermediateTotalSupply.minus(liquidity)

  const newReserve0 = oldReserve0.minus(amount0)
  const newReserve1 = oldReserve1.minus(amount1)

  if (isAmpPool) {
    const b = BigNumber.min(frac(newReserve0, intermediateTotalSupply, oldReserve0), frac(newReserve1, intermediateTotalSupply, oldReserve1))
    newVReserve0 = BigNumber.max(frac(oldVReserve0, b, intermediateTotalSupply), newReserve0)
    newVReserve1 = BigNumber.max(frac(oldVReserve1, b, intermediateTotalSupply), newReserve1)
  } else {
    newVReserve0 = new BigNumber(0)
    newVReserve1 = new BigNumber(0)
  }

  if (feeOn) {
    newKLast = updateLastK(isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1)
  }

  // console.log({ newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply })
  return { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply }
}

getRemoveLiquidityZILState = async (prevPoolState, routerState, prevToken0State, prevToken1State) => {
  let liquidity, newVReserve0, newVReserve1, newKLast;

  const oldReserve0 = new BigNumber(prevPoolState.reserve0)
  const oldReserve1 = new BigNumber(prevPoolState.reserve1)
  const oldVReserve0 = new BigNumber(prevPoolState.v_reserve0)
  const oldVReserve1 = new BigNumber(prevPoolState.v_reserve1)
  const ampBps = new BigNumber(prevPoolState.amp_bps)
  const oldTotalSupply = new BigNumber(prevPoolState.total_supply)
  const oldKLast = new BigNumber(prevPoolState.k_last)

  const feeOn = !(routerState.fee_configuration === ZERO_ADDRESS)
  const isAmpPool = !(ampBps.isEqualTo(BPS))

  // User's liquidity
  liquidity = prevPoolState.balances[owner.address.toLowerCase()]

  // Mint
  const fee = getMintFee(feeOn, isAmpPool, oldReserve0, oldReserve1, oldVReserve0, oldVReserve1, oldKLast, oldTotalSupply)

  let intermediateTotalSupply = oldTotalSupply.plus(fee)

  let balance0 = prevToken0State.balances[pool.address.toLowerCase()]
  let balance1 = prevToken1State.balances[pool.address.toLowerCase()]

  const amount0 = frac(liquidity, balance0, intermediateTotalSupply)
  const amount1 = frac(liquidity, balance1, intermediateTotalSupply)

  const newTotalSupply = intermediateTotalSupply.minus(liquidity)

  const newReserve0 = oldReserve0.minus(amount0)
  const newReserve1 = oldReserve1.minus(amount1)

  if (isAmpPool) {
    const b = BigNumber.min(frac(newReserve0, intermediateTotalSupply, oldReserve0), frac(newReserve1, intermediateTotalSupply, oldReserve1))
    newVReserve0 = BigNumber.max(frac(oldVReserve0, b, intermediateTotalSupply), newReserve0)
    newVReserve1 = BigNumber.max(frac(oldVReserve1, b, intermediateTotalSupply), newReserve1)
  } else {
    newVReserve0 = new BigNumber(0)
    newVReserve1 = new BigNumber(0)
  }

  if (feeOn) {
    newKLast = updateLastK(isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1)
  }

  // console.log({ newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply })
  return { newReserve0, newReserve1, newVReserve0, newVReserve1, newKLast, fee, liquidity, newTotalSupply }
}

updateLastK = (isAmpPool, newReserve0, newReserve1, newVReserve0, newVReserve1) => {
  if (isAmpPool) {
    return newVReserve0.multipliedBy(newVReserve1)
  } else {
    return newReserve0.multipliedBy(newReserve1)
  }
}

// return (x*y)/z
frac = (x, y, z) => {
  return new BigNumber(x).multipliedBy(y).dividedToIntegerBy(z)
}

quote = (amountA, reserveA, reserveB) => {
  return new BigNumber(amountA).multipliedBy(reserveB).dividedToIntegerBy(reserveA)
}