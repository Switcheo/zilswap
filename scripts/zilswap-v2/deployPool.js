const { deployZilswapV2Router, deployZilswapV2Pool } = require('../deploy.js');
const { callContract } = require('../call.js')
const { getContractCodeHash } = require('../../tests/zilswap-v2/helper.js');
const { default: BigNumber } = require('bignumber.js');
const { getPrivateKey, zilliqa, param, useKey } = require("../zilliqa");
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto');

// Helper functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
} 

;
(async () => {
  const privateKey = getPrivateKey()
  const ownerAddress = getAddressFromPrivateKey(privateKey);
  const wZilAddress = process.env.WZIL_CONTRACT_HASH;
  const wZilContract = zilliqa.contracts.at(wZilAddress);
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;
  const hunyContract = zilliqa.contracts.at(hunyAddress);
  const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

  const routerContract = (await deployZilswapV2Router(privateKey, { governor: null, codehash, wZil: wZilAddress.toLowerCase()}))[0];
  const routerAddress = routerContract.address.toLowerCase()

  const txSetFeeConfig = await callContract(
    privateKey, routerContract,
    'SetFeeConfiguration',
    [
      param('config', 'Pair ByStr20 Uint128', {
        "constructor": "Pair",
        "argtypes": ["ByStr20", "Uint128"],
        "arguments": [`${ownerAddress}`, "1000"] // 10%
      })
    ],
    0, false, false
  );
  console.log(`setting fee configuration on router: ${routerAddress}`, txSetFeeConfig.id);

  const poolContract = (await deployZilswapV2Pool(privateKey, { factory: routerContract, token0: wZilContract, token1: hunyContract, init_amp_bps: getAmpBps(false)}))[0];
  const poolAddress = poolContract.address.toLowerCase();

  const txAddPool = await callContract(
    privateKey, routerContract,
    'AddPool',
    [
      param('pool', 'ByStr20', poolAddress),
    ],
    0, false, false
  );
  console.log(`adding pool: ${poolAddress} to router: ${routerAddress}`, txAddPool.id);

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nRouter      `, routerAddress);
  console.log(`\nPool        `, poolAddress);
})();
