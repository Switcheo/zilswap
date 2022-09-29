const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { createRandomAccount } = require("../../../scripts/account");
const { callContract } = require("../../../scripts/call");
const { deployItems, deployMetazoa } = require("../../../scripts/zolar/mission-2/helper");
const { generateErrorMsg } = require('../bank/helper')

let privateKey, memberPrivateKey, address, memberAddress, itemsAddress, itemsContract

beforeAll(async () => {
  // deploy metazoa
  // deploy items
  // mint metazoa
  // mint items

  // item checks
  // equip item -> metazoa success
  // unequip item <- metazoa success
  // equip item -> item success
  // unequip item <- item success
  // equip an equipped item fail
  // unequip an unequipped item fail
  // equip item to itself fail
  // equip item and try to transfer/burn it fail
  // equip item where item does not belong to sender
  // equip item where parent does not belong to sender
  // equip item where, parent is already a child of the item attemping to equip
  // equip item and transfer parent, check who can unequip it and check if item ownership changes


  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();

  ; ({ key: memberPrivateKey, address: memberAddress } = await createRandomAccount(privateKey, '1000'))

  metazoaContract = await deployMetazoa()
  metazoaAddress = metazoaContract.address.toLowerCase();

  itemsContract = await deployItems({ baseUri: "https://test-api.zolar.io/items/metadata/" });
  itemsAddress = itemsContract.address.toLowerCase();

  const txMintMetazoa = await callContract(privateKey, metazoaContract, "Mint", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', "testing mint metazoa")
  ], 0, false, false)
  console.log(txMintMetazoa.id)

  const txMintItem1 = await callContract(privateKey, itemsContract, "Mint", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', "testing mint item 1")
  ], 0, false, false)
  console.log(txMintItem1.id)

  const txMintItem2 = await callContract(privateKey, itemsContract, "Mint", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', "testing mint item 2")
  ], 0, false, false)
  console.log(txMintItem2.id)

  const txMintItem3 = await callContract(privateKey, itemsContract, "Mint", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', "testing mint item 3")
  ], 0, false, false)
  console.log(txMintItem3.id)

  const txMintItem4 = await callContract(privateKey, itemsContract, "Mint", [
    param('to', 'ByStr20', memberAddress),
    param('token_uri', 'String', "testing mint item 4")
  ], 0, false, false)
  console.log(txMintItem4.id)
})

test('equip and unequip item to and from metazoa', async () => {
    const txEquip = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '1'),
        param('to_contract', 'ByStr20', metazoaAddress)
    ], 0, false, false)
    console.log(txEquip.id)
    expect(txEquip.receipt.success).toEqual(true)
    
    const txUnequip = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '1'),
        param('from_token_id', 'Uint256', '1'),
        param('from_contract', 'ByStr20', metazoaAddress)
    ], 0, false, false)
    console.log(txUnequip.id)
    expect(txUnequip.receipt.success).toEqual(true)
})

test('equip and unequip item to and from item', async () => {
    const txEquip = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '2'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip.id)
    expect(txEquip.receipt.success).toEqual(true)
    
    const txUnequip = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '1'),
        param('from_token_id', 'Uint256', '2'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip.id)
    expect(txUnequip.receipt.success).toEqual(true)
})

test('equipping an already equipped item', async () => {
    const txEquip1 = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '2'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip1.id)
    expect(txEquip1.receipt.success).toEqual(true)
    
    const txEquip2 = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '2'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip2.id)
    expect(txEquip2.receipt.success).toEqual(false)
    expect(txEquip2.receipt.exceptions[0].message).toEqual(generateErrorMsg(19)) // throws ItemOwnedError

    const txUnequip = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '1'),
        param('from_token_id', 'Uint256', '2'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip.id)
    expect(txUnequip.receipt.success).toEqual(true)
})

test('unequipping an unequipped item', async () => {
    const txUnequip = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '1'),
        param('from_token_id', 'Uint256', '2'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip.id)
    expect(txUnequip.receipt.success).toEqual(false)
    expect(txUnequip.receipt.exceptions[0].message).toEqual(generateErrorMsg(20)) // throws ItemNotOwnedError
})

test('equipping item to itself', async () => {
    const txEquip = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '1'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip.id)
    expect(txEquip.receipt.success).toEqual(false)
    expect(txEquip.receipt.exceptions[0].message).toEqual(generateErrorMsg(34)) // throws ItemSelfError
})

test('transfer and burn an equipped item', async () => {
    const txEquip = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '2'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip.id)
    expect(txEquip.receipt.success).toEqual(true)

    const txTransfer = await callContract(privateKey, itemsContract, "TransferFrom", [
        param('to', 'ByStr20', memberAddress),
        param('token_id', 'Uint256', '1'),
    ], 0, false, false)
    console.log(txTransfer.id)
    expect(txTransfer.receipt.success).toEqual(false)
    expect(txTransfer.receipt.exceptions[0].message).toEqual(generateErrorMsg(19)) // throws ItemOwnedError

    const txBurn = await callContract(privateKey, itemsContract, "Burn", [
        param('token_id', 'Uint256', '1'),
    ], 0, false, false)
    console.log(txBurn.id)
    expect(txBurn.receipt.success).toEqual(false)
    expect(txBurn.receipt.exceptions[0].message).toEqual(generateErrorMsg(19)) // throws ItemOwnedError

    const txUnequip = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '1'),
        param('from_token_id', 'Uint256', '2'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip.id)
    expect(txUnequip.receipt.success).toEqual(true)
})

test('equip item that belongs to another user', async () => {
    const txEquip = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '4'),
        param('to_token_id', 'Uint256', '2'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip.id)
    expect(txEquip.receipt.success).toEqual(false)
    expect(txEquip.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeNotTokenOwner
})

test('equip item where parent belongs to another user', async () => {
    const txEquip = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '4'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip.id)
    expect(txEquip.receipt.success).toEqual(false)
    expect(txEquip.receipt.exceptions[0].message).toEqual(generateErrorMsg(23)) // throws NotRootOwnerError
})

test('equip item where target parent is already a child of the item', async () => {
    const txEquip1 = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '2'),
        param('to_token_id', 'Uint256', '1'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip1.id)
    expect(txEquip1.receipt.success).toEqual(true)

    const txEquip2 = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '3'),
        param('to_token_id', 'Uint256', '2'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip2.id)
    expect(txEquip2.receipt.success).toEqual(true)

    const txEquip3 = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '1'),
        param('to_token_id', 'Uint256', '3'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip3.id)
    expect(txEquip3.receipt.success).toEqual(false)
    expect(txEquip3.receipt.exceptions[0].message).toEqual(generateErrorMsg(29)) // throws ItemCannotBeParentError2

    const txUnequip1 = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '2'),
        param('from_token_id', 'Uint256', '1'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip1.id)
    expect(txUnequip1.receipt.success).toEqual(true)

    const txUnequip2 = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '3'),
        param('from_token_id', 'Uint256', '2'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip2.id)
    expect(txUnequip2.receipt.success).toEqual(true)
})

test('equip items and transfer parent, to check if ownership of child items is transferred too', async () => {
    const txEquip = await callContract(privateKey, itemsContract, "TransferToParent", [
        param('item_id', 'Uint256', '2'),
        param('to_token_id', 'Uint256', '1'),
        param('to_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txEquip.id)
    expect(txEquip.receipt.success).toEqual(true)

    const txTransfer = await callContract(privateKey, itemsContract, "TransferFrom", [
        param('to', 'ByStr20', memberAddress),
        param('token_id', 'Uint256', '1'),
    ], 0, false, false)
    console.log(txTransfer.id)
    expect(txTransfer.receipt.success).toEqual(true)

    const txUnequip1 = await callContract(privateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '2'),
        param('from_token_id', 'Uint256', '1'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip1.id)
    expect(txUnequip1.receipt.success).toEqual(false)
    expect(txUnequip1.receipt.exceptions[0].message).toEqual(generateErrorMsg(23)) // throws NotRootOwnerError

    const txUnequip2 = await callContract(memberPrivateKey, itemsContract, "TransferFromParent", [
        param('item_id', 'Uint256', '2'),
        param('from_token_id', 'Uint256', '1'),
        param('from_contract', 'ByStr20', itemsAddress)
    ], 0, false, false)
    console.log(txUnequip2.id)
    expect(txUnequip2.receipt.success).toEqual(true)
})
