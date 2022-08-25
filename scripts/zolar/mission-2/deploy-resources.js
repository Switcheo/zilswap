const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey, param, zilliqa } = require("../../zilliqa");
const { deployResourceStore, deployResource, deployItems, deployGemRefinery } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const hunyAddress = process.env.HUNY_CONTRACT_HASH;
  const emporiumAddress = process.env.METAZOA_CONTRACT_HASH;

  const geodeContract = await deployResource("ZolarGeode", { name: "Geode - Zolar Resource", symbol: "zlrGEODE", decimals: "2" });
  const geodeAddress = geodeContract.address.toLowerCase();

  const berryContract = await deployResource("ZolarElderberry", { name: "Elderberry - Zolar Resource", symbol: "zlrBERRY", decimals: "2" });
  const berryAddress = berryContract.address.toLowerCase();

  const scrapContract = await deployResource("ZolarZolraniumScrap", { name: "Scraps - Zolar Resource", symbol: "zlrSCRAP", decimals: "2" });
  const scrapAddress = scrapContract.address.toLowerCase();

  const resourceStallContract = await deployResourceStore({ emporium: emporiumAddress, huny_token: hunyAddress });
  const resourceStallAddress = resourceStallContract.address.toLowerCase();

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\nGeode      `, geodeAddress);
  console.log(`\nBerry      `, berryAddress);
  console.log(`\nScrap      `, scrapAddress);
  console.log(`\nStall      `, resourceStallAddress);
  console.log(`\nGemRefinery`, gemRefineryAddress);
})();
