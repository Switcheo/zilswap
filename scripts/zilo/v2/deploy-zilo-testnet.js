const { getDefaultAccount } = require('../../account')
const { getBlockNum } = require('../../call.js')
const { deploySeedLP, deployZILOv2 } = require('../../deploy')

const deploy = async () => {
  const owner = getDefaultAccount()

  console.log("deploying from", owner.address)

  const bNum = await getBlockNum()
  const tokenAddress = '0x0c66dfdb08dbffc686ab15400c09edef2d96412b'

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
  const zilDecimals = '0'.repeat(9) // shifted -3 for easier completion **NOTE**
  const tknDecimals = '0'.repeat(12);
  const receiverAddress = '0x2a93d019d43872060ca2d3d68ac17009b6dd44ec'
  const treasuryAddress = '0x1fa0276d7dab7f6b77c05abf96e3790d355f5519'
  const [zilo, state] = await deployZILOv2(owner.key, {
    tokenAddress,
    tokenAmount:             '115500000' + tknDecimals, // TOKEN 115.5m
    targetZilAmount:          '32725000' + zilDecimals, // ZIL 32.725m (~$1m @ $0.031)
    minZilAmount:              '6545000' + zilDecimals, // ZIL 6.545m (20% of target)
    lpZilAmount:               '7700000' + zilDecimals, // ZIL 7.7m (token price = 0.01, zil price = 0.031)
    lpTokenAmount:            '23100000' + tknDecimals, // TOKEN 23.1m
    treasuryZilAmount:         '4908750' + zilDecimals, // ZIL ~4.9m (5% of target)
    receiverAddress:                   receiverAddress,
    treasuryAddress:                   treasuryAddress,
    liquidityAddress:         lp.address.toLowerCase(),
    startBlock:               (bNum + 30).toString(),   // start 30mins from now, 165 blocks an hr (testnet)
    endBlock:                 (bNum + 3000).toString(), // +24 hrs, hopefully
    discountBps:                                 "500",
    discountWhitelist: [
      "0x2a93d019d43872060ca2d3d68ac17009b6dd44ec",
      "0xa19e53f40550ac8d405f346e978089c22162944b",
      "0xf122f5a9681c1536ba988aad8973462a49137914",
      "0x0aa204b17ef19eb0ab56f2bf74bdb785f4c4217a",
    ]
  })

  console.log('Deployed zilo contract:')
  console.log(JSON.stringify(zilo, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))
}

deploy().then(() => console.log('Done.'))
