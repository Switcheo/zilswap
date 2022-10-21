const { toBech32Address } = require("@zilliqa-js/crypto")
const { createTransaction } = require("../../call");
const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");

;
(async () => {
  const privateKey = getPrivateKey();

  const zomgAddress = process.env.ZOMG_CONTRACT_HASH;

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []
  const itemsToRemove = ['7', '10']

  console.log('removing ZOMG Store items')
  for (const id of itemsToRemove) {
    const data = JSON.stringify({
        _tag: "RemoveItem",
        params: [
            param('item_id', 'Uint128', id),
        ]
    })

    console.log(`removing item ${id} to ZOMG store`)

    const bech32ZomgAddress = toBech32Address(zomgAddress)
    const newTx = await createTransaction(bech32ZomgAddress, data, minGasPrice)
    txList.push(newTx)
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);
  if (!batchResult) console.log(`error removing items from ZOMG Store: ${zomgAddress}`)
  else console.log(`successfuly removed items from ZOMG Store: ${zomgAddress}`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to remove item: \n', result)
  }
})();
