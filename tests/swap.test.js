const { units } = require('@zilliqa-js/util')
const BigNumber = require('bignumber.js')
const { callContract } = require('../scripts/call.js')
const { useFungibleToken, useZilswap } = require('../scripts/deploy.js')

const zilAmount = 10 // x = 10
const tokenAmount = '500000000' // y = 500

let key, contract, token
beforeAll(async () => {
  key = process.env.PRIVATE_KEY
  const zilswap = await useZilswap(key, { version: 1 })
  contract = zilswap[0]
  const ft = await useFungibleToken(key, { decimals: 6 })
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
    zilAmount, false)
})

afterAll(async () => {
  const state = await contract.getState()
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
        value: Object.values(state.balances[token.address.toLowerCase()])[0],
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
    0, false)
})

describe('zil <> zrc2 swaps', () => {
  let product
  beforeEach(async () => {
    let state = await contract.getState()
    console.log(JSON.stringify(state, null, 2))
    const [x, y] = state.pools[token.address.toLowerCase()].arguments
    product = new BigNumber(x).times(y)
  })

  test('swap exact zrc2 for zil', async () => {
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
          value: '10000000', // 2%
        },
        {
          vname: 'min_zil_amount',
          type: 'Uint128',
          value: units.toQa(0.22, units.Units.Zil), // 2% x 10 + 10% slippage allowance
        },
      ],
      0)
    expect(swapTxn.status).toEqual(2)
    // TODO
    // test x*y > before
    // check event reduce exact amt of zrc2
    // check event gave > zil
  })

  test('swap exact zil for zrc2', async () => {
    // TODO
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
          value: '4500000', // 1% x 500 - 10% slippage allowance
        },
      ],
      0.1, false) // 1%
    expect(addTxn.status).toEqual(2)
  })

  test('swap zrc2 for exact zil', async () => {
    // TODO
  })

  test('swap zil for exact zrc2', async () => {
    // TODO
  })

})

describe('zrc2 <> zrc2 swaps', () => {

  test('swap exact zrc2 for zrc2', async () => {
    // TODO
  })

  test('swap zrc2 for exact zrc2', async () => {
    // TODO
  })

})

describe('swap with non-sender receive address', () => {
  // TODO
})

describe('transferrable liquidity tokens', () => {
  // TODO
})

describe('transferrable governance token issuance', () => {
  // TODO
})
