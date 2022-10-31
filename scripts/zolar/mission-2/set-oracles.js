const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { toBech32Address } = require("@zilliqa-js/crypto")
const { createTransaction } = require("../../call");
const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const zomgItems = require('./zomg-items.json')

  ;
(async () => {
  const privateKey = getPrivateKey();

  const refineryAddress = process.env.GEM_REFINERY_CONTRACT_HASH;
  const gQuestAddress = process.env.QUEST_GEODE_CONTRACT_HASH;
  const bQuestAddress = process.env.QUEST_BERRY_CONTRACT_HASH;
  const sQuestAddress = process.env.QUEST_SCRAP_CONTRACT_HASH;
  const oracleAddress = process.env.ORACLE_ADDRESS;

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  console.log('setting oracles')
  for (const address of [gQuestAddress, bQuestAddress, sQuestAddress, refineryAddress]) {
    const data = JSON.stringify({
      _tag: "SetOracle",
      params: [
        param('oracle', 'ByStr20', oracleAddress),
      ]
    })

    const newTx = await createTransaction(toBech32Address(address), data, minGasPrice)
    txList.push(newTx)
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);
  if (!batchResult) console.log(`error setting oracles: ${oracleAddress}`)
  else console.log(`successfuly setting oracles: ${oracleAddress}`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to set oracles: \n', result)
  }
})();
