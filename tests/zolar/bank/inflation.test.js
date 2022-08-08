const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, getAllocationFee, getInflatedFeeAmt } = require("./helper")


let privateKey, memberPrivateKey, address, memberAddress, zilswapAddress, refineryAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, zilswapContract, refineryContract, hiveContract, hunyContract, authorityContract, bankContract

const epoch_one = initialEpochNumber
const epoch_two = epoch_one + 1

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
  
  authorityContract = await deployBankAuthority({ 
    initialEpochNumber, 
    hiveAddress, 
    hunyAddress 
  })
  authorityAddress = authorityContract.address.toLowerCase()

  bankContract = await deployGuildBank({ 
    initialMembers: [address], 
    initialEpochNumber: initialEpochNumber, 
    authorityAddress 
  })
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
    value: new BigNumber(1).shiftedBy(12 + 6),
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

test('epoch advances to epoch_two; new member joins guild and pays inflated joining fee', async () => { 
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

  const joiningFee_epochTwo = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, epoch_one, epoch_two)

  const captainAllocationFee = getAllocationFee(50, joiningFee_epochTwo)

  // check huny deduction for member; huny increment for bank (capped 95%), captain (5%) and officer (1% each; if any)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)

  const captainReceived = captainBalanceAfterTx - captainBalanceBeforeTx
  const memberPaid = memberBalanceBeforeTx - memberBalanceAfterTx
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx

  expect(captainReceived).toEqual(captainAllocationFee)
  expect(memberPaid).toEqual(joiningFee_epochTwo)
  expect(bankReceived).toEqual(joiningFee_epochTwo - captainAllocationFee)
})
