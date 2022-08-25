const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { callContract } = require("../../call");
const { getPrivateKey, param, zilliqa } = require("../../zilliqa");
const { deployResourceStore, deployResource, deployItems, deployGemRefinery } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH;
  const geodeAddress = process.env.GEODE_CONTRACT_HASH;

  const gemRefineryContract = await deployGemRefinery({ geodeAddress, itemsAddress });
  const gemRefineryAddress = gemRefineryContract.address.toLowerCase();

  const txAddMinterItemsRefinery = await callContract(privateKey, zilliqa.contracts.at(itemsAddress), "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false);
  console.log("add refinery as items minter", txAddMinterItemsRefinery.id);

  const txAddMinterGeodeRefinery = await callContract(privateKey, zilliqa.contracts.at(geodeAddress), "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false);
  console.log("add refinery as geode minter", txAddMinterGeodeRefinery.id);

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nGemRefinery`, gemRefineryAddress);
})();
