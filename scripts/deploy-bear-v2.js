const { getDefaultAccount } = require('./account')
const fs = require("fs");
const { deployNonFungibleToken, deployContract, deployBearV2 } = require('./deploy');


const deploy = async () => {
  const owner = getDefaultAccount()

  console.log("deploying mock nft")
  const [mockNFT, mockState] = await deployNonFungibleToken(owner.key, {
    })
  console.log(mockNFT.address, "mockNFT");

  console.log("deploying bear v2")
  const [nftContract, state] = await deployBearV2(owner.key, {
      name: "Bear V2",
      symbol: "TBMV2",
    })
  console.log(nftContract.address, "nftContract");

  console.log("deploying TranscendenceMinter")
  const burnCode = await fs.readFileSync('./src/tbm-v2/TranscendenceMinter.scilla')
  const [burnContract, burnState] = await deployContract(owner.key, burnCode.toString("utf8"), [
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: owner.address,
    },
    {
      vname: 'nft_address',
      type: 'ByStr20',
      // value: "0xBA9d440229eE4779DeF4EC09AecceE0626754805",
      value: nftContract.address,
    },
    {
        vname: 'max_supply',
        type: 'Uint128',
        value: "100",
    },
    {
      vname: 'tbm_address',
      type: 'ByStr20',
      // value: "0x79D05Fcc4f97EEdd905AFE6C59f0bCd0D4C4BA09",
      value: mockNFT.address,
    },
  ])
  console.log(burnContract.address, "burnContract");




//   console.log(gmContract.address, "Giveaway");

//   const txn1 = await callContract(owner.key, mockNFT, 'AddMinter', [{
//         vname: 'minter',
//         type: 'ByStr20',
//         value: owner.address.toLowerCase(),
//     }], 0, false, false)
}

deploy().then(() => console.log('Done.'))
