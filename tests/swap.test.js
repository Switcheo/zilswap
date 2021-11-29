const { units } = require('@zilliqa-js/util')
const BigNumber = require('bignumber.js')
const { createRandomAccount } = require('../scripts/account.js')
const { callContract, getState } = require('../scripts/call.js')
const { useFungibleToken, useZilswap } = require('../scripts/deploy.js')

const zilAmount = 100000 // x = 100000
const tokenAmount = '500000000' // y1 = 500
const token2Amount = '500000000000000000000' // y2 = 500

let key, contract, token, token2, prevState, prevState2
beforeAll(async () => {
  key = process.env.PRIVATE_KEY
  const zilswap = await useZilswap(key)
  contract = zilswap[0]
  const ft = await useFungibleToken(key, { decimals: 6 }, contract.address)
  token = ft[0]

  await callContract(
    key, contract,
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
        value: tokenAmount,
      },
    ],
    zilAmount, false
  )
})

afterAll(async () => {
  if (!contract.isInitialised()) return

  const state = await contract.getState()

  const contribution = state.balances[token.address.toLowerCase()]
  if (!contribution) return

  const amount = Object.values(contribution)[0]
  if (!amount || amount == '0') return

  await callContract(
    key, contract,
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
        value: amount,
      },
      {
        vname: 'min_zil_amount',
        type: 'Uint128',
        value: '1',
      },
      {
        vname: 'min_token_amount',
        type: 'Uint128',
        value: '1',
      },
    ],
    0, false
  )
})

beforeEach(async () => {
  prevState = await getState(key, contract, token)
})

describe('zilswap zil <> zrc2 swaps', () => {
  test('swap exact zrc2 for zil', async () => {
    const amount = new BigNumber(tokenAmount).times('0.0002').toString() // 0.02% = 0.1
    const minZils = units.toQa(zilAmount * 0.00018, units.Units.Zil).toString(10) // 0.02% - 10% slippage allowance ~= 20 +- 2
    const swapTxn = await callContract(
      key, contract,
      'SwapExactTokensForZIL',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'token_amount',
          type: 'Uint128',
          value: amount
        },
        {
          vname: 'min_zil_amount',
          type: 'Uint128',
          value: minZils,
        },
      ], 0)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check exact token sent to contract
    expectTokenTransfer(prevState, newState, 'toContract', amount, true)
    // check contract gave > min zil
    expectZilTransfer(prevState, newState, 'fromContract', minZils, getGas(swapTxn), false)
    // check contract balances
    validateBalances(token)
  })

  test('swap exact zil for zrc2', async () => {
    const amount = zilAmount * 0.0001 // 0.01% = 10
    const minTokens = new BigNumber(tokenAmount).times('0.00009').toString() // 0.01% - 10% slippage allowance ~= 0.05 +- 0.005
    const swapTxn = await callContract(
      key, contract,
      'SwapExactZILForTokens',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'min_token_amount',
          type: 'Uint128',
          value: minTokens,
        },
      ],
      amount) // 1%

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check sent exact zil to contract
    expectZilTransfer(prevState, newState, 'toContract', units.toQa(amount, units.Units.Zil).toString(10), getGas(swapTxn), true)
    // check contract gave > min token
    expectTokenTransfer(prevState, newState, 'fromContract', minTokens, false)
    // check contract balances
    validateBalances(token)
  })

  test('swap zrc2 for exact zil', async () => {
    const amount = units.toQa(zilAmount * 0.0005, units.Units.Zil).toString(10) // 0.05% = 50
    const maxTokens = new BigNumber(tokenAmount).times('0.00055').toString()// 0.05% + 10% slippage allowance ~= 0.25 +- 0.025
    const swapTxn = await callContract(
      key, contract,
      'SwapTokensForExactZIL',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'max_token_amount',
          type: 'Uint128',
          value: maxTokens,
        },
        {
          vname: 'zil_amount',
          type: 'Uint128',
          value: amount,
        },
      ],
      0)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check contract sent exact amt of zil
    expectZilTransfer(prevState, newState, 'fromContract', amount, getGas(swapTxn), true)
    // check sent < max token to contract
    expectTokenTransfer(prevState, newState, 'toContract', maxTokens, false)
    // check contract balances
    validateBalances(token)
  })

  test('swap zil for exact zrc2', async () => {
    const amount = new BigNumber(tokenAmount).times('0.0005').toString()// 0.05%
    const maxZils = zilAmount * 0.00055 // 0.05% + 10% slippage allowance
    const swapTxn = await callContract(
      key, contract,
      'SwapZILForExactTokens',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'token_amount',
          type: 'Uint128',
          value: amount,
        },
      ],
      maxZils)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check contract sent exact amt of tokens
    expectTokenTransfer(prevState, newState, 'fromContract', amount, true)
    // check sent < max token to contract
    expectZilTransfer(prevState, newState, 'toContract', units.toQa(maxZils, units.Units.Zil).toString(10), getGas(swapTxn), false)
    // check contract balances
    validateBalances(token)
  })

  test('swap zrc2 to exact zil to non-sender receive address', async () => {
    const amount = units.toQa(zilAmount * 0.0005, units.Units.Zil).toString(10) // 0.05% = 50
    const maxTokens = new BigNumber(tokenAmount).times('0.00055').toString()// 0.05% + 10% slippage allowance ~= 0.25 +- 0.025
    const recipient = await createRandomAccount(key)
    const prevRecipientState = await getState(recipient.key, contract, token)
    const swapTxn = await callContract(
      key, contract,
      'SwapTokensForExactZIL',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'max_token_amount',
          type: 'Uint128',
          value: maxTokens,
        },
        {
          vname: 'zil_amount',
          type: 'Uint128',
          value: amount,
        },
        {
          vname: 'recipient_address',
          type: 'ByStr20',
          value: recipient.address,
        },
      ],
      0, false)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check sent < max token to contract
    expectTokenTransfer(prevState, newState, 'toContract', maxTokens, false)
    // check contract sent exact amt of zil to receipient
    const recipientState = await getState(recipient.key, contract, token)
    expectZilTransfer(prevRecipientState, recipientState, 'fromContract', amount, '0', true)
    // check contract balances
    validateBalances(token)
  })

  test('reverts if swap rates cannot be fulfilled', async () => {
    const amount = new BigNumber(tokenAmount).times('0.0005').toString()// 0.05%
    const maxZils = zilAmount * 0.00001 // 0.01% < 0.05%
    const swapTxn = await callContract(
      key, contract,
      'SwapZILForExactTokens',
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'token_amount',
          type: 'Uint128',
          value: amount,
        },
      ],
      maxZils)

    // check failure
    expect(swapTxn.status).toEqual(3)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check no tokens sent
    expectTokenTransfer(prevState, newState, 'toContract', '0', true)
    // check no zils sent
    expectZilTransfer(prevState, newState, 'fromContract', '0', getGas(swapTxn), true)
    // check contract balances
    validateBalances(token)
  })
})

describe('zilswap zrc2 <> zrc2 swaps', () => {
  beforeAll(async () => {
    const ft = await useFungibleToken(key, { decimals: 18 }, contract.address, null)
    token2 = ft[0]

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
      zilAmount, false
    )
  })

  afterAll(async () => {
    const state = await contract.getState()

    const contribution = state.balances[token2.address.toLowerCase()]
    if (!contribution) return

    const amount = Object.values(contribution)[0]
    if (!amount || amount == '0') return

    await callContract(
      key, contract,
      "RemoveLiquidity",
      [
        {
          vname: 'token_address',
          type: 'ByStr20',
          value: token2.address,
        },
        {
          vname: 'contribution_amount',
          type: 'Uint128',
          value: amount,
        },
        {
          vname: 'min_zil_amount',
          type: 'Uint128',
          value: '1',
        },
        {
          vname: 'min_token_amount',
          type: 'Uint128',
          value: '1',
        },
      ],
      0, false,
    )
  })

  beforeEach(async () => {
    prevState2 = await getState(key, contract, token2)
  })

  test('swap exact zrc2 for zrc2', async () => {
    const amount = new BigNumber(tokenAmount).times(0.001).toString()// 0.1% * 500
    const minTokens = new BigNumber(token2Amount).times(0.00098).toString() // 0.1% x 500 - 2% slippage
    const swapTxn = await callContract(
      key, contract,
      'SwapExactTokensForTokens',
      [
        {
          vname: 'token0_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'token1_address',
          type: 'ByStr20',
          value: token2.address,
        },
        {
          vname: 'token0_amount',
          type: 'Uint128',
          value: amount,
        },
        {
          vname: 'min_token1_amount',
          type: 'Uint128',
          value: minTokens,
        },
      ],
      0
    )

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState0 = await getState(key, contract, token)
    const newState2 = await getState(key, contract, token2)
    // check constract product invariant
    expect(newState0.product.gte(newState0.product)).toBeTruthy()
    expect(newState2.product.gte(newState2.product)).toBeTruthy()
    // check sent exact amt of tokens0 to contract
    expectTokenTransfer(prevState, newState0, 'toContract', amount, true)
    // check contract sent > amt1 of tokens
    expectTokenTransfer(prevState2, newState2, 'fromContract', minTokens, false)
    // check no zils sent
    const gas = getGas(swapTxn)
    expectZilTransfer(prevState, newState0, 'toContract', '0', gas, true)
    expectZilTransfer(prevState, newState0, 'fromContract', '0', gas, true)
    // check contract balances
    validateBalances(token, token2)
  })

  test('swap zrc2 for exact zrc2', async () => {
    const amount = new BigNumber(tokenAmount).times(0.001).toString() // 0.1% * 500
    const maxTokens = new BigNumber(token2Amount).times(0.00102).toString() // 0.1% x 500 + 2% slippage
    const swapTxn = await callContract(
      key, contract,
      'SwapTokensForExactTokens',
      [
        {
          vname: 'token0_address',
          type: 'ByStr20',
          value: token2.address,
        },
        {
          vname: 'token1_address',
          type: 'ByStr20',
          value: token.address,
        },
        {
          vname: 'max_token0_amount',
          type: 'Uint128',
          value: maxTokens,
        },
        {
          vname: 'token1_amount',
          type: 'Uint128',
          value: amount,
        },
      ],
      0
    )

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState0 = await getState(key, contract, token)
    const newState2 = await getState(key, contract, token2)
    // check constract product invariant
    expect(newState0.product.gte(newState0.product)).toBeTruthy()
    expect(newState2.product.gte(newState2.product)).toBeTruthy()
    // check sent exact < amt0 of tokens to contract
    expectTokenTransfer(prevState2, newState2, 'toContract', maxTokens, false)
    // check contract sent exactly amt1 tokens
    expectTokenTransfer(prevState, newState0, 'fromContract', amount, true)
    // check no zils sent
    const gas = getGas(swapTxn)
    expectZilTransfer(prevState, newState0, 'toContract', '0', gas, true)
    expectZilTransfer(prevState, newState0, 'fromContract', '0', gas, true)
    // check contract balances
    validateBalances(token, token2)
  })
})

// == Helpers ==

getGas = (txn) => new BigNumber(txn.gasPrice.toString()).times(txn.receipt.cumulative_gas)

expectTokenTransfer = (prevState, newState, direction, amount, exact = true) => {
  switch (direction) {
    case 'toContract': {
      const coinsIn = newState.poolTokens.minus(prevState.poolTokens)
      const coinsOut = prevState.userTokens.minus(newState.userTokens)
      expect(coinsIn).toEqual(coinsOut)
      if (exact) {
        expect(coinsOut.eq(amount)).toBeTruthy()
      } else {
        expect(coinsOut.lte(amount)).toBeTruthy()
      }
      break
    }
    case 'fromContract': {
      const coinsIn = newState.userTokens.minus(prevState.userTokens)
      const coinsOut = prevState.poolTokens.minus(newState.poolTokens)
      expect(coinsIn).toEqual(coinsOut)
      if (exact) {
        expect(coinsIn.eq(amount)).toBeTruthy()
      } else {
        expect(coinsIn.gte(amount)).toBeTruthy()
      }
      break
    }
    default: throw new Error('invalid direction!')
  }
}

expectZilTransfer = (prevState, newState, direction, amount, fees, exact = true) => {
  switch (direction) {
    case 'toContract': {
      const coinsIn = newState.poolZils.minus(prevState.poolZils)
      const coinsOut = prevState.userZils.minus(newState.userZils).minus(fees)
      expect(coinsIn).toEqual(coinsOut)
      if (exact) {
        expect(coinsOut.eq(amount)).toBeTruthy()
      } else {
        expect(coinsOut.lte(amount)).toBeTruthy()
      }
      break
    }
    case 'fromContract': {
      const coinsIn = newState.userZils.minus(prevState.userZils).plus(fees)
      const coinsOut = prevState.poolZils.minus(newState.poolZils)
      expect(coinsIn).toEqual(coinsOut)
      if (exact) {
        expect(coinsIn.eq(amount)).toBeTruthy()
      } else {
        expect(coinsIn.gte(amount)).toBeTruthy()
      }
      break
    }
    default: throw new Error('invalid direction!')
  }

  validateBalances = async (...tokens) => {
    const cs = await contract.getState()

    const cZil = new BigNumber(cs._balance)
    const iZil = Object.values(cs.pools).reduce((acc, v) => acc.plus(v.arguments[0]), new BigNumber(0))
    expect(cZil.toString()).toEqual(iZil.toString())

    for (const token of tokens) {
      const ts = await token.getState()
      const cTkn = ts.balances[contract.address.toLowerCase()]
      const iTkn = cs.pools[token.address.toLowerCase()].arguments[1]
      expect(cTkn).toEqual(iTkn)
    }
  }
}
