require("dotenv").config()
const { createTransaction } = require("../../call");
const { param, zilliqa, useKey, getPrivateKey } = require("../../zilliqa");
const { fromBech32Address, toBech32Address } = require("@zilliqa-js/zilliqa");
const fs = require("fs");
const { default: BigNumber } = require("bignumber.js");

const elderBerryFilepath = process.env.ELDERBERRY_AIRDROP_FILEPATH;
const airdropData = fs.readFileSync(elderBerryFilepath).toString("utf8");
const airdropRecipients = airdropData.split("\n").filter(x => x.trim().length > 0).map(row => {
  const [amt, address] = row.split(",");
  return {
    amount: Math.ceil(0.1 * parseInt(amt)),
    address: address.trim(),
  };
});

const resourceAddress = process.env.BERRY_CONTRACT_HASH;

;
(async () => {
  useKey(getPrivateKey())
  console.log(airdropRecipients.map(x => `${x.address}: ${x.amount}`).join("\n"));
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = [];

  const resContractInit = await zilliqa.blockchain.getSmartContractInit(resourceAddress);
  const decimals = parseInt(resContractInit.result.find(item => item.vname === "decimals").value);
  const symbol = resContractInit.result.find(item => item.vname === "symbol").value;

  console.log("total", symbol, "count", airdropRecipients.reduce((sum, x) => sum + x.amount, 0));
  for (const recipient of airdropRecipients) {
    const address = fromBech32Address(recipient.address).toLowerCase();

    const data = JSON.stringify({
      _tag: "Mint",
      params: [
        param('recipient', 'ByStr20', address),
        param('amount', 'Uint128', new BigNumber(recipient.amount).dp(0).shiftedBy(decimals).toString(10)),
      ]
    })
    const newTx = await createTransaction(fromBech32Address(toBech32Address(resourceAddress)), data, minGasPrice)
    txList.push(newTx);
  }

  console.log("total tx count", txList.length);

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);
  if (!batchResult) console.log(`error airdropping: ${resourceAddress}`)
  else console.log(`successfuly airdropping: ${resourceAddress}`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to add item: \n', result)
  }
})().catch(console.error).finally(() => process.exit(0));
