const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { callContract } = require("../../call");
const { getPrivateKey, param, zilliqa } = require("../../zilliqa");
const { deployZOMGStore } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH;
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;
  const geodeAddress = process.env.GEODE_CONTRACT_HASH;
  const berryAddress = process.env.BERRY_CONTRACT_HASH;
  const scrapAddress = process.env.SCRAP_CONTRACT_HASH;

  const zomgStallContract = await deployZOMGStore();
  const zomgStallAddress = zomgStallContract.address.toLowerCase();

  for (const contract_address of [itemsAddress, hunyAddress, geodeAddress, berryAddress, scrapAddress]) {
    const contract = zilliqa.contracts.at(contract_address);
    const txAddMinter = await callContract(privateKey, contract, "AddMinter", [
      param('minter', 'ByStr20', zomgStallAddress),
    ], 0, false, false);
    console.log("add zomg store as minter", contract_address, txAddMinter.id);
  }

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nZOMG Store `, zomgStallAddress);
})();
