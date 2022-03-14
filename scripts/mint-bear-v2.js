const { getDefaultAccount } = require('./account')
const fs = require("fs");
const { callContract } = require('./call.js')
const { zilliqa } = require('./zilliqa')
const { fromBech32Address } = require("@zilliqa-js/crypto")

// const CONTRACT_HASH = '0x535416E04080219018717DF62bBE7f6a25e4080E' // giveaway
const MOCK_CONTRACT_HASH = '0xf9a19437C00de73d9C6b46A2f8d4f0D676a9d8E2' // nft
const V2_CONTRACT_HASH = '0xcd9bA0249F2a819Ad032423C9e4CF19ef69aC65a' // nft
const BURN_CONTRACT_HASH = '0x90CAeF92C07CBe2E80ec4c136884c16beca0aa5c' // nft

// const userAddress = fromBech32Address("zil1r7szwmta4dlkka7qt2ledcmep56474gej3psj6") // steven
// const userAddress = fromBech32Address("zil1nq8c5zp78lgtf6axvun6pd36ggjx48vzprpy4r") // andrew
const userAddress = fromBech32Address("zil1gtk045960q0p5akectarewvt4eec3ws73mkn26") // jereld
// const userAddress = fromBech32Address("zil1r7szwmta4dlkka7qt2ledcmep56474gej3psj6")

const mintMock = async () => {
    const contract = zilliqa.contracts.at(MOCK_CONTRACT_HASH)
    zilliqa.toBech32Address
    const owner = getDefaultAccount()
    console.log(owner)

    // configure minter
    await callContract(
        owner.key, contract,
        'ConfigureMinter',
        [
            {
                vname: 'proposed_traits',
                type: 'List (Pair String String)',
                value: traits.map((pair) => ({
                  constructor: 'Pair',
                  argtypes: ['String', 'String'],
                  arguments: [pair[0], pair[1]],
                })),
            }
        ],
        0, false, false
      )

    // add mint
    // await callContract(
    //     owner.key, contract,
    //     'Mint',
    //     [
    //         {
    //             vname: 'to',
    //             type: 'ByStr20',
    //             value: owner.address,
    //         },
    //         {
    //             vname: 'token_uri',
    //             type: 'String',
    //             value: '',
    //         },
    //     ],
    //     0, false, false
    //   )
    // for (let i = 0; i < 3; i++) {
    //     await callContract(
    //         owner.key, contract,
    //         'Mint',
    //         [
    //             {
    //                 vname: 'to',
    //                 type: 'ByStr20',
    //                 value: fromBech32Address("zil1r7szwmta4dlkka7qt2ledcmep56474gej3psj6"),
    //             },
    //             {
    //                 vname: 'token_uri',
    //                 type: 'String',
    //                 value: '',
    //             },
    //         ],
    //         0, false, false
    //       )
    //     await callContract(
    //         owner.key, contract,
    //         'Mint',
    //         [
    //             {
    //                 vname: 'to',
    //                 type: 'ByStr20',
    //                 value: fromBech32Address("zil1nq8c5zp78lgtf6axvun6pd36ggjx48vzprpy4r"),
    //             },
    //             {
    //                 vname: 'token_uri',
    //                 type: 'String',
    //                 value: '',
    //             },
    //         ],
    //         0, false, false
    //       )
    //     await callContract(
    //         owner.key, contract,
    //         'Mint',
    //         [
    //             {
    //                 vname: 'to',
    //                 type: 'ByStr20',
    //                 value: fromBech32Address("zil1gtk045960q0p5akectarewvt4eec3ws73mkn26"),
    //             },
    //             {
    //                 vname: 'token_uri',
    //                 type: 'String',
    //                 value: '',
    //             },
    //         ],
    //         0, false, false
    //       )
    // }

}

const burnAndMint = async () => {
    const mockContract = zilliqa.contracts.at(MOCK_CONTRACT_HASH)
    const v2Contract = zilliqa.contracts.at(V2_CONTRACT_HASH)
    const burnContract = zilliqa.contracts.at(BURN_CONTRACT_HASH)
    zilliqa.toBech32Address
    const owner = getDefaultAccount()
    console.log(owner)

    // // add minter
    // await callContract(
    //     owner.key, v2Contract,
    //     'AddMinter',
    //     [
    //         {
    //             vname: 'minter',
    //             type: 'ByStr20',
    //             value: BURN_CONTRACT_HASH,
    //         },
    //     ],
    //     0, false, false
    //   )
    // wl
    await callContract(
        owner.key, v2Contract,
        'SetWhitelist',
        [
            {
                vname: 'minter',
                type: 'ByStr20',
                value: BURN_CONTRACT_HASH,
            },
        ],
        0, false, false
      )

    // // allow BurnTBM contract to your burn mock nft
    // await callContract(
    //     owner.key, mockContract,
    //     'SetApprovalForAll',
    //     [
    //         {
    //             vname: 'to',
    //             type: 'ByStr20',
    //             value: BURN_CONTRACT_HASH.toLowerCase(),
    //         },
    //     ],
    //     0, false, false
    //   )

    
    // await callContract(
    //     owner.key, burnContract,
    //     'BurnAndMint',
    //     [
    //         {
    //             vname: 'to',
    //             type: 'ByStr20',
    //             value: owner.address,
    //         },
    //         {
    //             vname: 'token_ids',
    //             type: 'List Uint256',
    //             value: ["1"],
    //         },
    //     ],
    //     0, false, false
    //   )
}

mintMock().then(() => console.log('Done.'))
// burnAndMint().then(() => console.log('Done.'))
