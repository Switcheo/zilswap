const { callContract } = require("../../call");
const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto")

;
(async () => {
  const privateKey = getPrivateKey();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH.toLowerCase();
  const zomgAddress = process.env.ZOMG_CONTRACT_HASH.toLowerCase();
  const refineryAddress = process.env.GEM_REFINERY_CONTRACT_HASH.toLowerCase();

  const itemContract = zilliqa.contracts.at(itemsAddress)

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  for (const contractAddress of [zomgAddress, refineryAddress]) {
    // add following addresses as consumer for items contract
    const dataAddConsumer = JSON.stringify({
      _tag: "AddConsumer",
      params: [
        param('consumer', 'ByStr20', contractAddress),
      ]
    })
    const bech32ItemsAddress = toBech32Address(itemsAddress)
    const txAddConsumer = await createTransaction(bech32ItemsAddress, dataAddConsumer, minGasPrice)
    txList.push(txAddConsumer)
    console.log("add consumer for items contract", contractAddress);
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);

  if (!batchResult) console.log(`error adding item consumers`)
  else console.log(`successfuly added item consumers`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('the following tx failed:\n', result)
  }
})();
