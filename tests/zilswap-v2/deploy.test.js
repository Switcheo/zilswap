const { getDefaultAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')

let token0, token1, router, pool, owner

test('deploy ZilswapV2', async () => {
  owner = getDefaultAccount()
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0' }))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1' }))[0]
  router = (await deployZilswapV2Router(owner.key))[0]
  const result = await deployZilswapV2Pool(owner.key, { factory: router, token0, token1 })
  pool = result[0]
  const state = result[1]

  expect(pool).toBeDefined()
  // expect(state).toEqual({
  //   "allowances": {},
  //   "amp_bps": "0",
  //   "balances": {},
  //   "factory": "0xa93c4589a93070ad0235ca497c2e6b2896bec7e3",
  //   "reserve0": "0",
  //   "reserve1": "0",
  //   "token0": "0xb32189295ce654ffd525b92e10e5582297bf1fe7",
  //   "token1": "0x429a2fc3dde3c6c9b115536ba5e8118d3224a47a",
  //   "total_supply": "0",
  //   "v_reserve0": "0",
  //   "v_reserve1": "0",
  // })


  const initTx = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
    ],
    0, false, false
  )
  expect(initTx.status).toEqual(2)
})
