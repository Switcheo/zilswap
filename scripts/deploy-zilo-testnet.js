const { getDefaultAccount } = require('./account')
const { getContract, callContract, getBlockNum } = require('./call.js')
const { deployZILO, deploySeedLP } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const tokenAddress = '0x34f6e882a08a152dc36a380ac71fb1fa895b884e'
  const zwapAddress = '0xb2b119e2496f24590eff419f15aa1b6e82aa7074'

  // deploy seed lp
  const [lp, stateLP] = await deploySeedLP(owner.key, {
    tokenAddress,
    zilswapAddress: '0x1a62dd9c84b0c8948cb51fc664ba143e7a34985c',
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
    tokenAmount:                 '22500' + tknDecimals, // BLOX 22.5k
    targetZilAmount:             '45000' + zilDecimals, // ZIL 45k (~$38.5k @ $0.08385)
    targetZwapAmount:               '16' + zilDecimals, // ZWAP 16 (~$16.5k @ $105.9)
    minimumZilAmount:            '11500' + zilDecimals, // ZIL 11.5k (~25%)
    liquidityZilAmount:          '15000' + zilDecimals, // ZIL 15k (1/3 of target)
    liquidityTokenAmount:         '7500' + tknDecimals, // BLOX 7.5k
    receiverAddress:                     owner.address,
    liquidityAddress:         lp.address.toLowerCase(),
    startBlock:                 (bNum + 15).toString(),
    endBlock:               (bNum + (4*60)).toString(), // 4 hrs, hopefully
  })

  console.log('Deployed zilo contract:')
  console.log(JSON.stringify(zilo, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))

  // approve burn of zwap on zilo
  const zwap = getContract(zwapAddress)
  const result = await callContract(
    owner.key, zwap,
    'AddMinter',
    [
      {
        vname: 'minter',
        type: 'ByStr20',
        value: zilo.address.toLowerCase(),
      },
    ],
    0, false, false
  )

  console.log('Approved burn of zwap:')
  console.log(JSON.stringify(result, null, 2))

  // send tkns to zilo
  const tkn = getContract(tokenAddress)
  const result2 = await callContract(
    owner.key, tkn,
    'Transfer',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: zilo.address.toLowerCase(),
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '30000' + tknDecimals, // 300k (225 + 75)
      },
    ],
    0, false, false
  )

  console.log('Sent tkns to zilo:')
  console.log(JSON.stringify(result2, null, 2))

}

deploy().then(() => console.log('Done.'))
