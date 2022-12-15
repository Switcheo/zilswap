const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { ONE_HUNY } = require("./helper");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto");
const { default: BigNumber } = require("bignumber.js");

const BN_ONE = new BigNumber(1);

;
(async () => {
  const privateKey = getPrivateKey();

  const resourceStallAddress = process.env.RESOURCE_SHOP_CONTRACT_HASH.toLowerCase();
  // insert resource item ids to be updated here
  const itemIds = ['9', '10', '11']

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  for (const itemId of itemIds) {
    const dataUpdateTransact = JSON.stringify({
      _tag: "UpdateTransact",
      params: [
        param('item_id', 'Uint128', itemId),
        param('buy_quantity', 'Uint128', '0'),
        param('sell_quantity', 'Uint128', '10000'),
      ]
    })
    const bech32Address = toBech32Address(resourceStallAddress)
    const txUpdateTransact = await createTransaction(bech32Address, dataUpdateTransact, minGasPrice)
    txList.push(txUpdateTransact)
    console.log(`update transact count for item: ${itemId} on resourceStall contract`, resourceStallAddress);
  }

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
