const { Transaction, TxStatus } = require('@zilliqa-js/account')
const { bytes, BN, Long, toBech32Address, fromBech32Address } = require('@zilliqa-js/zilliqa')
const { zilliqa, VERSION } = require('../../zilliqa')
const metadataList = require('./gen0.json')

const BATCH_SIZE = 150 // max per block ~165

async function setTokenTraits() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')

  const contractAddress = fromBech32Address(toBech32Address(process.env.METAZOA_CONTRACT_HASH));
  console.log("contract", contractAddress)

  const targetLen = metadataList.length;

  const getTraits = (metadata) => {
    const faction = metadata.attributes.find(attribute => attribute.trait_type === "Faction").value;

    const value = [{
      argtypes: ["String", "String"],
      arguments: ["race", "mino"],
      constructor: "Pair"
    }, {
      argtypes: ["String", "String"],
      arguments: ["berserker", "1"],
      constructor: "Pair"
    }, {
      argtypes: ["String", "String"],
      arguments: ["generation", "0"],
      constructor: "Pair"
    }, {
      argtypes: ["String", "String"],
      arguments: ["faction", faction.toLowerCase()],
      constructor: "Pair"
    }];

    if (faction === "Mino") {
      const berserker = metadata.attributes.find(attribute => attribute.trait_type === "Berserker Level").value;
      value.push({
        argtypes: ["String", "String"],
        arguments: ["berserker_level", berserker],
        constructor: "Pair"
      });
    }

    return [{
      vname: "token_id",
      type: "Uint256",
      value: metadata.id,
    }, {
      vname: "proposed_traits",
      type: "List (Pair String String)",
      value,
    }]
  };
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  while (metadataList.length > 0) {
    const txList = [];
    console.log("preparing tx", txList.length + 1, "metadata left", metadataList.length)

    const currMetadataList = metadataList.splice(0, BATCH_SIZE);

    for (let i = 0; i < currMetadataList.length; ++i) {
      const params = {
        version: VERSION,
        amount: new BN(0),
        gasPrice: new BN(minGasPrice.result),
        gasLimit: Long.fromNumber(20000),
      };

      const tx = new Transaction(
        {
          ...params,
          toAddr: contractAddress,
          data: JSON.stringify({
            _tag: "SetTokenTraits",
            params: getTraits(currMetadataList[i]),
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

  }

  const contract = zilliqa.contracts.at(contractAddress);
  const state = await contract.getSubState("traits");
  console.log(`Traits target: ${targetLen} | Traits state: ${Object.keys(state.traits).length}`)
}

setTokenTraits().then(() => console.log('done.'))
