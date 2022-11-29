const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto")

const adt = (constructor, argtypes, args) => {
    return { constructor, argtypes, arguments: args }
}

;
(async () => {
  const privateKey = getPrivateKey();

  const gemRefineryAddress = process.env.GEM_REFINERY_CONTRACT_HASH.toLowerCase()

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  const mintData1 = require('./mint-data-1.json') // length 514
  const mint1Batch1 = [] // length 172, used to conclude refinment
  const mintData2 = require('./mint-data-2.json') // length 370
  const mint2Batch1 = [] // length 185, used to conclude refinemnt

  for (let i = 0; i < mintData1.length; i++) {
    const data = mintData1[i]
    if (i < 172) {
      // used to conclude refinement, no need to change struc
      mint1Batch1.push(data)
      continue
    } else break
  }

  for (let i = 0; i < mintData2.length; i++) {
    const data = mintData2[i]
    if (i < 185) {
      // used to conclude refinement, no need to change struc
      mint2Batch1.push(data)
      continue
    } else break
  }

  // first batch for concluding refinement
  const dataMint1Batch1 = JSON.stringify({
    _tag: "ConcludeRefinement",
    params: [
      param('refinement_id', 'Uint256', '516'),
      param('gems', `List ${gemRefineryAddress}.Gem`, mint1Batch1)
    ]
  })

  // first batch for concluding refinement
  const dataMint2Batch1 = JSON.stringify({
    _tag: "ConcludeRefinement",
    params: [
      param('refinement_id', 'Uint256', '517'),
      param('gems', `List ${gemRefineryAddress}.Gem`, mint2Batch1)
    ]
  })

  const bech32GemRefineryAddress = toBech32Address(gemRefineryAddress)

  // first batch for conclude refinement to Gem Refinery
  const txMint1Batch1 = await createTransaction(bech32GemRefineryAddress, dataMint1Batch1, minGasPrice)
  txList.push(txMint1Batch1)
  console.log('adding mint1batch1')

  // first batch for conclude refinement to Gem Refinery
  const txMint2Batch1 = await createTransaction(bech32GemRefineryAddress, dataMint2Batch1, minGasPrice)
  txList.push(txMint2Batch1)
  console.log('adding mint2batch1')

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);

  if (!batchResult) console.log(`error concluding refinements`)
  else console.log(`successfuly concluded refinements`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('the following tx failed:\n', result)
  }
})();
