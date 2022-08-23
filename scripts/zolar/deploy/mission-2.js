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

const deployMetazoa = async ({
} = {}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/Metazoa.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_contract_owner", "ByStr20", address),
    param("initial_base_uri", "String", "https://api.zolar.io/metazoa/metadata/"),
    param("name", "String", "Metazoa"),
    param("symbol", "String", "ZOA"),
  ]

  console.info(`Deploying Metazoa...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
};

const deployProfessions = async ({
  metazoaAddress
} = {}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/profession/ZolarProfessions.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_owner", "ByStr20", address),
    param("initial_attributes", "List String", ["STR", "DEX", "INT", "LUK"]),
    param("initial_professions", "List String", ["STR", "DEX", "INT"]),
  ]

  console.info(`Deploying ZolarProfessions...`)
  const [contract] = await deployContract(privateKey, code, init)

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

  const metazoaContract = await deployMetazoa();
  const metazoaAddress = metazoaContract.address.toLowerCase();

  const professionsContract = await deployProfessions({ metazoaAddress });
  const professionsAddress = professionsContract.address.toLowerCase();

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

  const txMintMetazoa = await callContract(privateKey, metazoaContract, "Mint", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', ''),
  ], 0, false, false);
  console.log("mint metazoa metazoa", txMintMetazoa.id);

  // transfer metazoa ownership to professions proxy contract
  const txTransferOwnership = await callContract(privateKey, metazoaContract, "SetContractOwnershipRecipient", [
    param('to', 'ByStr20', professionsAddress),
  ], 0, false, false);
  console.log("transfer metazoa ownership to proxy", txTransferOwnership.id);

  const txAcceptOwnershipt = await callContract(privateKey, professionsContract, "AcceptContractOwnership", [
    param('new_metazoa_address', 'ByStr20', metazoaAddress),
  ], 0, false, false);
  console.log("accept metazoa ownership for proxy", txAcceptOwnershipt.id);

  const txSetTokenTraits = await callContract(privateKey, professionsContract, "SetTokenTraits", [
    param('token_id', 'Uint256', '1'),
    param('proposed_traits', 'List (Pair String String)', [{
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['Trait1', 'Value1'],
    }, {
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['Profession', 'WrongValue'],
    }]),
  ], 0, false, false);
  console.log("set token trait for 1", txSetTokenTraits.id);

  const { traits } = await metazoaContract.getSubState("traits", ["1"]);
  console.log("verify trait set", traits["1"][0].arguments.join(": "), traits["1"][1].arguments.join(": "));

  const txUpdateProfession = await callContract(privateKey, professionsContract, "BulkUpdateProfession", [
    param('params', 'List (Pair Uint256 String)', [{
      constructor: 'Pair',
      argtypes: ['Uint256', 'String'],
      arguments: ['1', 'STR'],
    }]),
  ], 0, false, false);
  console.log("Update Profession", txUpdateProfession.id);

  const { traits: newTraits } = await metazoaContract.getSubState("traits", ["1"]);
  console.log("verify trait set", newTraits["1"][0].arguments.join(": "), newTraits["1"][1].arguments.join(": "));

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
    param('quantity', 'Uint128', "500"),
  ], 0, false, false)
  console.log("refine geode", txRefineGeode.id);

  const txConcludeRefine = await callContract(privateKey, gemRefineryContract, "ConcludeRefinement", [
    param('refinement_id', 'Uint256', "0"),
    param('gems', 'List String', ["INT", "INT", "INT", "INT"]),
  ], 0, false, false)
  console.log("conclude refinement", txConcludeRefine.id);

  const txAddOperator = await callContract(privateKey, itemsContract, "AddOperator", [
    param('operator', 'ByStr20', gemRefineryAddress),
  ], 0, false, false)
  console.log("item add refinery as operator", txAddOperator.id);

  const txEnhanceGem = await callContract(privateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, {
      constructor: `${gemRefineryAddress}.TierB`,
      argtypes: [],
      arguments: []
    }),
    param('base_gem_token_id', 'Uint256', "1"),
    param('material_gem_token_ids', 'List Uint256', ["2", "3", "4"]),
  ], 0, false, false)
  console.log("enhance gem", txEnhanceGem.id);

  const txConcludeEnhance = await callContract(privateKey, gemRefineryContract, "ConcludeRefinement", [
    param('refinement_id', 'Uint256', "1"),
    param('gems', 'List String', ["INT"]),
  ], 0, false, false)
  console.log("conclude enhancement", txConcludeEnhance.id);
})();
