const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { callContract } = require("../../call");
const { getPrivateKey, param, zilliqa } = require("../../zilliqa");
const { deployResourceStore, deployResource, deployItems, deployGemRefinery, ONE_HUNY } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const resourceStallContract = zilliqa.contracts.at(process.env.RESOURCE_SHOP_CONTRACT_HASH);
  const geodeContract = zilliqa.contracts.at(process.env.GEODE_CONTRACT_HASH);
  const geodeAddress = geodeContract.address.toLowerCase();
  const berryContract = zilliqa.contracts.at(process.env.BERRY_CONTRACT_HASH);
  const berryAddress = berryContract.address.toLowerCase();
  const scrapContract = zilliqa.contracts.at(process.env.SCRAP_CONTRACT_HASH);
  const scrapAddress = scrapContract.address.toLowerCase();
  const emporiumContract = zilliqa.contracts.at(process.env.EMPORIUM_CONTRACT_HASH);

  const resourceStallAddress = resourceStallContract.address.toLowerCase();

  // const txAddMinterStall1 = await callContract(privateKey, geodeContract, "AddMinter", [
  //   param('minter', 'ByStr20', resourceStallAddress),
  // ], 0, false, false);
  // console.log("add stall minter", txAddMinterStall1.id);

  // const txAddMinterStall2 = await callContract(privateKey, berryContract, "AddMinter", [
  //   param('minter', 'ByStr20', resourceStallAddress),
  // ], 0, false, false);
  // console.log("add stall minter", txAddMinterStall2.id);

  // const txAddMinterStall3 = await callContract(privateKey, scrapContract, "AddMinter", [
  //   param('minter', 'ByStr20', resourceStallAddress),
  // ], 0, false, false);
  // console.log("add stall minter", txAddMinterStall3.id);

  const txAddStall = await callContract(privateKey, emporiumContract, "AddItem", [
    param('stall', 'ByStr20', resourceStallAddress),
  ], 0, false, false)
  console.log("add stall", txAddStall.id);

  const txAddItem1 = await callContract(privateKey, resourceStallContract, "AddItem", [
    param('item_name', 'String', "Zolar Geode"),
    param('resource', 'ByStr20', geodeAddress),
    param('buy_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(36).toString(10), ONE_HUNY.times(3_600).toString(10), "100", "50"]
    }),
    param('sell_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "100", "50"]
    })], 0, false, false)
  console.log("add item", txAddItem1.id);

  const txAddItem2 = await callContract(privateKey, resourceStallContract, "AddItem", [
    param('item_name', 'String', "Zolar Elderberry"),
    param('resource', 'ByStr20', berryAddress),
    param('buy_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(100).toString(10), ONE_HUNY.times(10_000).toString(10), "100", "50"]
    }),
    param('sell_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "100", "50"]
    })], 0, false, false)
  console.log("add item", txAddItem2.id);

  const txAddItem3 = await callContract(privateKey, resourceStallContract, "AddItem", [
    param('item_name', 'String', "Zolranium Scraps"),
    param('resource', 'ByStr20', scrapAddress),
    param('buy_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(36).toString(10), ONE_HUNY.times(3_600).toString(10), "100", "50"]
    }),
    param('sell_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "100", "50"]
    })], 0, false, false)
  console.log("add item", txAddItem3.id);
})();
