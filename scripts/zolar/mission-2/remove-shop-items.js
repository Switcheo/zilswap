const { toBech32Address } = require("@zilliqa-js/crypto")
const { createTransaction } = require("../../call");
const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");

;
(async () => {
  const privateKey = getPrivateKey();

  const shopAddress = process.env.RESOURCE_SHOP_CONTRACT_HASH;

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []
  const itemsToRemove = ['9', '10', '11']

  console.log('removing Resource Store items')
  for (const id of itemsToRemove) {
    const data = JSON.stringify({
        _tag: "RemoveItem",
        params: [
            param('item_id', 'Uint128', id),
        ]
    })

    console.log(`removing item ${id} from Resource store`)

    const bech32ShopAddress = toBech32Address(shopAddress)
    const newTx = await createTransaction(bech32ShopAddress, data, minGasPrice)
    txList.push(newTx)
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);
  if (!batchResult) console.log(`error removing items from Resource Store: ${shopAddress}`)
  else console.log(`successfuly removed items from Resource Store: ${shopAddress}`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to remove item: \n', result)
  }
})();
