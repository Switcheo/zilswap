const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { ONE_HUNY } = require("./helper");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto")

;
(async () => {
  const privateKey = getPrivateKey();

  const resourceStallAddress = process.env.RESOURCE_SHOP_CONTRACT_HASH.toLowerCase();
  const geodeAddress = process.env.GEODE_CONTRACT_HASH.toLowerCase();
  const berryAddress = process.env.BERRY_CONTRACT_HASH.toLowerCase();
  const scrapAddress = process.env.SCRAP_CONTRACT_HASH.toLowerCase();
  const emporiumAddress = process.env.EMPORIUM_CONTRACT_HASH.toLowerCase();
  const hunyAddress = process.env.HUNY_CONTRACT_HASH.toLowerCase();

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  for (const contractAddress of [geodeAddress, berryAddress, scrapAddress, hunyAddress]) {
    // add resource stall as minter for the following contracts
    const dataAddMinter = JSON.stringify({
      _tag: "AddMinter",
      params: [
        param('minter', 'ByStr20', resourceStallAddress),
      ]
    })
    const bech32Address = toBech32Address(contractAddress)
    const txAddMinter = await createTransaction(bech32Address, dataAddMinter, minGasPrice)
    txList.push(txAddMinter)
    console.log("add resource stall as minter", contractAddress);
  }

  // add resource stall into grand emporium
  const dataAddStall = JSON.stringify({
    _tag: "AddStall",
    params: [
      param('address', 'ByStr20', resourceStallAddress),
    ]
  })
  const bech32EmporiumAddress = toBech32Address(emporiumAddress)
  const txAddStall = await createTransaction(bech32EmporiumAddress, dataAddStall, minGasPrice)
  txList.push(txAddStall)
  console.log("add resource stall to grand emporium", emporiumAddress);

  // add resources to stall
  // add geode to stall
  const dataAddItem1 = JSON.stringify({
    _tag: "AddItem",
    params: [
      param('item_name', 'String', "Zolar Geode"),
      param('resource', 'ByStr20', geodeAddress),
      param('buy_price', `${resourceStallAddress}.Price`, {
        constructor: `${resourceStallAddress}.Price`,
        argtypes: [],
        arguments: [ONE_HUNY.times(28).toString(10), ONE_HUNY.times(2_800).toString(10), "100", "50"]
      }),
      param('sell_price', `${resourceStallAddress}.Price`, {
        constructor: `${resourceStallAddress}.Price`,
        argtypes: [],
        arguments: [ONE_HUNY.times(14).toString(10), ONE_HUNY.times(420).toString(10), "50", "100"]
      })]
  })
  const bech32StallAddress = toBech32Address(resourceStallAddress)
  const txAddItem1 = await createTransaction(bech32StallAddress, dataAddItem1, minGasPrice)
  txList.push(txAddItem1)
  console.log("add geode to stall", geodeAddress);
  
  // add berry to stall
  const dataAddItem2 = JSON.stringify({
    _tag: "AddItem",
    params: [
      param('item_name', 'String', "Zolar Elderberry"),
      param('resource', 'ByStr20', berryAddress),
      param('buy_price', `${resourceStallAddress}.Price`, {
        constructor: `${resourceStallAddress}.Price`,
        argtypes: [],
        arguments: [ONE_HUNY.times(80).toString(10), ONE_HUNY.times(8_500).toString(10), "100", "50"]
      }),
      param('sell_price', `${resourceStallAddress}.Price`, {
        constructor: `${resourceStallAddress}.Price`,
        argtypes: [],
        arguments: [ONE_HUNY.times(40).toString(10), ONE_HUNY.times(1_200).toString(10), "50", "100"]
      })]
  })
  const txAddItem2 = await createTransaction(bech32StallAddress, dataAddItem2, minGasPrice)
  txList.push(txAddItem2)
  console.log("add berry to stall", berryAddress);

  // add scrap to stall
  const dataAddItem3 = JSON.stringify({
    _tag: "AddItem",
    params: [
      param('item_name', 'String', "Zolranium Scraps"),
      param('resource', 'ByStr20', geodeAddress),
      param('buy_price', `${resourceStallAddress}.Price`, {
        constructor: `${resourceStallAddress}.Price`,
        argtypes: [],
        arguments: [ONE_HUNY.times(28).toString(10), ONE_HUNY.times(2_800).toString(10), "100", "50"]
      }),
      param('sell_price', `${resourceStallAddress}.Price`, {
        constructor: `${resourceStallAddress}.Price`,
        argtypes: [],
        arguments: [ONE_HUNY.times(14).toString(10), ONE_HUNY.times(420).toString(10), "50", "100"]
      })]
  })
  const txAddItem3 = await createTransaction(bech32StallAddress, dataAddItem3, minGasPrice)
  txList.push(txAddItem3)
  console.log("add scrap to stall", scrapAddress);

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);

  if (!batchResult) console.log(`error adding resources to shop`)
  else console.log(`successfuly added resources to shop`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('the following tx failed:\n', result)
  }
})();
