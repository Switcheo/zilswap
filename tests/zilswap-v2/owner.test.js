const { createRandomAccount, getDefaultAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { deployZilswapV2Router, deployWrappedZIL } = require('../../scripts/deploy.js')
const { getContractCodeHash } = require('./helper.js')
const { param } = require("../../scripts/zilliqa");

let router, wZil, origKey, origOwner, newKey, newOwner
beforeEach(async () => {
  const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

  const defaultAccount = getDefaultAccount()
  origKey = defaultAccount.key
  origOwner = defaultAccount.address

  const account = await createRandomAccount(origKey)
  newKey = account.key
  newOwner = account.address

  wZil = (await deployWrappedZIL(origKey, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(origKey, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
})

test('zilswap transferrable governor', async () => {

  let state = await router.getState()
  expect(state.governor).toEqual(origOwner)
  expect(state.pending_governor).toEqual(
    {
      "argtypes": ['ByStr20'],
      "arguments": [],
      "constructor": 'None'
    }
  )

  const txn1 = await callContract(
    origKey, router,
    'SetGovernor',
    [
      param('new_governor', 'ByStr20', newOwner)
    ],
    0, false, false
  )
  expect(txn1.status).toEqual(2)

  state = await router.getState()
  expect(state.governor).toEqual(origOwner)
  expect(state.pending_governor).toEqual(
    {
      "argtypes": ['ByStr20'],
      "arguments": [`${newOwner}`],
      "constructor": 'Some'
    }
  )

  const txn2 = await callContract(
    newKey, router,
    'AcceptGovernance',
    [], 0, false, false
  )
  expect(txn2.status).toEqual(2)

  state = await router.getState()
  console.log(state)
  expect(state.governor).toEqual(newOwner)
  expect(state.pending_governor).toEqual({
    "argtypes": ['ByStr20'],
    "arguments": [],
    "constructor": 'None'
  })
})

test('zilswap non-governor cannot change governor', async () => {
  let state = await router.getState()
  expect(state.governor).toEqual(origOwner)
  expect(state.pending_governor).toEqual(
    {
      "argtypes": ['ByStr20'],
      "arguments": [],
      "constructor": 'None'
    }
  )

  const txn = await callContract(
    newKey, router,
    'SetGovernor',
    [
      param('new_governor', 'ByStr20', newOwner)
    ],
    0, false, false
  )
  expect(txn.status).toEqual(3)

  state = await router.getState()
  expect(state.governor).toEqual(origOwner)
  expect(state.pending_governor).toEqual(
    {
      "argtypes": ['ByStr20'],
      "arguments": [],
      "constructor": 'None'
    }
  )
})
