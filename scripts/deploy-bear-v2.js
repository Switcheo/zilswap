const { getDefaultAccount } = require('./account')
const fs = require("fs");
const { callContract } = require('./call.js')
const { deployNonFungibleToken, deployContract, deployBearV2 } = require('./deploy');

const ZIL_ZEROS = "000000000000"

const deploy = async () => {
  // const v2Code = (await fs.readFileSync('./src/tbm-v2/BearV2.scilla')).toString("utf8")
  // const gmCode = (await fs.readFileSync('./src/tbm/GiveawayMinter.scilla')).toString("utf8")
  // const cmCode = (await fs.readFileSync('./src/tbm/CommunityMinter.scilla')).toString("utf8")

  const owner = getDefaultAccount()

  console.log("mock bear v2")
  const [mockNFT, mockState] = await deployBearV2(owner.key, {
      name: "Mock OG",
      symbol: "MockBurn",
    })

//   console.log("deploying bear v2")
//   const [nftContract, state] = await deployBearV2(owner.key, {
//       name: "Bear V2",
//       symbol: "TBMV2",
//     })
    
//   console.log("deploying giveaway")
//   const gmCode = await fs.readFileSync('./src/tbm-v2/GiveawayMinterV2.scilla')
//   const [gmContract, gmState] = await deployContract(owner.key, gmCode.toString("utf8"), [
//       {
//         vname: '_scilla_version',
//         type: 'Uint32',
//         value: '0',
//       },
//       {
//         vname: 'contract_owner',
//         type: 'ByStr20',
//         value: owner.address,
//       },
//       {
//         vname: 'nft_address',
//         type: 'ByStr20',
//         value: nftContract.address,
//       },
//       {
//         vname: 'max_supply',
//         type: 'Uint128',
//         value: "200",
//       },
//     ])

 

  console.log(mockNFT.address, "mockNFT");
//   console.log(gmContract.address, "Giveaway");

  const txn1 = await callContract(owner.key, mockNFT, 'AddMinter', [{
        vname: 'minter',
        type: 'ByStr20',
        value: owner.address.toLowerCase(),
    }], 0, false, false)
}

deploy().then(() => console.log('Done.'))
