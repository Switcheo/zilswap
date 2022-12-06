const { toBech32Address } = require("@zilliqa-js/zilliqa");
const { getZilliqaInstance, getPrivateKey, callContract, param } = require("../../utils");


;
(async () => {

  const privateKey = getPrivateKey();
  // const srcItemContractAddress = "0x0e978eefcaaa0be4e162676657fe71d2a1e6453e";
  // const dstItemContractAddress = "0xbd801eddb155da249758d0805856bd7ec2b70098";

  const srcItemContractAddress = "0xf628d335bed123b2b2356c5929dc84f2580802bf";
  const dstItemContractAddress = "0xec5091c4cb0690a941454b9c2cf176770a773a1f";

  const zilliqa = getZilliqaInstance();
  const { result: { token_owners: tokenOwners } } = await zilliqa.blockchain.getSmartContractSubState(srcItemContractAddress, "token_owners");
  const { result: { traits: tokenTraits } } = await zilliqa.blockchain.getSmartContractSubState(srcItemContractAddress, "traits");

  console.log(tokenOwners, tokenTraits);

  const items = [];
  for (const itemId in tokenOwners) {
    const tokenOwner = tokenOwners[itemId];
    const tokenTrait = tokenTraits[itemId];

    items.push({
      constructor: 'Pair',
      argtypes: ['Pair ByStr20 String', 'List (Pair String String)'],
      arguments: [{
        constructor: 'Pair',
        argtypes: ['ByStr20', 'String'],
        arguments: [tokenOwner, ""],
      }, tokenTrait.map(({ arguments }) => ({
        constructor: 'Pair',
        argtypes: ['String', 'String'],
        arguments,
      }))],
    })
  }

  const dstItemContract = zilliqa.contracts.atBech32(toBech32Address(dstItemContractAddress));
  const txBatchMintSetTraits = await callContract(privateKey, dstItemContract, "BatchMintAndSetTraits", [
    param('to_token_uri_proposed_traits_list', 'List (Pair (Pair ByStr20 String) (List (Pair String String)))', items),
  ]);
  console.log("Transfer Items Tx", txBatchMintSetTraits.id);
})().catch(console.error).finally(() => process.exit(0))
