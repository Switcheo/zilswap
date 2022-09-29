const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { createRandomAccount } = require("../../../scripts/account");
const { callContract } = require("../../../scripts/call");
const { deployHunyToken, deployEmporium, deployItems, deployZOMGStore, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");
const { generateErrorMsg, getBalanceFromStates } = require('../bank/helper')
const { adt } = require("./helper")

const MINT_ITEM_COUNT = 6

let privateKey, memberPrivateKey, address, memberAddress, hunyAddress, emporiumAddress, itemsAddress, zomgStoreAddress, hunyContract, emporiumContract, itemsContract, zomgStoreContract

beforeAll(async () => {
  // deploy huny
  // deploy emporium
  // deploy items
  // deploy zomg stall
  // mint huny for self and member
  // add zomg stall as huny minter
  // add zomg stall as item minter
  // mint 6 x gems (Type Gem, Affinity INT, Tier C) for self 
  // add zomg stall as item operator for self and member

  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();

  ; ({ key: memberPrivateKey, address: memberAddress } = await createRandomAccount(privateKey, '1000'))

  hunyContract = await deployHunyToken({ name: "Huny Token", symbol: "HUNY", decimals: "12" });
  hunyAddress = hunyContract.address.toLowerCase();

  emporiumContract = await deployEmporium();
  emporiumAddress = emporiumContract.address.toLowerCase();

  itemsContract = await deployItems({ baseUri: "https://test-api.zolar.io/items/metadata/" });
  itemsAddress = itemsContract.address.toLowerCase();

  zomgStoreContract = await deployZOMGStore();
  zomgStoreAddress = zomgStoreContract.address.toLowerCase();

  const txMintSelf = await callContract(privateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', address),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMintSelf.id);

  const txMintMember = await callContract(privateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', memberAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMintMember.id);

  const txAddHunyMinter = await callContract(privateKey, hunyContract, "AddMinter", [
    param('minter', 'ByStr20', zomgStoreAddress)], 0, false, false);
  console.log("add zomg store as huny minter", txAddHunyMinter.id)

  const txAddMinterZOMG = await callContract(privateKey, itemsContract, "AddMinter", [
    param('minter', 'ByStr20', zomgStoreAddress)], 0, false, false);
  console.log("add zomg store as item minter", txAddMinterZOMG.id)

  for (let i = 0; i < MINT_ITEM_COUNT; i++) {
    const mid = Math.floor(MINT_ITEM_COUNT / 2)
    const currentAddress = i < mid ? address : memberAddress
    const txMintGemAndSetTraits = await callContract(privateKey, itemsContract, "MintAndSetTraits", [
      param('to', 'ByStr20', currentAddress),
      param('token_uri', 'String', ''),
      param('proposed_traits', 'List (Pair String String)', [
        adt('Pair', ['String', 'String'], ['Type', 'Gem']),
        adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
        adt('Pair', ['String', 'String'], ['Tier', 'C']),
      ])
    ], 0, false, false);
    console.log(`mint and set token trait for gem ${i + 1}`, txMintGemAndSetTraits.id);
  }

  const txZOMGStoreAddOperatorSelf = await callContract(privateKey, itemsContract, "AddOperator", [
    param('operator', 'ByStr20', zomgStoreAddress),
  ], 0, false, false)
  console.log("item add zomg store as operator for self", txZOMGStoreAddOperatorSelf.id);

  const txZOMGStoreAddOperatorMember = await callContract(memberPrivateKey, itemsContract, "AddOperator", [
    param('operator', 'ByStr20', zomgStoreAddress),
  ], 0, false, false)
  console.log("item add zomg store as operator for member", txZOMGStoreAddOperatorMember.id);
})

test('add item to zomg store (independent of emporium)', async () => {
  const hunyCost = adt(`${zomgStoreAddress}.CraftingCost`, [], [hunyAddress, ONE_HUNY.times(27000), []])

  const gemAttributes = [
    adt('Pair', ['String', 'String'], ['Type', 'Gem']),
    adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
    adt('Pair', ['String', 'String'], ['Tier', 'C']),
  ]

  const gemCost = adt(`${zomgStoreAddress}.CraftingCost`, [], [
    itemsAddress,
    "0", // ignored for zrc6 
    gemAttributes])

  const txAddWeapon = await callContract(privateKey, zomgStoreContract, "AddItem", [
    param('item_name', 'String', 'HA13-Hand of Death'),
    param('token_address', 'ByStr20', itemsAddress),
    param('traits', 'List (Pair String String)', [
      adt('Pair', ['String', 'String'], ['Type', 'Equipment']),
      adt('Pair', ['String', 'String'], ['STR', '7']),
      adt('Pair', ['String', 'String'], ['INT', '7']),
      adt('Pair', ['String', 'String'], ['DEX', '7']),
    ]),
    param('cost', `List ${zomgStoreAddress}.CraftingCost`, [
      hunyCost, gemCost, gemCost, gemCost
    ]),
  ], 0, false, false);
  console.log("add weapon", txAddWeapon.id);

  const state = await zomgStoreContract.getState()
  expect(Object.keys(state.items).length).toEqual(1)
  expect(state.items[0].arguments[0]).toEqual('HA13-Hand of Death')
})

test('(fail) craft item with non-matching (length) paymentItems and craftingCost)', async () => {
  // test length of cost token vs payment token should match (9 - CodeInvalidPaymentItemCount)
  const txCraftWeaponExcess = await callContract(privateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [
      adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, "0"]), // pay huny
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "1"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "2"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "3"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "4"]), // pay gem
    ]),
  ], 0, false, false)
  console.log("craft weapon with excess payment items", txCraftWeaponExcess.id);

  expect(txCraftWeaponExcess.status).toEqual(3)
  expect(txCraftWeaponExcess.receipt.exceptions[0].message).toEqual(generateErrorMsg(9)) // throws CodeInvalidPaymentItemCount
  expect(txCraftWeaponExcess.receipt.success).toEqual(false)

  const txCraftWeaponDeficit = await callContract(privateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [
      adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, "0"]), // pay huny
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "1"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "2"]), // pay gem
    ]),
  ], 0, false, false)
  console.log("craft weapon with insufficient payment items", txCraftWeaponDeficit.id);

  expect(txCraftWeaponDeficit.status).toEqual(3)
  expect(txCraftWeaponDeficit.receipt.exceptions[0].message).toEqual(generateErrorMsg(9)) // throws CodeInvalidPaymentItemCount
  expect(txCraftWeaponDeficit.receipt.success).toEqual(false)
})

test('(fail) craft item with non-matching (order) paymentItems and craftingCost', async () => {
  // test order of cost token vs payment token should match (10 - CodeInvalidPaymentItemToken) 
  const txCraftWeapon = await callContract(privateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "1"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "2"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "3"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, "0"]), // pay huny
    ]),
  ], 0, false, false)
  console.log("craft weapon with non-matching (order) paymentItems and craftingCost", txCraftWeapon.id);

  expect(txCraftWeapon.status).toEqual(3)
  expect(txCraftWeapon.receipt.exceptions[0].message).toEqual(generateErrorMsg(10)) // throws CodeInvalidPaymentItemToken
  expect(txCraftWeapon.receipt.success).toEqual(false)
})

test('(fail) craft item with non-matching (traits) paymentItems and craftingCost', async () => {
  // test traits of cost token vs payment token should match (11 - CodeInvalidPaymentItemTraits) 
  const txMintGemAndSetTraits = await callContract(privateKey, itemsContract, "MintAndSetTraits", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', ''),
    param('proposed_traits', 'List (Pair String String)', [
      adt('Pair', ['String', 'String'], ['Type', 'Gem']),
      adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
      adt('Pair', ['String', 'String'], ['Tier', 'B']),
    ])
  ], 0, false, false);
  console.log("mint Tier B gem", txMintGemAndSetTraits.id);

  const txCraftWeapon = await callContract(privateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [
      adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, "0"]), // pay huny
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "1"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "2"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "7"]), // pay gem
    ]),
  ], 0, false, false)
  console.log("craft weapon with non-matching (traits) paymentItems and craftingCost", txCraftWeapon.id);

  expect(txCraftWeapon.status).toEqual(3)
  expect(txCraftWeapon.receipt.exceptions[0].message).toEqual(generateErrorMsg(11)) // throws CodeInvalidPaymentItemTraits
  expect(txCraftWeapon.receipt.success).toEqual(false)
})

test(`(fail) craft item using other users' gems for payment`, async () => {
  const txCraftWeapon = await callContract(privateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [
      adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, "0"]), // pay huny
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "4"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "5"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "6"]), // pay gem
    ]),
  ], 0, false, false)
  console.log("craft weapon with other users' gems", txCraftWeapon.id);
  expect(txCraftWeapon.status).toEqual(3)
  // expect(txCraftWeapon.receipt.exceptions[0].message).toEqual(generateErrorMsg(11)) // throws CodeInvalidPaymentItemTraits
  expect(txCraftWeapon.receipt.success).toEqual(false)
})

test('(success) craft item', async () => {
  const hunyStateBeforeTx = await hunyContract.getState()

  // test zrc-2 and zrc-6 payment tokens correctly deducted (burnt)
  const txCraftWeapon = await callContract(privateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [
      adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, "0"]), // pay huny
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "1"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "2"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "3"]), // pay gem
    ]),
  ], 0, false, false)
  console.log("craft weapon", txCraftWeapon.id);

  const hunyStateAfterTx = await hunyContract.getState()
  const itemsStateAfterTx = await itemsContract.getState()

  const [balanceBeforeTx, balanceAfterTx] = getBalanceFromStates(address, hunyStateBeforeTx, hunyStateAfterTx)
  const hunyBurnt = (new BigNumber(balanceBeforeTx)).minus(balanceAfterTx)

  expect(hunyBurnt.toString()).toEqual(ONE_HUNY.times(27000).toString())

  const gemsBurnt = ["1", "2", "3"]
  gemsBurnt.forEach(gem => expect(Object.keys(itemsStateAfterTx.token_owners)).not.toContain(gem))
  expect(Object.keys(itemsStateAfterTx.token_owners)).toContain((MINT_ITEM_COUNT + 1).toString())
})