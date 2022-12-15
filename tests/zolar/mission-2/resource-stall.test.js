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

const getSellSideInflation = (purchaseCount, inflationBPS, deflationBPS) => {
  const absPurchaseCount = Math.abs(purchaseCount)
  const rootPurchase = Math.floor(Math.sqrt(absPurchaseCount))
  if (purchaseCount < 0) return Math.floor(rootPurchase * deflationBPS) // deflating
  else return Math.floor(rootPurchase * inflationBPS) // inflating
}

const getAvgDeflationBPS = (purchaseCount, qtySold, inflationBPS, deflationBPS) => {
  const currentInflationBPS = getSellSideInflation(purchaseCount, inflationBPS, deflationBPS)
  const newCount = purchaseCount - qtySold + 1
  const newInflationBPS = getSellSideInflation(newCount, inflationBPS, deflationBPS)
  const avgDeflationIncrBPS = Math.floor((newInflationBPS - currentInflationBPS) / 2)
  const avgDeflationBPS = currentInflationBPS + avgDeflationIncrBPS

  return avgDeflationBPS
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
  // 50 items bought, net purchase = 0 + 50 = 50
  let sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('50')

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
  // 100 items bought, net purchase = 50 + 100 = 150
  sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('150')
})

test('sell resource and test deflation', async () => {
  const txSellGeode = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '1'),
    param('quantity', 'Uint128', "50"),
  ], 0, false, false)
  console.log("sell 50 geodes", txSellGeode.id);
  expect(txSellGeode.receipt.success).toEqual(true)

  // inflation = root k * inflationBPS/deflationBPS, where k = nett +ve/-ve purchase count
  // net purchase is now at +150
  // current inflation is at root(150) * 100bps = 12.00% inflation
  // newPurchaseCount = 150 - 50 = 100
  // newInflationRate = root(101) * 1.00% = 10.00% inflation
  // change in inflation rate = 10 - 12.00 = -2.00%
  // avgDeflation = -2.00 / 2 = -1.00%
  // avgDeflationBPS = 12.24 - 1.00 = 11.00%
  const avgDeflation = getAvgDeflationBPS(150, 50, GEODE_INFLATION_BPS, GEODE_DEFLATION_BPS)
  expect(avgDeflation).toEqual(1100)

  const hunyEarned = new BigNumber(txSellGeode.receipt.event_logs[3].params[2].value)
  // huny earned = 5 huny * 50 qty * 111% = 277.8
  expect(hunyEarned).toEqual(ONE_HUNY.times(277.5))

  let state = await resourceStallContract.getState()
  // 50 items sold, sellSideNetPurchase = 150 - 100 = 50
  let sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('100')
  // 50 items sold, buy inflation should go down by 50.00%, 100.00 - 50.00 = 50.00%
  let buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('5000')

  const txSellGeode2 = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '1'),
    param('quantity', 'Uint128', "100"),
  ], 0, false, false)
  console.log("sell 100 geodes", txSellGeode.id);
  expect(txSellGeode2.receipt.success).toEqual(true)

  // inflation = root k * inflationBPS/deflationBPS, where k = nett +ve/-ve purchase count
  // net purchase is now at +100
  // current inflation is at root(100) * 100bps = 10.00% inflation
  // newPurchaseCount = 100 - 100 = 0
  // newInflationRate = root(1) * 1.00% = 1.00% inflation
  // change in inflation rate = 1.00 - 10.00 = -9.00%
  // avgDeflation = -9.00 / 2 = -4.50%
  // avgDeflationBPS = 10.00 - 4.50 = 5.50%
  const avgDeflation2 = getAvgDeflationBPS(100, 100, GEODE_INFLATION_BPS, GEODE_DEFLATION_BPS)
  expect(avgDeflation2).toEqual(550)

  const hunyEarned2 = new BigNumber(txSellGeode2.receipt.event_logs[3].params[2].value)
  // huny earned = 5 huny * 100 qty * 105.5% = 527.5
  expect(hunyEarned2).toEqual(ONE_HUNY.times(527.5))

  state = await resourceStallContract.getState()
  // 100 items sold, sellSideNetPurchase = 100 - 100 = 0
  sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('0')
  // 100 items sold, buy inflation should go down by 100.00%, 50.00 -100.00 = 0 (min 0)
  buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('0')

  const txSellGeode3 = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '1'),
    param('quantity', 'Uint128', "100"),
  ], 0, false, false)
  console.log("sell 100 geodes", txSellGeode.id);
  expect(txSellGeode3.receipt.success).toEqual(true)

  // inflation = root k * inflationBPS/deflationBPS, where k = nett +ve/-ve purchase count
  // net purchase is now at 0
  // current inflation is at root(0) * 100bps = 0% inflation
  // newPurchaseCount = 0 - 100  = -100
  // newInflationRate = root(99) * -1.00% = -9.00% inflation
  // change in inflation rate = -9.00 - 0 = -9.00%
  // avgDeflation = -9.00 / 2 = -4.50%
  // avgDeflationBPS = 0 - 4.50 = -4.50%
  const avgDeflation3 = getAvgDeflationBPS(0, 100, GEODE_INFLATION_BPS, GEODE_DEFLATION_BPS)
  expect(avgDeflation3).toEqual(-450)

  const hunyEarned3 = new BigNumber(txSellGeode3.receipt.event_logs[3].params[2].value)
  // huny earned = 5 huny * 100 qty * 95.5% = 477.5
  expect(hunyEarned3).toEqual(ONE_HUNY.times(477.5))

  state = await resourceStallContract.getState()
  // 100 items sold, sellSideNetPurchase = 0 - 100 = -100
  sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('-100')
  // 100 items sold, buy inflation should go down by 100.00%, remaining at 0
  buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('0')
})

test('max out deflation', async () => {
  // current net purchase = -100
  // max deflation = (0 - 5) / 5 * 100% = 100.00%
  // inflation = root k * inflationBPS/deflationBPS, where k = nett +ve/-ve purchase count
  // max k = (100.00% / -100bps)^2 = -10000
  const txSellGeode1 = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '1'),
    param('quantity', 'Uint128', "10000"),
  ], 0, false, false)
  console.log("sell 10000 geodes", txSellGeode1.id);
  expect(txSellGeode1.receipt.success).toEqual(true)

  // inflation = root k * inflationBPS/deflationBPS, where k = nett +ve/-ve purchase count
  // net purchase is now at -100
  // current inflation is at root(abs(-100)) * -100bps = -10.00% inflation
  // newPurchaseCount = -100 - 10000 = -10100 (-10000 max)
  // 9900 will be charged using avg formula, last 100 will be charged at base price
  // newInflationRate = root(abs(-9999)) * -1.00% = 99.00% inflation
  // change in inflation rate = -99 - (-10.00) = -89%
  // avgDeflation = -89 / 2 = -44.5%
  // avgDeflationBPS = -10 - 44.5 = -54.5
  const avgDeflation1 = getAvgDeflationBPS(-100, 9900, GEODE_INFLATION_BPS, GEODE_DEFLATION_BPS)
  expect(avgDeflation1).toEqual(-5450)

  const hunyEarned1 = new BigNumber(txSellGeode1.receipt.event_logs[3].params[2].value)
  // huny earned = 5 huny * 9900 qty * 45.5% + 100 qty * 0 huny = 22522.5
  expect(hunyEarned1).toEqual(ONE_HUNY.times(22522.5))

  let state = await resourceStallContract.getState()
  // 10000 items sold, sellSideNetPurchase = -100 - 10000 = -10000 (capped at -10000)
  let sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('-10000')
  // no change to buy side inflation
  let buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('0')

  const txSellGeode2 = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '0'),
    param('quantity', 'Uint128', "10000"),
  ], 0, false, false)
  console.log("sell 10000 geodes", txSellGeode2.id);
  expect(txSellGeode2.receipt.success).toEqual(true)

  const hunyEarned2 = new BigNumber(txSellGeode2.receipt.event_logs[3].params[2].value)
  // huny earned = base price * 10000 qty = 0 
  expect(hunyEarned2).toEqual(ONE_HUNY.times(0))

  state = await resourceStallContract.getState()
  // 10000 items sold, sellSideNetPurchase = -10000 - 10000 = -10000 (capped at -10000)
  sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('-10000')
  // no change to buy side inflation
  buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('0')
})

test('max out inflation', async () => {
  // net purchase at -10000, need to buy at least 20000 to make it at max positive
  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', ONE_HUNY.times(10000000)),
    param('purchase_data', 'String', "20100"),
  ], 0, false, false)
  console.log("purchase 20100 geodes", txPurchaseGeode.id);
  expect(txPurchaseGeode.receipt.success).toEqual(true)

  const avgInflation = getAvgInflationBPS(0, 100, GEODE_INFLATION_BPS)
  // no items bought yet, so current inflation rate = 0
  // inflation rate of 100 bps, 50 items bought, avg inflation bps = 0 + (100 - 1) / 2 * 100 = 4950 bps
  expect(avgInflation).toEqual(4950)
  const hunyPaid = new BigNumber(txPurchaseGeode.receipt.event_logs[3].params[2].value)
  // huny paid = 100 geodes at avg inflation, 20000 at max price, 100 qty * 5 huny * 149.5% + 20000 qty * 10 huny = 200747.5
  expect(hunyPaid).toEqual(ONE_HUNY.times(200747.5))

  let state = await resourceStallContract.getState()
  // with inflation rate of 1.00%, 100 items will cause current buy side inflation rate to be 100%
  let buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('10000')
  // 20100 items bought, net purchase = -10000 + 20100 = capped at 10000
  let sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('10000')

  const txPurchaseGeodeMaxInflation = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', ONE_HUNY.times(100000)),
    param('purchase_data', 'String', "100"),
  ], 0, false, false)
  console.log("purchase 100 geodes", txPurchaseGeodeMaxInflation.id);
  expect(txPurchaseGeodeMaxInflation.receipt.success).toEqual(true)
  
  const hunyPaid2 = new BigNumber(txPurchaseGeodeMaxInflation.receipt.event_logs[3].params[2].value)
  // huny paid = 100 geodes at max price = 1000huny
  expect(hunyPaid2).toEqual(ONE_HUNY.times(1000))

  // with inflation rate already capped, inflation will remain at 100%
  state = await resourceStallContract.getState()
  buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('10000')
  // 100 items bought, net purchase = 10000 + 100 = capped at 10000
  sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('10000')
})

test('selling into net-negative with one transaction', async ()  => {
  const txSellGeode1 = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', '1'),
    param('quantity', 'Uint128', "15000"),
  ], 0, false, false)
  console.log("sell 15000 geodes", txSellGeode1.id);
  expect(txSellGeode1.receipt.success).toEqual(true)

  // inflation = root k * inflationBPS/deflationBPS, where k = nett +ve/-ve purchase count
  // net purchase is now at 10000
  // current inflation is at root(abs(10000)) * 100bps = 100.00% inflation
  // newPurchaseCount = 10000 - 15000 = -5000
  // newInflationRate = root(abs(-4999)) * -1.00% = -70.00% inflation
  // change in inflation rate = -70 - 100 = -170%
  // avgDeflation = -170 / 2 = -85%
  // avgDeflationBPS = 100 - 85 = 15
  const avgDeflation1 = getAvgDeflationBPS(10000, 15000, GEODE_INFLATION_BPS, GEODE_DEFLATION_BPS)
  expect(avgDeflation1).toEqual(1500)

  const hunyEarned1 = new BigNumber(txSellGeode1.receipt.event_logs[3].params[2].value)
  // huny earned = 5 huny * 15000 qty * 115%
  expect(hunyEarned1).toEqual(ONE_HUNY.times(86250))

  let state = await resourceStallContract.getState()
  // 15000 items sold, sellSideNetPurchase = 10000 - 15000 = -5000
  let sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('-5000')
  // buy side inflation capped at 0, more than 100 items sold
  let buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('0')
})

test('update transact count', async () => {
  const txUpdateTransactCount = await callContract(privateKey, resourceStallContract, "UpdateTransact", [
    param('item_id', 'Uint128', '0'),
    param('buy_quantity', 'Uint128', '0'),
    param('sell_quantity', 'Uint128', '7000')
  ], 0, false, false)
  console.log('update transact count for item id: 0 with 5000 items sold', txUpdateTransactCount.id)

  expect(txUpdateTransactCount.receipt.success).toEqual(true)
  let state = await resourceStallContract.getState()
  // 5000 items sold, sellSideNetPurchase = -5000 - 7000 = capped at -10000
  let sellSideNetPurchase = state.transact_count['0'].arguments[1]
  expect(sellSideNetPurchase).toEqual('-10000')
  // buy side inflation capped at 0, more than 100 items sold
  let buySideInflation = state.transact_count['0'].arguments[0]
  expect(buySideInflation).toEqual('0')
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
