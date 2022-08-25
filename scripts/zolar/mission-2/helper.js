const fs = require("fs");
const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { deployContract } = require("../../deploy");
const { getPrivateKey, param } = require("../../zilliqa");
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

module.exports = {
  ONE_HUNY,
  deployHunyToken,
  deployMetazoa,
  deployProfessions,
  deployResource,
  deployItems,
  deployGemRefinery,
  deployEmporium,
  deployResourceStore,
}
