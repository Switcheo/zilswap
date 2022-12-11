const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { callContract } = require("../../../scripts/call");
const { deployHunyToken, deployEmporium, deployResourceStore, deployResource, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");
const { adt } = require("./helper")

let privateKey, address, hunyAddress, emporiumAddress, resourceStallAddress, geodeAddress, hunyContract, emporiumContract, resourceStallContract, geodeContract

const HUNDRED_PERCENT_BPS = 100
const NEGATIVE_HUNDRED_PERCENT_BPS = -100
const GEODE_BASE_PRICE = new BigNumber(0)
const GEODE_START_PRICE = ONE_HUNY.times(5)
const GEODE_MAX_PRICE = ONE_HUNY.times(10)
const GEODE_INFLATION_BPS = HUNDRED_PERCENT_BPS
const GEODE_DEFLATION_BPS = NEGATIVE_HUNDRED_PERCENT_BPS

const getAvgInflationBPS = (currentInflationBPS, qtyPurchased, inflationBPS) => {
  // sum of inflation incr BPS = (0 + 1 + ... + (n-1)) * inflation BPS
  const avgInflationIncrBPS = Math.floor((qtyPurchased - 1) * inflationBPS / 2)
  const avgInflationBPS = currentInflationBPS + avgInflationIncrBPS

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
        GEODE_START_PRICE.toString(10),      // base price = 5 HUNY
        GEODE_START_PRICE.toString(10),     // start price = 5 HUNY
        GEODE_MAX_PRICE.toString(10),       // max price = 10 HUNY
        GEODE_INFLATION_BPS.toString(10),   // inflation bps
        GEODE_DEFLATION_BPS.toString(10)    // deflation bps
      ])
    ),
    param('sell_price', `${resourceStallAddress}.Price`,
      adt(`${resourceStallAddress}.Price`, [], [
        GEODE_BASE_PRICE.toString(10),      // base price = 0 HUNY
        GEODE_START_PRICE.toString(10),     // start price = 5 HUNY
        GEODE_MAX_PRICE.toString(10),       // max price = 10 HUNY
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
    param('max_price', 'Uint128', ONE_HUNY.times(100000)),
    param('purchase_data', 'String', "50"),
  ], 0, false, false)
  console.log("purchase 50 geodes", txPurchaseGeode.id);
  expect(txPurchaseGeode.receipt.success).toEqual(true)

  const avgInflation = getAvgInflationBPS(0, 50, GEODE_INFLATION_BPS)
  // no items bought yet, so current inflation rate = 0
  // inflation rate of 100 bps, 50 items bought, avg inflation bps = 0 + (50 - 1) / 2 * 100 = 2450 bps
  expect(avgInflation).toEqual(2450)
  const hunyPaid = new BigNumber(txPurchaseGeode.receipt.event_logs[3].params[2].value)
  // huny paid = 5 huny * 50 qty * 124.5% = 311.25
  expect(hunyPaid).toEqual(ONE_HUNY.times(311.25))

  let state = await resourceStallContract.getState()
  // with inflation rate of 1.00%, 50 items will cause current buy side inflation rate to be 50%
  let buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('5000')

  const txPurchaseGeodeMaxInflation = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', ONE_HUNY.times(100000)),
    param('purchase_data', 'String', "100"),
  ], 0, false, false)
  console.log("purchase 100 geodes", txPurchaseGeodeMaxInflation.id);
  expect(txPurchaseGeodeMaxInflation.receipt.success).toEqual(true)

  const avgInflation2 = getAvgInflationBPS(5000, 50, GEODE_INFLATION_BPS)
  // 50 items bought so far, inflation rate at 50.00%
  // inflation rate of 100 bps, 50 more items to hit the cap, avg inflation bps = 5000 + (50 - 1) / 2 * 100 = 7450 bps
  // next 50 items will be paid at max price of 10 huny
  expect(avgInflation2).toEqual(7450)
  
  const hunyPaid2 = new BigNumber(txPurchaseGeodeMaxInflation.receipt.event_logs[3].params[2].value)
  // huny paid = (5 huny * 50 qty * 174.5%) + (10 huny * 50 qty) = 936.25
  expect(hunyPaid2).toEqual(ONE_HUNY.times(936.25))

  // with inflation rate already capped, inflation will remain at 100%
  state = await resourceStallContract.getState()
  buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('10000')
})

test('sell resource and test deflation', async () => {
  const txSellGeode = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Int128', '1'),
    param('quantity', 'Int128', "50"),
  ], 0, false, false)
  console.log("sell 50 geodes", txSellGeode.id);
  expect(txSellGeode.receipt.success).toEqual(true)

  // current inflation is at 100.00%
  // 50 items sold, deflation rate of -100 bps, avg inflation bps = 10000 + (50 - 1) / 2 * (-100) = 7550 bps
  const avgDeflation = getAvgInflationBPS(10000, 50, GEODE_DEFLATION_BPS)
  expect(avgDeflation).toEqual(7550)

  const hunyEarned = new BigNumber(txSellGeode.receipt.event_logs[3].params[2].value)
  // huny earned = 5 huny * 50 qty * 175.5% = 438.75 
  expect(hunyEarned).toEqual(ONE_HUNY.times(438.75))

  let state = await resourceStallContract.getState()
  // 50 items sold at deflation rate of -100 bps, new sell side inflation rate = 10000 - 5000 = 5000
  let sellSideInflation = state.transact_count['0'].arguments[1]
  expect(sellSideInflation).toEqual('5000')

  const txSellGeodeMaxDeflation = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Int128', '1'),
    param('quantity', 'Int128', "200"),
  ], 0, false, false)
  console.log("sell 200 geodes", txSellGeode.id);
  expect(txSellGeodeMaxDeflation.receipt.success).toEqual(true)

  // current inflation is at 100.00%
  // 50 items sold so far, 150 more items sold to hit min, deflation rate of -100 bps, avg inflation bps = 5000 + (150 - 1) / 2 * (-100) = -2450 bps
  // last 50 items will be sold at base price of 0 huny
  const avgDeflation2 = getAvgInflationBPS(5000, 150, GEODE_DEFLATION_BPS)
  expect(avgDeflation2).toEqual(-2450)

  const hunyEarned2 = new BigNumber(txSellGeodeMaxDeflation.receipt.event_logs[3].params[2].value)
  // huny earned = 5 huny * 150 qty * 75.5% = 438.75 
  expect(hunyEarned2).toEqual(ONE_HUNY.times(566.25))

  state = await resourceStallContract.getState()
  // with sell side inflation rate at min, will be capped at -100.00%
  sellSideInflation = state.transact_count['0'].arguments[1]
  expect(sellSideInflation).toEqual('-10000')
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
    param('min_price', 'Int128', new BigNumber(100000000000).shiftedBy(12).toString(10)),
    param('quantity', 'Int128', "10"),
  ], 0, false, false)
  console.log("sell geode with max_price too high", txSellGeode.id);

  expect(txSellGeode.receipt.success).toEqual(false)
})
