const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { createRandomAccount } = require("../../../scripts/account");
const { callContract, nextBlock } = require("../../../scripts/call");
const { deployMetazoa, deployHunyToken, deployResource, deployQuest, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");
const { generateErrorMsg } = require('../bank/helper')

let privateKey, memberPrivateKey, address, memberAddress, metazoaContract, metazoaAddress, hunyContract, hunyAddress, resourceContract, resourceAddress, questContract, questAddress

beforeAll(async () => {
  // deploy metazoa
  // deploy huny
  // deploy resource
  // deploy quest
  // mint metazoa
  // add quest as minter for huny
  // add quest as minter for resource
  // add as operator

  // quest checks
  // enterQuest (metazoa_commanders update, last_harvested update, emit updateQuestBonus event, oracle trigger update)
  // harvestResource (correct amt of resources, xp, huny minted/burnt based on blocks passed, emit updateQuestBonus, oracle trigger update)
  // returnToBase (correct amt of resources, xp, huny minted/burnt based on blocks passed, emit updateQuestBonus, oracle trigger update, metazoa_commanders update)

  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();

  ; ({ key: memberPrivateKey, address: memberAddress } = await createRandomAccount(privateKey, '1000'))

  metazoaContract = await deployMetazoa()
  metazoaAddress = metazoaContract.address.toLowerCase();

  hunyContract = await deployHunyToken({ name: "Huny Token", symbol: "HUNY", decimals: "12" });
  hunyAddress = hunyContract.address.toLowerCase();

  resourceContract = await deployResource("ZolarGeode", { name: "Geode - Zolar Resource", symbol: "zlrGEODE", decimals: "2" });
  resourceAddress = resourceContract.address.toLowerCase();

  questContract = await deployQuest({
    questName: "Zolar Quest - Asteroid Belt",
    resourceContract: resourceAddress,
    metazoaContract: metazoaAddress,
    epoch: "1",
    resourcePerEpoch: "2800",
    xpPerEpoch: "5",
    feeContract: hunyAddress,
    harvestFeePerEpoch: ONE_HUNY.times(100), // 100 HUNY
    numEpochsWaiveHarvest: '30', // 1 month to waive harvest fee
    returnFee: ONE_HUNY.times(200), // 200 HUNY
  });
  questAddress = questContract.address.toLowerCase();

  const txMintMetazoa1 = await callContract(privateKey, metazoaContract, "Mint", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', "testing mint metazoa")
  ], 0, false, false)
  console.log(txMintMetazoa1.id)

  const txMintMetazoa2 = await callContract(privateKey, metazoaContract, "Mint", [
    param('to', 'ByStr20', memberAddress),
    param('token_uri', 'String', "testing mint metazoa")
  ], 0, false, false)
  console.log(txMintMetazoa2.id)

  const txAddMinterHuny = await callContract(privateKey, hunyContract, "AddMinter", [
    param('minter', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddMinterHuny.id)

  const txAddMinterResource = await callContract(privateKey, resourceContract, "AddMinter", [
    param('minter', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddMinterResource.id)

  const txAddOperator1 = await callContract(privateKey, metazoaContract, "AddOperator", [
    param('operator', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddOperator1.id)

  const txAddOperator2 = await callContract(memberPrivateKey, metazoaContract, "AddOperator", [
    param('operator', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddOperator2.id)
})

test('enter quest with owned metazoas', async () => {
  const txEnterQuest = await callContract(privateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(true)
})

test('enter quest with other users metazoas', async () => {
  const txEnterQuest = await callContract(privateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(false)
  expect(txEnterQuest.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeNotTokenOwner
})

test('harvest with owned metazoas', async () => {
  const txHarvest = await callContract(privateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  console.log(txHarvest.id)
  expect(txHarvest.receipt.success).toEqual(true)
})

test('harvest with other users metazoas', async () => {
  const txEnterQuest = await callContract(memberPrivateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(true)

  const txHarvest = await callContract(privateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txHarvest.id)
  expect(txHarvest.receipt.success).toEqual(false)
  expect(txHarvest.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeNotTokenOwner
})

test('return to base with owned metazoas', async () => {
  const txReturn = await callContract(privateKey, questContract, "ReturnToBase", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  console.log(txReturn.id)
  expect(txReturn.receipt.success).toEqual(true)
})

test('return to base with other users metazoas', async () => {
  const txReturn = await callContract(privateKey, questContract, "ReturnToBase", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txReturn.id)
  expect(txReturn.receipt.success).toEqual(false)
  expect(txReturn.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeNotTokenOwner
})

test('return to base without enough huny for fees', async () => {
  const txReturn = await callContract(memberPrivateKey, questContract, "ReturnToBase", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txReturn.id)
  expect(txReturn.receipt.success).toEqual(false)
  expect(txReturn.receipt.exceptions[0].message).toEqual(generateErrorMsg(2)) // throws CodeInsufficientFunds
})

test('harvest without enough huny for fees', async () => {
  await nextBlock()
  await nextBlock()
  const txHarvest = await callContract(memberPrivateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txHarvest.id)
  expect(txHarvest.receipt.success).toEqual(false)
  expect(txHarvest.receipt.exceptions[0].message).toEqual(generateErrorMsg(2)) // throws CodeInsufficientFunds
})
