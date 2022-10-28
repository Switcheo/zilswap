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
    param("initial_metazoa_address", "ByStr20", metazoaAddress),
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
  baseUri,
} = {}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/item/ZolarItems.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_contract_owner", "ByStr20", address),
    param("initial_base_uri", "String", baseUri),
    param("initial_royalty_recipient", "ByStr20", address),
    param("initial_royalty_bps", "Uint128", "500"),
    param("name", "String", "Zolar Items"),
    param("symbol", "String", "zlrITEM"),
  ]

  console.info(`Deploying ZolarItems...`)
  const [contract] = await deployContract(privateKey, code, init)
  return contract;
};

const deployGemRefinery = async ({
  itemsAddress,
  geodeAddress,
  feeAddress,
  refinementFee,
  enhancementFee
} = {}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/item/ZolarGemRefinery.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_owner", "ByStr20", address),
    param("initial_items_address", "ByStr20", itemsAddress),
    param("initial_geode_address", "ByStr20", geodeAddress),
    param("initial_gem_affinities", "List String", ["INT", "STR", "DEX", "LUK", "SPD", "END", "ACC"]),
    param("initial_fee_contract", "ByStr20", feeAddress),
    param("initial_refinement_fee", "Uint128", refinementFee),
    param("initial_enhancement_fee", "Uint128", enhancementFee),
  ]

  console.info(`Deploying ZolarGemRefinery...`)
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

const deployZOMGStore = async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/item/ZolarOMGShop.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("initial_owner", "ByStr20", address),
  ]

  console.info(`Deploying Item Store...`)
  const [contract] = await deployContract(privateKey, code, init)
  return contract;
};

const deployQuest = async ({questName, resourceContract, metazoaContract, epoch, resourcePerEpoch, xpPerEpoch, feeContract, harvestFeePerEpoch, numEpochsWaiveHarvest, percentageBps, returnFee}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile(`./src/zolar/quest/ZolarQuest.scilla`)).toString()
  const init = [
    param("_scilla_version", "Uint32", "0"),
    param("name", "String", questName),
    param("initial_owner", "ByStr20", address),
    param("initial_oracle", "ByStr20", address),
    param("resource_contract", "ByStr20", resourceContract),
    param("metazoa_contract", "ByStr20", metazoaContract),
    param("initial_blocks_required_to_harvest", "Uint128", epoch),
    param("initial_resource_per_epoch", "Uint128", resourcePerEpoch),
    param("initial_xp_per_epoch", "Uint128", xpPerEpoch),
    param("initial_fee_contract", "ByStr20", feeContract),
    param("initial_harvest_fee_per_epoch", "Uint128", harvestFeePerEpoch),
    param("initial_num_epochs_waive_harvest", "Uint32", numEpochsWaiveHarvest),
    param("initial_waive_harvest_percentage_bps", "Uint128", percentageBps),
    param("initial_return_fee", "Uint128", returnFee),
  ]

  console.info(`Deploying Quest Contract: ${questName}...`)
  const [contract] = await deployContract(privateKey, code, init)
  return contract;
}

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
  deployZOMGStore,
  deployQuest
}
