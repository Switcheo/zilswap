const { deployZilswapV2Router, deployZilswapV2Pool } = require('../deploy.js');
const { callContract } = require('../call.js')
const { getContractCodeHash } = require('../../tests/zilswap-v2/helper.js');
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

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nRouter      `, routerAddress);
})();
