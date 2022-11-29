const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto")

const adt = (constructor, argtypes, args) => {
    return { constructor, argtypes, arguments: args }
}

;
(async () => {
  const privateKey = getPrivateKey();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH.toLowerCase();

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  const mintData1 = require('./mint-data-1.json') // length 514
  const mint1Batch1 = []
  const mint1Batch2 = []
  const mint1Batch3 = []
  const mintData2 = require('./mint-data-2.json') // length 370
  const mint2Batch1 = []
  const mint2Batch2 = []

  const address1 = '0xa9cf3a2480db9a95bf6fe367af314a0a2fdec914'
  const address2 = '0x773fdc4383ac0c8298629b15cc13bb7f519e1c92'

  for (let i = 0; i < mintData1.length; i++) {
    const data = mintData1[i]
    const affinity = data.arguments[0]
    const traits = [
        adt('Pair', ['String', 'String'], ['Type', 'Gem']),
        adt('Pair', ['String', 'String'], ['Condition', 'Normal']),
        adt('Pair', ['String', 'String'], ['Tier', 'C']),
        adt('Pair', ['String', 'String'], ['Affinity', affinity]),
    ]
    const toTokenUriPair = adt('Pair', ['ByStr20', 'String'], [address1, ''])
    const toTokenUriTraitsPair = adt('Pair', ['Pair ByStr20 String', 'List (Pair String String)'], [toTokenUriPair, traits])
    if (i < 172) mint1Batch1.push(toTokenUriTraitsPair)
    else if (i < 344) mint1Batch2.push(toTokenUriTraitsPair)
    else mint1Batch3.push(toTokenUriTraitsPair)
  }

  for (let i = 0; i < mintData2.length; i++) {
    const data = mintData2[i]
    const affinity = data.arguments[0]
    const traits = [
        adt('Pair', ['String', 'String'], ['Type', 'Gem']),
        adt('Pair', ['String', 'String'], ['Condition', 'Normal']),
        adt('Pair', ['String', 'String'], ['Tier', 'C']),
        adt('Pair', ['String', 'String'], ['Affinity', affinity]),
    ]
    const toTokenUriPair = adt('Pair', ['ByStr20', 'String'], [address2, ''])
    const toTokenUriTraitsPair = adt('Pair', ['Pair ByStr20 String', 'List (Pair String String)'], [toTokenUriPair, traits])
    if (i < 185) mint2Batch1.push(toTokenUriTraitsPair)
    else mint2Batch2.push(toTokenUriTraitsPair)
  }

  const dataMint1Batch1 = JSON.stringify({
    _tag: "BatchMintAndSetTraits",
    params: [
        param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', mint1Batch1)
    ]
  })

  const dataMint1Batch2 = JSON.stringify({
    _tag: "BatchMintAndSetTraits",
    params: [
        param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', mint1Batch2)
    ]
  })

  const dataMint1Batch3 = JSON.stringify({
    _tag: "BatchMintAndSetTraits",
    params: [
        param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', mint1Batch3)
    ]
  })

  const dataMint2Batch1 = JSON.stringify({
    _tag: "BatchMintAndSetTraits",
    params: [
        param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', mint2Batch1)
    ]
  })

  const dataMint2Batch2 = JSON.stringify({
    _tag: "BatchMintAndSetTraits",
    params: [
        param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', mint2Batch2)
    ]
  })

  const bech32ItemsAddress = toBech32Address(itemsAddress)

  const txMint1Batch1 = await createTransaction(bech32ItemsAddress, dataMint1Batch1, minGasPrice)
  txList.push(txMint1Batch1)
  console.log('adding mint1batch1')

  const txMint1Batch2 = await createTransaction(bech32ItemsAddress, dataMint1Batch2, minGasPrice)
  txList.push(txMint1Batch2)
  console.log('adding mint1batch2')

  const txMint1Batch3 = await createTransaction(bech32ItemsAddress, dataMint1Batch3, minGasPrice)
  txList.push(txMint1Batch3)
  console.log('adding mint1batch3')

  const txMint2Batch1 = await createTransaction(bech32ItemsAddress, dataMint2Batch1, minGasPrice)
  txList.push(txMint2Batch1)
  console.log('adding mint2batch1')

  const txMint2Batch2 = await createTransaction(bech32ItemsAddress, dataMint2Batch2, minGasPrice)
  txList.push(txMint2Batch2)
  console.log('adding mint2batch2')

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);

  if (!batchResult) console.log(`error batch minting gems`)
  else console.log(`successfuly batch mint gems`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('the following tx failed:\n', result)
  }
})();
