const { getDefaultAccount } = require('../../scripts/account.js');
const { nextBlock } = require('../../scripts/call.js');
const { deployARK } = require('../../scripts/deploy.js');

let key, owner
beforeAll(async () => {
  const defaultAcc = getDefaultAccount()
  owner = defaultAcc.address
  key = defaultAcc.key
})

// test success
test('deploy ARK successfully', async () => {
  const [contract, _, tokenProxy] = await deployARK(key)

  await nextBlock()
  expect(contract.address).toBeDefined()

  const state = await contract.getState()
  expect(state).toEqual({
    "_balance": "0",
    "current_owner": {
      "argtypes": ["ByStr20"],
      "arguments": [owner],
      "constructor": "Some",
    },
    "fee_address": owner,
    "pending_owner": {
      "argtypes": ["ByStr20"],
      "arguments": [],
      "constructor": "None",
    },
    "token_proxy": {
      "argtypes": ["ByStr20"],
      "arguments": [tokenProxy.address.toLowerCase()],
      "constructor": "Some",
    },
    "voided_cheques": {},
  })
})
