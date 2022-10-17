const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { deployZilswapV2Router, deployZilswapV2Pool, useFungibleToken } = require('../../scripts/deploy.js');
const { callContract } = require('../../scripts/call.js')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')

let token0, token1, owner, privateKey, feeAccount, tx, pool, poolState, router, routerState
const minimumLiquidity = 1000
const initToken0Amt = "1000000000000"
const initToken1Amt = "1000000000000"
const codehash = "0xdeeb20a34fd14161dcc0bfe247c77fc8ef701389e5686592db0869dc48159208"

// MintFee fails as the pool is not amp pool, resulting in kl/r0 to be 0/0 (MintFee procedure)
// For non-amp pools, the only way is to addLiquidity once first, then set the fee config


// Not_amp pool; fee not on
test('zilswap addLiquidity and removeLiquidity', async () => {
  owner = getDefaultAccount()
  privateKey = owner.key
  feeAccount = await createRandomAccount(privateKey)
  // console.log("feeAccount", feeAccount)

  router = (await deployZilswapV2Router(owner.key, { governor: null, codehash }))[0]
  token0 = (await useFungibleToken(owner.key, undefined, router.address.toLowerCase(), null, { symbol: 'TKN0' }))[0]
  token1 = (await useFungibleToken(owner.key, undefined, router.address.toLowerCase(), null, { symbol: 'TKN1' }))[0]
  pool = (await deployZilswapV2Pool(owner.key, { factory: router, token0, token1 }))[0]
  const [initToken0Address, initToken1Address] = [token0.address.toLowerCase(), token1.address.toLowerCase()].sort();

  poolState = await pool.getState()
  routerState = await router.getState()

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
  routerState = await router.getState()
  // console.log(routerState)

  // AddLiquidity to new Pool
  // amountA = amountA_desired; amountB = amountB_desired;
  tx = await callContract(
    privateKey, router,
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
  // expect(tx.status).toEqual(2)
  console.log("tx", tx)
  // console.log("pool address", pool.address.toLowerCase())
  // console.log("router address", router.address.toLowerCase())
  // console.log(await token0.getState())


  poolState = await pool.getState()
  // console.log(poolState)

  expect(poolState).toEqual(expect.objectContaining({
    "reserve0": `${initToken0Amt}`,
    "reserve1": `${initToken1Amt}`,
    "balances": {
      "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
      [`${owner.address}`]: `${getLiquidity()}`
    },
    "total_supply": `${minimumLiquidity + getLiquidity()}`
  }))

  // Increase Allowance for LP Token
  tx = await callContract(
    privateKey, pool,
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
  expect(tx.status).toEqual(2)

  // RemoveLiquidity
  tx = await callContract(
    privateKey, router,
    'RemoveLiquidity',
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
        vname: 'liquidity',
        type: 'Uint128',
        value: `${getLiquidity()}`,
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
        vname: 'to',
        type: 'ByStr20',
        value: `${owner.address.toLowerCase()}`,
      },
    ],
    0, false, true
  )
  expect(tx.status).toEqual(2)
  poolState = await pool.getState()
  // console.log(poolState)

  expect(poolState).toEqual(expect.objectContaining({
    "reserve0": `${getAmount(getLiquidity(), initToken0Amt, `${minimumLiquidity + getLiquidity()}`)}`,
    "reserve1": `${getAmount(getLiquidity(), initToken1Amt, `${minimumLiquidity + getLiquidity()}`)}`,
    "balances": {
      "0x0000000000000000000000000000000000000000": `${minimumLiquidity}`,
      [`${owner.address}`]: '0',
      [`${pool.address.toLowerCase(0)}`]: '0'
    },
    "total_supply": `${minimumLiquidity}`
  }))
})

// obtain amt of LP tokens minted; new pool 
const getLiquidity = () => {
  return (Math.sqrt(initToken0Amt * initToken1Amt) - minimumLiquidity);
}

const getAmount = (liquidity, balance, supply) => {
  return balance - ((liquidity / balance) * supply);
}