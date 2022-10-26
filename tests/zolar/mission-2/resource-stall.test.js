const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { callContract } = require("../../../scripts/call");
const { deployHunyToken, deployEmporium, deployResourceStore, deployResource, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");
const { adt } = require("./helper")

let privateKey, address, hunyAddress, emporiumAddress, resourceStallAddress, geodeAddress, hunyContract, emporiumContract, resourceStallContract, geodeContract

const HUNDRED_PERCENT_BPS = 100
const GEODE_BASE_PRICE = ONE_HUNY.times(1)
const GEODE_MAX_PRICE = ONE_HUNY.times(2)
const GEODE_INFLATION_BPS = HUNDRED_PERCENT_BPS
const GEODE_DEFLATION_BPS = HUNDRED_PERCENT_BPS

const getAvgInflationBPS = (currentInflationBPS, qtyPurchased, inflationBPS) => {
  // sum of inflation incr BPS = (0 + 1 + ... + (n-1)) * inflation BPS
  const avgInflationIncrBPS = Math.floor((qtyPurchased - 1) * inflationBPS / 2)
  const avgInflationBPS = currentInflationBPS + avgInflationIncrBPS

  return avgInflationBPS
}

const getAvgDeflationBPS = (currentInflationBPS, qtyPurchased, inflationBPS) => {
  // sum of inflation incr BPS = (0 + 1 + ... + (n-1)) * inflation BPS
  const avgInflationIncrBPS = Math.floor((qtyPurchased - 1) * inflationBPS / 2)
  const avgInflationBPS = currentInflationBPS - avgInflationIncrBPS

  return avgInflationBPS
}

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

  const txMintHuny = await callContract(privateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', address),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMintHuny.id);

  const txMintGeode = await callContract(privateKey, geodeContract, "Mint", [
    param('recipient', 'ByStr20', address),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMintGeode.id);

  const txHunyAllowance = await callContract(privateKey, hunyContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', emporiumAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("increase allowance huny", txHunyAllowance.id);

  const txGeodeAllowance = await callContract(privateKey, geodeContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', resourceStallAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("increase allowance geode", txGeodeAllowance.id);

  const txAddStall = await callContract(privateKey, emporiumContract, "AddStall", [
    param('address', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall", txAddStall.id);

  const txAddGeodeMinterStall = await callContract(privateKey, geodeContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter for geode", txAddGeodeMinterStall.id);

  const txAddHunyMinterStall = await callContract(privateKey, hunyContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter for huny", txAddHunyMinterStall.id);
})

test('add item (resource) to resource stall -> emporium', async () => {
  const txAddItem = await callContract(privateKey, resourceStallContract, "AddItem", [
    param('item_name', 'String', "Zolar Geode"),
    param('resource', 'ByStr20', geodeAddress),
    param('buy_price', `${resourceStallAddress}.Price`,
      adt(`${resourceStallAddress}.Price`, [], [
        GEODE_BASE_PRICE.toString(10),      // base price = 1 HUNY
        GEODE_MAX_PRICE.toString(10),       // max price = 100 HUNY
        GEODE_INFLATION_BPS.toString(10),   // inflation bps
        GEODE_DEFLATION_BPS.toString(10)    // deflation bps
      ])
    ),
    param('sell_price', `${resourceStallAddress}.Price`,
      adt(`${resourceStallAddress}.Price`, [], [
        ONE_HUNY.times(1).toString(10),
        ONE_HUNY.times(100).toString(10),
        GEODE_INFLATION_BPS.toString(10),   // inflation bps
        GEODE_DEFLATION_BPS.toString(10)    // deflation bps
      ])
    )], 0, false, false)
  console.log("add item", txAddItem.id);

  const state = await resourceStallContract.getState()
  expect(Object.keys(state.items).length).toEqual(1)
})

test('buy resource and test inflation', async () => {
  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
    param('purchase_data', 'String', "10"),
  ], 0, false, false)
  console.log("purchase 10 geodes", txPurchaseGeode.id);
  expect(txPurchaseGeode.receipt.success).toEqual(true)

  const avgInflation = getAvgInflationBPS(0, 10, HUNDRED_PERCENT_BPS)
  // no items bought yet, so current inflation rate = 0
  // inflation rate of 100 bps, 10 items bought, avg inflation bps = 0 + (10 - 1) / 2 * 100 = 450 bps
  expect(avgInflation).toEqual(450)
  const hunyPaid = new BigNumber(txPurchaseGeode.receipt.event_logs[3].params[2].value)
  expect(hunyPaid).toEqual(ONE_HUNY.times(10.45))
})

test('sell resource and test deflation', async () => {
  const txSellGeode = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '1'),
    param('quantity', 'Uint128', "10"),
  ], 0, false, false)
  console.log("sell 10 geodes", txSellGeode.id);
  expect(txSellGeode.receipt.success).toEqual(true)

  const avgDeflation = getAvgDeflationBPS(1000, 10, HUNDRED_PERCENT_BPS)
  // 10 items bought so inflation rate is at 100 * 10 = 1000 bps
  // deflation rate of 100 bps, 10 items sold, avg inflation bps = 1000 - (10 - 1) / 2 * 100 (bps) = 550 bps
  expect(avgDeflation).toEqual(550)
  const hunyEarned = new BigNumber(txSellGeode.receipt.event_logs[3].params[2].value)
  expect(hunyEarned).toEqual(ONE_HUNY.times(10.55))
})

test('buy resource, half quantity inflation, half at max price', async () => {
  // current inflation = 0, base price = 1 HUNY, max price = 2 HUNY, inflation bps = 100 (1%)
  // if 200 resources are bought, 100 bought will be charged inflation and the last 100 will be charged the max price
  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
    param('purchase_data', 'String', "200"),
  ], 0, false, false)
  console.log("purchase 10 geodes", txPurchaseGeode.id);
  expect(txPurchaseGeode.receipt.success).toEqual(true)

  const avgInflation = getAvgInflationBPS(0, 100, HUNDRED_PERCENT_BPS)
  // no items bought yet, so current inflation rate = 0
  // inflation rate of 100 bps, 10 items bought, avg inflation bps = 0 + (100 - 1) / 2 * 100 = 4950 bps
  expect(avgInflation).toEqual(4950)
  const hunyPaid = new BigNumber(txPurchaseGeode.receipt.event_logs[3].params[2].value)
  // huny paid = 
  // first 100 with inflation + last 100 at max price
  // (100 * 1.495) + (100 * 2)
  expect(hunyPaid).toEqual(ONE_HUNY.times(349.5))
})

test('sell resource, half quantity deflation, half at min price', async () => {
  // current inflation = 100%, base price = 1 HUNY, max price = 2 HUNY, deflation bps = 100 (1%)
  // if 200 resources are sold, 100 sold will be charged deflation and the last 100 will be charged the min price
  const txSellGeode = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '1'),
    param('quantity', 'Uint128', "100"),
  ], 0, false, false)
  console.log("sell 10 geodes", txSellGeode.id);
  expect(txSellGeode.receipt.success).toEqual(true)

  const avgDeflation = getAvgDeflationBPS(10000, 100, HUNDRED_PERCENT_BPS)
  // 100 items bought so current inflation rate is at 100 * 100 = 10000 bps
  // deflation rate of 100 bps, 200 items sold, avg inflation bps = 10000 - (100 - 1) / 2 * 100 (bps) = 5050 bps
  expect(avgDeflation).toEqual(5050)
  const hunyEarned = new BigNumber(txSellGeode.receipt.event_logs[3].params[2].value)
  // huny earned = 
  // first 100 with deflation + last 100 at min price
  // (100 * 1.505) + (100 * 1)
  expect(hunyEarned).toEqual(ONE_HUNY.times(250.5))
})

test('make purchase with insufficient max_price', async () => {
  // test max_price < cost (throws CodeItemTooExpensive)
  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12).toString(10)),
    param('purchase_data', 'String', "10"),
  ], 0, false, false)
  console.log("purchase geode with insufficient max_price", txPurchaseGeode.id);

  expect(txPurchaseGeode.receipt.success).toEqual(false)
})

test('make transaction with min_price too high', async () => {
  // test max_price < cost (throws CodeItemTooExpensive)
  const txSellGeode = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', new BigNumber(100000000000).shiftedBy(12).toString(10)),
    param('quantity', 'Uint128', "10"),
  ], 0, false, false)
  console.log("sell geode with max_price too high", txSellGeode.id);

  expect(txSellGeode.receipt.success).toEqual(false)
})
