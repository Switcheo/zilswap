const { getDefaultAccount } = require('./account')
const { callContract } = require('./call.js')
// const { deployNonFungibleToken, deployContract } = require('./deploy');
const { zilliqa } = require('./zilliqa')

// const ZIL_ZEROS = "000000000000"

const CONTRACT_HASH = '0x3bab722a53cb11bA7A46c16D2EB6cC867c90Fd42'

const run = async () => {
    const contract = zilliqa.contracts.at(CONTRACT_HASH)
    const owner = getDefaultAccount()

    // add minter
    await callContract(
        owner.key, contract,
        'AddMinter',
        [
          {
            vname: 'minter',
            type: 'ByStr20',
            value: owner.address,
          },
        ],
        0, false, false
      )

    await callContract(
        owner.key, contract,
        'Mint',
        [
          {
            vname: 'recipient',
            type: 'ByStr20',
            value: owner.address,
          },
          {
            vname: 'amount',
            type: 'Uint128',
            value: "1000000000000",
          },
        ],
        0, false, false
      )

//   const gmFile = './src/tbm/GiveawayMinter.scilla'
//   const cmFile = './src/tbm/CommunityMinter.scilla'

//   const owner = getDefaultAccount()
//   const [nftContract, state] = await deployNonFungibleToken(owner.key, {
//     name: "The Bear Market",
//     symbol: "BEAR",
//     maxNftSupply: 10,
//     reservedNftSupply: 2,
//     provHash: "0x663a71ad604ebddb736d870b758326cfe910bc0fc989d5166ebc07d794973017",
//   })

//   console.log("deploying giveaway minter")
//   const [gmContract, gmState] = await deployContract(owner.key, gmFile, [
//     {
//       vname: '_scilla_version',
//       type: 'Uint32',
//       value: '0',
//     },
//     {
//       vname: 'contract_owner',
//       type: 'ByStr20',
//       value: owner.address,
//     },
//     {
//       vname: 'nft_address',
//       type: 'ByStr20',
//       value: nftContract.address.toLowerCase(),
//     },
//     {
//       vname: 'reserved_supply',
//       type: 'Uint256',
//       value: "2",
//     },
//   ])

//   console.log("deploying community minter")
//   const [cmContract, cmState] = await deployContract(owner.key, cmFile, [
//     {
//       vname: '_scilla_version',
//       type: 'Uint32',
//       value: '0',
//     },
//     {
//       vname: 'contract_owner',
//       type: 'ByStr20',
//       value: owner.address,
//     },
//     {
//       vname: 'nft_address',
//       type: 'ByStr20',
//       value: nftContract.address.toLowerCase(),
//     },
//     {
//       vname: 'nft_price',
//       type: 'Uint128',
//       value: ZIL_ZEROS,
//     },
//   ])

//   await callContract(
//     owner.key, nftContract,
//     'ConfigureMinter',
//     [
//       {
//         vname: 'minter',
//         type: 'ByStr20',
//         value: gmContract.address.toLowerCase(),
//       },
//     ],
//     0, false, false
//   )
//   await callContract(
//     owner.key, nftContract,
//     'SetGiveawayMinter',
//     [
//       {
//         vname: 'address',
//         type: 'ByStr20',
//         value: gmContract.address.toLowerCase(),
//       },
//     ],
//     0, false, false
//   )
//   await callContract(
//     owner.key, nftContract,
//     'ConfigureMinter',
//     [
//       {
//         vname: 'minter',
//         type: 'ByStr20',
//         value: cmContract.address.toLowerCase(),
//       },
//     ],
//     0, false, false
//   )

//   console.log(nftContract.address, "NFT");
//   console.log(gmContract.address, "Giveaway");
//   console.log(cmContract.address, "Community");
}

run().then(() => console.log('Done.'))
