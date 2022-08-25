const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");
const { callContract } = require("../../call");
const { getPrivateKey, param, noneParam, ZERO_ADDRESS } = require("../../zilliqa");
const { deployHunyToken, deployMetazoa, deployProfessions, deployEmporium, deployResourceStore, deployResource, deployItems, deployGemRefinery, ONE_HUNY, deployZOMGStore } = require("./helper");

;
(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();

  const hunyContract = await deployHunyToken({ name: "Huny Token", symbol: "HUNY", decimals: "12" });
  const hunyAddress = hunyContract.address.toLowerCase();

  const metazoaContract = await deployMetazoa();
  const metazoaAddress = metazoaContract.address.toLowerCase();

  const professionsContract = await deployProfessions({ metazoaAddress });
  const professionsAddress = professionsContract.address.toLowerCase();

  const emporiumContract = await deployEmporium();
  const emporiumAddress = emporiumContract.address.toLowerCase();

  const resourceStallContract = await deployResourceStore({ emporium: emporiumAddress, huny_token: hunyAddress });
  const resourceStallAddress = resourceStallContract.address.toLowerCase();

  const geodeContract = await deployResource("ZolarGeode", { name: "Geode - Zolar Resource", symbol: "zlrGEODE", decimals: "2" });
  const geodeAddress = geodeContract.address.toLowerCase();

  const berryContract = await deployResource("ZolarElderberry", { name: "Elderberry - Zolar Resource", symbol: "zlrBERRY", decimals: "2" });
  const berryAddress = berryContract.address.toLowerCase();

  const scrapContract = await deployResource("ZolarZolraniumScrap", { name: "Scraps - Zolar Resource", symbol: "zlrSCRAP", decimals: "2" });
  const scrapAddress = scrapContract.address.toLowerCase();

  const itemsContract = await deployItems({ baseUri: "https://test-api.zolar.io/items/metadata/" });
  const itemsAddress = itemsContract.address.toLowerCase();

  const zomgStoreContract = await deployZOMGStore();
  const zomgStoreAddress = zomgStoreContract.address.toLowerCase();

  const gemRefineryContract = await deployGemRefinery({ geodeAddress, itemsAddress });
  const gemRefineryAddress = gemRefineryContract.address.toLowerCase();

  const txAddWeapon = await callContract(privateKey, zomgStoreContract, "AddItem", [
    param('item_name', 'String', 'HA13-Hand of Death'),
    param('token_address', 'ByStr20', itemsAddress),
    param('traits', 'List (Pair String String)', [{
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['Type', 'Equipment'],
    }, {
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['STR', '7'],
    }, {
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['INT', '7'],
    }, {
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['DEX', '7'],
    }]),
    param('cost', `List ${zomgStoreAddress}.CraftingCost`, [{
      constructor: `${zomgStoreAddress}.CraftingCost`,
      argtypes: [],
      arguments: [
        hunyAddress,
        ONE_HUNY.times(27000), // 27K huny
        [],
      ],
    }, {
      constructor: `${zomgStoreAddress}.CraftingCost`,
      argtypes: [],
      arguments: [
        itemsAddress,
        "0", // ignored for zrc6
        [{
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Type', 'Gem'],
        }, {
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Affinity', 'Int'],
        }, {
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Tier', 'C'],
        }],
      ],
    }, {
      constructor: `${zomgStoreAddress}.CraftingCost`,
      argtypes: [],
      arguments: [
        itemsAddress,
        "0", // ignored for zrc6
        [{
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Type', 'Gem'],
        }, {
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Affinity', 'Int'],
        }, {
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Tier', 'C'],
        }],
      ],
    }, {
      constructor: `${zomgStoreAddress}.CraftingCost`,
      argtypes: [],
      arguments: [
        itemsAddress,
        "0", // ignored for zrc6
        [{
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Type', 'Gem'],
        }, {
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Affinity', 'Int'],
        }, {
          constructor: `Pair`,
          argtypes: ['String', 'String'],
          arguments: ['Tier', 'C'],
        }],
      ],
    }]),
  ], 0, false, false);
  console.log("add weapon", txAddWeapon.id);

  const txMintMetazoa = await callContract(privateKey, metazoaContract, "Mint", [
    param('to', 'ByStr20', address),
    param('token_uri', 'String', ''),
  ], 0, false, false);
  console.log("mint metazoa metazoa", txMintMetazoa.id);

  // transfer metazoa ownership to professions proxy contract
  const txTransferOwnership = await callContract(privateKey, metazoaContract, "SetContractOwnershipRecipient", [
    param('to', 'ByStr20', professionsAddress),
  ], 0, false, false);
  console.log("transfer metazoa ownership to proxy", txTransferOwnership.id);

  const txAcceptOwnershipt = await callContract(privateKey, professionsContract, "AcceptContractOwnership", [
    param('new_metazoa_address', 'ByStr20', metazoaAddress),
  ], 0, false, false);
  console.log("accept metazoa ownership for proxy", txAcceptOwnershipt.id);

  const txSetTokenTraits = await callContract(privateKey, professionsContract, "SetTokenTraits", [
    param('token_id', 'Uint256', '1'),
    param('proposed_traits', 'List (Pair String String)', [{
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['Trait1', 'Value1'],
    }, {
      constructor: 'Pair',
      argtypes: ['String', 'String'],
      arguments: ['Profession', 'WrongValue'],
    }]),
  ], 0, false, false);
  console.log("set token trait for 1", txSetTokenTraits.id);

  const { traits } = await metazoaContract.getSubState("traits", ["1"]);
  console.log("verify trait set", traits["1"][0].arguments.join(": "), traits["1"][1].arguments.join(": "));

  const txUpdateProfession = await callContract(privateKey, professionsContract, "BulkUpdateProfession", [
    param('params', 'List (Pair Uint256 String)', [{
      constructor: 'Pair',
      argtypes: ['Uint256', 'String'],
      arguments: ['1', 'STR'],
    }]),
  ], 0, false, false);
  console.log("Update Profession", txUpdateProfession.id);

  const { traits: newTraits } = await metazoaContract.getSubState("traits", ["1"]);
  console.log("verify trait set", newTraits["1"][0].arguments.join(": "), newTraits["1"][1].arguments.join(": "));

  const txAddMinterItemsRefinery = await callContract(privateKey, itemsContract, "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false);
  console.log("add refinery as items minter", txAddMinterItemsRefinery.id);

  const txAddMinterGeodeRefinery = await callContract(privateKey, geodeContract, "AddMinter", [
    param('minter', 'ByStr20', gemRefineryAddress),
  ], 0, false, false);
  console.log("add refinery as geode minter", txAddMinterGeodeRefinery.id);

  const txAddMinterStall1 = await callContract(privateKey, geodeContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter", txAddMinterStall1.id);

  const txAddMinterStall2 = await callContract(privateKey, berryContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter", txAddMinterStall2.id);

  const txAddMinterStall3 = await callContract(privateKey, scrapContract, "AddMinter", [
    param('minter', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall minter", txAddMinterStall3.id);

  const txAddStall = await callContract(privateKey, emporiumContract, "AddStall", [
    param('address', 'ByStr20', resourceStallAddress),
  ], 0, false, false);
  console.log("add stall", txAddStall.id);

  const txAddItem = await callContract(privateKey, resourceStallContract, "AddItem", [
    param('item_name', 'String', "Zolar Geode"),
    param('resource', 'ByStr20', geodeAddress),
    param('buy_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "2", "1"]
    }),
    param('sell_price', `${resourceStallAddress}.Price`, {
      constructor: `${resourceStallAddress}.Price`,
      argtypes: [],
      arguments: [ONE_HUNY.times(5).toString(10), ONE_HUNY.times(5_000).toString(10), "2", "1"]
    })], 0, false, false)
  console.log("add item", txAddItem.id);

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

  const txPurchaseGeode = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 7).toString(10)),
    param('purchase_data', 'String', "100000"),
  ], 0, false, false)
  console.log("purchase geode", txPurchaseGeode.id);

  const txPurchaseGeodeAgain = await callContract(privateKey, emporiumContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('max_price', 'Uint128', new BigNumber(1).shiftedBy(12 + 5).toString(10)),
    param('purchase_data', 'String', "100"),
  ], 0, false, false)
  console.log("purchase geode", txPurchaseGeodeAgain.id);

  const txResourceAllowance = await callContract(privateKey, geodeContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', resourceStallAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 5)),
  ], 0, false, false)
  console.log("increase allowance geode", txResourceAllowance.id);

  const txSellGeode = await callContract(privateKey, resourceStallContract, "SellItem", [
    param('item_id', 'Uint128', "0"),
    param('min_price', 'Uint128', "0"),
    param('quantity', 'Uint128', "100"),
  ], 0, false, false)
  console.log("sell geode", txSellGeode.id);

  const txRefineryAllowance = await callContract(privateKey, geodeContract, "IncreaseAllowance", [
    param('spender', 'ByStr20', gemRefineryAddress),
    param('amount', 'Uint128', new BigNumber(1).shiftedBy(12 + 9).toString(10)),
  ], 0, false, false)
  console.log("increase allowance geode", txRefineryAllowance.id);

  const txRefineGeode = await callContract(privateKey, gemRefineryContract, "BeginGeodeRefinement", [
    param('quantity', 'Uint128', "500"),
  ], 0, false, false)
  console.log("refine geode", txRefineGeode.id);

  const txConcludeRefine = await callContract(privateKey, gemRefineryContract, "ConcludeRefinement", [
    param('refinement_id', 'Uint256', "0"),
    param('gems', `List (Pair String ${gemRefineryAddress}.GemTier)`, [{
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierC`,
        argtypes: [],
        arguments: [],
      }]
    }, {
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierC`,
        argtypes: [],
        arguments: [],
      }]
    }, {
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierC`,
        argtypes: [],
        arguments: [],
      }]
    }, {
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierC`,
        argtypes: [],
        arguments: [],
      }]
    }, {
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierC`,
        argtypes: [],
        arguments: [],
      }]
    }, {
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierC`,
        argtypes: [],
        arguments: [],
      }]
    }, {
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierC`,
        argtypes: [],
        arguments: [],
      }]
    }]),
  ], 0, false, false)
  console.log("conclude refinement", txConcludeRefine.id);

  const txAddOperator = await callContract(privateKey, itemsContract, "AddOperator", [
    param('operator', 'ByStr20', gemRefineryAddress),
  ], 0, false, false)
  console.log("item add refinery as operator", txAddOperator.id);

  const txEnhanceGem = await callContract(privateKey, gemRefineryContract, "BeginGemEnhancement", [
    param('output_tier', `${gemRefineryAddress}.GemTier`, {
      constructor: `${gemRefineryAddress}.TierB`,
      argtypes: [],
      arguments: []
    }),
    param('base_gem_token_id', 'Uint256', "1"),
    param('material_gem_token_ids', 'List Uint256', ["2", "3", "4"]),
  ], 0, false, false)
  console.log("enhance gem", txEnhanceGem.id);

  const txConcludeEnhance = await callContract(privateKey, gemRefineryContract, "ConcludeRefinement", [
    param('refinement_id', 'Uint256', "1"),
    param('gems', `List (Pair String ${gemRefineryAddress}.GemTier)`, [{
      constructor: `Pair`,
      argtypes: ['String', `${gemRefineryAddress}.GemTier`],
      arguments: ['INT', {
        constructor: `${gemRefineryAddress}.TierB`,
        argtypes: [],
        arguments: [],
      }]
    }]),
  ], 0, false, false)
  console.log("conclude enhancement", txConcludeEnhance.id);

  console.log("items traits", "\n" + Object.entries((await itemsContract.getSubState("traits")).traits).map(([token_id, traits]) => `${token_id}: ${traits.map(t => t.arguments.join("=")).join(",")}`).join("\n"))
  console.log("items owners", "\n" + Object.entries((await itemsContract.getSubState("token_owners")).token_owners).map(([token_id, owner]) => `${token_id}: ${owner}`).join("\n"))

  const txCraftWeapon = await callContract(privateKey, zomgStoreContract, "PurchaseItem", [
    param('item_id', 'Uint128', "0"),
    param('payment_items', `List ${zomgStoreAddress}.PaymentItem`, [{
      constructor: `${zomgStoreAddress}.PaymentItem`,
      argtypes: [],
      arguments: [hunyAddress, "0"], // pay huny
    }, {
      constructor: `${zomgStoreAddress}.PaymentItem`,
      argtypes: [],
      arguments: [itemsAddress, "5"], // pay gem
    }, {
      constructor: `${zomgStoreAddress}.PaymentItem`,
      argtypes: [],
      arguments: [itemsAddress, "6"], // pay gem
    }, {
      constructor: `${zomgStoreAddress}.PaymentItem`,
      argtypes: [],
      arguments: [itemsAddress, "7"], // pay gem
    }]),
  ], 0, false, false)
  console.log("craft weapon", txCraftWeapon.id);
})();
