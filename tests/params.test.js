
const { createRandomAccount } = require('../scripts/account.js')
const { callContract } = require('../scripts/call.js')
const { useZilswap } = require('../scripts/deploy.js')

let key, contract
beforeAll(async () => {
  key = process.env.PRIVATE_KEY
  const zilswap = await useZilswap(key)
  contract = zilswap[0]
})

test('zilswap configurable protocol fees by owner', async () => {
  const txn1 = await callContract(
    key, contract,
    'SetFee',
    [
      {
        vname: 'new_fee',
        type: 'Uint256',
        value: '100',
      },
    ],
    0, false, false
  )
  expect(txn1.status).toEqual(2)

  let state = await contract.getState()
  expect(state.output_after_fee).toEqual("9900")

  const txn2 = await callContract(
    key, contract,
    'SetFee',
    [
      {
        vname: 'new_fee',
        type: 'Uint256',
        value: '30',
      },
    ],
    0, false, false
  )
  expect(txn2.status).toEqual(2)

  state = await contract.getState()
  expect(state.output_after_fee).toEqual("9970")
})

test('zilswap non-owner cannot configure fees', async () => {
  const { key: randomKey } = await createRandomAccount(key)

  const txn = await callContract(
    randomKey, contract,
    'SetFee',
    [
      {
        vname: 'new_fee',
        type: 'Uint256',
        value: '100',
      },
    ],
    0, false, false
  )
  expect(txn.status).toEqual(3)

  let state = await contract.getState()
  expect(state.output_after_fee).toEqual("9970")
})
