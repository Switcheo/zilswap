
const { Transaction, TxStatus } = require('@zilliqa-js/account');
const { bytes, BN, Long } = require('@zilliqa-js/zilliqa');
const { default: BigNumber } = require('bignumber.js');
const { zilliqa, VERSION } = require('../../zilliqa');

function computInflation(price, hunySupply, purchaseCount) {
  const priceMatch = price.constructor.match(/^0x[a-z0-9]{40}.([a-z0-9]*)$/i);
  if (!priceMatch)
    throw new Error("invalid price constructor");

  const type = priceMatch[1];
  switch (type) {
    case "SupplyScaledInflation": {
      return new BigNumber(price.arguments[0]).times(purchaseCount).times(hunySupply).dividedToIntegerBy(10000);
    }
    case "NumericInflation": {
      return new BigNumber(price.arguments[0]).times(purchaseCount);
    }
    case "NoInflation": return new BigNumber(0);
    default: throw new Error(`invalid price type: ${type}`);
  }

}

function computePrice(price, hunySupply, purchaseCount) {
  const priceMatch = price.constructor.match(/^0x[a-z0-9]{40}.([a-z0-9]*)$/i);
  if (!priceMatch)
    throw new Error("invalid price constructor");

  const type = priceMatch[1];
  switch (type) {
    case "NumericPrice": {
      const inflation = computInflation(price.arguments[1], hunySupply, purchaseCount);
      return new BigNumber(price.arguments[0]).plus(inflation)
    };
    case "SupplyScaledPrice": {
      const inflation = computInflation(price.arguments[1], hunySupply, purchaseCount);
      return new BigNumber(price.arguments[0]).times(hunySupply).dividedToIntegerBy(10000).plus(inflation);
    }
    default: throw new Error(`invalid price type: ${type}`);
  }

}

async function computeFinalPrice(priceScale, hunySupply, purchaseCount) {
  if (!hunySupply) {
    const { result } = await zilliqa.blockchain.getSmartContractSubState(process.env.HUNY_CONTRACT_HASH, "total_supply");
    hunySupply = new BigNumber(result.total_supply);
  }

  const priceScaleMatch = priceScale.constructor.match(/^0x[a-z0-9]{40}.([a-z0-9]*)$/i);
  if (!priceScaleMatch)
    throw new Error("invalid price scale constructor");

  const type = priceScaleMatch[1];

  let finalPrice, parameters;
  switch (type) {
    case "MinPrice": {
      const [priceA, priceB] = priceScale.arguments;
      const priceAValue = await computePrice(priceA, hunySupply, purchaseCount);
      const priceBValue = await computePrice(priceB, hunySupply, purchaseCount);

      finalPrice = BigNumber.min(priceAValue, priceBValue);
      parameters = [priceAValue, priceBValue];
      break;
    }
    case "MaxPrice": {
      const [priceA, priceB] = priceScale.arguments;
      const priceAValue = await computePrice(priceA, hunySupply, purchaseCount);
      const priceBValue = await computePrice(priceB, hunySupply, purchaseCount);

      finalPrice = BigNumber.max(priceAValue, priceBValue);
      parameters = [priceAValue, priceBValue];
      break;
    }
    case "BoundedPrice": {
      const [priceTarget, priceMin, priceMax] = priceScale.arguments;
      const priceTargetValue = await computePrice(priceTarget, hunySupply, purchaseCount);
      const priceMinValue = await computePrice(priceMin, hunySupply, purchaseCount);
      const priceMaxValue = await computePrice(priceMax, hunySupply, purchaseCount);

      finalPrice = BigNumber.min(BigNumber.max(priceTargetValue, priceMinValue), priceMaxValue);
      parameters = [priceTargetValue, priceMinValue, priceMaxValue];
      break;
    }
    case "ConstantPrice": {
      const [price] = priceScale.arguments;
      const priceValue = await computePrice(price, hunySupply);

      finalPrice = priceValue;
      parameters = [priceValue];
      break;
    }
    default: throw new Error(`invalid price scale: ${type}`);
  }

  return {
    type,
    parameters,
    finalPrice,
    hunySupply,
  }
};

async function checkPrice() {

  const ITEM_ID = "21";

  console.log("checking price for", ITEM_ID);

  const { result } = await zilliqa.blockchain.getSmartContractSubState(process.env.HUNY_CONTRACT_HASH, "total_supply");
  const hunySupply = new BigNumber(result.total_supply);

  const { result: countResult } = await zilliqa.blockchain.getSmartContractSubState(process.env.HUNY_CONTRACT_HASH, "purchase_count", [ITEM_ID]);
  const purchaseCount = new BigNumber(countResult?.purchase_count?.[ITEM_ID] ?? 0).toNumber();
  console.log("Purchase Count", purchaseCount)

  const { result: itemsResult } = await zilliqa.blockchain.getSmartContractSubState(process.env.HUNY_STALL_CONTRACT_HASH, "items");
  const item = itemsResult.items[ITEM_ID];
  const [itemName, priceScale] = item.arguments;
  const price = await computeFinalPrice(priceScale, hunySupply, purchaseCount);
  console.log("Price Type", price.type);
  console.log("Parameters", price.parameters.map(p => p.shiftedBy(-12).toFormat()));
  console.log("Final Price", price.finalPrice.shiftedBy(-12).toFormat());
  console.log("Huny Supply", hunySupply.shiftedBy(-12).toFormat());
}

checkPrice().then(() => console.log('done.'))
