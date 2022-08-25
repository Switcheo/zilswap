const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey } = require("../../zilliqa");
const { deployItems } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const itemsContract = await deployItems();
  const itemsAddress = itemsContract.address.toLowerCase();

  console.log(`\n\n======================`)
  console.log(`\n  Contracts`)
  console.log(`\n======================`)
  console.log(`\bItems      `, itemsAddress);
})();
