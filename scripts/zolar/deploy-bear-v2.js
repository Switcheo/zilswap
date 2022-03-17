const { getDefaultAccount } = require('../account')
const { deployNonFungibleToken, deployBearV2, deployTranscendenceMinter } = require('../deploy');

const deploy = async () => {
  const owner = getDefaultAccount()

  console.log("deploying mock nft")
  const [tbmv1, ] = await deployNonFungibleToken(owner.key, {
    })
  console.log(tbmv1.address, "mockNFT");

  console.log("deploying bear v2")
  const [tbmv2, ] = await deployBearV2(owner.key, {
      name: "Bear V2",
      symbol: "TBMV2",
    })
  console.log(tbmv2.address, "nftContract");

  console.log("deploying TranscendenceMinter")
  const [burnContract, ] = await deployTranscendenceMinter(owner.key, { tbmv1, tbmv2 })
  console.log(burnContract.address, "burnContract");
}

deploy().then(() => console.log('Done.'))
