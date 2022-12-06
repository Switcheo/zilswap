require("dotenv").config()
const { createTransaction } = require("../../call");
const { param, zilliqa, useKey, getPrivateKey } = require("../../zilliqa");
const { fromBech32Address, toBech32Address } = require("@zilliqa-js/zilliqa");
const fs = require("fs");

const elderBerryFilepath = process.env.ELDERBERRY_AIRDROP_FILEPATH;
const airdropData = fs.readFileSync(elderBerryFilepath).toString("utf8");
const airdropRecipients = airdropData.split("\n").filter(x => x.trim().length > 0).map(row => {
  const [amt, address] = row.split(",");
  return {
    amount: Math.ceil(0.1 * parseInt(amt)),
    address: address.trim(),
  };
});

const itemsAddress = process.env.ITEMS_CONTRACT_HASH;

const makeTxValue = (constructor, argtypes, arguments) => ({ constructor, argtypes, arguments });
const makeItemTrait = (key, value) => makeTxValue(
  'Pair',
  ['String', 'String'],
  [key, value],
);

;
(async () => {
  useKey(getPrivateKey())
  const allAirdrop = [];

  console.log(airdropRecipients.map(x => `${x.address}: ${x.amount}`).join("\n"));
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const txList = [];

  for (const recipient of airdropRecipients) {
    for (let i = 0; i < recipient.amount; ++i) {
      allAirdrop.push(recipient.address)
    }
  }

  console.log("total juice count", allAirdrop.length)

  let items = [];
  for (const airdropAddress of allAirdrop) {
    const address = fromBech32Address(airdropAddress).toLowerCase();

    items.push(
      makeTxValue("Pair", ["(Pair ByStr20 String)", "(List (Pair String String))"], [
        makeTxValue("Pair", ["ByStr20", "String"], [address, ""]),
        [
          makeItemTrait("Name", "Elderberry Juice"),
          makeItemTrait("Type", "Consumable"),
        ],
      ]),
    )

    if (items.length >= 200) {
      const data = JSON.stringify({
        _tag: "BatchMintAndSetTraits",
        params: [
          param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', items.slice()),
        ]
      })
      const newTx = await createTransaction(fromBech32Address(toBech32Address(itemsAddress)), data, minGasPrice)
      txList.push(newTx);
      items = [];
    }
  }

  if (items.length) {
    const data = JSON.stringify({
      _tag: "BatchMintAndSetTraits",
      params: [
        param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', items),
      ]
    })
    const newTx = await createTransaction(fromBech32Address(toBech32Address(itemsAddress)), data, minGasPrice)
    txList.push(newTx);
  }

  console.log("total tx count", txList.length);
  for (const tx of txList)
    console.log("tx", JSON.parse(tx.txParams.data).params[0].value.length)

  console.log('signing transactions...')
  const signedTxList = await zilliqa.wallet.signBatch(txList)

  console.log('sending batch transactions...')
  const batchResult = await zilliqa.blockchain.createBatchTransaction(signedTxList);
  if (!batchResult) console.log(`error airdropping: ${itemsAddress}`)
  else console.log(`successfuly airdropping: ${itemsAddress}`)

  for (const result of batchResult) {
    if (!result?.receipt?.success) console.log('failed to add item: \n', result)
  }
})().catch(console.error).finally(() => process.exit(0));
