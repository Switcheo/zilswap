const { BigNumber } = require('bignumber.js')
const { createRandomAccount } = require('../../scripts/account.js');
const { callContract, getBalance, getContract } = require('../../scripts/call.js')
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployWrappedZIL } = require('../../scripts/deploy.js');
const { getContractCodeHash } = require('./helper.js');
const { param } = require("../../scripts/zilliqa");

const NUM_ACTIONS = 22
const NUM_ACCOUNTS = 3

const TOKEN_0_DECIMALS = 12
const TOKEN_1_DECIMALS = 12
const TOKEN_2_DECIMALS = 12
const WZIL_DECIMALS = 12

// Used to add liquidity and determine how much tokens each account possesses
const ZIL_INIT_RANGE = [5000000, 10000000]
const WZIL_INIT_RANGE = [5000000, 10000000]
const TOKEN_0_INIT_RANGE = [5000000, 10000000]
const TOKEN_1_INIT_RANGE = [1000000, 5000000]
const TOKEN_2_INIT_RANGE = [500000, 1000000]

const TRADE_RANGE = [1, 5] // max 5%, if not insufficient tokens in account for all transitions
const ADD_LIQ_RANGE = [1, 5]
const REM_LIQ_RANGE = [1, 5]
const ACTIONS =
  [
    'AddLiquidity', 'RemoveLiquidity',
    'AddLiquidityZIL', 'RemoveLiquidityZIL',
    'SwapExactTokensForZILOnce', 'SwapExactTokensForZILTwice', 'SwapExactTokensForZILThrice',
    'SwapExactZILForTokensOnce', 'SwapExactZILForTokensTwice', 'SwapExactZILForTokensThrice',
    'SwapTokensForExactZILOnce', 'SwapTokensForExactZILTwice', 'SwapTokensForExactZILThrice',
    'SwapZILForExactTokensOnce', 'SwapZILForExactTokensTwice', 'SwapZILForExactTokensThrice',
    'SwapExactTokensForTokensOnce', 'SwapExactTokensForTokensTwice', 'SwapExactTokensForTokensThrice',
    'SwapTokensForExactTokensOnce', 'SwapTokensForExactTokensTwice', 'SwapTokensForExactTokensThrice'
  ]

const INIT_AMP_BPS_RANGE = [10000, 20000]

const accounts = []
let key, feeAccount, tx, args, router, token0, token1, token2, wZil, zrc2Pool1, zrc2Pool2, zrc2Pool3, zilPool1, zilPool2, zilPool3
let pools, zrc2Tokens, tokenPools

beforeAll(async () => {
  const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");
  key = process.env.PRIVATE_KEY
  feeAccount = await createRandomAccount(key)

  wZil = (await deployWrappedZIL(key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: WZIL_DECIMALS, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]

  token0 = (await useFungibleToken(key, { symbol: 'TKN0', decimals: TOKEN_0_DECIMALS }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(key, { symbol: 'TKN1', decimals: TOKEN_1_DECIMALS }, router.address.toLowerCase(), null))[0]
  token2 = (await useFungibleToken(key, { symbol: 'TKN2', decimals: TOKEN_2_DECIMALS }, router.address.toLowerCase(), null))[0]

  zrc2Tokens = [token0.address.toLowerCase(), token1.address.toLowerCase(), token2.address.toLowerCase(), wZil.address.toLowerCase()]

  // Ordering the swaps such that the token addresses are in ascending order
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1, token2] = [token1, token0, token2]
  if (parseInt(token1.address, 16) > parseInt(token2.address, 16)) [token0, token1, token2] = [token0, token2, token1]
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1, token2] = [token1, token0, token2]

  // Increase Allowance of router on wZIL contract
  tx = await callContract(
    key, wZil,
    'IncreaseAllowance',
    [
      param('spender', 'ByStr20', router.address.toLowerCase()),
      param('amount', 'Uint128', '100000000000000000000000000000000000000')
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    key, router,
    'SetFeeConfiguration',
    [
      param('config', 'Pair ByStr20 Uint128', {
        "constructor": "Pair",
        "argtypes": ["ByStr20", "Uint128"],
        "arguments": [`${feeAccount.address}`, `${getRandomInt([0, 10000])}`]
      })
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  // token0-token1
  zrc2Pool1 = (await deployZilswapV2Pool(key, { factory: router, token0, token1, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]

  // token1-token2
  zrc2Pool2 = (await deployZilswapV2Pool(key, { factory: router, token0: token1, token1: token2, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]

  // token0-token2
  zrc2Pool3 = (await deployZilswapV2Pool(key, { factory: router, token0: token0, token1: token2, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]

  // token0-wZil
  if (parseInt(token0.address, 16) > parseInt(wZil.address, 16)) {
    zilPool1 = (await deployZilswapV2Pool(key, { factory: router, token0, token1: wZil, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]
  }
  else {
    zilPool1 = (await deployZilswapV2Pool(key, { factory: router, token0: wZil, token1: token0, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]
  }

  // token1-wZil
  if (parseInt(token1.address, 16) > parseInt(wZil.address, 16)) {
    zilPool2 = (await deployZilswapV2Pool(key, { factory: router, token0: wZil, token1, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]
  }
  else {
    zilPool2 = (await deployZilswapV2Pool(key, { factory: router, token0: token1, token1: wZil, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]
  }

  // token2-wZil
  if (parseInt(token2.address, 16) > parseInt(wZil.address, 16)) {
    zilPool3 = (await deployZilswapV2Pool(key, { factory: router, token0: wZil, token1: token2, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]
  }
  else {
    zilPool3 = (await deployZilswapV2Pool(key, { factory: router, token0: token2, token1: wZil, init_amp_bps: `${getRandomInt(INIT_AMP_BPS_RANGE)}` }))[0]
  }

  // Add pools to router
  tx = await callContract(key, router, 'AddPool', [param('pool', 'ByStr20', zrc2Pool1.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)
  tx = await callContract(key, router, 'AddPool', [param('pool', 'ByStr20', zrc2Pool2.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)
  tx = await callContract(key, router, 'AddPool', [param('pool', 'ByStr20', zrc2Pool3.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)
  tx = await callContract(key, router, 'AddPool', [param('pool', 'ByStr20', zilPool1.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)
  tx = await callContract(key, router, 'AddPool', [param('pool', 'ByStr20', zilPool2.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)
  tx = await callContract(key, router, 'AddPool', [param('pool', 'ByStr20', zilPool3.address.toLowerCase())], 0, false, false)
  expect(tx.status).toEqual(2)

  const zilAmount = getRandomInt(ZIL_INIT_RANGE)
  const token0Amount = new BigNumber(getRandomInt(TOKEN_0_INIT_RANGE)).shiftedBy(TOKEN_0_DECIMALS)
  const token1Amount = new BigNumber(getRandomInt(TOKEN_1_INIT_RANGE)).shiftedBy(TOKEN_1_DECIMALS)
  const token2Amount = new BigNumber(getRandomInt(TOKEN_2_INIT_RANGE)).shiftedBy(TOKEN_2_DECIMALS)

  tx = await callContract(
    key, router,
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
      param('tokenB', 'ByStr20', `${token1.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${zrc2Pool1.address.toLowerCase()}`),
      param('amountA_desired', 'Uint128', token0Amount),
      param('amountB_desired', 'Uint128', token1Amount),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(zrc2Pool1)).vReserveMin}`, `${(await getVReserveBound(zrc2Pool1)).vReserveMax}`]
      })
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    key, router,
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', `${token1.address.toLowerCase()}`),
      param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${zrc2Pool2.address.toLowerCase()}`),
      param('amountA_desired', 'Uint128', token1Amount),
      param('amountB_desired', 'Uint128', token2Amount),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(zrc2Pool2)).vReserveMin}`, `${(await getVReserveBound(zrc2Pool2)).vReserveMax}`]
      })
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    key, router,
    'AddLiquidity',
    [
      param('tokenA', 'ByStr20', `${token0.address.toLowerCase()}`),
      param('tokenB', 'ByStr20', `${token2.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${zrc2Pool3.address.toLowerCase()}`),
      param('amountA_desired', 'Uint128', token0Amount),
      param('amountB_desired', 'Uint128', token2Amount),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(zrc2Pool3)).vReserveMin}`, `${(await getVReserveBound(zrc2Pool3)).vReserveMax}`]
      })
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    key, router,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', `${token0.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${zilPool1.address.toLowerCase()}`),
      param('amount_token_desired', 'Uint128', token0Amount),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(zilPool1)).vReserveMin}`, `${(await getVReserveBound(zilPool1)).vReserveMax}`]
      })
    ],
    zilAmount, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    key, router,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', `${token1.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${zilPool2.address.toLowerCase()}`),
      param('amount_token_desired', 'Uint128', token1Amount),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(zilPool2)).vReserveMin}`, `${(await getVReserveBound(zilPool2)).vReserveMax}`]
      })
    ],
    zilAmount, false, true
  )
  expect(tx.status).toEqual(2)

  tx = await callContract(
    key, router,
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', `${token2.address.toLowerCase()}`),
      param('pool', 'ByStr20', `${zilPool3.address.toLowerCase()}`),
      param('amount_token_desired', 'Uint128', token2Amount),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(zilPool3)).vReserveMin}`, `${(await getVReserveBound(zilPool3)).vReserveMax}`]
      })
    ],
    zilAmount, false, true
  )
  expect(tx.status).toEqual(2)

  // Retrieve states
  pools = [zrc2Pool1.address.toLowerCase(), zrc2Pool2.address.toLowerCase(), zrc2Pool3.address.toLowerCase(), zilPool1.address.toLowerCase(), zilPool2.address.toLowerCase(), zilPool3.address.toLowerCase()]
  tokenPools = {} // Mapping of tokens to pools

  for (let address of pools) {
    const pool = getContract(address)
    const poolState = await pool.getInit()
    const token0 = poolState.find(i => i.vname == 'init_token0').value
    const token1 = poolState.find(i => i.vname == 'init_token1').value
    if (!tokenPools[token0]) {
      tokenPools[token0] = [address]
    }
    else {
      const token0Pools = tokenPools[token0]
      token0Pools.push(address)
      tokenPools[token0] = token0Pools
    }
    if (!tokenPools[token1]) {
      tokenPools[token1] = [address]
    }
    else {
      const token1Pools = tokenPools[token1]
      token1Pools.push(address)
      tokenPools[token1] = token1Pools
    }
  }
  console.log("tokenPools", tokenPools)

  // Create 3 accounts
  // Each account will possess wZIL, token0/ token1/ token2 and ZIL
  for (let i = 0; i < NUM_ACCOUNTS; ++i) {
    // all accounts have ZIL
    accounts[i] = await createRandomAccount(key, getRandomInt([0, 200000]).toString())

    // xfer wZIL to all accounts
    const wZILAmount = new BigNumber(getRandomInt(WZIL_INIT_RANGE)).shiftedBy(WZIL_DECIMALS).toString()
    await transfer(key, wZil, accounts[i].address, wZILAmount)

    let token;
    if (i === 0) {
      // xfer token 0
      token = token0
      const tokenAmount = new BigNumber(getRandomInt(TOKEN_0_INIT_RANGE)).shiftedBy(TOKEN_0_DECIMALS).toString()
      await transfer(key, token0, accounts[i].address, tokenAmount)
    }
    if (i === 1) {
      // xfer token 1
      token = token1
      const tokenAmount = new BigNumber(getRandomInt(TOKEN_1_INIT_RANGE)).shiftedBy(TOKEN_1_DECIMALS).toString()
      await transfer(key, token1, accounts[i].address, tokenAmount)
    }
    if (i === 2) {
      // xfer token 2
      token = token2
      const tokenAmount = new BigNumber(getRandomInt(TOKEN_2_INIT_RANGE)).shiftedBy(TOKEN_2_DECIMALS).toString()
      await transfer(key, token2, accounts[i].address, tokenAmount)
    }
    accounts[i]["token"] = token.address.toLowerCase()

    tx = await callContract(
      accounts[i].key, wZil,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', '100000000000000000000000000000000000000')
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)

    tx = await callContract(
      accounts[i].key, token,
      'IncreaseAllowance',
      [
        param('spender', 'ByStr20', router.address.toLowerCase()),
        param('amount', 'Uint128', '100000000000000000000000000000000000000')
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)
  }
  console.log("accounts", accounts)
})

describe('fuzz test zilswap', () => {
  test('all actions', async () => {
    const initialStat = { failed: 0, success: 0, total: 0 }
    const stats = {
      total: {
        total: { ...initialStat }
      }
    }
    for (const action of ACTIONS) {
      for (let i = 0; i < NUM_ACCOUNTS; ++i) {
        if (!stats[i]) stats[i] = { total: { ...initialStat } }
        stats[i][action] = { ...initialStat }
      }
      stats.total[action] = { ...initialStat }
    }
    console.log(JSON.stringify(stats, null, 2))
    await validateBalance(null, 1)
    for (let i = 0; i < NUM_ACTIONS; ++i) {
      // pick an account
      const accountNum = getRandomInt([0, NUM_ACCOUNTS - 1])
      // pick an action and try until complete
      let result = false
      while (result === false) {
        const action = getRandomAction()
        result = await action(accountNum)
      }
      // add result to stats
      updateStats(stats, result)
      // validate consistent balance
      await validateBalance(result.args, accountNum)
    }
    console.log(JSON.stringify(stats, null, 2))
  })
})

// == Helpers ==

// @param range - [min, max]
// min and max is inclusive
const getRandomInt = (range) => {
  min = Math.ceil(range[0])
  max = Math.floor(range[1])
  return Math.floor(Math.random() * (range[1] - range[0] + 1) + range[0])
}

const getVReserveBound = async (pool) => {
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

const transfer = async (key, contract, to, amount) => {
  await callContract(
    key, contract,
    "Transfer",
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: to,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: amount,
      },
    ],
    0, false, false
  )
}

const tryAddLiquidity = async (accountNum) => {
  const account = accounts[accountNum]

  // choose pool
  const tokenAddress = account["token"]
  const poolAddress = getPoolAddress(tokenAddress, wZil.address.toLowerCase())
  const pool = getContract(poolAddress)

  // check token balance
  const tknBal = await getTokenBalance(tokenAddress, account)
  if (!tknBal.isPositive()) return false

  // check wZil balance
  const wZilBal = await getTokenBalance(wZil.address.toLowerCase(), account)
  if (!wZilBal.isPositive()) return false

  const tokenAmt = tknBal.multipliedBy(getRandomInt(ADD_LIQ_RANGE)).dividedToIntegerBy(100)
  const wZilAmt = wZilBal.multipliedBy(getRandomInt(ADD_LIQ_RANGE)).dividedToIntegerBy(100)

  let tokenAAddress, tokenBAddress, amountADesired, amountBDesired
  if (parseInt(tokenAddress, 16) > parseInt(wZil.address, 16)) {
    tokenAAddress = wZil.address.toLowerCase()
    tokenBAddress = tokenAddress
    amountADesired = wZilAmt
    amountBDesired = tokenAmt
  }
  else {
    tokenAAddress = tokenAddress
    tokenBAddress = wZil.address.toLowerCase()
    amountADesired = tokenAmt
    amountBDesired = wZilAmt
  }

  const args = [
    "AddLiquidity",
    [
      param('tokenA', 'ByStr20', `${tokenAAddress}`),
      param('tokenB', 'ByStr20', `${tokenBAddress}`),
      param('pool', 'ByStr20', `${poolAddress}`),
      param('amountA_desired', 'Uint128', `${amountADesired}`),
      param('amountB_desired', 'Uint128', `${amountBDesired}`),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
      })
    ], 0, false, true
  ]

  const tx = await callContract(account.key, router, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

// Check tokenAmount again
const tryAddLiquidityZil = async (accountNum) => {
  const account = accounts[accountNum]

  // choose pool
  const tokenAddress = account["token"]
  const poolAddress = getPoolAddress(tokenAddress, wZil.address.toLowerCase())
  const pool = getContract(poolAddress)

  // check token balance
  const tknBal = await getTokenBalance(tokenAddress, account)
  if (!tknBal.isPositive()) return false

  // check zil balance
  const zilBal = await getBalance(account.address)
  if (!zilBal.isPositive()) return false

  const tokenAmt = tknBal.multipliedBy(getRandomInt(ADD_LIQ_RANGE)).dividedToIntegerBy(100)
  const zilAmt = zilBal.multipliedBy(getRandomInt(ADD_LIQ_RANGE)).dividedToIntegerBy(100)

  const args = [
    'AddLiquidityZIL',
    [
      param('token', 'ByStr20', `${tokenAddress}`),
      param('pool', 'ByStr20', `${poolAddress}`),
      param('amount_token_desired', 'Uint128', `${tokenAmt}`),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
      param('v_reserve_ratio_bounds', 'Pair (Uint256) (Uint256)', {
        "constructor": "Pair",
        "argtypes": ["Uint256", "Uint256"],
        "arguments": [`${(await getVReserveBound(pool)).vReserveMin}`, `${(await getVReserveBound(pool)).vReserveMax}`]
      })
    ],
    zilAmt.shiftedBy(-12).toNumber(), false, true
  ]

  const tx = await callContract(account.key, router, ...args)
  expect(tx.status).toEqual(2)

  return { success: tx.receipt.success, args, accountNum }
}

const tryRemoveLiquidity = async (accountNum) => {
  const account = accounts[accountNum]

  // choose pool
  const tokenAddress = account["token"]
  const poolAddress = getPoolAddress(tokenAddress, wZil.address.toLowerCase())
  const pool = getContract(poolAddress)

  // check liquidity balance
  const poolState = await pool.getState()
  const balance = new BigNumber(poolState.balances[account.address.toLowerCase()])
  if (!balance.isPositive()) return false

  const liquidity = balance.multipliedBy(getRandomInt(REM_LIQ_RANGE)).dividedToIntegerBy(100)

  let tokenAAddress, tokenBAddress
  if (parseInt(tokenAddress, 16) > parseInt(wZil.address, 16)) {
    tokenAAddress = wZil.address.toLowerCase()
    tokenBAddress = tokenAddress
  }
  else {
    tokenAAddress = tokenAddress
    tokenBAddress = wZil.address.toLowerCase()
  }

  let tx = await callContract(
    account.key, pool,
    'IncreaseAllowance',
    [
      param('spender', 'ByStr20', router.address.toLowerCase()),
      param('amount', 'Uint128', liquidity)
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  const args = [
    "RemoveLiquidity",
    [
      param('tokenA', 'ByStr20', `${tokenAAddress}`),
      param('tokenB', 'ByStr20', `${tokenBAddress}`),
      param('pool', 'ByStr20', `${poolAddress}`),
      param('liquidity', 'Uint128', `${liquidity}`),
      param('amountA_min', 'Uint128', '0'),
      param('amountB_min', 'Uint128', '0'),
    ],
    0,
  ]

  tx = await callContract(account.key, router, ...args, false, true)

  expect(tx.status).toEqual(2)

  return { success: tx.receipt.success, args, accountNum }
}

const tryRemoveLiquidityZil = async (accountNum) => {
  const account = accounts[accountNum]

  // choose pool
  const tokenAddress = account["token"]
  const poolAddress = getPoolAddress(tokenAddress, wZil.address.toLowerCase())
  const pool = getContract(poolAddress)

  // check liquidity balance
  const poolState = await pool.getState()
  const balance = new BigNumber(poolState.balances[account.address.toLowerCase()])
  if (!balance.isPositive()) return false

  const liquidity = balance.multipliedBy(getRandomInt(REM_LIQ_RANGE)).dividedToIntegerBy(100)

  let tx = await callContract(
    account.key, pool,
    'IncreaseAllowance',
    [
      param('spender', 'ByStr20', router.address.toLowerCase()),
      param('amount', 'Uint128', liquidity)
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  args = [
    "RemoveLiquidityZIL",
    [
      param('token', 'ByStr20', `${tokenAddress}`),
      param('pool', 'ByStr20', `${poolAddress}`),
      param('liquidity', 'Uint128', `${liquidity}`),
      param('amount_token_min', 'Uint128', '0'),
      param('amount_wZIL_min', 'Uint128', '0'),
    ],
    0, false, true
  ]

  tx = await callContract(account.key, router, ...args)

  expect(tx.status).toEqual(2)

  return { success: tx.receipt.success, args, accountNum }
}

const swapExactTokensForZil = async (accountNum) => {
  const account = accounts[accountNum]

  // choose number of pools
  const poolNumber = getRandomInt([1, 3])
  const tokenIn = account["token"]
  const tokenOut = wZil.address.toLowerCase()

  if (tokenIn === tokenOut) { return false }

  // get balances
  let tokenInBalance = await getTokenBalance(tokenIn, account)
  let amountIn = tokenInBalance.multipliedBy(getRandomInt(TRADE_RANGE)).dividedToIntegerBy(100)
  let amountOutMin = amountIn.multipliedBy(5).dividedToIntegerBy(100)

  let args, tokenPath
  if (poolNumber === 1) {
    args = [
      'SwapExactTokensForZILOnce',
      [
        param('amount_in', 'Uint128', `${amountIn}`),
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool', 'ByStr20', `${getPoolAddress(tokenIn, tokenOut)}`),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [tokenIn, tokenOut]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 2) {
    tokenPath = await getDoubleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapExactTokensForZILTwice',
      [
        param('amount_in', 'Uint128', `${amountIn}`),
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 3) {
    tokenPath = await getTripleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapExactTokensForZILThrice',
      [
        param('amount_in', 'Uint128', `${amountIn}`),
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('pool3', 'ByStr20', `${getPoolAddress(tokenPath[2].tokenIn, tokenPath[2].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        }),
        param('path3', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[2].tokenIn}`, `${tokenPath[2].tokenOut}`]
        })
      ],
      0, false, true
    ]
  }
  else {
    throw new Error("Invalid number of pools")
  }

  const tx = await callContract(account.key, router, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

const swapTokensForExactZIL = async (accountNum) => {
  const account = accounts[accountNum]

  // choose number of pools
  const poolNumber = getRandomInt([1, 3])
  const tokenIn = account["token"]
  const tokenOut = wZil.address.toLowerCase()

  if (tokenIn === tokenOut) { return false }

  // get balances
  let tokenInBalance = await getTokenBalance(tokenIn, account)
  let amountInMax = tokenInBalance.multipliedBy(getRandomInt(TRADE_RANGE)).dividedToIntegerBy(100)
  let amountOut = amountInMax.multipliedBy(5).dividedToIntegerBy(100)

  let args, tokenPath
  if (poolNumber === 1) {
    args = [
      'SwapTokensForExactZILOnce',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('amount_in_max', 'Uint128', `${amountInMax}`),
        param('pool', 'ByStr20', `${getPoolAddress(tokenIn, tokenOut)}`),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenIn}`, `${tokenOut}`]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 2) {
    tokenPath = await getDoubleTokenPaths(tokenPools, tokenIn, tokenOut)
    args = [
      'SwapTokensForExactZILTwice',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('amount_in_max', 'Uint128', `${amountInMax}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 3) {
    tokenPath = await getTripleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapTokensForExactZILThrice',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('amount_in_max', 'Uint128', `${amountInMax}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('pool3', 'ByStr20', `${getPoolAddress(tokenPath[2].tokenIn, tokenPath[2].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        }),
        param('path3', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[2].tokenIn}`, `${tokenPath[2].tokenOut}`]
        })
      ],
      0, false, true
    ]
  }
  else {
    throw new Error("Invalid number of pools")
  }

  const tx = await callContract(account.key, router, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

const swapExactTokensForTokens = async (accountNum) => {
  const account = accounts[accountNum]

  // choose number of pools
  const poolNumber = getRandomInt([1, 3])
  const tokenIn = account["token"]
  const tokenOut = zrc2Tokens[getRandomInt([0, zrc2Tokens.length - 1])]

  if (tokenIn === tokenOut) { return false }

  // get balances
  let tokenInBalance = await getTokenBalance(tokenIn, account)
  let amountIn = tokenInBalance.multipliedBy(getRandomInt(TRADE_RANGE)).dividedToIntegerBy(100)
  let amountOutMin = amountIn.multipliedBy(5).dividedToIntegerBy(100)

  let args, tokenPath
  if (poolNumber === 1) {
    args = [
      'SwapExactTokensForTokensOnce',
      [
        param('amount_in', 'Uint128', `${amountIn}`),
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool', 'ByStr20', `${getPoolAddress(tokenIn, tokenOut)}`),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [tokenIn, tokenOut]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 2) {
    tokenPath = await getDoubleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapExactTokensForTokensTwice',
      [
        param('amount_in', 'Uint128', `${amountIn}`),
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 3) {
    tokenPath = await getTripleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapExactTokensForTokensThrice',
      [
        param('amount_in', 'Uint128', `${amountIn}`),
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('pool3', 'ByStr20', `${getPoolAddress(tokenPath[2].tokenIn, tokenPath[2].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        }),
        param('path3', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[2].tokenIn}`, `${tokenPath[2].tokenOut}`]
        })
      ],
      0, false, true
    ]
  }
  else {
    throw new Error("Invalid number of pools")
  }

  const tx = await callContract(account.key, router, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

const swapTokensForExactTokens = async (accountNum) => {
  const account = accounts[accountNum]

  // choose number of pools
  const poolNumber = getRandomInt([1, 3])
  const tokenIn = account["token"]
  const tokenOut = zrc2Tokens[getRandomInt([0, zrc2Tokens.length - 1])]

  if (tokenIn === tokenOut) { return false }

  // get balances
  let tokenInBalance = await getTokenBalance(tokenIn, account)
  let amountInMax = tokenInBalance.multipliedBy(getRandomInt(TRADE_RANGE)).dividedToIntegerBy(100)
  let amountOut = amountInMax.multipliedBy(5).dividedToIntegerBy(100)

  let args, tokenPath
  if (poolNumber === 1) {
    args = [
      'SwapTokensForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('amount_in_max', 'Uint128', `${amountInMax}`),
        param('pool', 'ByStr20', `${getPoolAddress(tokenIn, tokenOut)}`),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenIn}`, `${tokenOut}`]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 2) {
    tokenPath = await getDoubleTokenPaths(tokenPools, tokenIn, tokenOut)
    args = [
      'SwapTokensForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('amount_in_max', 'Uint128', `${amountInMax}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        })
      ],
      0, false, true
    ]
  } else if (poolNumber === 3) {
    tokenPath = await getTripleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapTokensForExactTokensThrice',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('amount_in_max', 'Uint128', `${amountInMax}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('pool3', 'ByStr20', `${getPoolAddress(tokenPath[2].tokenIn, tokenPath[2].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        }),
        param('path3', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[2].tokenIn}`, `${tokenPath[2].tokenOut}`]
        })
      ],
      0, false, true
    ]
  }
  else {
    throw new Error("Invalid number of pools")
  }

  const tx = await callContract(account.key, router, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

const swapExactZILForTokens = async (accountNum) => {
  const account = accounts[accountNum]

  // choose number of pools
  const poolNumber = getRandomInt([1, 3])
  const tokenIn = wZil.address.toLowerCase()
  const tokenOut = zrc2Tokens[getRandomInt([0, zrc2Tokens.length - 1])]

  if (tokenIn === tokenOut) { return false }

  // get balances
  let zilBal = await getBalance(account.address)
  let amountIn = zilBal.multipliedBy(getRandomInt(TRADE_RANGE)).dividedToIntegerBy(100)
  let amountOutMin = amountIn.multipliedBy(5).dividedToIntegerBy(100)

  let args, tokenPath
  if (poolNumber === 1) {
    args = [
      'SwapExactZILForTokensOnce',
      [
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool', 'ByStr20', `${getPoolAddress(tokenIn, tokenOut)}`),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [tokenIn, tokenOut]
        })
      ],
      amountIn.shiftedBy(-12).toNumber(), false, true
    ]
  } else if (poolNumber === 2) {
    tokenPath = await getDoubleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapExactZILForTokensTwice',
      [
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        })
      ],
      amountIn.shiftedBy(-12).toNumber(), false, true
    ]
  } else if (poolNumber === 3) {
    tokenPath = await getTripleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapExactZILForTokensThrice',
      [
        param('amount_out_min', 'Uint128', `${amountOutMin}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('pool3', 'ByStr20', `${getPoolAddress(tokenPath[2].tokenIn, tokenPath[2].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        }),
        param('path3', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[2].tokenIn}`, `${tokenPath[2].tokenOut}`]
        })
      ],
      amountIn.shiftedBy(-12).toNumber(), false, true
    ]
  }
  else {
    throw new Error("Invalid number of pools")
  }

  const tx = await callContract(account.key, router, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

const swapZILForExactTokens = async (accountNum) => {
  const account = accounts[accountNum]

  // choose number of pools
  const poolNumber = getRandomInt([1, 3])
  const tokenIn = wZil.address.toLowerCase()
  const tokenOut = zrc2Tokens[getRandomInt([0, zrc2Tokens.length - 1])]

  if (tokenIn === tokenOut) { return false }

  // get balances
  let zilBal = await getBalance(account.address)
  let amountInMax = zilBal.multipliedBy(getRandomInt(TRADE_RANGE)).dividedToIntegerBy(100)
  let amountOut = amountInMax.multipliedBy(5).dividedToIntegerBy(100)

  let args, tokenPath
  if (poolNumber === 1) {
    args = [
      'SwapZILForExactTokensOnce',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('pool', 'ByStr20', `${getPoolAddress(tokenIn, tokenOut)}`),
        param('path', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenIn}`, `${tokenOut}`]
        })
      ],
      amountInMax.shiftedBy(-12).toNumber(), false, true
    ]
  } else if (poolNumber === 2) {
    tokenPath = await getDoubleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapZILForExactTokensTwice',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        })
      ],
      amountInMax.shiftedBy(-12).toNumber(), false, true
    ]
  } else if (poolNumber === 3) {
    tokenPath = await getTripleTokenPaths(tokenPools, tokenIn, tokenOut)
    // console.log("tokenPath", tokenPath)
    args = [
      'SwapZILForExactTokensThrice',
      [
        param('amount_out', 'Uint128', `${amountOut}`),
        param('pool1', 'ByStr20', `${getPoolAddress(tokenPath[0].tokenIn, tokenPath[0].tokenOut)}`),
        param('pool2', 'ByStr20', `${getPoolAddress(tokenPath[1].tokenIn, tokenPath[1].tokenOut)}`),
        param('pool3', 'ByStr20', `${getPoolAddress(tokenPath[2].tokenIn, tokenPath[2].tokenOut)}`),
        param('path1', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[0].tokenIn}`, `${tokenPath[0].tokenOut}`]
        }),
        param('path2', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[1].tokenIn}`, `${tokenPath[1].tokenOut}`]
        }),
        param('path3', 'Pair (ByStr20) (ByStr20)', {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${tokenPath[2].tokenIn}`, `${tokenPath[2].tokenOut}`]
        })
      ],
      amountInMax.shiftedBy(-12).toNumber(), false, true
    ]
  }
  else {
    throw new Error("Invalid number of pools")
  }

  const tx = await callContract(account.key, router, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

const getPoolAddress = (tokenA, tokenB) => {
  const tokenAPools = tokenPools[tokenA]
  const tokenBPools = tokenPools[tokenB]
  for (let pool of tokenAPools) {
    if (tokenAPools.includes(pool) && tokenBPools.includes(pool)) {
      return pool
    }
  }
  for (let pool of tokenBPools) {
    if (tokenAPools.includes(pool) && tokenBPools.includes(pool)) {
      return pool
    }
  }
}

const getTokenBalance = async (tokenAddress, account) => {
  const token = getContract(tokenAddress)
  const state = await token.getState()
  return new BigNumber(state.balances[account.address.toLowerCase()])
}

const getOtherToken = async (poolAddress, tokenAddress) => {
  const pool = getContract(poolAddress)
  const poolState = await pool.getInit()
  const token0 = poolState.find(i => i.vname == 'init_token0').value
  const token1 = poolState.find(i => i.vname == 'init_token1').value
  if (tokenAddress === token0) {
    return token1
  }
  else {
    return token0
  }
}

const getDoubleTokenPaths = async (tokenPools, tokenIn, tokenOut) => {
  for (let i = 0; i < tokenPools[tokenIn].length; i++) {
    let pool1 = tokenPools[tokenIn][i]
    let pool1TokenOut = await getOtherToken(pool1, tokenIn)

    for (let j = 0; j < tokenPools[pool1TokenOut].length; j++) {
      let pool2 = tokenPools[pool1TokenOut][j]
      let pool2TokenOut = await getOtherToken(pool2, pool1TokenOut)

      if (tokenOut === pool2TokenOut) {
        return [
          { tokenIn, tokenOut: pool1TokenOut },
          { tokenIn: pool1TokenOut, tokenOut }
        ]
      }
    }
  }
  throw new Error("Unable to get path")
}

const getTripleTokenPaths = async (tokenPools, tokenIn, tokenOut) => {
  for (let i = 0; i < tokenPools[tokenIn].length; i++) {
    let pool1 = tokenPools[tokenIn][i]
    let pool1TokenOut = await getOtherToken(pool1, tokenIn)

    for (let j = 0; j < tokenPools[pool1TokenOut].length; j++) {
      let pool2 = tokenPools[pool1TokenOut][j]
      let pool2TokenOut = await getOtherToken(pool2, pool1TokenOut)

      for (let k = 0; k < tokenPools[pool2TokenOut].length; k++) {
        let pool3 = tokenPools[pool2TokenOut][k]
        let pool3TokenOut = await getOtherToken(pool3, pool2TokenOut)

        if (tokenOut === pool3TokenOut) {
          return [
            { tokenIn, tokenOut: pool1TokenOut },
            { tokenIn: pool1TokenOut, tokenOut: pool2TokenOut },
            { tokenIn: pool2TokenOut, tokenOut }
          ]
        }
      }
    }
  }
  throw new Error("Unable to get path")
}

const getRandomAction = () => {
  const type = getRandomInt([1, 9])
  switch (type) {
    case 0: return tryAddLiquidity
    case 1: return tryRemoveLiquidity
    case 2: return tryAddLiquidityZil
    case 3: return tryRemoveLiquidityZil
    case 4: return swapExactTokensForZil
    case 5: return swapTokensForExactZIL
    case 6: return swapExactTokensForTokens
    case 7: return swapTokensForExactTokens
    case 8: return swapExactZILForTokens
    case 9: return swapZILForExactTokens
    default: throw new Error('Invalid type')
  }
}

// check balance of zil in contract, and both tokens
// on mismatch, log tx params and action and throw err
const validateBalance = async (args = null, accountNum) => {
  // console.log(JSON.stringify(args, null, 2))

  if (accountNum === null || accountNum === undefined) { throw new Error("No accountNum provided") }

  const account = accounts[accountNum]

  for (let address of pools) {
    const pool = getContract(address)
    const init = await pool.getInit()
    const token0 = init.find((i) => i.vname == 'init_token0').value
    const token1 = init.find((i) => i.vname == 'init_token1').value

    const state = await pool.getState()
    const reserve0 = new BigNumber(state.reserve0)
    const reserve1 = new BigNumber(state.reserve1)

    const poolToken0Balance = await getTokenBalance(token0, pool)
    const poolToken1Balance = await getTokenBalance(token1, pool)
    expect(reserve0).toEqual(poolToken0Balance)
    expect(reserve1).toEqual(poolToken1Balance)
  }
}

const updateStats = (stats, result) => {
  if (!result.success) console.log(JSON.stringify(result.args, null, 2))

  const type = result.success ? 'success' : 'failed'
  const transition = result.args[0]
  // totals
  stats.total.total.total += 1 // total
  stats.total.total[type] += 1 // total success / failed
  stats.total[transition].total += 1 // total for transition
  stats.total[transition][type] += 1 // total success / failed for transition
  // accounts
  stats[result.accountNum].total.total += 1 // total for acc
  stats[result.accountNum].total[type] += 1 // total success / failed for acc
  stats[result.accountNum][transition].total += 1 // total for transition for acc
  stats[result.accountNum][transition][type] += 1 // total success / failed for transition for acc
}
