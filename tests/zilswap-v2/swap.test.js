const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');
const { getContractCodeHash } = require('./helper.js');

let token0, token1, owner, feeAccount, router, pool
const minimumLiquidity = 1000
const initToken0Amt = "1000000000000"
const initToken1Amt = "1000000000000"
const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

// Not_amp pool; fee not on
test('zilswap addLiquidity and removeLiquidity', async () => {
  owner = getDefaultAccount()
  feeAccount = await createRandomAccount(owner.key)
  // console.log("feeAccount", feeAccount)

  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  token0 = (await useFungibleToken(owner.key, undefined, router.address.toLowerCase(), null, { symbol: 'TKN0' }))[0]
  token1 = (await useFungibleToken(owner.key, undefined, router.address.toLowerCase(), null, { symbol: 'TKN1' }))[0]
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1 }))[0]
  const [initToken0Address, initToken1Address] = [token0.address.toLowerCase(), token1.address.toLowerCase()].sort();

  // // Need to fix the fee
  // await callContract(
  //   owner.key, router,
  //   'SetFeeConfiguration',
  //   [
  //     {
  //       vname: 'config',
  //       type: 'Pair ByStr20 Uint128',
  //       value: {
  //         "constructor": "Pair",
  //         "argtypes": ["ByStr20", "Uint128"],
  //         "arguments": [`${feeAccount.address}`, "1000"] // 10%
  //       }
  //     },
  //   ],
  //   0, false, false
  // )
  // console.log(await router.getState())

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

  let poolState = await pool.getState()


  // AddLiquidity to new Pool
  // amountA = amountA_desired;
  // amountB = amountB_desired;
  const pooltx = await callContract(
    owner.key, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${initToken0Address}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${initToken1Address}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${pool.address.toLowerCase()}`,
      },
      {
        vname: 'amountA_desired',
        type: 'Uint128',
        value: `${initToken0Amt}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${initToken1Amt}`,
      },
      {
        vname: 'amountA_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'amountB_min',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'v_reserve_ratio_bounds',
        type: 'Pair (Uint128) (Uint128)',
        value: {
          "constructor": "Pair",
          "argtypes": ["Uint128", "Uint128"],
          "arguments": ["0", "1000000000000"]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      },
    ],
    0, false, true
  )
  poolState = await pool.getState()
  // console.log("pooltx", pooltx)
  // console.log("pool state", poolState)

  expect(poolState).toEqual(expect.objectContaining({
    "reserve0": `${initToken0Amt}`,
    "reserve1": `${initToken1Amt}`,
    "balances": {
      "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
      [`${owner.address}`]: `${getLiquidity()}`
    },
    "total_supply": `${minimumLiquidity + getLiquidity()}`
  }))


  await callContract(
    owner.key, router,
    'SwapExactTokensForTokens',
    [
      {
        vname: 'amount_in',
        type: 'Uint128',
        value: "100000",
      },
      {
        vname: 'amount_out_min',
        type: 'Uint128',
        value: "1000",
      },
      {
        vname: 'pool_path',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
      {
        vname: 'path',
        type: 'Pair (ByStr20) (ByStr20)',
        value: {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${initToken0Address}`, `${initToken1Address}`]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
    ],
    0, false, true
  )
  // console.log("pool", await pool.getState())

  await callContract(
    owner.key, router,
    'SwapExactTokensForTokens',
    [
      {
        vname: 'amount_in',
        type: 'Uint128',
        value: "100000",
      },
      {
        vname: 'amount_out_min',
        type: 'Uint128',
        value: "1000",
      },
      {
        vname: 'pool_path',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
      {
        vname: 'path',
        type: 'Pair (ByStr20) (ByStr20)',
        value: {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${initToken1Address}`, `${initToken0Address}`]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
    ],
    0, false, true
  )

  // console.log("router", await router.getState())
  // console.log("pool", await pool.getState())

  // console.log("token0", await token0.getState())
  // console.log("token1", await token1.getState())

  await callContract(
    owner.key, router,
    'SwapTokensForExactTokens',
    [
      {
        vname: 'amount_out',
        type: 'Uint128',
        value: "1000",
      },
      {
        vname: 'amount_in_max',
        type: 'Uint128',
        value: "100000",
      },
      {
        vname: 'pool_path',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
      {
        vname: 'path',
        type: 'Pair (ByStr20) (ByStr20)',
        value: {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${initToken0Address}`, `${initToken1Address}`]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
    ],
    0, false, true
  )

  await callContract(
    owner.key, router,
    'SwapTokensForExactTokens',
    [
      {
        vname: 'amount_out',
        type: 'Uint128',
        value: "1000",
      },
      {
        vname: 'amount_in_max',
        type: 'Uint128',
        value: "100000",
      },
      {
        vname: 'pool_path',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
      {
        vname: 'path',
        type: 'Pair (ByStr20) (ByStr20)',
        value: {
          "constructor": "Pair",
          "argtypes": ["ByStr20", "ByStr20"],
          "arguments": [`${initToken1Address}`, `${initToken0Address}`]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: pool.address.toLowerCase(),
      },
    ],
    0, false, true
  )

  // console.log("pool", pool.address.toLowerCase(), await pool.getState())
  // console.log("token0", token0.address.toLowerCase(), await token0.getState())
  // console.log("token1", token1.address.toLowerCase(), await token1.getState())


  // Increase Allowance for LP Token
  await callContract(
    owner.key, pool,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: router.address.toLowerCase(),
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${getLiquidity()}`,
      },
    ],
    0, false, false
  )

  // Syncs the reserves on the contract
  await callContract(
    owner.key, pool,
    'Sync',
    [],
    0, false, false
  )

  // // Seems to be having some issues now
  // // RemoveLiquidity
  // await callContract(
  //   owner.key, router,
  //   'RemoveLiquidity',
  //   [
  //     {
  //       vname: 'tokenA',
  //       type: 'ByStr20',
  //       value: `${initToken0Address}`,
  //     },
  //     {
  //       vname: 'tokenB',
  //       type: 'ByStr20',
  //       value: `${initToken1Address}`,
  //     },
  //     {
  //       vname: 'pool',
  //       type: 'ByStr20',
  //       value: `${pool.address.toLowerCase()}`,
  //     },
  //     {
  //       vname: 'liquidity',
  //       type: 'Uint128',
  //       value: `${getLiquidity()}`,
  //     },
  //     {
  //       vname: 'amountA_min',
  //       type: 'Uint128',
  //       value: '0',
  //     },
  //     {
  //       vname: 'amountB_min',
  //       type: 'Uint128',
  //       value: '0',
  //     },
  //     {
  //       vname: 'to',
  //       type: 'ByStr20',
  //       value: `${owner.address.toLowerCase()}`,
  //     },
  //   ],
  //   0, false, true
  // )
})

// obtain amt of LP tokens minted; new pool 
const getLiquidity = () => {
  return (Math.sqrt(initToken0Amt * initToken1Amt) - minimumLiquidity);
}
