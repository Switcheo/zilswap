const { getDefaultAccount } = require('../../scripts/account.js');
const { deployZilswap } = require('../../scripts/deploy.js');

test('deploy Zilswap', async () => {
  const { key, address: owner } = getDefaultAccount()
  const [contract, state] = await deployZilswap(key, { fee: '30', owner })
  expect(contract.address).toBeDefined()
  expect(state).toEqual({
    "_balance": "0",
    "balances": {},
    "initialized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "False",
    },
    "output_after_fee": "9970",
    "owner": owner,
    "pending_owner": "0x0000000000000000000000000000000000000000",
    "pools": {},
    "total_contributions": {}
  })
})
