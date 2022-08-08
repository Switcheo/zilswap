
const { Transaction, TxStatus } = require('@zilliqa-js/account')
const { bytes, BN, Long, toBech32Address, fromBech32Address } = require('@zilliqa-js/zilliqa')
const { zilliqa, VERSION } = require('../../zilliqa')
const list = require('../whitelist/mint-whitelist.json')

const BATCH_SIZE = 500

async function setWhitelist() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')

  const contract = zilliqa.contracts.at(process.env.MOON_BATTLE_CONTRACT_HASH);
  const value = Object.keys(list).map((addr) => {
    return {
      constructor: 'Pair',
      argtypes: ['ByStr20', 'Uint32'],
      arguments: [addr, list[addr].toString()],
    }
  })
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const params = {
    version: VERSION,
    amount: new BN(0),
    gasPrice: new BN(minGasPrice.result),
    gasLimit: Long.fromNumber(20000),
  };

  const txList = [];
  while (value.length > 0) {
    const v = value.splice(0, Math.min(value.length, BATCH_SIZE))

    const tx = new Transaction({
      ...params,
      toAddr: contract.address,
      data: JSON.stringify({
        _tag: "SetWhitelist",
        params: [{
          vname: 'list',
          type: 'List (Pair ByStr20 Uint32)',
          value: v,
        }],
      }),
    },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    );

    txList.push(tx);
  }
  zilliqa.wallet.addByPrivateKey(key);
  const signedTxList = await zilliqa.wallet.signBatch(txList);

  // send batch transaction
  await zilliqa.blockchain.createBatchTransaction(signedTxList);

  const state = await contract.getState()
  console.log(`Whitelist target: ${Object.keys(list).length} | Whitelist state: ${Object.keys(state.whitelist).length}`)
}

setWhitelist().then(() => console.log('done.'))
