const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { createRandomAccount } = require("../../../scripts/account");
const { callContract, nextBlock } = require("../../../scripts/call");
const { deployMetazoa, deployHunyToken, deployResource, deployQuest, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");
const { generateErrorMsg } = require('../bank/helper')
const { BigNumber } = require('bignumber.js')
const { adt } = require("./helper")

let user1PrivateKey, user2PrivateKey, user1Address, user2Address, metazoaContract, metazoaAddress, hunyContract, hunyAddress, resourceContract, resourceAddress, questContract, questAddress

beforeAll(async () => {
  // deploy metazoa
  // deploy huny
  // deploy resource
  // deploy quest
  // mint metazoa
  // mint huny
  // mint resource
  // add quest as minter for huny
  // add quest as minter for resource
  // add as operator

  // quest checks
  // enterQuest (metazoa_commanders update, last_harvested update, emit updateQuestBonus event, oracle trigger update)
  // harvestResource (correct amt of resources, xp, huny minted/burnt based on blocks passed, emit updateQuestBonus, oracle trigger update)
  // returnToBase (correct amt of resources, xp, huny minted/burnt based on blocks passed, emit updateQuestBonus, oracle trigger update, metazoa_commanders update)

  user1PrivateKey = getPrivateKey();
  user1Address = getAddressFromPrivateKey(user1PrivateKey).toLowerCase();

  ; ({ key: user2PrivateKey, address: user2Address } = await createRandomAccount(user1PrivateKey, '1000'))

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
    numEpochsWaiveHarvest: '10',
    percentageBps: '5000', // percentage of init harvest fee to be waived
    returnFee: ONE_HUNY.times(200), // 200 HUNY
  });
  questAddress = questContract.address.toLowerCase();

  const txMintMetazoa1 = await callContract(user1PrivateKey, metazoaContract, "Mint", [
    param('to', 'ByStr20', user1Address),
    param('token_uri', 'String', "testing mint metazoa")
  ], 0, false, false)
  console.log(txMintMetazoa1.id)

  const txMintMetazoa2 = await callContract(user1PrivateKey, metazoaContract, "Mint", [
    param('to', 'ByStr20', user2Address),
    param('token_uri', 'String', "testing mint metazoa")
  ], 0, false, false)
  console.log(txMintMetazoa2.id)

  const txMintHuny = await callContract(user1PrivateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', user1Address),
    param('amount', 'Uint128', '1000000000000000000')
  ], 0, false, false)
  console.log(txMintHuny.id)

  const txMintResource = await callContract(user1PrivateKey, resourceContract, "Mint", [
    param('recipient', 'ByStr20', user1Address),
    param('amount', 'Uint128', '10000000')
  ], 0, false, false)
  console.log(txMintResource.id)

  const txAddMinterHuny = await callContract(user1PrivateKey, hunyContract, "AddMinter", [
    param('minter', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddMinterHuny.id)

  const txAddMinterResource = await callContract(user1PrivateKey, resourceContract, "AddMinter", [
    param('minter', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddMinterResource.id)

  const txAddOperator1 = await callContract(user1PrivateKey, metazoaContract, "AddOperator", [
    param('operator', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddOperator1.id)

  const txAddOperator2 = await callContract(user2PrivateKey, metazoaContract, "AddOperator", [
    param('operator', 'ByStr20', questAddress),
  ], 0, false, false)
  console.log(txAddOperator2.id)

  const batchMintParams = []

  for (let i = 0; i < 100; i++) {
    batchMintParams.push(adt('Pair', ['ByStr20', 'String'], [user2Address, 'test-uri']))
  }

  const txBatchMintMetazoa = await callContract(user1PrivateKey, metazoaContract, "BatchMint", [
    param('to_token_uri_pair_list', 'List (Pair ByStr20 String)', batchMintParams)
  ], 0, false, false)
  console.log(txBatchMintMetazoa)
})

test('enter quest with owned metazoas', async () => {
  const txEnterQuest = await callContract(user1PrivateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(true)
})

test('enter quest with other users metazoas', async () => {
  const txEnterQuest = await callContract(user1PrivateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(false)
  expect(txEnterQuest.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeNotTokenOwner
})

test('harvest with owned metazoas', async () => {
  const txHarvest = await callContract(user1PrivateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  console.log(txHarvest.id)
  expect(txHarvest.receipt.success).toEqual(true)
})

test('harvest with other users metazoas', async () => {
  const txEnterQuest = await callContract(user2PrivateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(true)

  const txHarvest = await callContract(user1PrivateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txHarvest.id)
  expect(txHarvest.receipt.success).toEqual(false)
  expect(txHarvest.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeNotTokenOwner
})

test('return to base with owned metazoas', async () => {
  const txReturn = await callContract(user1PrivateKey, questContract, "ReturnToBase", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  console.log(txReturn.id)
  expect(txReturn.receipt.success).toEqual(true)
})

test('return to base with other users metazoas', async () => {
  const txReturn = await callContract(user1PrivateKey, questContract, "ReturnToBase", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txReturn.id)
  expect(txReturn.receipt.success).toEqual(false)
  expect(txReturn.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeNotTokenOwner
})

test('return to base without enough huny for fees', async () => {
  const txReturn = await callContract(user2PrivateKey, questContract, "ReturnToBase", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txReturn.id)
  expect(txReturn.receipt.success).toEqual(false)
  expect(txReturn.receipt.exceptions[0].message).toEqual(generateErrorMsg(2)) // throws CodeInsufficientFunds
})

test('harvest without enough huny for fees', async () => {
  const txHarvest = await callContract(user2PrivateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["2"]),
  ], 0, false, false)
  console.log(txHarvest.receipt.event_logs)
  expect(txHarvest.receipt.success).toEqual(false)
  expect(txHarvest.receipt.exceptions[0].message).toEqual(generateErrorMsg(2)) // throws CodeInsufficientFunds
})

test('harvest half-way from waive harvest fee', async () => {
  const txEnterQuest = await callContract(user1PrivateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(true)
  
  await nextBlock() // total of 2 epochs past, 2^2/10^2 = 4%, 96% of fee should be charged

  const txHarvest = await callContract(user1PrivateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  expect(txHarvest.receipt.success).toEqual(true)
  const fee = new BigNumber(txHarvest.receipt.event_logs[4].params[2].value)
  expect(fee).toEqual(ONE_HUNY.times(196))
})

test('harvest after percentage of harvest fee waived', async () => {
  const txSetNumEpochsWaiveHarvest = await callContract(user1PrivateKey, questContract, "SetNumberOfEpochsWaiveHarvest", [
    param('num_epochs', 'Uint32', '3'),
  ], 0, false, false)
  console.log(txSetNumEpochsWaiveHarvest.id)
  expect(txSetNumEpochsWaiveHarvest.receipt.success).toEqual(true)

  await nextBlock()

  const txHarvest = await callContract(user1PrivateKey, questContract, "HarvestResource", [
    param('token_ids', 'List Uint256', ["1"]),
  ], 0, false, false)
  expect(txHarvest.receipt.success).toEqual(true)
  const fee = new BigNumber(txHarvest.receipt.event_logs[4].params[2].value)
  expect(fee).toEqual(ONE_HUNY.times(150))
})

test('batch enter quest', async () => {
  tokenIds = []
  for (let i = 3; i < 103; i++) {
    tokenIds.push(i.toString())
  }
  const txEnterQuest = await callContract(user2PrivateKey, questContract, "EnterQuest", [
    param('token_ids', 'List Uint256', tokenIds),
  ], 0, false, false)
  console.log(txEnterQuest.id)
  expect(txEnterQuest.receipt.success).toEqual(true)
})

test('batch return to base without harvest', async () => {
  const txMintHuny = await callContract(user1PrivateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', user2Address),
    param('amount', 'Uint128', '1000000000000000000')
  ], 0, false, false)
  console.log(txMintHuny.id)

  tokenIds = []
  for (let i = 3; i < 53; i++) {
    tokenIds.push(i.toString())
  }

  // 10 more epochs passed
  for (let i = 0; i < 10; i++) {
    await nextBlock()
  }

  // check if only return fee is charged and no resources are harvested
  const txReturnToBase = await callContract(user2PrivateKey, questContract, "ReturnToBaseWithoutHarvest", [
    param('token_ids', 'List Uint256', tokenIds),
  ], 0, false, false)
  console.log(txReturnToBase.id)
  let didHarvestOccur = false
  const events = txReturnToBase.receipt.event_logs
  for (const event of events) {
    const eventName = event._eventname
    if (eventName === 'HarvestQuest' || eventName === 'HarvestMetazoa') didHarvestOccur = true
  }
  expect(txReturnToBase.receipt.success).toEqual(true)
  expect(didHarvestOccur).toEqual(false)
})

test('test eject quest', async () => {
  const txAbandonQuest = await callContract(user1PrivateKey, questContract, "SetQuestAbandoned",[
    param('a', 'Bool', adt('True', [], []))
  ], 0, false, false)
  console.log(txAbandonQuest.id)

  tokenIds = []
  for (let i = 53; i < 103; i++) {
    tokenIds.push(i.toString())
  }
  const txEjectQuest = await callContract(user1PrivateKey, questContract, "EjectQuest", [], 0, false, false)
  console.log(txEjectQuest.id)
  expect(txEjectQuest.receipt.success).toEqual(true)
})
