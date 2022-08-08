
const { Transaction, TxStatus } = require('@zilliqa-js/account')
const { bytes, BN, Long, toBech32Address, fromBech32Address, getAddressFromPrivateKey } = require('@zilliqa-js/zilliqa')
const { zilliqa, VERSION } = require('../../zilliqa')
const zoaOwners = require("./zoa-owners.json");

const BATCH_SIZE = 100
const MINT_COUNT = 1300

async function batchMint() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')

  const selfAddress = getAddressFromPrivateKey(key).toLowerCase();

  const contractAddress = fromBech32Address(toBech32Address(process.env.METAZOA_CONTRACT_HASH));
  console.log("contract", contractAddress)

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  const txList = [];
  let lastMinted = 0;
  let tokenId = 1;
  const numTx = Math.ceil(MINT_COUNT / BATCH_SIZE);
  for (let i = 0; i < numTx; ++i) {
    console.log("preparing tx", i + 1, "of", numTx);

    const params = {
      version: VERSION,
      amount: new BN(0),
      gasPrice: new BN(minGasPrice.result),
      gasLimit: Long.fromNumber(20000),
    };

    const v = [];
    for (let j = lastMinted; j < lastMinted + BATCH_SIZE; ++j) {
      const owner = zoaOwners[tokenId++] ?? selfAddress;
      v.push({
        constructor: 'Pair',
        argtypes: ['ByStr20', 'String'],
        arguments: [owner, ''],
      })
    }

    const tx = new Transaction(
      {
        ...params,
        toAddr: contractAddress,
        data: JSON.stringify({
          _tag: "BatchMint",
          params: [{
            vname: 'to_token_uri_pair_list',
            type: 'List (Pair ByStr20 String)',
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

  console.log("txs", txList.length);

  zilliqa.wallet.addByPrivateKey(key);
  const signedTxList = await zilliqa.wallet.signBatch(txList);

  // send batch transaction
  await zilliqa.blockchain.createBatchTransaction(signedTxList);

  const contract = zilliqa.contracts.at(contractAddress);
  const state = await contract.getSubState("token_owners");
  console.log(`Mint target: ${MINT_COUNT} | Mint state: ${Object.keys(state.token_owners).length}`)
}

batchMint().then(() => console.log('done.'))
