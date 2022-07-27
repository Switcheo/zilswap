const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ZERO_ADDRESS, ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, generateErrorMsg } = require("./helper")
const util = require("util")

let privateKey, memberPrivateKey, address, memberAddress, zilswapAddress, refineryAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, zilswapContract, refineryContract, hiveContract, authorityContract, bankContract

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  
  memberPrivateKey = getPrivateKey("PRIVATE_KEY_MEMBER")
  memberAddress = getAddressFromPrivateKey(memberPrivateKey).toLowerCase();
  
  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()
  
  zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  refineryContract = await deployRefinery({ hunyAddress });
  refineryAddress = refineryContract.address.toLowerCase();

  hiveContract = await deployHive({ hunyAddress, zilswapAddress, refineryAddress });
  hiveAddress = hiveContract.address.toLowerCase();
  
  authorityContract = await deployBankAuthority({ initialEpochNumber, hiveAddress, hunyAddress })
  authorityAddress = authorityContract.address.toLowerCase()

  bankContract = await deployGuildBank({ initialMembers: [address, memberAddress], initialOfficers: [memberAddress], initialEpochNumber, authorityAddress })
  bankAddress = bankContract.address.toLowerCase()

  console.log('hunyAddress', hunyAddress)
  console.log('zilswapAddress', zilswapAddress)
  console.log('hiveAddress', hiveAddress)
  console.log('authorityAddress', authorityAddress)
  console.log('bankAddress', bankAddress)

  const txAddMinterCaptain = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);
  
  const txMintCaptain = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 8),
  }], 0, false, false)

  const txAllowanceCaptain = await callContract(privateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)

  const txMakeHunyDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: new BigNumber(1).shiftedBy(12 + 5).toString(10),
  }], 0, false, false)

  const txMakeZilDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: ZERO_ADDRESS,
  }, {
    vname: "amount",
    type: "Uint128",
    value: new BigNumber(1).shiftedBy(17).toString(10), // 1 ZIL
  }], 100000, false, false)
  console.log("make donation zil tx", txMakeZilDonation.id)

  // initialise zilswap
  // add hive as harvester in refinery 
  // add refinery as minter
  const txInitializeZilswap = await callContract(privateKey, zilswapContract, "Initialize", [], 0, false, false)
  console.log("initialize zilswap tx", txInitializeZilswap.id)

  const txAddHiveAsHarvester = await callContract(privateKey, refineryContract, "AddHarvester", [{
    vname: "address",
    type: "ByStr20",
    value: hiveAddress,
  }, {
    vname: "required_refinement_percentage",
    type: "Uint128",
    value: "50",
  }, {
    vname: "blocks_to_reduce_required_refinement",
    type: "Uint128",
    value: "50",
  }], 0, false, false)
  console.log("initiate add hive as harvester in refinery", txAddHiveAsHarvester.id)

  const txAddMinterRefinery = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: refineryAddress,
  }], 0, false, false);
})

test('deposit hive', async () => {
  const txInitiateDepositHive = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.DepositHiveTxParams`,
      argtypes: [],
      arguments: ["0", new BigNumber(1).shiftedBy(12 + 3).toString(), "3"]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New hive deposit request",
  }], 1000, false, false)
  console.log("initiate deposit hive tx", txInitiateDepositHive.id)
})

// test('deposit hive again', async () => {
//   const txInitiateDepositHive = await callContract(privateKey, bankContract, "InitiateTx", [{
//     vname: "tx_params",
//     type: `${bankAddress}.TxParams`,
//     value: {
//       constructor: `${bankAddress}.DepositHiveTxParams`,
//       argtypes: [],
//       arguments: ["0", new BigNumber(1).shiftedBy(12 + 4).toString(), "3"]
//     },
//   }, {
//     vname: "message",
//     type: "String",
//     value: "New hive deposit request",
//   }], 1000, false, false)
//   console.log("initiate deposit hive tx again", txInitiateDepositHive.id)
// })

test('withdraw hive', async () => {
  console.log(await refineryContract.getState())
  console.log(await hiveContract.getState())
  console.log(util.inspect(await zilswapContract.getState(), {showHidden: false, depth: null, colors: true}))
  const txInitiateWithdrawHive = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.WithdrawHiveTxParams`,
      argtypes: [],
      arguments: [
        new BigNumber(500).shiftedBy(12).toString(10), 
        new BigNumber(1).shiftedBy(12).toString(10), 
        new BigNumber(1).shiftedBy(12).toString(10), 
        "5"]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New hive withdraw request",
  }], 1, false, false)
  console.log("initiate withdraw hive tx", txInitiateWithdrawHive.id)
})




