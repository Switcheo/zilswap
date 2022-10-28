const { getPrivateKey, param, zilliqa, useKey } = require("../../zilliqa");
const { deployGemRefinery, ONE_HUNY } = require("./helper");
const { createTransaction } = require("../../call");
const { toBech32Address } = require("@zilliqa-js/crypto")


;
(async () => {
  const privateKey = getPrivateKey();

  const itemsAddress = process.env.ITEMS_CONTRACT_HASH;
  const geodeAddress = process.env.GEODE_CONTRACT_HASH;
  const hunyAddress = process.env.HUNY_CONTRACT_HASH;

  const gemRefineryContract = await deployGemRefinery({ geodeAddress, itemsAddress, feeAddress: hunyAddress, refinementFee: ONE_HUNY.times(5), enhancementFee: ONE_HUNY.times(250)});
  const gemRefineryAddress = gemRefineryContract.address.toLowerCase();

  useKey(privateKey)
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = []

  for (const contractAddress of [itemsAddress, hunyAddress, geodeAddress]) {
    // add gemRefinery as minter for the following contracts
    const dataAddMinter = JSON.stringify({
      _tag: "AddMinter",
      params: [
        param('minter', 'ByStr20', gemRefineryAddress),
      ]
    })
    const bech32Address = toBech32Address(contractAddress)
    const txAddMinter = await createTransaction(bech32Address, dataAddMinter, minGasPrice)
    txList.push(txAddMinter)
    console.log("add gem refinery as minter", contractAddress);
  }

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('the following tx failed:\n', result)
  }

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nGemRefinery`, gemRefineryAddress);
})();
