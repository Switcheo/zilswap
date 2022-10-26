const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { deployZOMGStore } = require("./helper");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto")

;
(async () => {
  const privateKey = getPrivateKey();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH;
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;
  const geodeAddress = process.env.GEODE_CONTRACT_HASH;
  const berryAddress = process.env.BERRY_CONTRACT_HASH;
  const scrapAddress = process.env.SCRAP_CONTRACT_HASH;

  const zomgStallContract = await deployZOMGStore();
  const zomgStallAddress = zomgStallContract.address.toLowerCase();

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  // add consumable type into list of white-listed consumables
  const dataAddConsumable = JSON.stringify({
    _tag: "AddConsumable",
    params: [
      param('name', 'String', 'Consumable'),
    ]
  })
  const bech32ZomgStallAddress = toBech32Address(zomgStallAddress)
  const txAddConsumable = await createTransaction(bech32ZomgStallAddress, dataAddConsumable, minGasPrice)
  txList.push(txAddConsumable)
  console.log('add consumable type into consumable whitelist', zomgStallAddress)

  for (const contractAddress of [itemsAddress, hunyAddress, geodeAddress, berryAddress, scrapAddress]) {
    // add zomgStall as minter for the following contracts
    const dataAddMinter = JSON.stringify({
      _tag: "AddMinter",
      params: [
        param('minter', 'ByStr20', zomgStallAddress),
      ]
    })
    const bech32Address = toBech32Address(contractAddress)
    const txAddMinter = await createTransaction(bech32Address, dataAddMinter, minGasPrice)
    txList.push(txAddMinter)
    console.log("add zomg store as minter", contractAddress);
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('the following tx failed:\n', result)
  }

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nZOMG Store `, zomgStallAddress);
})();
