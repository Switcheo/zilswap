const { BigNumber } = require('bignumber.js')
const { createRandomAccount } = require('../scripts/account.js')
const { callContract, getBalance } = require('../scripts/call.js')
const { useFungibleToken, useZilswap } = require('../scripts/deploy.js')

// initial ratios
const NUM_ACTIONS = 10 // 5000
const NUM_ACCOUNTS = 2 // 20

const RESERVE_FEES = '100000000000000'
const TOKEN_1_DECIMALS = 12
const TOKEN_2_DECIMALS = 12
const ZIL_INIT_RANGE = [10000, 100000]
const TOKEN_1_INIT_RANGE = [100000, 10000000]
const TOKEN_2_INIT_RANGE = [1000, 5000]
const TRADE_RANGE = [1, 50]
const ADD_LIQ_RANGE = [5, 100]
const REM_LIQ_RANGE = [5, 100]
const ACTIONS = ['AddLiquidity', 'RemoveLiquidity',
'SwapExactTokensForZIL', 'SwapExactZILForTokens',
'SwapTokensForExactZIL', 'SwapZILForExactTokens',
'SwapExactTokensForTokens', 'SwapTokensForExactTokens']


// create 2 sets of tokens
// set initial liquidity amount
// create test accounts
// give random amounts to each user
const accounts = []
let key, contract, token1, token2
beforeAll(async () => {
  key = process.env.PRIVATE_KEY
  const zilswap = await useZilswap(key)
  contract = zilswap[0]
  const ft = await useFungibleToken(key, { decimals: TOKEN_1_DECIMALS }, contract.address)
  token1 = ft[0]
  const ft2 = await useFungibleToken(key, { decimals: TOKEN_2_DECIMALS }, contract.address)
  token2 = ft2[0]

  const zil1Amount = getRandomInt(ZIL_INIT_RANGE)
  const zil2Amount = getRandomInt(ZIL_INIT_RANGE)
  const token1Amount = new BigNumber(getRandomInt(TOKEN_1_INIT_RANGE)).shiftedBy(TOKEN_1_DECIMALS)
  const token2Amount = new BigNumber(getRandomInt(TOKEN_2_INIT_RANGE)).shiftedBy(TOKEN_2_DECIMALS)

  console.log('ZIL per TKN1: ', new BigNumber(zil1Amount).div(token1Amount).toString())
  console.log('ZIL per TKN2: ', new BigNumber(zil2Amount).div(token2Amount).toString())
  console.log('TKN2 per TKN1: ', new BigNumber(token2Amount).div(token1Amount).toString())

  await callContract(
    key, contract,
    "AddLiquidity",
    [
      {
        vname: 'token_address',
        type: 'ByStr20',
        value: token1.address,
      },
      {
        vname: 'min_contribution_amount',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'max_token_amount',
        type: 'Uint128',
        value: token1Amount,
      },
    ],
    zil1Amount, false
  )

  await callContract(
    key, contract,
    "AddLiquidity",
    [
      {
        vname: 'token_address',
        type: 'ByStr20',
        value: token2.address,
      },
      {
        vname: 'min_contribution_amount',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'max_token_amount',
        type: 'Uint128',
        value: token2Amount,
      },
    ],
    zil2Amount, false
  )

  console.log('Creating accounts..')
  // transfer random amts to 20 accounts
  // 2 accounts have token 1 only
  // 2 accounts have token 2 only
  // 5 accounts have zil only
  for (let i = 0; i < NUM_ACCOUNTS; ++i) {
    accounts[i] = await createRandomAccount(key, getRandomInt([0, 200000]).toString())
    if (i < 15) { // 5 accounts have zil only
      if (i !== 0 || i !== 1) { // 2 accounts have no token 1
        // xfer token 1
        const amount = new BigNumber(getRandomInt(TOKEN_1_INIT_RANGE)).times(0.2).shiftedBy(TOKEN_1_DECIMALS).toString()
        await transfer(key, token1, accounts[i].address, amount)
      }
      if (i !== 2 || i !== 3) { // 2 accounts have no token 2
        // xfer token 2
        const amount = new BigNumber(getRandomInt(TOKEN_2_INIT_RANGE)).times(0.2).shiftedBy(TOKEN_2_DECIMALS).toString()
        await transfer(key, token2, accounts[i].address, amount)
      }
    }

    await callContract(
      accounts[i].key, token1,
      'IncreaseAllowance',
      [
        {
          vname: 'spender',
          type: 'ByStr20',
          value: contract.address,
        },
        {
          vname: 'amount',
          type: 'Uint128',
          value: '100000000000000000000000000000',
        },
      ],
      0, false, false
    )

    await callContract(
      accounts[i].key, token2,
      'IncreaseAllowance',
      [
        {
          vname: 'spender',
          type: 'ByStr20',
          value: contract.address,
        },
        {
          vname: 'amount',
          type: 'Uint128',
          value: '100000000000000000000000000000',
        },
      ],
      0, false, false
    )
  }
  console.log('Initial State:')
  console.log('ZilSwap:')
  console.log(JSON.stringify(await contract.getState(), null, 2))
  console.log('Token 1:')
  console.log(JSON.stringify(await token1.getState(), null, 2))
  console.log('Token 2:')
  console.log(JSON.stringify(await token2.getState(), null, 2))
})

afterAll(async () => {
  if (!contract.isInitialised()) return

  const state = await contract.getState()

  const contribution = state.balances[token.address.toLowerCase()]
  if (!contribution) return

  const amount = Object.values(contribution)[0]
  if (!amount || amount == '0') return

  // TODO: remove liquidity for all accounts
})

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

const swap = async (accountNum) => {
  const account = accounts[accountNum]
  const state = await contract.getState()
  const zilBal = await getBalance(account.address)

  // choose an input
  let input = token1
  const inputType = getRandomInt([1, 3])
  if (inputType === 2) {
    input = token2
  }
  if (inputType === 3 && zilBal.gt(RESERVE_FEES)) { // don't drain account
    input = 'zil'
  }

  // choose output
  const outputType = getRandomInt([1, input === 'zil' ? 2 : 3])
  let output = token1
  if (outputType === 2 && inputType !== 2) {
    output = token2
  }
  if (outputType === 3) {
    output = 'zil'
  }

  // get pools
  const inputPool = state.pools[(input === 'zil' ? output : input).address.toLowerCase()]
  const outputPool = state.pools[(output === 'zil' ? input : output).address.toLowerCase()]

  // get balances
  let inputBalance
  if (input === 'zil') {
    inputBalance = zilBal.minus(RESERVE_FEES)
  } else {
    inputBalance = await getTokenBalance(input, account)
  }

  // choose input amount
  const inputAmt = inputBalance.times(getRandomInt(TRADE_RANGE)).dividedToIntegerBy(100)

  // choose exact in / out
  const exactType = getRandomInt([1, 2]) === 1 ? 'in' : 'out'

  // calculate args: find output amt with slippage and select transition
  let args = []
  if (input === 'zil') {
    const outputAmt = inputAmt.times(inputPool.arguments[1]).times(0.5).dividedToIntegerBy(inputPool.arguments[0])
    if (exactType === 'in') {
      args = ['SwapExactZILForTokens',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: output.address,
        },
        {
          vname: 'min_token_amount',
          type: 'Uint128',
          value: outputAmt.toString(),
        },
      ],
      inputAmt.shiftedBy(-12).toNumber()]
    } else {
      args = ['SwapZILForExactTokens',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: output.address,
        },
        {
          vname: 'token_amount',
          type: 'Uint128',
          value: outputAmt.toString(),
        },
      ],
      inputAmt.shiftedBy(-12).toNumber()]
    }
  } else if (output === 'zil') {
    const outputAmt = inputAmt.times(inputPool.arguments[0]).times(0.5).dividedToIntegerBy(inputPool.arguments[1])
    if (exactType === 'in') {
      args = ['SwapExactTokensForZIL',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: input.address,
        },
        {
          vname: 'token_amount',
          type: 'Uint128',
          value: inputAmt.toString(),
        },
        {
          vname: 'min_zil_amount',
          type: 'Uint128',
          value: outputAmt.toString(),
        },
      ],
      0]
    } else {
      args = ['SwapTokensForExactZIL',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: input.address,
        },
        {
          vname: 'max_token_amount',
          type: 'Uint128',
          value: inputAmt.toString(),
        },
        {
          vname: 'zil_amount',
          type: 'Uint128',
          value: outputAmt.toString(),
        },
      ],
      0]
    }
  } else {
    const outputAmt = inputAmt.times(inputPool.arguments[0]).dividedToIntegerBy(inputPool.arguments[1]). // token -> zil
      times(outputPool.arguments[1]).times(0.5).dividedToIntegerBy(outputPool.arguments[0]) // zil -> token
    if (exactType === 'in') {
      args = ['SwapExactTokensForTokens',
      [
        {
          vname: 'token0_address',
          type: 'ByStr20',
          value: input.address,
        },
        {
          vname: 'token1_address',
          type: 'ByStr20',
          value: output.address,
        },
        {
          vname: 'token0_amount',
          type: 'Uint128',
          value: inputAmt.toString(),
        },
        {
          vname: 'min_token1_amount',
          type: 'Uint128',
          value: outputAmt.toString(),
        },
      ],
      0]
    } else {
      args = ['SwapTokensForExactTokens',
      [
        {
          vname: 'token0_address',
          type: 'ByStr20',
          value: input.address,
        },
        {
          vname: 'token1_address',
          type: 'ByStr20',
          value: output.address,
        },
        {
          vname: 'max_token0_amount',
          type: 'Uint128',
          value: inputAmt.toString(),
        },
        {
          vname: 'token1_amount',
          type: 'Uint128',
          value: outputAmt.toString(),
        },
      ],
      0]
    }
  }

  const tx = await callContract(account.key, contract, ...args)

  return { success: tx.receipt.success, args, accountNum }
}

const tryAddLiquidity = async (accountNum) => {
  const account = accounts[accountNum]

  // choose pool
  let token = token1
  const tokenNum = getRandomInt([1, 2])
  if (tokenNum === 2) {
    token = token2
  }
  // check zil balance
  const zilBal = await getBalance(account.address)
  if (!zilBal.isPositive()) return false

  // check token balance
  const tknBal = await getTokenBalance(token, account)
  if (!tknBal.isPositive()) return false

  // get rates
  const state = await contract.getState()
  const pool = state.pools[token.address.toLowerCase()]

  // choose values
  const ratio = getRandomInt(ADD_LIQ_RANGE)
  let maxTkn = tknBal.times(ratio).div(100).integerValue()
  let zilAmt = maxTkn.times(pool.arguments[0]).times(0.99).dividedToIntegerBy(pool.arguments[1])

  // get rates
  if (zilAmt.gt(zilBal)) {
    zilAmt = zilBal.times(ratio).div(100).integerValue().minus(RESERVE_FEES) // remove 100 zils for fees
    maxTkn = zilAmt.times(pool.arguments[1]).times(1.01).dividedToIntegerBy(pool.arguments[0])
  }

   // no more zils to do tx
  if (!zilAmt.isPositive()) return false

  const args = [
    "AddLiquidity",
    [
      {
        vname: 'token_address',
        type: 'ByStr20',
        value: token.address,
      },
      {
        vname: 'min_contribution_amount',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'max_token_amount',
        type: 'Uint128',
        value: maxTkn,
      },
    ],
    zilAmt.shiftedBy(-12).toNumber()
  ]
  const tx = await callContract(account.key, contract, ...args, false)

  return { success: tx.receipt.success, args, accountNum }
}

const tryRemoveLiquidity = async (accountNum) => {
  const account = accounts[accountNum]

  // choose pool
  let token = token1
  const tokenNum = getRandomInt([1, 2])
  if (tokenNum === 2) {
    token = token2
  }

  // check liquidity balance
  const state = await contract.getState()
  const balance = new BigNumber(state.balances[token.address.toLowerCase()][account.address.toLowerCase()])
  if (!balance.isPositive()) return false

  const ratio = getRandomInt(REM_LIQ_RANGE)
  const contributionAmt = balance.times(ratio).div(100).integerValue()
  const percentOfPool = new BigNumber(contributionAmt).dividedBy(state.total_contributions[token.address.toLowerCase()])
  const zilAmt = new BigNumber(state.pools[token.address.toLowerCase()].arguments[0]).times(percentOfPool).times(0.99).dividedToIntegerBy(100)
  const tknAmt = new BigNumber(state.pools[token.address.toLowerCase()].arguments[1]).times(percentOfPool).times(0.99).dividedToIntegerBy(100)

  const args = [
    "RemoveLiquidity",
    [
      {
        vname: 'token_address',
        type: 'ByStr20',
        value: token.address,
      },
      {
        vname: 'contribution_amount',
        type: 'Uint128',
        value: contributionAmt,
      },
      {
        vname: 'min_zil_amount',
        type: 'Uint128',
        value: zilAmt,
      },
      {
        vname: 'min_token_amount',
        type: 'Uint128',
        value: tknAmt,
      },
    ],
    0,
  ]

  const tx = await callContract(account.key, contract, ...args, false)

  return { success: tx.receipt.success, args, accountNum }
}

// randomly trade (pick zil / tkn1, tkn2 based own balance and pool ratio) / add / remove liquidity
// at each step, check zilswap zil / token zilswap balance vs pool internal balances
// throw if the balance is not correct
// count successful actions vs failed actions
describe('fuzz test zilswap', () => {
  test('all actions', async () => {
    const initialStat = { failed: 0, success: 0, total: 0 }
    const stats = {
      total: {
        total: { ... initialStat }
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
    await validateBalance()
    for (let i = 0; i < NUM_ACTIONS; ++i) {
      // pick an account
      const accountNum = getRandomInt([0, NUM_ACCOUNTS-1])
      // pick an action and try until complete
      let result = false
      while (result === false) {
        const action = getRandomAction()
        result = await action(accountNum)
      }
      // add result to stats
      updateStats(stats, result)
      // validate consistent balance
      await validateBalance(result.args)
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

const getRandomAction = () => {
  const type = getRandomInt([0, 2])
  switch (type) {
    case 0: return swap // swap
    case 1: return tryAddLiquidity
    case 2: return tryRemoveLiquidity
    default: throw new Error('Invalid type')
  }
}
const getTokenBalance = async (token, account) => {
  const state = await token.getState()
  return new BigNumber(state.balances[account.address.toLowerCase()])
}

// check balance of zil in contract, and both tokens
// on mismatch, log tx params and action and throw err
const validateBalance = async (args = null) => {
  console.log(JSON.stringify(args, null, 2))

  const cs = await contract.getState()
  const t1s = await token1.getState()
  const t2s = await token2.getState()

  const cZil = new BigNumber(cs._balance)
  const t1Zil = new BigNumber(cs.pools[token1.address.toLowerCase()].arguments[0])
  const t2Zil = new BigNumber(cs.pools[token2.address.toLowerCase()].arguments[0])
  expect(cZil.toString()).toEqual(t1Zil.plus(t2Zil).toString())

  const ct1 = cs.pools[token1.address.toLowerCase()].arguments[1]
  const t1c = t1s.balances[contract.address.toLowerCase()]
  expect(ct1).toEqual(t1c)

  const ct2 = cs.pools[token2.address.toLowerCase()].arguments[1]
  const t2c = t2s.balances[contract.address.toLowerCase()]
  expect(ct2).toEqual(t2c)
}

const updateStats = (stats, result) => {
  if (!result.success) console.log(JSON.stringify(result.args, null , 2))

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
