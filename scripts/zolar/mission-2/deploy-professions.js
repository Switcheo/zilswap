const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { callContract } = require("../../call");
const { getPrivateKey, param, zilliqa } = require("../../zilliqa");
const { deployHunyToken, deployMetazoa, deployProfessions, deployEmporium, deployResourceStore, deployResource, deployItems, deployGemRefinery } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const metazoaAddress = process.env.METAZOA_CONTRACT_HASH;

  const professionsContract = await deployProfessions({ metazoaAddress });
  const professionsAddress = professionsContract.address.toLowerCase();

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nProfessions`, professionsAddress);
})();
