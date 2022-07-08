const { Transaction, TxStatus } = require('@zilliqa-js/account')
const { bytes, BN, Long, toBech32Address, fromBech32Address, getAddressFromPrivateKey } = require('@zilliqa-js/zilliqa')
const { zilliqa, VERSION } = require('../../zilliqa')

const BATCH_SIZE = 150 // max per block ~165

async function setTokenTraits() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')

  const contractAddress = fromBech32Address(toBech32Address(process.env.METAZOA_CONTRACT_HASH));
  console.log("contract", contractAddress)
  console.log("sender", getAddressFromPrivateKey(key).toLowerCase())

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  const params = {
    version: VERSION,
    amount: new BN(0),
    gasPrice: new BN(minGasPrice.result),
    gasLimit: Long.fromNumber(20000),
  };

  const txList = [new Transaction(
    {
      ...params,
      toAddr: contractAddress,
      data: JSON.stringify({
        _tag: "SetTokenTraits",
        params: [{
          vname: "token_id",
          type: "Uint256",
          value: "211",
        }, {
          vname: "proposed_traits",
          type: "List (Pair String String)",
          value: [{
            argtypes: ["String", "String"],
            arguments: ["generation", "3"],
            constructor: "Pair"
          }, {
            argtypes: ["String", "String"],
            arguments: ["race", "ursa"],
            constructor: "Pair"
          }],
        }],
      }),
    },
    zilliqa.provider,
    TxStatus.Initialised,
    true,
  )];

  console.log("txs", txList.length);

  zilliqa.wallet.addByPrivateKey(key);
  const signedTxList = await zilliqa.wallet.signBatch(txList);

  // send batch transaction
  await zilliqa.blockchain.createBatchTransaction(signedTxList);
}

setTokenTraits().then(() => console.log('done.'))
