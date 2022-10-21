const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployContract } = require('../../scripts/deploy.js');
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');
const { getContractCodeHash } = require('./helper.js');

let token0, token1, owner, tx, router, routerState, pool, poolState
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

beforeAll(async () => {
  owner = getDefaultAccount()
  privateKey = owner.key
  feeAccount = await createRandomAccount(privateKey)
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  token0 = (await useFungibleToken(owner.key, undefined, router.address.toLowerCase(), null, { symbol: 'TKN0' }))[0]
  token1 = (await useFungibleToken(owner.key, undefined, router.address.toLowerCase(), null, { symbol: 'TKN1' }))[0]

  routerState = await router.getState()

  expect(router).toBeDefined()
  expect(routerState).toEqual({
    "_balance": "0",
    "all_pools": [],
    "pool_codehash": `${codehash}`,
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
})

test('deploy ZilswapV2 (AmpPool)', async () => {
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(true) }))[0]
  poolState = await pool.getState()

  expect(pool).toBeDefined()
  expect(poolState).toEqual({
    "_balance": "0",
    "allowances": {},
    "amp_bps": `${getAmpBps(true)}`,
    "balances": {},
    "current_block_volume": "0",
    "factory": `${router.address.toLowerCase()}`,
    "k_last": "0",
    "last_trade_block": "0",
    "long_ema": "0",
    "reserve0": "0",
    "reserve1": "0",
    "short_ema": "0",
    "token0": `${token0.address.toLowerCase()}`,
    "token1": `${token1.address.toLowerCase()}`,
    "total_supply": "0",
    "v_reserve0": "0",
    "v_reserve1": "0",
  })
})

test('deploy ZilswapV2 (notAmpPool)', async () => {
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1, init_amp_bps: getAmpBps(false) }))[0]
  poolState = await pool.getState()

  expect(pool).toBeDefined()
  expect(poolState).toEqual({
    "_balance": "0",
    "allowances": {},
    "amp_bps": `${getAmpBps(false)}`,
    "balances": {},
    "current_block_volume": "0",
    "factory": `${router.address.toLowerCase()}`,
    "k_last": "0",
    "last_trade_block": "0",
    "long_ema": "0",
    "reserve0": "0",
    "reserve1": "0",
    "short_ema": "0",
    "token0": `${token0.address.toLowerCase()}`,
    "token1": `${token1.address.toLowerCase()}`,
    "total_supply": "0",
    "v_reserve0": "0",
    "v_reserve1": "0",
  })
})

// is_amp_pool = let is_eq = builtin eq amp bps in negb is_eq;
const getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}
