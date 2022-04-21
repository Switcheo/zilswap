
const { Transaction, TxStatus } = require('@zilliqa-js/account')
const { bytes, BN, Long, toBech32Address, fromBech32Address, getAddressFromPrivateKey } = require('@zilliqa-js/zilliqa')
const { zilliqa, VERSION } = require('../../zilliqa')

async function batchMint() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  const params = {
    version: VERSION,
    amount: new BN(0),
    gasPrice: new BN(minGasPrice.result),
    gasLimit: Long.fromNumber(20000),
  };

  const metazoaAddress = fromBech32Address(toBech32Address(process.env.METAZOA_CONTRACT_HASH))
  const moonbattleAddress = fromBech32Address(toBech32Address(process.env.MOON_BATTLE_CONTRACT_HASH))
  const refineryAddress = fromBech32Address(toBech32Address(process.env.REFINERY_CONTRACT_HASH))
  const hiveAddress = fromBech32Address(toBech32Address(process.env.HIVE_CONTRACT_HASH))
  const hunyAddress = fromBech32Address(toBech32Address(process.env.HUNY_CONTRACT_HASH))

  const txList = [];

  const refineryState = await zilliqa.contracts.at(refineryAddress).getState();
  const [hiveHarvesterPct, hiveHarvesterBlks] = refineryState.harvesters?.[hiveAddress.toLowerCase()]?.arguments ?? [];
  if (hiveHarvesterPct !== "75" || hiveHarvesterBlks !== (2520 * 7).toString()) {
    // add hive harvester
    txList.push(new Transaction(
      {
        ...params,
        toAddr: refineryAddress,
        data: JSON.stringify({
          _tag: "AddHarvester",
          params: getHarvesterParams(hiveAddress, 75, 2520 * 7),
        }),
      },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    ));
  }

  const [moonbattleHarvesterPct, moonbattleHarvesterBlks] = refineryState.harvesters?.[moonbattleAddress.toLowerCase()]?.arguments ?? [];
  if (moonbattleHarvesterPct !== "75" || moonbattleHarvesterBlks !== "2520") {
    // add moon battle harvester
    txList.push(new Transaction(
      {
        ...params,
        toAddr: refineryAddress,
        data: JSON.stringify({
          _tag: "AddHarvester",
          params: getHarvesterParams(moonbattleAddress, 75, 2520),
        }),
      },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    ));
  }

  const [kickbackAddress, kickbackPercentage] = refineryState.magic_hive_kickback?.arguments ?? [];
  if (kickbackAddress !== hiveAddress.toLowerCase() || kickbackPercentage !== "80") {
    // add hive kickback
    txList.push(new Transaction(
      {
        ...params,
        toAddr: refineryAddress,
        data: JSON.stringify({
          _tag: "SetMagicHiveKickback",
          params: [{
            vname: 'kickback',
            type: 'Pair ByStr20 Uint128',
            value: {
              constructor: 'Pair',
              argtypes: ['ByStr20', 'Uint128'],
              arguments: [hiveAddress.toLowerCase(), "80"]
            },
          }],
        }),
      },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    ));
  }

  const metazoaState = await zilliqa.contracts.at(metazoaAddress).getState();
  if (metazoaState.minters?.[moonbattleAddress.toLowerCase()]?.constructor !== "True") {
    // add moon battle as zoa minter
    txList.push(new Transaction(
      {
        ...params,
        toAddr: metazoaAddress,
        data: JSON.stringify({
          _tag: "AddMinter",
          params: getMinterParams(moonbattleAddress),
        }),
      },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    ));
  }

  const hunyState = await zilliqa.contracts.at(hunyAddress).getState();
  if (hunyState.minters?.[moonbattleAddress.toLowerCase()]?.constructor !== "True") {
    // add moon battle as huny minter
    txList.push(new Transaction(
      {
        ...params,
        toAddr: hunyAddress,
        data: JSON.stringify({
          _tag: "AddMinter",
          params: getMinterParams(moonbattleAddress),
        }),
      },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    ));
  }

  if (hunyState.minters?.[refineryAddress.toLowerCase()]?.constructor !== "True") {
    // add refinery as huny minter
    txList.push(new Transaction(
      {
        ...params,
        toAddr: hunyAddress,
        data: JSON.stringify({
          _tag: "AddMinter",
          params: getMinterParams(refineryAddress),
        }),
      },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    ));
  }

  if (txList.length) {
    console.log("sending", txList.length, "txs");
    zilliqa.wallet.addByPrivateKey(key);
    const signedTxList = await zilliqa.wallet.signBatch(txList);

    // send batch transaction
    await zilliqa.blockchain.createBatchTransaction(signedTxList);
  }

  const newRefineryState = await zilliqa.contracts.at(refineryAddress).getState();
  console.log('# refinery state verififcation');
  console.log('  check harvester', 'moon battle', newRefineryState.harvesters?.[moonbattleAddress.toLowerCase()]?.arguments);
  console.log('  check harvester', 'hive', newRefineryState.harvesters?.[hiveAddress.toLowerCase()]?.arguments);
  console.log('  check kickback', 'hive', newRefineryState.magic_hive_kickback?.arguments);

  const newHunyState = await zilliqa.contracts.at(hunyAddress).getState();
  console.log('# huny state verififcation');
  console.log('  check huny minter', 'refinery', newHunyState.minters?.[refineryAddress.toLowerCase()]?.constructor);
  console.log('  check huny minter', 'moon battle', newHunyState.minters?.[moonbattleAddress.toLowerCase()]?.constructor);

  const newMetazoaState = await zilliqa.contracts.at(metazoaAddress).getState();
  console.log('# metazoa state verififcation');
  console.log('  check metazoa minter', 'moon battle', newMetazoaState.minters?.[moonbattleAddress.toLowerCase()]?.constructor);
}

batchMint().then(() => console.log('done.'))


const getHarvesterParams = (address, percentage, blocks) => ([{
  vname: 'address',
  type: 'ByStr20',
  value: address.toLowerCase(),
}, {
  vname: 'required_refinement_percentage',
  type: 'Uint128',
  value: percentage.toString(),
}, {
  vname: 'blocks_to_reduce_required_refinement',
  type: 'Uint128',
  value: blocks.toString(),
}])

const getMinterParams = (address) => ([{
  vname: 'minter',
  type: 'ByStr20',
  value: address.toLowerCase(),
}])
