const { toBech32Address } = require("@zilliqa-js/crypto")
const { createTransaction } = require("../../call");
const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { ONE_HUNY } = require("./helper");

  ;
(async () => {
  const privateKey = getPrivateKey();

  const gQuestAddress = process.env.QUEST_GEODE_CONTRACT_HASH;
  const bQuestAddress = process.env.QUEST_BERRY_CONTRACT_HASH;
  const sQuestAddress = process.env.QUEST_SCRAP_CONTRACT_HASH;

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  console.log('setting harvest fees')
  for (const address of [
    gQuestAddress,
    bQuestAddress,
    sQuestAddress,
  ]) {
    const data = JSON.stringify({
      _tag: "SetHarvestFeePerEpoch",
      params: [
        param('fee', 'Uint128', ONE_HUNY.times(1200).toString(10)), // 1200 HUNY
      ]
    })

    const newTx = await createTransaction(toBech32Address(address), data, minGasPrice)
    txList.push(newTx)
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);
  if (!batchResult) console.log(`error setting harvest fee`)
  else console.log(`successfuly setting harvest fee`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to set harvest fee: \n', result)
  }
})();
