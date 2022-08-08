
const { toBech32Address, fromBech32Address } = require('@zilliqa-js/zilliqa')
const { zilliqa } = require('../../zilliqa')

async function batchMint() {

  const metazoaAddress = fromBech32Address(toBech32Address(process.env.METAZOA_CONTRACT_HASH))
  const moonbattleAddress = fromBech32Address(toBech32Address(process.env.MOON_BATTLE_CONTRACT_HASH))
  const refineryAddress = fromBech32Address(toBech32Address(process.env.REFINERY_CONTRACT_HASH))
  const hiveAddress = fromBech32Address(toBech32Address(process.env.HIVE_CONTRACT_HASH))
  const hunyAddress = fromBech32Address(toBech32Address(process.env.HUNY_CONTRACT_HASH))

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
