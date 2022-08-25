const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { callContract } = require("../../call");
const { getPrivateKey, param, zilliqa } = require("../../zilliqa");
const { deployHunyToken, deployMetazoa, deployProfessions, deployEmporium, deployResourceStore, deployResource, deployItems, deployGemRefinery } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const metazoaAddress = process.env.METAZOA_CONTRACT_HASH;
  const metazoaContract = zilliqa.contracts.at(metazoaAddress);

  const professionsContract = await deployProfessions({ metazoaAddress });
  const professionsAddress = professionsContract.address.toLowerCase();

  // transfer metazoa ownership to professions proxy contract
  const txTransferOwnership = await callContract(privateKey, metazoaContract, "SetContractOwnershipRecipient", [
    param('to', 'ByStr20', professionsAddress),
  ], 0, false, false);
  console.log("transfer metazoa ownership to proxy", txTransferOwnership.id);

  const txAcceptOwnership = await callContract(privateKey, professionsContract, "AcceptContractOwnership", [
    param('new_metazoa_address', 'ByStr20', metazoaAddress),
  ], 0, false, false);
  console.log("accept metazoa ownership for proxy", txAcceptOwnership.id);

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nProfessions`, professionsAddress);
})();
