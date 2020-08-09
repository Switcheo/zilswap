const { deployZilswap } = require('../scripts/deploy.js');

test('deploy Zilswap', async () => {
  const [contract, state] = await deployZilswap(process.env.PRIVATE_KEY, {})
  expect(contract.address).toBeDefined()
  expect(state).toEqual({
    "_balance": "0",
    "balances": {},
    "pools": {},
    "total_contributions": {}
  })
})
