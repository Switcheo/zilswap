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
  const codeHashAddress = process.env.HASH_CONTRACT_HASH;
  const codeHashContract = zilliqa.contracts.at(codeHashAddress);


  const txAddPool = await callContract(
    privateKey, codeHashContract,
    'foo',
    [
      param('addr', 'ByStr20', "0xef54901af1507548a89b022e4505e5fed96ba30a"),
    ],
    0, false, false
  );

  const codehash = txAddPool.receipt.event_logs.find(e => e._eventname === "Success")?.params?.[0]?.value;

  console.log(`codehash: ${codehash}`)
})();
