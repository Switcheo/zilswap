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
  const privateKey = getPrivateKey();
  const wZilAddress = process.env.WZIL_CONTRACT_HASH;
  const wZilContract = zilliqa.contracts.at(wZilAddress);
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;
  const hunyContract = zilliqa.contracts.at(hunyAddress);

  const routerAddress = process.env.ROUTER_CONTRACT_HASH;
  const routerContract = zilliqa.contracts.at(routerAddress);

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
  console.log(`\nPool        `, poolAddress);
})();
