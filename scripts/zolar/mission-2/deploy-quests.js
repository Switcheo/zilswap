const { getPrivateKey, zilliqa, param, useKey } = require("../../zilliqa");
const { deployQuest, ONE_HUNY } = require("./helper");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto")

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
    harvestFeePerEpoch: ONE_HUNY.times(100), // 100 HUNY
    numEpochsWaiveHarvest: '14', // 2 weeks to waive percentage harvest fee
    percentageBps: '10000', // percentage of init harvest fee to be waived
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
    harvestFeePerEpoch: ONE_HUNY.times(100), // 100 HUNY
    numEpochsWaiveHarvest: '14', // 2 weeks to waive percentage harvest fee
    percentageBps: '10000', // percentage of init harvest fee to be waived
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
    harvestFeePerEpoch: ONE_HUNY.times(100), // 100 HUNY
    numEpochsWaiveHarvest: '14', // 2 weeks to waive percentage harvest fee
    percentageBps: '10000', // percentage of init harvest fee to be waived
    returnFee: ONE_HUNY.times(200), // 200 HUNY
  });
  const questBerryAddress = questBerryContract.address.toLowerCase();

  // add questContracts as minter for their respective resource + huny (for resource minting plus fees)

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  // add questScrap as minter for z-scraps
  const dataAddMinter1 = JSON.stringify({
    _tag: "AddMinter",
    params: [
      param('minter', 'ByStr20', questScrapAddress),
    ]
  })
  const bech32ScrapAddress = toBech32Address(scrapAddress)
  const txAddMinter1 = await createTransaction(bech32ScrapAddress, dataAddMinter1, minGasPrice)
  txList.push(txAddMinter1)
  console.log(`add quest: ${questScrapAddress} as minter for z-scrap contract`, scrapAddress);

  // add questGeode as minter for geodes
  const dataAddMinter2 = JSON.stringify({
    _tag: "AddMinter",
    params: [
      param('minter', 'ByStr20', questGeodeAddress),
    ]
  })
  const bech32GeodeAddress = toBech32Address(geodeAddress)
  const txAddMinter2 = await createTransaction(bech32GeodeAddress, dataAddMinter2, minGasPrice)
  txList.push(txAddMinter2)
  console.log(`add quest: ${questGeodeAddress} as minter for geode contract`, geodeAddress);

  // add questBerry as minter for berry
  const dataAddMinter3 = JSON.stringify({
    _tag: "AddMinter",
    params: [
      param('minter', 'ByStr20', questBerryAddress),
    ]
  })
  const bech32BerryAddress = toBech32Address(berryAddress)
  const txAddMinter3 = await createTransaction(bech32BerryAddress, dataAddMinter3, minGasPrice)
  txList.push(txAddMinter3)
  console.log(`add quest: ${questBerryAddress} as minter for berry contract`, berryAddress);

  // add questContracts as minter for huny
  for (const contractAddress of [questScrapAddress, questGeodeAddress, questBerryAddress]) {
    const dataAddMinter = JSON.stringify({
      _tag: "AddMinter",
      params: [
        param('minter', 'ByStr20', contractAddress),
      ]
    })
    const bech32HunyAddress = toBech32Address(hunyAddress)
    const txAddMinter = await createTransaction(bech32HunyAddress, dataAddMinter, minGasPrice)
    txList.push(txAddMinter)
    console.log(`add quest: ${contractAddress} as minter for huny contract`, hunyAddress);
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to add minter: \n', result)
  }

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nQuest Scrap      `, questScrapAddress);
  console.log(`\nQuest Geode      `, questGeodeAddress);
  console.log(`\nQuest Berry      `, questBerryAddress);
})();
