const { Transaction, TxStatus } = require("@zilliqa-js/account");
const { fromBech32Address, normaliseAddress, toBech32Address } = require("@zilliqa-js/crypto");
const { BN, Long } = require("@zilliqa-js/util");
const { zilliqa, useKey, VERSION } = require('../../zilliqa');
const fs = require("fs");
const path = require("path");
const { default: BigNumber } = require("bignumber.js");
const FILEPATH = path.join(__dirname, './winners.txt');
const recipients = fs.readFileSync(FILEPATH).toString("utf8").split("\n").map(item => item.trim()).filter(item => !!item.length).map(bech32 => fromBech32Address(bech32).toLowerCase());

console.log(recipients);

async function sendGiveaway() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')

  const giveawayContractAddress = process.env.GIVEAWAY_MINTER_CONTRACT_HASH;
  if (!giveawayContractAddress) throw new Error('GIVEAWAY_MINTER_CONTRACT_HASH env var missing!')
  const contractAddress = normaliseAddress(toBech32Address(giveawayContractAddress));

  useKey(key);

  const txList = [];
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  for (const recipientAddress of recipients) {

    console.log(recipientAddress)

    const args = [
      {
        vname: "to",
        type: "ByStr20",
        value: recipientAddress,
      },
      {
        vname: "quantity",
        type: "Uint32",
        value: "1",
      },
    ];

    const params = {
      version: VERSION,
      amount: new BN(0),
      gasPrice: new BN(new BigNumber(minGasPrice.result).times(1.1).toString(10)),
      gasLimit: Long.fromNumber(20000),
    };

    const tx = new Transaction(
      {
        ...params,
        toAddr: contractAddress,
        data: JSON.stringify({
          _tag: "MintForCommunity",
          params: args,
        }),
      },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    );

    txList.push(tx);
  }

  console.log(txList.map((tx, index) => [index + 1, JSON.stringify(tx.data)].join(": ")));

  console.log(zilliqa.wallet)
  const signedTxList = await zilliqa.wallet.signBatch(txList);

  const batchResult = await zilliqa.blockchain.createBatchTransaction(
    signedTxList,
  );

  console.log('Transactions created:...\n');
  for (const confirmedTx of batchResult) {
    console.log('The transaction id is: %o', confirmedTx.id);
    console.log(`The transaction status is: %o`, confirmedTx.receipt);
  }

  console.log(txList.length)
}

sendGiveaway().then(console.log('done.'))
