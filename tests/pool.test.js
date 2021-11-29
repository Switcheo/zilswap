const { getDefaultAccount } = require('../scripts/account.js')
const { useFungibleToken, useZilswap } = require('../scripts/deploy.js')
const { callContract } = require('../scripts/call.js')

test('zilswap addLiquidity and removeLiquidity', async () => {
  const { key, address: owner } = getDefaultAccount()
  const [contract, _cs] = await useZilswap(key)
  expect(contract.address).toBeDefined()

  const [token, _ts] = await useFungibleToken(key, { decimals: 6 }, contract.address, null)
  expect(token.address).toBeDefined()

  // test amts
  const zilAmount = '1000000000000000'
  const tokenAmount = '50000000000'

  let state = await contract.getState()

  const addTxn = await callContract(
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
    1000, false)
  expect(addTxn.status).toEqual(2)

  state = await contract.getState()
  expect(state.pools[token.address.toLowerCase()]).toEqual({
    "argtypes": [],
    "arguments": [
      zilAmount,
      tokenAmount
    ],
    "constructor": `${contract.address.toLowerCase()}.Pool`
  })
  expect(state.total_contributions[token.address.toLowerCase()]).toEqual(zilAmount)
  expect(Object.values(state.balances[token.address.toLowerCase()])[0]).toEqual(zilAmount)

  const removeTxn = await callContract(
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
        value: zilAmount,
      },
      {
        vname: 'min_zil_amount',
        type: 'Uint128',
        value: zilAmount,
      },
      {
        vname: 'min_token_amount',
        type: 'Uint128',
        value: tokenAmount,
      },
    ],
    0, false)
  expect(removeTxn.status).toEqual(2)

  state = await contract.getState()
  expect(state).toEqual({
    "_balance": "0",
    "balances": {},
    "initialized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "True",
    },
    "output_after_fee": "9970",
    "owner": owner,
    "pending_owner": "0x0000000000000000000000000000000000000000",
    "pools": {},
    "total_contributions": {}
  })
})
