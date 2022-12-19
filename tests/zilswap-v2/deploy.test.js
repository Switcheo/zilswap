const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken, deployContract, deployWrappedZIL } = require('../../scripts/deploy.js');
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');
const { getContractCodeHash } = require('./helper.js');

let token0, token1, wZil, owner, tx, router, routerState, pool, poolState
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

beforeAll(async () => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  wZil = (await deployWrappedZIL(owner.key, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
  token0 = (await useFungibleToken(owner.key, { symbol: 'TKN0' }, router.address.toLowerCase(), null))[0]
  token1 = (await useFungibleToken(owner.key, { symbol: 'TKN1' }, router.address.toLowerCase(), null))[0]

  routerState = await router.getState()

  expect(router).toBeDefined()
  expect(routerState).toEqual({
    "_balance": "0",
    "all_pools": [],
    "pool_codehash": `${codehash}`,
    "amt_in": "0",
    "amt_out": "0",
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
    "unamplified_pools": {},
    "wZIL_address": `${wZil.address.toLowerCase()}`,
  })
})

test('deploy ZilswapV2 (Amp pool)', async () => {
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
})

test('deploy ZilswapV2 (Non-amp pool)', async () => {
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
})

// is_amp_pool = let is_eq = builtin eq amp bps in negb is_eq;
const getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
}
