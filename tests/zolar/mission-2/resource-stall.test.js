const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { callContract } = require("../../../scripts/call");
const { deployHunyToken, deployEmporium, deployResourceStore, deployResource, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");
const { generateErrorMsg, getBalanceFromStates } = require('../bank/helper')
const { adt } = require("./helper")

let privateKey, address, hunyAddress, emporiumAddress, resourceStallAddress, geodeAddress, hunyContract, emporiumContract, resourceStallContract, geodeContract

let netPurchase = 0
let maxInflationBPS
const HUNDRED_PERCENT_BPS = 10000
const GEODE_BASE_PRICE = ONE_HUNY.times(5)
const GEODE_MAX_PRICE = ONE_HUNY.times(50)
const GEODE_INFLATION_BPS = HUNDRED_PERCENT_BPS
const GEODE_DEFLATION_BPS = HUNDRED_PERCENT_BPS

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
    param('buy_price', `${resourceStallAddress}.Price`,
      adt(`${resourceStallAddress}.Price`, [], [
        GEODE_BASE_PRICE.toString(10),      // base price = 5 HUNY
        GEODE_MAX_PRICE.toString(10),       // max price = 50 HUNY
        GEODE_INFLATION_BPS.toString(10),   // inflation bps
        GEODE_DEFLATION_BPS.toString(10)    // deflation bps
      ])
    ),
    param('sell_price', `${resourceStallAddress}.Price`,
      adt(`${resourceStallAddress}.Price`, [], [
        ONE_HUNY.times(5).toString(10),
        ONE_HUNY.times(50).toString(10),
        "10000",
        "10000"
      ])
    )], 0, false, false)
  console.log("add item", txAddItem.id);

  const state = await resourceStallContract.getState()
  expect(Object.keys(state.items).length).toEqual(1)
})

describe('test inflation mechanism', () => {
  // < 10th item is subjected to linear inflation 
  // >= 10th item is priced at max price
  test('purchase 9 units of resource; net purchase = 9', async () => {
    const qtyPurchased = 9
    netPurchase += qtyPurchased
    const hunyStateBeforeTx = await hunyContract.getState()

    const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
      param('item_id', 'Uint128', "0"),
      param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
      param('purchase_data', 'String', "9"),
    ], 0, false, false)
    console.log("purchase geode; net purchase = 9", txPurchaseGeode.id);

    const hunyStateAfterTx = await hunyContract.getState()
    const [balanceBeforeTx, balanceAfterTx] = getBalanceFromStates(address, hunyStateBeforeTx, hunyStateAfterTx)
    const hunySpentActual = (new BigNumber(balanceBeforeTx)).minus(balanceAfterTx)

    const avgInflationBPS = getAvgInflationBPS(0, qtyPurchased, GEODE_INFLATION_BPS)
    const avgInflation = GEODE_BASE_PRICE * Math.floor(avgInflationBPS / HUNDRED_PERCENT_BPS)
    const avgPrice = GEODE_BASE_PRICE.plus(avgInflation)
    const hunySpentExpected = avgPrice.multipliedBy(qtyPurchased)

    expect(hunySpentActual).toEqual(hunySpentExpected)
  })

  test('purchase 1 unit of resource; net purchase = 10', async () => {
    const qtyPurchased = 1
    netPurchase += qtyPurchased
    const hunyStateBeforeTx = await hunyContract.getState()

    const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
      param('item_id', 'Uint128', "0"),
      param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
      param('purchase_data', 'String', `${qtyPurchased}`),
    ], 0, false, false)
    console.log("purchase geode; net purchase = 10", txPurchaseGeode.id);

    const resourceStallStateAfterTx = await resourceStallContract.getState()
    const hunyStateAfterTx = await hunyContract.getState()
    const [balanceBeforeTx, balanceAfterTx] = getBalanceFromStates(address, hunyStateBeforeTx, hunyStateAfterTx)
    const hunySpentActual = (new BigNumber(balanceBeforeTx)).minus(balanceAfterTx)

    expect(hunySpentActual).toEqual(GEODE_MAX_PRICE)

    maxInflationBPS = (GEODE_MAX_PRICE.minus(GEODE_BASE_PRICE)).dividedBy(GEODE_BASE_PRICE).multipliedBy(HUNDRED_PERCENT_BPS)

    const geodeTransact = resourceStallStateAfterTx.transact_count[0]
    expect(geodeTransact.arguments[0]).toEqual(netPurchase.toString())
    expect(geodeTransact.arguments[1]).toEqual(maxInflationBPS.toString())
  })

  test('purchase 1 unit of resource; net purchase = 11', async () => {
    const qtyPurchased = 1
    netPurchase += qtyPurchased
    const hunyStateBeforeTx = await hunyContract.getState()

    const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
      param('item_id', 'Uint128', "0"),
      param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
      param('purchase_data', 'String', `${qtyPurchased}`),
    ], 0, false, false)
    console.log("purchase geode; net purchase = 11", txPurchaseGeode.id);

    const resourceStallStateAfterTx = await resourceStallContract.getState()
    const hunyStateAfterTx = await hunyContract.getState()
    const [balanceBeforeTx, balanceAfterTx] = getBalanceFromStates(address, hunyStateBeforeTx, hunyStateAfterTx)
    const hunySpentActual = (new BigNumber(balanceBeforeTx)).minus(balanceAfterTx)

    expect(hunySpentActual).toEqual(GEODE_MAX_PRICE)

    maxInflationBPS = (GEODE_MAX_PRICE.minus(GEODE_BASE_PRICE)).dividedBy(GEODE_BASE_PRICE).multipliedBy(HUNDRED_PERCENT_BPS)

    const geodeTransact = resourceStallStateAfterTx.transact_count[0]
    expect(geodeTransact.arguments[0]).toEqual(netPurchase.toString())
    expect(geodeTransact.arguments[1]).toEqual(maxInflationBPS.toString())
  })
})

test('make purchase with insufficient max_price', async () => {
  // test max_price < cost (throws CodeItemTooExpensive)
  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12).toString(10)),
    param('purchase_data', 'String', "1"),
  ], 0, false, false)
  console.log("purchase geode with insufficient max_price", txPurchaseGeode.id);

  expect(txPurchaseGeode.status).toEqual(3)
  expect(txPurchaseGeode.receipt.exceptions[0].message).toEqual(generateErrorMsg(6)) // throws CodeItemTooExpensive
  expect(txPurchaseGeode.receipt.success).toEqual(false)
})