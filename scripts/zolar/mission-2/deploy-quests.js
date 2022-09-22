const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey, zilliqa, param } = require("../../zilliqa");
const { deployQuest, ONE_HUNY } = require("./helper");
const { callContract } = require("../../call");

;
(async () => {
  const privateKey = getPrivateKey()
  const scrapAddress = process.env.SCRAP_CONTRACT_HASH;
  const geodeAddress = process.env.GEODE_CONTRACT_HASH;
  const berryAddress = process.env.BERRY_CONTRACT_HASH;
  const metazoaAddress = process.env.METAZOA_CONTRACT_HASH;
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;

  const questScrapContract = await deployQuest({
    questName: "Zolar Quest - Moon Battlegrounds",
    resourceContract: scrapAddress,
    metazoaContract: metazoaAddress,
    epoch: "2520",
    resourcePerEpoch: "2800",
    xpPerEpoch: "5",
    feeContract: hunyAddress,
    harvestFee: ONE_HUNY.times(100), // 100 HUNY
    returnFee: ONE_HUNY.times(200), // 200 HUNY
  });
  const questScrapAddress = questScrapContract.address.toLowerCase();

  const questGeodeContract = await deployQuest({
    questName: "Zolar Quest - Asteroid Belt",
    resourceContract: geodeAddress,
    metazoaContract: metazoaAddress,
    epoch: "2520",
    resourcePerEpoch: "2800",
    xpPerEpoch: "5",
    feeContract: hunyAddress,
    harvestFee: ONE_HUNY.times(100), // 100 HUNY
    returnFee: ONE_HUNY.times(200), // 200 HUNY
  });
  const questGeodeAddress = questGeodeContract.address.toLowerCase();

  const questBerryContract = await deployQuest({
    questName: "Zolar Quest - Elder Woodlands",
    resourceContract: berryAddress,
    metazoaContract: metazoaAddress,
    epoch: "2520",
    resourcePerEpoch: "1000",
    xpPerEpoch: "5",
    feeContract: hunyAddress,
    harvestFee: ONE_HUNY.times(100), // 100 HUNY
    returnFee: ONE_HUNY.times(200), // 200 HUNY
  });
  const questBerryAddress = questBerryContract.address.toLowerCase();

  // add questContracts as minter for their respective resource + huny (for resource minting plus fees)

  // add questScrap as minter for z-scraps
  const scrapContract = zilliqa.contracts.at(scrapAddress);
  const txAddMinter1 = await callContract(privateKey, scrapContract, "AddMinter", [
    param('minter', 'ByStr20', questScrapAddress),
  ], 0, false, false);
  console.log(`add quest: ${questScrapAddress} as minter for z-scrap contract`, scrapAddress, txAddMinter1.id);

  // add questGeode as minter for geodes
  const geodeContract = zilliqa.contracts.at(geodeAddress);
  const txAddMinter2 = await callContract(privateKey, geodeContract, "AddMinter", [
    param('minter', 'ByStr20', questGeodeAddress),
  ], 0, false, false);
  console.log(`add quest: ${questGeodeAddress} as minter for geode contract`, geodeAddress, txAddMinter2.id);

  // add questBerry as minter for berry
  const berryContract = zilliqa.contracts.at(berryAddress);
  const txAddMinter3 = await callContract(privateKey, berryContract, "AddMinter", [
    param('minter', 'ByStr20', questBerryAddress),
  ], 0, false, false);
  console.log(`add quest: ${questBerryAddress} as minter for berry contract`, berryAddress, txAddMinter3.id);

  // add questContracts as minter for huny
  for (const contract_address of [questScrapAddress, questGeodeAddress, questBerryAddress]) {
    const hunyContract = zilliqa.contracts.at(hunyAddress);
    const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [
      param('minter', 'ByStr20', contract_address),
    ], 0, false, false);
    console.log(`add quest: ${contract_address} as minter for huny contract`, hunyAddress, txAddMinter.id);
  }

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nQuest Scrap      `, questScrapAddress);
  console.log(`\nQuest Geode      `, questGeodeAddress);
  console.log(`\nQuest Berry      `, questBerryAddress);
})();
