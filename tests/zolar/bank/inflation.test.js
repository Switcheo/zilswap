const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, getInflatedFeeAmt } = require("./helper")

let privateKey, address, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  
  memberPrivateKey = getPrivateKey("PRIVATE_KEY_MEMBER")
  memberAddress = getAddressFromPrivateKey(memberPrivateKey).toLowerCase();
  
  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()

  const zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  const hiveContract = await deployHive({ hunyAddress, zilswapAddress });
  hiveAddress = hiveContract.address.toLowerCase();
  
  authorityContract = await deployBankAuthority({ initialEpochNumber, hiveAddress, hunyAddress })
  authorityAddress = authorityContract.address.toLowerCase()

  bankContract = await deployGuildBank({ initialMembers: [], initialEpochNumber, authorityAddress })
  bankAddress = bankContract.address.toLowerCase()

  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  const txMintMember = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: memberAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)

  // allow member to transfer token to bank (spender)
  const txAllowanceMember = await callContract(memberPrivateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)
})

test('new member joins guild at epoch = 2; pays joining fee (= initial joining fee + 1 x inflation)', async () => { 
  const epoch_two = initialEpochNumber + 1
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_two.toString(),
  }], 0, false, false)

  const hunyContractStateBeforeTx = await hunyContract.getState()

  const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)
  const txApproveMember = await callContract(privateKey, bankContract, "ApproveAndReceiveJoiningFee", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)

  const hunyContractStateAfterTx = await hunyContract.getState()

  // check huny deduction for member; huny increment for bank (capped 95%), captain (5%) and officer (1% each; if any)
  const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const memberPaid = memberBalanceBeforeTx - memberBalanceAfterTx
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx
  const captainReceived = captainBalanceAfterTx - captainBalanceBeforeTx

  const joiningFeeInflated = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, initialEpochNumber, epoch_two)
  expect(memberPaid.toString()).toEqual(joiningFeeInflated.toString(10))
  expect(bankReceived.toString()).toEqual((joiningFeeInflated* 0.95).toString(10))
  expect(captainReceived.toString()).toEqual((joiningFeeInflated * 0.05).toString(10))
})

test("member pays weekly tax (= initial weekly tax + 2 x inflation) in next epoch (= 3)", async () => {
  const epoch_three = initialEpochNumber + 2
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_three.toString(),
  }], 0, false, false)

  const hunyContractStateBeforeTx = await hunyContract.getState()
  
  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, (initialEpochNumber + 2).toString()]
    },
  ],
  }], 0, false, false)
  
  const hunyContractStateAfterTx = await hunyContract.getState()
  // check huny deduction for member; huny increment for bank (capped 95%), captain (5%) and officer (1% each; if any)
  const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const memberPaid = memberBalanceBeforeTx - memberBalanceAfterTx
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx
  const captainReceived = captainBalanceAfterTx - captainBalanceBeforeTx

  const weeklyTaxInflated = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, initialEpochNumber, epoch_three)
  
  expect(memberPaid.toString()).toEqual(weeklyTaxInflated.toString(10))
  expect(bankReceived.toString()).toEqual((weeklyTaxInflated * 0.95).toString(10))
  expect(captainReceived.toString()).toEqual((weeklyTaxInflated * 0.05).toString(10))
})