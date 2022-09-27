const { callContract } = require("../../scripts/call.js")
const { deployContract } = require("../../scripts/deploy.js");
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
require('dotenv').config()


beforeAll(async () => {
});

test('deploy Zilswap', async () => {
  const privateKey = process.env.PRIVATE_KEY;
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  console.log("address", address)

  // Deploy ZRC-2 contracts
  const tokenFile = "./src/FungibleToken.scilla"
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
  console.log(routerAddress)

  const [initToken0, initToken1] = [token0Address, token1Address].sort()

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

})
