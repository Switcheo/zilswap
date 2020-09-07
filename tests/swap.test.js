const { units } = require('@zilliqa-js/util')
const BigNumber = require('bignumber.js')
const { callContract, getState } = require('../scripts/call.js')
const { useFungibleToken, useZilswap } = require('../scripts/deploy.js')

const zilAmount = 100000 // x = 100000
const tokenAmount = '500000000' // y = 500

let key, contract, token, token2
beforeAll(async () => {
  key = process.env.PRIVATE_KEY
  const zilswap = await useZilswap(key, { version: 1 })
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
      const coinsOut = prevState.userZils.minus(newState.userZils).plus(fees)
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
}

describe('zil <> zrc2 swaps', () => {
  let prevState
  beforeEach(async () => {
    prevState = await getState(key, contract, token)
  })

  test('swap exact zrc2 for zil', async () => {
    const amount = new BigNumber(tokenAmount).times('0.0002').toString() // 0.02%
    const minZils = units.toQa(zilAmount * 0.00018, units.Units.Zil) // 0.02% - 10% slippage allowance
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
      ],
      0)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check exact token sent to contract
    expectTokenTransfer(prevState, newState, 'toContract', amount, true)
    // check contract gave > min zil
    expectZilTransfer(prevState, newState, 'fromContract', minZils, getGas(swapTxn), false)
  })

  test('swap exact zil for zrc2', async () => {
    const amount = units.toQa(zilAmount * 0.0001, units.Units.Zil) // 0.01%
    const minTokens = new BigNumber(tokenAmount).times('0.00009').toString() // 0.01% - 10% slippage allowance
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
      amount, false) // 1%

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check sent exact zil to contract
    expectZilTransfer(prevState, newState, 'toContract', units.toQa(amount, units.Units.Zil), getGas(swapTxn), true)
    // check contract gave > min token
    expectTokenTransfer(prevState, newState, 'fromContract', minTokens, false)
  })

  test('swap zrc2 for exact zil', async () => {
    const amount = units.toQa(zilAmount * 0.0005, units.Units.Zil) // 0.05%
    const maxTokens = new BigNumber(tokenAmount).times('0.00055').toString()// 0.05% + 10% slippage allowance
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
      0, false)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check contract sent exact amt of zil
    expectZilTransfer(prevState, newState, 'fromContract', amount, getGas(swapTxn), true)
    // check sent < max token to contract
    expectTokenTransfer(prevState, newState, 'toContract', maxTokens, false)
  })

  test('swap zil for exact zrc2', async () => {
    const amount = new BigNumber(tokenAmount).times('0.0005').toString()// 0.05%
    const maxZils = units.toQa(zilAmount * 0.00055, units.Units.Zil) // 0.05% + 10% slippage allowance
    const swapTxn = await callContract(
      key, contract,
      'SwapZilForExactTokens',
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
      0.45, false)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState = await getState(key, contract, token)
    // check constract product invariant
    expect(newState.product.gte(prevState.product)).toBeTruthy()
    // check contract sent exact amt of tokens
    expectTokenTransfer(prevState, newState, 'fromContract', amount, true)
    // check sent < max token to contract
    expectZilTransfer(prevState, newState, 'toContract', maxZils, getGas(swapTxn), false)
  })
})

describe('zrc2 <> zrc2 swaps', () => {
  beforeAll(async () => {
    const ft = await useFungibleToken2(key, { decimals: 18 }, contract.address, process.env.TOKEN2_HASH)
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
          value: tokenAmount,
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
      0, false
    )
  })

  test('swap exact zrc2 for zrc2', async () => {
    const amount = '500000'// 0.1% * 500
    const minTokens = '450000000000000000' // 0.1% x 500 - 10% slippage
    const swapTxn = await callContract(
      key, contract,
      'SwapTokensForExactTokens',
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
      0, false)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState0 = await getState(key, contract, token)
    const newState1 = await getState(key, contract, token2)
    // check constract product invariant
    expect(newState0.product.gte(newState0.product)).toBeTruthy()
    expect(newState1.product.gte(newState1.product)).toBeTruthy()
    // check sent exact amt of tokens0 to contract
    expectTokenTransfer(prevState, newState0, 'toContract', amount, true)
    // check contract sent > amt1 of tokens
    expectTokenTransfer(prevState, newState1, 'fromContract', minTokens, false)
    // check no zlis sent
    expectZilTransfer(prevState, newState0, 'toContract', '0', getGas(swapTxn), true)
  })

  test('swap zrc2 for exact zrc2', async () => {
    const amount = '500000000000000000'// 0.1% * 500
    const maxTokens = '550000' // 0.1% x 500 + 10% slippage
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
      0, false)

    // check success
    expect(swapTxn.status).toEqual(2)
    const newState0 = await getState(key, contract, token)
    const newState1 = await getState(key, contract, token2)
    // check constract product invariant
    expect(newState0.product.gte(newState0.product)).toBeTruthy()
    expect(newState1.product.gte(newState1.product)).toBeTruthy()
    // check sent exact < amt0 of tokens to contract
    expectTokenTransfer(prevState, newState0, 'toContract', maxTokens, false)
    // check contract sent exactly amt1 tokens
    expectTokenTransfer(prevState, newState1, 'fromContract', amount, true)
    // check no zlis sent
    expectZilTransfer(prevState, newState0, 'toContract', '0', getGas(swapTxn), true)
  })
})

describe('swap with non-sender receive address', () => {
  // TODO
})
