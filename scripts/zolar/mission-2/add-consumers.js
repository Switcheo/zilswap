const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { callContract } = require("../../call");
const { getPrivateKey, param, zilliqa } = require("../../zilliqa");
const { deployZOMGStore } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH;
  const zomgAddress = process.env.ZOMG_CONTRACT_HASH;
  const refineryAddress = process.env.GEM_REFINERY_CONTRACT_HASH;

  const itemContract = zilliqa.contracts.at(itemsAddress)

  // add ZOMG as consumer for item contract
  const txAddZomg = await callContract(privateKey, itemContract, "AddConsumer", [
    param('consumer', 'ByStr20', zomgAddress),
  ], 0, false, false);
  console.log("add zomg store as consumer", zomgAddress, txAddZomg.id);


  // add gem-refinery as consumer for item contract
  const txAddRefinery = await callContract(privateKey, itemContract, "AddConsumer", [
    param('consumer', 'ByStr20', refineryAddress),
  ], 0, false, false);
  console.log("add gem refinery as consumer", refineryAddress, txAddRefinery.id);
})();
