const { getDefaultAccount } = require('./account')
const { getBlockNum } = require('./call.js')
const { deployZILO, deploySeedLP } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const receiverAddress = '0x410ac524959c3b49d366f206b5d21353e8dd01bc' // https://devex.zilliqa.com/address/zil1gy9v2fy4nsa5n5mx7grtt5sn205d6qduxkl84t?network=https%3A%2F%2Fapi.zilliqa.com
  const tokenAddress = '0x4268c34da6ad41a4cdeaa25cdef6531ed0c9a1a2' // https://devex.zilliqa.com/address/zil1gf5vxndx44q6fn025fwdaajnrmgvngdzel0jzp?network=https%3A%2F%2Fapi.zilliqa.com
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
  const tknDecimals = '00'
  const [zilo, state] = await deployZILO(owner.key, {
    zwapAddress,
    tokenAddress,
    tokenAmount:               '2250000' + tknDecimals, // BLOX 2.25m
    targetZilAmount:           '3891000' + zilDecimals, // ZIL 3.891m (~$385k @ $0.09893)
    targetZwapAmount:             '1250' + zilDecimals, // ZWAP 1.25k (~$165k @ $132.01)
    minimumZilAmount:           '972750' + zilDecimals, // ZIL 972.8k (25% of target)
    liquidityZilAmount:        '1297000' + zilDecimals, // ZIL 1.297m (1/3 of target)
    liquidityTokenAmount:       '750000' + tknDecimals, // BLOX 750k
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
