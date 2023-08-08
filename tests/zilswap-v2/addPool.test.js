const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, useFungibleToken, deployWrappedZIL, deployZilswapV2Pool } = require('../../scripts/deploy.js');
const { getPoolContractCodeHash } = require('./helper.js');
const { callContract } = require('../../scripts/call.js')

let token0, token1, wZil, owner, tx, router, routerState, pool, poolState

beforeAll(async () => {
  owner = getDefaultAccount()
  const codehash = await getPoolContractCodeHash(owner)
  feeAccount = await createRandomAccount(owner.key)
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0' }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1' }, router.address.toLowerCase(), null))[0]
})

test('add ZilswapV2 pool', async () => {
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];

  pool = (await deployZilswapV2Pool(owner.key))[0]

  // call addPool transition on router side
  const txAddPool = await callContract(
    owner.key, router,
    'AddPool',
    [
      {
        vname: 'init_token0',
        type: 'ByStr20',
        value: `${token0.address.toLowerCase()}`,
      },
      {
        vname: 'init_token1',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'init_amp_bps',
        type: 'Uint128',
        value: getAmpBps(false),
      },
      {
        vname: 'init_name',
        type: 'String',
        value: `test-pool`,
      },
      {
        vname: 'init_symbol',
        type: 'String',
        value: `TEST`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
    ],
    0, false, false
  )
  expect(txAddPool.status).toEqual(2)

  poolState = await pool.getState()
  expect(pool).toBeDefined()
  expect(poolState).toEqual({
    "_balance": "0",
    "allowances": {},
    "amp_bps": `${getAmpBps(false)}`,
    "balances": {},
    "current_block_volume": "0",
    "decimals": "12",
    "factory": `${router.address.toLowerCase()}`,
    "init_supply": "0",
    "k_last": "0",
    "last_trade_block": "0",
    "long_ema": "0",
    "name": "test-pool",
    "symbol": "TEST",
    "r_factor_in_precision": "0",
    "reserve0": "0",
    "reserve1": "0",
    "short_ema": "0",
    "token0": `${token0.address.toLowerCase()}`,
    "token1": `${token1.address.toLowerCase()}`,
    "total_supply": "0",
    "v_reserve0": "0",
    "v_reserve1": "0",
  })

  // try to setInitParams after initialising pool, should not work
  const txSetInitParams = await callContract(
    owner.key, pool,
    'SetInitParams',
    [
      {
        vname: 'init_token0',
        type: 'ByStr20',
        value: `${token0.address.toLowerCase()}`,
      },
      {
        vname: 'init_token1',
        type: 'ByStr20',
        value: `${token1.address.toLowerCase()}`,
      },
      {
        vname: 'init_amp_bps',
        type: 'Uint128',
        value: getAmpBps(false),
      },
      {
        vname: 'init_name',
        type: 'String',
        value: `test-pool`,
      },
      {
        vname: 'init_symbol',
        type: 'String',
        value: `TEST`,
      }
    ],
    0, false, false
  )
  expect(txSetInitParams.status).toEqual(3)
})

// is_amp_pool = let is_eq = builtin eq amp bps in negb is_eq;
const getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}

