const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { getPrivateKey, param } = require("../../../scripts/zilliqa");
const { createRandomAccount } = require("../../../scripts/account");
const { callContract } = require("../../../scripts/call");
const { deployItems, deployHunyToken, deployResource, deployGemRefinery, ONE_HUNY } = require("../../../scripts/zolar/mission-2/helper");
const { adt } = require("./helper")
const { generateErrorMsg } = require('../bank/helper')

let user1PrivateKey, user2PrivateKey, user1Address, user2Address, itemsAddress, itemsContract, geodeAddress, geodeContract, hunyAddress, hunyContract, gemRefineryAddress, gemRefineryContract

beforeAll(async () => {
  // deploy refinery, items, geode, huny
  // add refinery as minter for items, geode and huny
  // add refinery as consumer for items
  // increase allowance for gem-refinery for geode contract to transfer
  // mint huny, mint geode

  // gem-refinery checks
  // refine geodes
  // enhance gems
  // refine/enhance when not enough huny for fees
  // refine when not enough geodes
  // enhance when not enough gems
  // enhance when gems belong to another user

  user1PrivateKey = getPrivateKey();
  user1Address = getAddressFromPrivateKey(user1PrivateKey).toLowerCase();

  ; ({ key: user2PrivateKey, address: user2Address } = await createRandomAccount(user1PrivateKey, '1000'))

  itemsContract = await deployItems({ baseUri: "https://test-api.zolar.io/items/metadata/" });
  itemsAddress = itemsContract.address.toLowerCase();

  hunyContract = await deployHunyToken({ name: "Huny Token", symbol: "HUNY", decimals: "12" });
  hunyAddress = hunyContract.address.toLowerCase();

  geodeContract = await deployResource("ZolarGeode", { name: "Geode - Zolar Resource", symbol: "zlrGEODE", decimals: "2" });
  geodeAddress = geodeContract.address.toLowerCase();

  gemRefineryContract = await deployGemRefinery({ geodeAddress, itemsAddress, feeAddress: hunyAddress, refinementFee: ONE_HUNY.times(10), enhancementFee: ONE_HUNY.times(100)});
  gemRefineryAddress = gemRefineryContract.address.toLowerCase();

  const txAddMinterHuny = await callContract(user1PrivateKey, hunyContract, "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false)
  console.log(txAddMinterHuny.id)

  const txAddMinterResource = await callContract(user1PrivateKey, geodeContract, "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false)
  console.log(txAddMinterResource.id)

  const txAddMinterItems = await callContract(user1PrivateKey, itemsContract, "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false)
  console.log(txAddMinterItems.id)

  const txAddConsumerItems = await callContract(user1PrivateKey, itemsContract, "AddConsumer", [
    param('consumer', 'ByStr20', gemRefineryAddress),
  ], 0, false, false)
  console.log(txAddConsumerItems.id)

  const txIncreaseAllowance1 = await callContract(user1PrivateKey, geodeContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', gemRefineryAddress),
    param('amount', 'Uint128', "10000000000000")
  ], 0, false, false)
  console.log(txIncreaseAllowance1.id)

  const txIncreaseAllowance2 = await callContract(user2PrivateKey, geodeContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', gemRefineryAddress),
    param('amount', 'Uint128', "10000000000000")
  ], 0, false, false)
  console.log(txIncreaseAllowance2.id)

  const txMintHuny = await callContract(user1PrivateKey, hunyContract, "Mint", [
    param('recipient', 'ByStr20', user1Address),
    param('amount', 'Uint128', '1000000000000000000')
  ], 0, false, false)
  console.log(txMintHuny.id)

  const txMintGeode = await callContract(user1PrivateKey, geodeContract, "Mint", [
    param('recipient', 'ByStr20', user1Address),
    param('amount', 'Uint128', '1000000000000000000')
  ], 0, false, false)
  console.log(txMintGeode.id)
})

test('refine own geodes', async () => {
  const txRefine = await callContract(user1PrivateKey, gemRefineryContract, "BeginGeodeRefinement", [
    param('quantity', 'Uint128', "500")
  ], 0, false, false)
  console.log(txRefine.id)
  expect(txRefine.receipt.success).toEqual(true)

  let gems = []
  for (let i = 0; i < 10; i++) {
    gems.push(
        adt(`${gemRefineryAddress}.Gem`, [], [
          'INT',
          adt(`${gemRefineryAddress}.TierC`, [], []),
          adt('False', [], [])
        ])
    )
  }

  const txConcludeRefine = await callContract(user1PrivateKey, gemRefineryContract, "ConcludeRefinement", [
    param('refinement_id', 'Uint256', "0"),
    param('gems', `List ${gemRefineryAddress}.Gem`, gems)
  ], 0, false, false)
  console.log(txConcludeRefine.id)
  expect(txConcludeRefine.receipt.success).toEqual(true)

  const itemsState = await itemsContract.getState()
  console.log(`The state of the items contract is:\n${JSON.stringify(itemsState, null, 2)}`)
})

test('refine geodes when not enough balance', async () => {
  const txRefine = await callContract(user2PrivateKey, gemRefineryContract, "BeginGeodeRefinement", [
    param('quantity', 'Uint128', "500")
  ], 0, false, false)
  console.log(txRefine.id)
  expect(txRefine.receipt.exceptions[0].message).toEqual(generateErrorMsg(2)) // throws CodeInsufficientFunds
  expect(txRefine.receipt.success).toEqual(false)
})

test('enhance own gems', async () => {
  const outputTier = adt(`${gemRefineryAddress}.TierB`, [], [])
  const baseGemId = "1"
  const materialGemsId = ["2", "3", "4"]
  const txEnhance = await callContract(user1PrivateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, outputTier),
    param('base_gem_token_id', 'Uint256', baseGemId),
    param('material_gem_token_ids', 'List Uint256', materialGemsId)
  ], 0, false, false)
  console.log(txEnhance.id)
  expect(txEnhance.receipt.success).toEqual(true)

  let gems = []
  for (let i = 0; i < 1; i++) {
    gems.push(
        adt(`${gemRefineryAddress}.Gem`, [], [
          'INT',
          adt(`${gemRefineryAddress}.TierB`, [], []),
          adt('False', [], [])
        ])
    )
  }

  const txConcludeRefine = await callContract(user1PrivateKey, gemRefineryContract, "ConcludeRefinement", [
    param('refinement_id', 'Uint256', "1"),
    param('gems', `List ${gemRefineryAddress}.Gem`, gems)
  ], 0, false, false)
  console.log(txConcludeRefine.id)
  expect(txConcludeRefine.receipt.success).toEqual(true)

  const itemsState = await itemsContract.getState()
  console.log(`The state of the items contract is:\n${JSON.stringify(itemsState, null, 2)}`)
})

test('enhance gem with other users gems', async () => {
  const outputTier = adt(`${gemRefineryAddress}.TierB`, [], [])
  const baseGemId = "5"
  const materialGemsId = ["6", "7", "8"]
  const txEnhance = await callContract(user2PrivateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, outputTier),
    param('base_gem_token_id', 'Uint256', baseGemId),
    param('material_gem_token_ids', 'List Uint256', materialGemsId)
  ], 0, false, false)
  console.log(txEnhance.id)
  expect(txEnhance.receipt.exceptions[0].message).toEqual(generateErrorMsg(4)) // throws CodeNotOwnedGem
  expect(txEnhance.receipt.success).toEqual(false)
})

test('refine geodes with insufficient huny', async () => {
  const txMintGeode = await callContract(user1PrivateKey, geodeContract, "Mint", [
    param('recipient', 'ByStr20', user2Address),
    param('amount', 'Uint128', '1000000')
  ], 0, false, false)
  console.log(txMintGeode.id)
  expect(txMintGeode.receipt.success).toEqual(true)

  const txRefine = await callContract(user2PrivateKey, gemRefineryContract, "BeginGeodeRefinement", [
    param('quantity', 'Uint128', "500")
  ], 0, false, false)
  console.log(txRefine.id)
  expect(txRefine.receipt.success).toEqual(false)
  expect(txRefine.receipt.exceptions[0].message).toEqual(generateErrorMsg(2)) // throws CodeInsufficientFunds
})

test('enhance gems with insufficient huny', async () => {
    let gems = []
    for (let i = 0; i < 5; i++) {
      const traits = [
        adt('Pair', ['String', 'String'], ['Type', 'Gem']),
        adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
        adt('Pair', ['String', 'String'], ['Tier', 'C']),
      ]
      const recipientUriPair = adt('Pair', ['ByStr20', 'String'], [user2Address, 'test-enhance-without-huny'])
      const recipientUriTraitsPair = adt('Pair', ['(Pair ByStr20 String)', '(List (Pair String String))'], [recipientUriPair, traits])
      gems.push(recipientUriTraitsPair)
    }

    const txMintGem = await callContract(user1PrivateKey, itemsContract, "BatchMintAndSetTraits", [
      param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', gems)
    ], 0, false, false)
    console.log(txMintGem.id)
    expect(txMintGem.receipt.success).toEqual(true)

    const outputTier = adt(`${gemRefineryAddress}.TierB`, [], [])
    const baseGemId = "12"
    const materialGemsId = ["13", "14", "15"]
    const txEnhance = await callContract(user2PrivateKey, gemRefineryContract, "BeginGemEnhancement", [
      param('output_tier', `${gemRefineryAddress}.GemTier`, outputTier),
      param('base_gem_token_id', 'Uint256', baseGemId),
      param('material_gem_token_ids', 'List Uint256', materialGemsId)
    ], 0, false, false)
    console.log(txEnhance.id)
    expect(txEnhance.receipt.success).toEqual(false)
    expect(txEnhance.receipt.exceptions[0].message).toEqual(generateErrorMsg(2)) // throws CodeInsufficientFunds
})

test('enhance gem C with insufficient base gems', async () => {
  const outputTier = adt(`${gemRefineryAddress}.TierB`, [], [])
  const baseGemId = "5"
  const materialGemsId = ["6", "7"]
  const txEnhance = await callContract(user1PrivateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, outputTier),
    param('base_gem_token_id', 'Uint256', baseGemId),
    param('material_gem_token_ids', 'List Uint256', materialGemsId)
  ], 0, false, false)
  console.log(txEnhance.id)
  expect(txEnhance.receipt.success).toEqual(false)
  expect(txEnhance.receipt.exceptions[0].message).toEqual(generateErrorMsg(11)) // throws CodeInvalidMaterial
})

test('enhance gem B with insufficient base gems', async () => {
  let gems = []
  for (let i = 0; i < 2; i++) {
    const traits = [
      adt('Pair', ['String', 'String'], ['Type', 'Gem']),
      adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
      adt('Pair', ['String', 'String'], ['Tier', 'B']),
    ]
    const recipientUriPair = adt('Pair', ['ByStr20', 'String'], [user1Address, 'test-enhance-without-enough-gems'])
    const recipientUriTraitsPair = adt('Pair', ['(Pair ByStr20 String)', '(List (Pair String String))'], [recipientUriPair, traits])
    gems.push(recipientUriTraitsPair)
  }

  const txMintGem = await callContract(user1PrivateKey, itemsContract, "BatchMintAndSetTraits", [
    param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', gems)
  ], 0, false, false)
  console.log(txMintGem.id)
  expect(txMintGem.receipt.success).toEqual(true)

  const outputTier = adt(`${gemRefineryAddress}.TierA`, [], [])
  const baseGemId = "17"
  const materialGemsId = ["18"]
  const txEnhance = await callContract(user1PrivateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, outputTier),
    param('base_gem_token_id', 'Uint256', baseGemId),
    param('material_gem_token_ids', 'List Uint256', materialGemsId)
  ], 0, false, false)
  console.log(txEnhance.id)
  expect(txEnhance.receipt.success).toEqual(false)
  expect(txEnhance.receipt.exceptions[0].message).toEqual(generateErrorMsg(11)) // throws CodeInvalidMaterial
})


test('enhance gem A with insufficient base gems', async () => {
  let gems = []
  for (let i = 0; i < 1; i++) {
    const traits = [
      adt('Pair', ['String', 'String'], ['Type', 'Gem']),
      adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
      adt('Pair', ['String', 'String'], ['Tier', 'A']),
    ]
    const recipientUriPair = adt('Pair', ['ByStr20', 'String'], [user1Address, 'test-enhance-without-enough-gems'])
    const recipientUriTraitsPair = adt('Pair', ['(Pair ByStr20 String)', '(List (Pair String String))'], [recipientUriPair, traits])
    gems.push(recipientUriTraitsPair)
  }

  const txMintGem = await callContract(user1PrivateKey, itemsContract, "BatchMintAndSetTraits", [
    param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', gems)
  ], 0, false, false)
  console.log(txMintGem.id)
  expect(txMintGem.receipt.success).toEqual(true)

  const outputTier = adt(`${gemRefineryAddress}.TierS`, [], [])
  const baseGemId = "19"
  const materialGemsId = []
  const txEnhance = await callContract(user1PrivateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, outputTier),
    param('base_gem_token_id', 'Uint256', baseGemId),
    param('material_gem_token_ids', 'List Uint256', materialGemsId)
  ], 0, false, false)
  console.log(txEnhance.id)
  expect(txEnhance.receipt.success).toEqual(false)
  expect(txEnhance.receipt.exceptions[0].message).toEqual(generateErrorMsg(11)) // throws CodeInvalidMaterial
})


test('enhance gem S with insufficient base gems', async () => {
  let gems = []
  for (let i = 0; i < 1; i++) {
    const traits = [
      adt('Pair', ['String', 'String'], ['Type', 'Gem']),
      adt('Pair', ['String', 'String'], ['Affinity', 'INT']),
      adt('Pair', ['String', 'String'], ['Tier', 'S']),
    ]
    const recipientUriPair = adt('Pair', ['ByStr20', 'String'], [user1Address, 'test-enhance-without-enough-gems'])
    const recipientUriTraitsPair = adt('Pair', ['(Pair ByStr20 String)', '(List (Pair String String))'], [recipientUriPair, traits])
    gems.push(recipientUriTraitsPair)
  }

  const txMintGem = await callContract(user1PrivateKey, itemsContract, "BatchMintAndSetTraits", [
    param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', gems)
  ], 0, false, false)
  console.log(txMintGem.id)
  expect(txMintGem.receipt.success).toEqual(true)

  const outputTier = adt(`${gemRefineryAddress}.TierSS`, [], [])
  const baseGemId = "20"
  const materialGemsId = []
  const txEnhance = await callContract(user1PrivateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, outputTier),
    param('base_gem_token_id', 'Uint256', baseGemId),
    param('material_gem_token_ids', 'List Uint256', materialGemsId)
  ], 0, false, false)
  console.log(txEnhance.id)
  expect(txEnhance.receipt.success).toEqual(false)
  expect(txEnhance.receipt.exceptions[0].message).toEqual(generateErrorMsg(11)) // throws CodeInvalidMaterial
})
