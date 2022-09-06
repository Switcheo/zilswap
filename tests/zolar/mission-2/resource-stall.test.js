const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { callContract } = require("../../../scripts/call");
const { deployHunyToken, deployEmporium, deployResourceStore, deployResource, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");

let privateKey, address, hunyAddress, emporiumAddress, resourceStallAddress, geodeAddress, hunyContract, emporiumContract, resourceStallContract, geodeContract

beforeAll(async () => {
  // deploy huny
  // deploy emporium
  // deploy resource stall
  // deploy resource (geode)
  // add self as huny minter
  // mint huny for self
  // increase huny allowance from self to emporium
  // add stall to emporium
  // add stall as resource minter

  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();

  hunyContract = await deployHunyToken({ name: "Huny Token", symbol: "HUNY", decimals: "12" });
  hunyAddress = hunyContract.address.toLowerCase();

  emporiumContract = await deployEmporium();
  emporiumAddress = emporiumContract.address.toLowerCase();

  resourceStallContract = await deployResourceStore({ emporium: emporiumAddress, huny_token: hunyAddress });
  resourceStallAddress = resourceStallContract.address.toLowerCase();

  geodeContract = await deployResource("ZolarGeode", { name: "Geode - Zolar Resource", symbol: "zlrGEODE", decimals: "2" });
  geodeAddress = geodeContract.address.toLowerCase();

  console.log(await hunyContract.getState())
  const txMint = await callContract(privateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', address),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMint.id);

  const txAllowance = await callContract(privateKey, hunyContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', emporiumAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("increase allowance huny", txAllowance.id);

  const txAddStall = await callContract(privateKey, emporiumContract, "AddStall", [
    param('address', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall", txAddStall.id);

  const txAddMinterStall = await callContract(privateKey, geodeContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter", txAddMinterStall.id);
})

test('add item (resource) to resource stall -> emporium', async () => {
  const txAddItem = await callContract(privateKey, resourceStallContract, "AddItem", [
    param('item_name', 'String', "Zolar Geode"),
    param('resource', 'ByStr20', geodeAddress),
    param('buy_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "2", "1"]
    }),
    param('sell_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "2", "1"]
    })], 0, false, false)
  console.log("add item", txAddItem.id);
})

test('purchase item (resource) from emporium -> resource stall', async () => {
  // 1. test inflation mechanism
  // - first item = current inflation bps
  // - second item onwards = current inflation bps + (n-1) * increment (capped at max price)
  // 2. test max_price < cost (throws CodeItemTooExpensive)
  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
    param('purchase_data', 'String', "100000"),
  ], 0, false, false)
  console.log("purchase geode", txPurchaseGeode.id);
})