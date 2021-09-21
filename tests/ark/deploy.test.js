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
  const [contract, _] = await deployARK(key)

  await nextBlock()
  expect(contract.address).toBeDefined()

  const state = await contract.getState()
  expect(state).toEqual({
    "_balance": "0",
    "current_owner": {
      "argtypes": ["ByStr20"],
      "arguments": ["0xd90f2e538ce0df89c8273cad3b63ec44a3c4ed82"],
      "constructor": "Some",
    },
    "fee_address": owner,
    "pending_owner": {
      "argtypes": ["ByStr20"],
      "arguments": [],
      "constructor": "None",
    },
    "voided_cheques": {},
  })
})
