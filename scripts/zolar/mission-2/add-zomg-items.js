const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { toBech32Address } = require("@zilliqa-js/crypto")
const { createTransaction } = require("../../call");
const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const zomgItems = require('./zomg-items.json')

;
(async () => {
  const privateKey = getPrivateKey();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH;
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;
  const zomgAddress = process.env.ZOMG_CONTRACT_HASH;
  const berryAddress = process.env.BERRY_CONTRACT_HASH;
  const scrapAddress = process.env.SCRAP_CONTRACT_HASH;

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  console.log('adding ZOMG Store items')
  for (const item of zomgItems) {
    const itemName = item.traits["Name"]
    const traits = Object.entries(item.traits).map(entry => {
      const key = entry[0]
      const value = entry[1]
      return {
        constructor: 'Pair',
        argtypes: ['String', 'String'],
        arguments: [key, value]
      }
    })

    const cost = item.cost.map(entry => {
      let materialAddress = ''
      const { material, quantity, traits } = entry
      if (material === 'HUNY') materialAddress = hunyAddress
      else if (material === 'SCRAP') materialAddress = scrapAddress
      else if (material === 'BERRY') materialAddress = berryAddress
      else if (material === 'ITEM') materialAddress = itemsAddress
      else return

      return {
        constructor: `${zomgAddress}.CraftingCost`,
        argtypes: [],
        arguments: [materialAddress, quantity, traits]
      }
    })
    
    console.log(`adding ${itemName} to ZOMG store`)

    const data = JSON.stringify({
        _tag: "AddItem",
        params: [
            param('item_name', 'String', itemName),
            param('token_address', 'ByStr20', itemsAddress),
            param('traits', 'List (Pair String String)', traits),
            param('cost', `List ${zomgAddress}.CraftingCost`, cost)
        ]
    })

    const bech32ZomgAddress = toBech32Address(zomgAddress)

    const newTx = await createTransaction(bech32ZomgAddress, data, minGasPrice)
    txList.push(newTx)
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);
  if (!batchResult) console.log('error adding items to ZOMG Store')

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to add item: \n', result)
  }
})();
