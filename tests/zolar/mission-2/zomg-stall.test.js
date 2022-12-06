const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { createRandomAccount } = require("../../../scripts/account");
const { callContract } = require("../../../scripts/call");
const { deployHunyToken, deployEmporium, deployItems, deployZOMGStore, ONE_HUNY, deployResource, deployMetazoa } = require("../../../scripts/zolar/mission-2/helper");
const { generateErrorMsg, getBalanceFromStates } = require('../bank/helper')
const { adt } = require("./helper")

const MINT_ITEM_COUNT = 6
let currentMintId = 1

let user1PrivateKey, user2PrivateKey, user1Address, user2Address, hunyAddress, emporiumAddress, itemsAddress, zomgStoreAddress, hunyContract, emporiumContract, itemsContract, zomgStoreContract, metazoaContract, metazoaAddress

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
  // mint metazoa to consume elderBerry juice

  user1PrivateKey = getPrivateKey();
  user1Address = getAddressFromPrivateKey(user1PrivateKey).toLowerCase();

  ; ({ key: user2PrivateKey, address: user2Address } = await createRandomAccount(user1PrivateKey, '1000'))

  hunyContract = await deployHunyToken({ name: "Huny Token", symbol: "HUNY", decimals: "12" });
  hunyAddress = hunyContract.address.toLowerCase();

  emporiumContract = await deployEmporium();
  emporiumAddress = emporiumContract.address.toLowerCase();

  itemsContract = await deployItems({ baseUri: "https://test-api.zolar.io/items/metadata/" });
  itemsAddress = itemsContract.address.toLowerCase();

  zomgStoreContract = await deployZOMGStore();
  zomgStoreAddress = zomgStoreContract.address.toLowerCase();

  metazoaContract = await deployMetazoa();
  metazoaAddress = metazoaContract.address.toLowerCase();

  const txMintSelf = await callContract(user1PrivateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', user1Address),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMintSelf.id);

  const txMintMember = await callContract(user1PrivateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', user2Address),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("mint", txMintMember.id);

  const txAddHunyMinter = await callContract(user1PrivateKey, hunyContract, "AddMinter", [
    param('minter', 'ByStr20', zomgStoreAddress)], 0, false, false);
  console.log("add zomg store as huny minter", txAddHunyMinter.id)

  const txAddMinterZOMG = await callContract(user1PrivateKey, itemsContract, "AddMinter", [
    param('minter', 'ByStr20', zomgStoreAddress)], 0, false, false);
  console.log("add zomg store as item minter", txAddMinterZOMG.id)

  for (let i = 0; i < MINT_ITEM_COUNT; i++) {
    const mid = Math.floor(MINT_ITEM_COUNT / 2)
    const currentAddress = i < mid ? user1Address : user2Address
    const txMintGemAndSetTraits = await callContract(user1PrivateKey, itemsContract, "MintAndSetTraits", [
      param('to', 'ByStr20', currentAddress),
      param('token_uri', 'String', ''),
      param('proposed_traits', 'List (Pair String String)', [
        adt('Pair', ['String', 'String'], ['Type', 'Gem']),
        adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
        adt('Pair', ['String', 'String'], ['Tier', 'C']),
      ])
    ], 0, false, false);
    console.log(`mint and set token trait for gem ${i + 1}`, txMintGemAndSetTraits.id);
    currentMintId++
  }

  const txZOMGStoreAddOperatorSelf = await callContract(user1PrivateKey, itemsContract, "AddOperator", [
    param('operator', 'ByStr20', zomgStoreAddress),
  ], 0, false, false)
  console.log("item add zomg store as operator for self", txZOMGStoreAddOperatorSelf.id);

  const txZOMGStoreAddOperatorMember = await callContract(user2PrivateKey, itemsContract, "AddOperator", [
    param('operator', 'ByStr20', zomgStoreAddress),
  ], 0, false, false)
  console.log("item add zomg store as operator for member", txZOMGStoreAddOperatorMember.id);

  const txAddConsumer = await callContract(user1PrivateKey, itemsContract, 'AddConsumer', [
    param('consumer', 'ByStr20', zomgStoreAddress),
  ], 0, false, false)
  console.log('item add zomg store as consumer', txAddConsumer.id)

  const txMintMetazoa = await callContract(user1PrivateKey, metazoaContract, 'Mint', [
    param('to', 'ByStr20', user1Address),
    param('token_uri', 'String', ''),
  ], 0, false, false)
  console.log(txMintMetazoa.id)
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

  const txAddWeapon = await callContract(user1PrivateKey, zomgStoreContract, "AddItem", [
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
  const txCraftWeaponExcess = await callContract(user1PrivateKey, zomgStoreContract, "CraftItem", [
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

  const txCraftWeaponDeficit = await callContract(user1PrivateKey, zomgStoreContract, "CraftItem", [
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
  const txCraftWeapon = await callContract(user1PrivateKey, zomgStoreContract, "CraftItem", [
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
  const txMintGemAndSetTraits = await callContract(user1PrivateKey, itemsContract, "MintAndSetTraits", [
    param('to', 'ByStr20', user1Address),
    param('token_uri', 'String', ''),
    param('proposed_traits', 'List (Pair String String)', [
      adt('Pair', ['String', 'String'], ['Type', 'Gem']),
      adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
      adt('Pair', ['String', 'String'], ['Tier', 'B']),
    ])
  ], 0, false, false);
  console.log("mint Tier B gem", txMintGemAndSetTraits.id);
  currentMintId++

  const txCraftWeapon = await callContract(user1PrivateKey, zomgStoreContract, "CraftItem", [
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
  const txCraftWeapon = await callContract(user1PrivateKey, zomgStoreContract, "CraftItem", [
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
  const txCraftWeapon = await callContract(user1PrivateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [
      adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, "0"]), // pay huny
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "1"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "2"]), // pay gem
      adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, "3"]), // pay gem
    ]),
  ], 0, false, false)
  console.log("craft weapon", txCraftWeapon.id);
  currentMintId++

  const hunyStateAfterTx = await hunyContract.getState()
  const itemsStateAfterTx = await itemsContract.getState()

  const [balanceBeforeTx, balanceAfterTx] = getBalanceFromStates(user1Address, hunyStateBeforeTx, hunyStateAfterTx)
  const hunyBurnt = (new BigNumber(balanceBeforeTx)).minus(balanceAfterTx)

  expect(hunyBurnt.toString()).toEqual(ONE_HUNY.times(27000).toString())

  const gemsBurnt = ["1", "2", "3"]
  gemsBurnt.forEach(gem => expect(Object.keys(itemsStateAfterTx.token_owners)).not.toContain(gem))
  expect(Object.keys(itemsStateAfterTx.token_owners)).toContain((MINT_ITEM_COUNT + 1).toString())
})

test('(success) batch craft items (check if bypasses max depth)', async () => {
  const hunyCost = adt(`${zomgStoreAddress}.CraftingCost`, [], [hunyAddress, ONE_HUNY.times(100), []])
  const txAddElderberryJuice = await callContract(user1PrivateKey, zomgStoreContract, "AddItem", [
    param('item_name', 'String', 'Elderberry Juice'),
    param('token_address', "ByStr20", itemsAddress),
    param('traits', 'List (Pair String String)', [
      adt('Pair', ['String', 'String'], ['Type', 'Consumable']),
      adt('Pair', ['String', 'String'], ['Name', 'ElderberryJuice'])
    ]),
    param('cost', `List ${zomgStoreAddress}.CraftingCost`, [
      hunyCost
    ])
  ], 0, false, false)
  console.log('add elderberry juice', txAddElderberryJuice)

  const itemsToCraft = []

  for (let i = 0; i < 250; i++) {
    itemsToCraft.push(
      adt('Pair', ['Uint128', `List ${zomgStoreAddress}.PaymentItem`], [
        '1', [adt(`${zomgStoreAddress}.PaymentItem`, [], [hunyAddress, '0'])]
      ])
    )
  }

  const txBatchCraftElderberry = await callContract(user1PrivateKey, zomgStoreContract, "BatchCraftItem", [
    param('item_id_payment_items_pair_list', `List (Pair Uint128 (List ${zomgStoreAddress}.PaymentItem))`, itemsToCraft)
  ], 0, false, false)
  console.log('batch craft elderberry juice', txBatchCraftElderberry.id)
  expect(txBatchCraftElderberry.receipt.success).toEqual(true)
})

test('consume elderberry juice', async () => {
  const txAddConsumable = await callContract(user1PrivateKey, zomgStoreContract, "AddConsumable", [
    param('name', 'String', 'Consumable')
  ], 0, false, false)
  console.log(txAddConsumable.id)

  const txConsume = await callContract(user1PrivateKey, zomgStoreContract, "ConsumeItem", [
    param('token_id', 'Uint256', currentMintId.toString()),
    param('token_contract_address', 'ByStr20', itemsAddress),
    param('consumer_id', 'Uint256', '1'),
    param('consumer_contract_address', 'ByStr20', metazoaAddress),
  ], 0, false, false)
  console.log(txConsume.id)
  currentMintId++
  expect(txConsume.receipt.success).toEqual(true)
})

test('batch consume elderberry', async () => {
  const consumeList = []
  for (let i = 0; i < 70; i++) {
    consumeList.push(
      adt(`${zomgStoreAddress}.ConsumeItem`, [], [itemsAddress, (currentMintId).toString(), metazoaAddress, '1'])
    )
    currentMintId++
  }
  const txBatchConsume = await callContract(user1PrivateKey, zomgStoreContract, "BatchConsumeItem", [
    param('token_consumer_list', `List ${zomgStoreAddress}.ConsumeItem`, consumeList)
  ], 0, false, false)
  console.log(txBatchConsume.id)
  currentMintId+= 179
  expect(txBatchConsume.receipt.success).toEqual(true)
})

test('craft item with many materials (test to bypass max depth)', async () => {
  const strAttributes = [
    adt('Pair', ['String', 'String'], ['Type', 'Gem']),
    adt('Pair', ['String', 'String'], ['Condition', 'Normal']),
    adt('Pair', ['String', 'String'], ['Affinity', 'STR']),
    adt('Pair', ['String', 'String'], ['Tier', 'C']),
  ]

  const params = []

  for (let i = 0; i < 100; i++) {
    const recipientUriPair = adt('Pair', ['ByStr20', 'String'], [user1Address, 'test'])
    const recipientUriTraitsPair = adt('Pair', ['Pair ByStr20 String', 'List (Pair String String)'], [recipientUriPair, strAttributes])
    params.push(recipientUriTraitsPair)
  }

  const txBatchMintGemAndSetTraits = await callContract(user1PrivateKey, itemsContract, "BatchMintAndSetTraits", [
    param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', params),
  ], 0, false, false);
  console.log(txBatchMintGemAndSetTraits.id);

  const cost = []
  
  // add 100 gem costs to cost
  for (let i = 0; i < 100; i++) {
    cost.push(adt(`${zomgStoreAddress}.CraftingCost`, [], [itemsAddress, "0", strAttributes]))
  }

  const txAddGodslayerItem = await callContract(user1PrivateKey, zomgStoreContract, "AddItem", [
    param('item_name', 'String', `OH7-Godslayer's Hand of Death`),
    param('token_address', 'ByStr20', itemsAddress),
    param('traits', 'List (Pair String String)', [
      adt('Pair', ['String', 'String'], ['Type', 'Off-Hand']),
      adt('Pair', ['String', 'String'], ['Name', `OH7-Godslayer's Hand of Death`]),
      adt('Pair', ['String', 'String'], ['Subtype', 'Magic']),
      adt('Pair', ['String', 'String'], ['Damage', '50']),
    ]),
    param('cost', `List ${zomgStoreAddress}.CraftingCost`, cost)
  ], 0, false, false)
  console.log(txAddGodslayerItem)
  expect(txAddGodslayerItem.receipt.success).toEqual(true)

  const payment = []
  
  // add corresponding payments
  for (let i = 0; i < 100; i++) {
    payment.push(adt(`${zomgStoreAddress}.PaymentItem`, [], [itemsAddress, (i + currentMintId).toString()]))
  }

  const txCraftGodslayerItem = await callContract(user1PrivateKey, zomgStoreContract, "CraftItem", [
    param('item_id', 'Uint128', '2'),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, payment),
  ], 0, false, false)
  console.log(txCraftGodslayerItem)
  expect(txCraftGodslayerItem.receipt.success).toEqual(true)
})