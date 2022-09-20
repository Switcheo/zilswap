const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey } = require("../../zilliqa");
const { deployQuest, ONE_HUNY } = require("./helper");


;
(async () => {
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

 

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nQuest Scrap      `, questScrapAddress);
  console.log(`\nQuest Geode      `, questGeodeAddress);
  console.log(`\nQuest Berry      `, questBerryAddress);
})();
