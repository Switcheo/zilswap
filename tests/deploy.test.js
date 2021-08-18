const { getDefaultAccount } = require('../scripts/account.js');
const { deployZilswap, deployNonFungibleToken } = require('../scripts/deploy.js');

test('deploy Zilswap', async () => {
  const { key, address: owner } = getDefaultAccount()
  const [contract, state] = await deployZilswap(key, { fee: '30', owner })
  expect(contract.address).toBeDefined()
  expect(state).toEqual({
    "_balance": "0",
    "balances": {},
    "output_after_fee": "9970",
    "owner": owner,
    "pending_owner": "0x0000000000000000000000000000000000000000",
    "pools": {},
    "total_contributions": {}
  })
})

test('deploy NFT', async () => {
  const { key, address: owner } = getDefaultAccount()
  const [contract, state] = await deployNonFungibleToken(key, { symbol: 'BEAR' })
  expect(contract.address).toBeDefined()
  expect(state._balance).toEqual('0')
  expect(state.bear_price).toEqual('1')
  expect(state.is_token_locked.constructor).toEqual('True')
  expect(state.max_nft_purchase).toEqual('20')
  expect(state.sale_is_active.constructor).toEqual('False')
  expect(state.total_supply).toEqual('0')
})
