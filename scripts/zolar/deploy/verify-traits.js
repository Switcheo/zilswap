const metadataList = require('./gen0.json')
const { zilliqa } = require("../../zilliqa");
const { fromBech32Address, toBech32Address } = require('@zilliqa-js/zilliqa');

;
(async () => {
  const contractAddress = fromBech32Address(toBech32Address(process.env.METAZOA_CONTRACT_HASH));
  const traitsResult = await zilliqa.contracts.at(contractAddress).getSubState("traits");

  const traits = traitsResult.traits;

  for (const metadata of metadataList) {
    const tokenTraits = traits[metadata.id];
    if (!tokenTraits) {
      console.log(metadata.id, "trait not set");
      continue;
    }
    const faction = tokenTraits.find(trait => trait.arguments[0] === "faction").arguments[1];
    const berserkerLevel = tokenTraits.find(trait => trait.arguments[0] === "berserker_level")?.arguments[1];

    const metadataFaction = metadata.attributes.find(attr => attr.trait_type === "Faction")?.value;
    const metadataBerserker = metadata.attributes.find(attr => attr.trait_type === "Berserker Level")?.value;

    if (faction !== metadataFaction.toLowerCase())
      console.log(metadata.id, "wrong faction", faction, metadataFaction)

    if (metadataFaction === "Mino" && metadataBerserker !== berserkerLevel)
      console.log(metadata.id, "wrong level", berserkerLevel, metadataBerserker)
  }

  console.log("verification complete");

})().catch(console.error);
