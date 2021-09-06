const { getDefaultAccount } = require('./account')
const { getBlockNum } = require('./call.js')
const { deployZILO, deploySeedLP } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const tokenAddress = '0x2fc7167c3baff89e2805aef72636ccd98ee6bbb2' // https://devex.zilliqa.com/address/zil19lr3vlpm4lufu2q94mmjvdkvmx8wdwajuntzx2?network=https%3A%2F%2Fapi.zilliqa.com
  const zwapAddress = '0x0d21c1901a06abee40d8177f95171c8c63abdc31' // https://devex.zilliqa.com/address/zil1p5suryq6q647usxczale29cu3336hhp376c627?network=https%3A%2F%2Fapi.zilliqa.com

  // deploy seed lp
  const [lp, stateLP] = await deploySeedLP(owner.key, {
    tokenAddress,
    zilswapAddress: '0xba11eb7bcc0a02e947acf03cc651bfaf19c9ec00', // https://devex.zilliqa.com/address/zil1hgg7k77vpgpwj3av7q7vv5dl4uvunmqqjzpv2w?network=https%3A%2F%2Fapi.zilliqa.com
  })

  console.log('Deployed seed lp contract:')
  console.log(JSON.stringify(lp, null, 2))
  console.log('State:')
  console.log(JSON.stringify(stateLP, null, 2))

  // deploy zilo
  const zilDecimals = '000000000000'
  const tknDecimals = '000000000000000000'
  const receiverAddress = '0x2170482b10663df895e9aa7d64260dbe1bf35c95' // https://devex.zilliqa.com/address/zil1y9cys2csvc7l390f4f7kgfsdhcdlxhy42e2g08?network=https%3A%2F%2Fapi.zilliqa.com
  const [zilo, state] = await deployZILO(owner.key, {
    zwapAddress,
    tokenAddress,
    tokenAmount:               '1666666' + tknDecimals, // DMZ  1,666,666
    targetZilAmount:           '6384919' + zilDecimals, // ZIL  6.38m  (~$840k  @ $0.13156)
    targetZwapAmount:             '3168' + zilDecimals, // ZWAP 3.168k (~$360k @ $113.62)
    minimumZilAmount:          '1596229' + zilDecimals, // ZIL  1.59m  (25% of target)
    liquidityZilAmount:        '4560656' + zilDecimals, // ZIL  4.56m  ((targetZilAmount / 7 * 10) / tokenAmount * liquidityTokenAmount)
    liquidityTokenAmount:       '833333' + tknDecimals, // DMZ  833,333
    receiverAddress:                   receiverAddress,
    liquidityAddress:         lp.address.toLowerCase(),
    startBlock:                 (bNum + 83).toString(), // 1 hrs, 100 blocks an hr
    endBlock:                 (bNum + 2483).toString(), // 24 hrs, hopefully
  })

  console.log('Deployed zilo contract:')
  console.log(JSON.stringify(zilo, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))

  // zwap TODO: approve burn of zwap on zilo

  // project TODO: send tkns to zilo
}

deploy().then(() => console.log('Done.'))
