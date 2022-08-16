const { default: BigNumber } = require("bignumber.js");
const { getDefaultAccount } = require('../../../scripts/account');
const { callContract } = require("../../../scripts/call");
const { ZERO_ADDRESS, initialEpochNumber } = require("./config");
const { deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank } = require("./helper")

let privateKey, address, zilswapAddress, refineryAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, zilswapContract, refineryContract, hiveContract, authorityContract, bankContract

beforeAll(async () => {
  ; ({ key: privateKey, address } = getDefaultAccount())

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

  bankContract = await deployGuildBank({ initialMembers: [address], initialOfficers: [], initialEpochNumber, authorityAddress })
  bankAddress = bankContract.address.toLowerCase()

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
      arguments: ["0", new BigNumber(1).shiftedBy(12 + 3).toString(), new BigNumber(1).shiftedBy(12 + 3).toString(), "3"]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New hive deposit request",
  }], 0, false, false)
  console.log("initiate deposit hive tx", txInitiateDepositHive.id)

  expect(txInitiateDepositHive.status).toEqual(2)
  expect(txInitiateDepositHive.receipt.success).toEqual(true)
})

test('withdraw hive', async () => {
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
  }], 0, false, false)
  console.log("initiate withdraw hive tx", txInitiateWithdrawHive.id)

  expect(txInitiateWithdrawHive.status).toEqual(2)
  expect(txInitiateWithdrawHive.receipt.success).toEqual(true)
})

test('claim hive', async () => {
  const claimHiveTx = await callContract(privateKey, bankContract, "ClaimHive", [], 0, false, false)
  console.log("claimHiveTx id ", claimHiveTx.id)

  expect(claimHiveTx.status).toEqual(2)
  expect(claimHiveTx.receipt.success).toEqual(true)
})

test('claim refinery', async () => {
  const refineryStateBeforeTx = await refineryContract.getState()
  console.log('refineryStateBeforeTx ', refineryStateBeforeTx)
  const bnum = Object.keys(refineryStateBeforeTx.refining[bankAddress])[0]
  console.log('bnum', bnum)
  const claimRefineryTx = await callContract(privateKey, bankContract, "ClaimRefinery", [{
    vname: "claim_block",
    type: "BNum",
    value: bnum,
  }], 0, false, false)
  console.log("claimRefineryTx id ", claimRefineryTx.id)

  expect(claimRefineryTx.status).toEqual(2)
  expect(claimRefineryTx.receipt.success).toEqual(true)
})