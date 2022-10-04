const { callContract, getContract } = require("../../scripts/call.js")
const { deployContract } = require("../../scripts/deploy.js");
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
require('dotenv').config()


beforeAll(async () => {
});

test('deploy Zilswap', async () => {
  const privateKey = process.env.PRIVATE_KEY;
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  // console.log("address", address)

  // Deploy HUNY as ZRC2 due to FungibleToken.scilla not having Mint transition
  const tokenFile = "./src/zolar/Huny.scilla"
  const tokenInit = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: address,
    },
    {
      vname: 'name',
      type: 'String',
      value: `zrc2`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: "zrc2",
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: "12",
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: "0",
    },
  ]
  const [token0, token0State] = await deployContract(privateKey, tokenFile, tokenInit)
  const [token1, token1State] = await deployContract(privateKey, tokenFile, tokenInit)
  const token0Address = token0.address.toLowerCase();
  const token1Address = token1.address.toLowerCase();

  // Deploy Router
  const routerFile = "./src/zilswap-v2/ZilSwapRouter.scilla"
  const routerInit = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'init_governor',
      type: 'ByStr20',
      value: address,
    },
  ]
  const [router, routerState] = await deployContract(privateKey, routerFile, routerInit)
  const routerAddress = router.address.toLowerCase();
  // console.log(routerAddress)

  // Sort token order
  // Important when deploying Pool
  const [initToken0, initToken1] = [token0Address, token1Address].sort()
  const initToken0Contract = getContract(initToken0)
  const initToken1Contract = getContract(initToken1)
  let initToken0Amount, initToken1Amount
  initToken0Amount = initToken1Amount = 10000;

  // Deploy Pool
  const poolFile = "./src/zilswap-v2/ZilSwapPool.scilla"
  const poolInit = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'init_token0',
      type: 'ByStr20',
      value: initToken0,
    },
    {
      vname: 'init_token1',
      type: 'ByStr20',
      value: initToken1,
    },
    {
      vname: 'init_factory',
      type: 'ByStr20',
      value: routerAddress,
    },
    {
      vname: 'init_amp_bps',
      type: 'Uint128',
      value: '10000',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: routerAddress,
    },
    {
      vname: 'name',
      type: 'String',
      value: 'pool',
    },
    {
      vname: 'symbol',
      type: 'String',
      value: 'pool',
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: '12',
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: '0',
    },
  ]
  const [pool, poolState] = await deployContract(privateKey, poolFile, poolInit)
  const poolAddress = pool.address;

  // Add Pool to Router
  await callContract(
    privateKey, router,
    'AddPool',
    [
      {
        vname: 'pool',
        type: 'ByStr20',
        value: poolAddress,
      },
    ],
    0, false, false
  )

  // Add Minter (specific to HUNY)
  await callContract(
    privateKey, initToken0Contract,
    'AddMinter',
    [
      {
        vname: 'minter',
        type: 'ByStr20',
        value: address,
      },
    ],
    0, false, false
  )
  await callContract(
    privateKey, initToken1Contract,
    'AddMinter',
    [
      {
        vname: 'minter',
        type: 'ByStr20',
        value: address,
      },
    ],
    0, false, false
  )

  // Mint ZRC2 tokens
  await callContract(
    privateKey, initToken0Contract,
    'Mint',
    [
      {
        vname: 'recipient',
        type: 'ByStr20',
        value: address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${initToken0Amount}`,
      },
    ],
    0, false, false
  )
  await callContract(
    privateKey, initToken1Contract,
    'Mint',
    [
      {
        vname: 'recipient',
        type: 'ByStr20',
        value: address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${initToken1Amount}`,
      },
    ],
    0, false, false
  )

  // Increase allowance for ZRC2 tokens minted
  await callContract(
    privateKey, token0,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: routerAddress,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${initToken0Amount}`,
      },
    ],
    0, false, false
  )
  await callContract(
    privateKey, token1,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: routerAddress,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${initToken1Amount}`,
      },
    ],
    0, false, false
  )

  // AddLiquidity
  await callContract(
    privateKey, router,
    'AddLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${initToken0}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${initToken1}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${poolAddress}`,
      },
      {
        vname: 'amountA_desired',
        type: 'Uint128',
        value: `${initToken0Amount}`,
      },
      {
        vname: 'amountB_desired',
        type: 'Uint128',
        value: `${initToken1Amount}`,
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
          "arguments": ["0", "100000000"]
        }
      },
      {
        vname: 'to',
        type: 'ByStr20',
        value: `${address}`,
      },
    ],
    0, false, true
  )
  const state = await pool.getState()
  console.log(state)

  // Missing fee config here. Need to set fee config on router

  // Increase Allowance for LP Token
  await callContract(
    privateKey, pool,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: routerAddress,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: `${9000}`, // Amount less than initial due to fee config not being set yet
      },
    ],
    0, false, false
  )

  // RemoveLiquidity
  await callContract(
    privateKey, router,
    'RemoveLiquidity',
    [
      {
        vname: 'tokenA',
        type: 'ByStr20',
        value: `${initToken0}`,
      },
      {
        vname: 'tokenB',
        type: 'ByStr20',
        value: `${initToken1}`,
      },
      {
        vname: 'pool',
        type: 'ByStr20',
        value: `${poolAddress}`,
      },
      {
        vname: 'liquidity',
        type: 'Uint128',
        value: `${9000}`,
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
        value: `${address}`,
      },
    ],
    0, false, true
  )

})
