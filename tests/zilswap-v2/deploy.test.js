const { getDefaultAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployContract } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')

let token0, token1, owner, tx, router, routerState, pool, poolState

test('deploy ZilswapV2', async () => {
  const codehash = "0xdeeb20a34fd14161dcc0bfe247c77fc8ef701389e5686592db0869dc48159208"

  owner = getDefaultAccount()
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0' }))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1 }))[0]
  const [initToken0Address, initToken1Address] = [token0.address.toLowerCase(), token1.address.toLowerCase()].sort();

  poolState = await pool.getState()
  routerState = await router.getState()

  expect(pool).toBeDefined()
  expect(poolState).toEqual({
    "_balance": "0",
    "allowances": {},
    "amp_bps": "10000",
    "balances": {},
    "current_block_volume": "0",
    "factory": `${router.address.toLowerCase()}`,
    "k_last": "0",
    "last_trade_block": "0",
    "long_ema": "0",
    "reserve0": "0",
    "reserve1": "0",
    "short_ema": "0",
    "token0": `${initToken0Address}`,
    "token1": `${initToken1Address}`,
    "total_supply": "0",
    "v_reserve0": "0",
    "v_reserve1": "0",
  })

  expect(router).toBeDefined()
  expect(routerState).toEqual({
    "_balance": "0",
    "all_pools": [],
    "codehash": `${codehash}`,
    "fee_configuration": {
      "argtypes": [
        "ByStr20",
        "Uint128"
      ],
      "arguments": [
        "0x0000000000000000000000000000000000000000",
        "0"
      ],
      "constructor": "Pair"
    },
    "governor": `${getAddressFromPrivateKey(owner.key).toLowerCase()}`,
    "pending_governor": {
      "argtypes": [
        "ByStr20"
      ],
      "arguments": [],
      "constructor": "None"
    },
    "pools": {},
    "unamplified_pools": {}
  })

  tx = await callContract(
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
  expect(tx.status).toEqual(2)
  console.log(await router.getState())

  // Deploy CodeHash contract
  const file = './src/zilswap-v2/PoolCodeHash.scilla'
  const init = [
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'owner',
      type: 'ByStr20',
      value: `${owner.address.toLowerCase()}`,
    }
  ]
  const codeHashContract = (await deployContract(owner.key, file, init))[0]

  // Call GetCodeHash transition
  tx = await callContract(
    owner.key, codeHashContract,
    'GetCodeHash',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      }
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)
  console.log(tx)
})
