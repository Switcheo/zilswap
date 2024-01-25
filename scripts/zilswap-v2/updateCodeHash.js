const { callContract } = require('../call.js')
const { getPrivateKey, zilliqa, param, useKey } = require("../zilliqa");

// Helper functions
getAmpBps = (isAmpPool) => {
  ampBps = isAmpPool ? "15000" : "10000";
  return ampBps;
} 

;
(async () => {
  const privateKey = getPrivateKey();
  const routerAddress = process.env.ROUTER_CONTRACT_HASH;
  const routerContract = zilliqa.contracts.at(routerAddress);

  const newCodeHash = '0x70007b9c8c4a2c61361ec602af51e0bf9d64dd3e2a8ca9752ebba7c37048381'


  const txUpdateCodeHash = await callContract(
    privateKey, routerContract,
    'UpdateCodeHash',
    [
      param('codehash', 'ByStr32', `${newCodeHash}`)
    ],
    0, false, false
  );

  console.log(`updating code hash for contract: ${routerAddress}, to: ${newCodeHash}`, txUpdateCodeHash.id);
})();
