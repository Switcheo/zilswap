const fs = require("fs");
const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { deployContract } = require("../../deploy");
const { zilliqa, getPrivateKey, param } = require("../../zilliqa");
const { callContract } = require("../../call");
const { default: BigNumber } = require("bignumber.js");

const ONE_HUNY = new BigNumber(1).shiftedBy(12);

const deployHunyToken = async ({
  name,
  symbol,
  decimals,
}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/Huny.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("name", "String", name),
    param("symbol", "String", symbol),
    param("decimals", "Uint32", decimals),
    param("init_supply", "Uint128", "0"),
    param("contract_owner", "ByStr20", address),
  ]

  console.info(`Deploying ${name}...`)
  const [contract] = await deployContract(privateKey, code, init)

  await callContract(privateKey, contract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  return contract;
};

const deployResource = async (resource, {
  name,
  symbol,
  decimals,
}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/resource/ZolarResource.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("name", "String", name),
    param("symbol", "String", symbol),
    param("decimals", "Uint32", decimals),
    param("init_supply", "Uint128", "0"),
    param("contract_owner", "ByStr20", address),
  ]

  console.info(`Deploying ${name}...`)
  const [contract] = await deployContract(privateKey, code, init)

  await callContract(privateKey, contract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  return contract;
};

const deployItems = async ({
} = {}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/item/ZolarItems.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_contract_owner", "ByStr20", address),
    param("initial_base_uri", "String", "https://api.zolar.io/items/metadata/"),
    param("name", "String", "Zolar Items"),
    param("symbol", "String", "ITEM"),
  ]

  console.info(`Deploying ZolarItems...`)
  const [contract] = await deployContract(privateKey, code, init)

  await callContract(privateKey, contract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  return contract;
};

const deployGemRefinery = async ({
  itemsAddress,
  geodeAddress,
} = {}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/item/ZolarGemRefinery.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_owner", "ByStr20", address),
    param("initial_items_address", "ByStr20", itemsAddress),
    param("initial_geode_address", "ByStr20", geodeAddress),
    param("initial_gem_affinities", "List String", ["INT"]),
  ]

  console.info(`Deploying ZolarItems...`)
  const [contract] = await deployContract(privateKey, code, init)
  return contract;
};

const deployEmporium = async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/ZGrandEmporium.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_owner", "ByStr20", address),
  ]

  console.info(`Deploying Emporium...`)
  const [contract] = await deployContract(privateKey, code, init)
  return contract;
};

const deployResourceStore = async ({ emporium, huny_token }) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/resource/ZolarResourceShop.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_owner", "ByStr20", address),
    param("emporium", "ByStr20", emporium),
    param("huny_token", "ByStr20", huny_token),
  ]

  console.info(`Deploying Resource Store...`)
  const [contract] = await deployContract(privateKey, code, init)
  return contract;
};

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const hunyContract = await deployHunyToken({ name: "Huny Token", symbol: "HUNY", decimals: "12" });
  const hunyAddress = hunyContract.address.toLowerCase();

  const emporiumContract = await deployEmporium();
  const emporiumAddress = emporiumContract.address.toLowerCase();

  const resourceStallContract = await deployResourceStore({ emporium: emporiumAddress, huny_token: hunyAddress });
  const resourceStallAddress = resourceStallContract.address.toLowerCase();

  const geodeContract = await deployResource("ZolarGeode", { name: "Geode - Zolar Resource", symbol: "zlrGEODE", decimals: "2" });
  const geodeAddress = geodeContract.address.toLowerCase();

  const berryContract = await deployResource("ZolarElderberry", { name: "Elderberry - Zolar Resource", symbol: "zlrBERRY", decimals: "2" });
  const berryAddress = berryContract.address.toLowerCase();

  const scrapContract = await deployResource("ZolarZolraniumScrap", { name: "Scraps - Zolar Resource", symbol: "zlrSCRAP", decimals: "2" });
  const scrapAddress = scrapContract.address.toLowerCase();

  const itemsContract = await deployItems();
  const itemsAddress = itemsContract.address.toLowerCase();

  const gemRefineryContract = await deployGemRefinery({ geodeAddress, itemsAddress });
  const gemRefineryAddress = gemRefineryContract.address.toLowerCase();

  const txAddMinterRefinery = await callContract(privateKey, itemsContract, "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false);
  console.log("add refinery as items minter", txAddMinterRefinery.id);

  const txAddMinter1 = await callContract(privateKey, geodeContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter", txAddMinter1.id);

  const txAddMinter2 = await callContract(privateKey, berryContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter", txAddMinter2.id);

  const txAddMinter3 = await callContract(privateKey, scrapContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter", txAddMinter3.id);

  const txAddStall = await callContract(privateKey, emporiumContract, "AddStall", [
    param('address', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall", txAddStall.id);

  const txAddItem = await callContract(privateKey, resourceStallContract, "AddItem", [
    param('item_name', 'String', "Zolar Geode"),
    param('resource', 'ByStr20', geodeAddress),
    param('buy_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "2", "1"]
    }),
    param('sell_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "2", "1"]
    })], 0, false, false)
  console.log("add item", txAddItem.id);

  const txMint = await callContract(privateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', address),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMint.id);

  const txAllowance = await callContract(privateKey, hunyContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', emporiumAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("increase allowance huny", txAllowance.id);

  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
    param('purchase_data', 'String', "100000"),
  ], 0, false, false)
  console.log("purchase geode", txPurchaseGeode.id);

  const txPurchaseGeodeAgain = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 5).toString(10)),
    param('purchase_data', 'String', "100"),
  ], 0, false, false)
  console.log("purchase geode", txPurchaseGeodeAgain.id);

  const txResourceAllowance = await callContract(privateKey, geodeContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', resourceStallAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 5)),
  ], 0, false, false)
  console.log("increase allowance geode", txResourceAllowance.id);

  const txSellGeode = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', "0"),
    param('quantity', 'Uint128', "100"),
  ], 0, false, false)
  console.log("sell geode", txSellGeode.id);

  const txRefineryAllowance = await callContract(privateKey, geodeContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', emporiumAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("increase allowance geode", txRefineryAllowance.id);

  const txRefineGeode = await callContract(privateKey, gemRefineryContract, "BeginGeodeRefinement", [
    param('quantity', 'Uint128', "100"),
  ], 0, false, false)
  console.log("refine geode", txRefineGeode.id);

  const txConcludeRefine = await callContract(privateKey, gemRefineryContract, "ConcludeGeodeRefinement", [
    param('refinement_id', 'Uint256', "0"),
    param('gems', 'List String', ["INT"]),
  ], 0, false, false)
  console.log("conclude refinement", txConcludeRefine.id);
})();
