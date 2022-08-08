
const { Transaction, TxStatus } = require('@zilliqa-js/account')
const { bytes, BN, Long, toBech32Address, fromBech32Address } = require('@zilliqa-js/zilliqa')
const { zilliqa, VERSION } = require('../../zilliqa')
const fs = require("fs");
const path = require("path");

async function fetchZoaOwners() {

  const metazoaAddress = fromBech32Address(toBech32Address(process.env.METAZOA_CONTRACT_HASH));
  console.log("metazoa", metazoaAddress)
  const { token_owners: owners } = await zilliqa.contracts.at(metazoaAddress).getSubState("token_owners");

  console.log(owners);

  const moonbattleAddress = fromBech32Address(toBech32Address(process.env.MOON_BATTLE_CONTRACT_HASH));
  console.log("moon battle", moonbattleAddress)
  const { metazoa_commanders: commanders } = await zilliqa.contracts.at(moonbattleAddress).getSubState("metazoa_commanders");

  console.log(commanders);

  const tokenOwners = { ...owners, ...commanders };
  
  console.log(`Metazoa owners: ${Object.keys(owners).length} | Metazoa battle: ${Object.keys(commanders).length} | Total: ${Object.keys(tokenOwners).length}`)
  fs.writeFileSync(path.join(__dirname, './_zoa-owners.json'), JSON.stringify(tokenOwners));
}

fetchZoaOwners().then(() => console.log('done.'))
