const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ONE_HUNY, getPrivateKey, initialEpochNumber, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank } = require("../../../scripts/zolar/bank/deploy");
const {callContract} = require("../../../scripts/call")
const { getBalanceFromStates, generateErrorMsg } = require("./helper")

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

describe('member joins guild for the first time', () => {
  test('member applies for membership', async () => {
    const bankContractStateBeforeTx = await bankContract.getState()    
    const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)
    const bankContractStateAfterTx = await bankContract.getState()

    expect(bankContractStateBeforeTx.joining_requests).not.toHaveProperty(memberAddress)
    expect(bankContractStateAfterTx.joining_requests).toHaveProperty(memberAddress)
    // expect(bankContractStateAfterTx.joining_requests.constructor).toEqual('True')
  })

  test('member automatically pays joining fee after approval', async () => {
    const bankContractStateBeforeTx = await bankContract.getState()
    const hunyContractStateBeforeTx = await hunyContract.getState()
  
    const txApproveMember = await callContract(privateKey, bankContract, "ApproveAndReceiveJoiningFee", [{
      vname: "member",
      type: "ByStr20",
      value: memberAddress,
    }], 0, false, false)
  
    const bankContractStateAfterTx = await bankContract.getState()
    const hunyContractStateAfterTx = await hunyContract.getState()
    
    // check change in membership 
    expect(bankContractStateAfterTx.joining_requests).not.toHaveProperty(memberAddress)
    expect(bankContractStateBeforeTx.members).not.toHaveProperty(memberAddress)
    expect(bankContractStateAfterTx.members).toHaveProperty(memberAddress)
    
    // check change in fee status
    expect(Object.keys(bankContractStateBeforeTx.joining_fee_paid).length).toEqual(0)
    expect(Object.keys(bankContractStateAfterTx.joining_fee_paid).length).toEqual(1)
    expect(bankContractStateAfterTx.joining_fee_paid).toMatchObject({[memberAddress]: ONE_HUNY.toString(10)}) // no inflation
  
    // check huny deduction for member; huny increment for bank (95%), captain (5%) and officer (1% each; if any)
    const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
    const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
    const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
    const memberPaid = memberBalanceBeforeTx - memberBalanceAfterTx
    const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx
    const captainReceived = captainBalanceAfterTx - captainBalanceBeforeTx
    expect(memberPaid.toString()).toEqual(ONE_HUNY.toString(10))
    expect(bankReceived.toString()).toEqual((ONE_HUNY * 0.95).toString(10))
    expect(captainReceived.toString()).toEqual((ONE_HUNY * 0.05).toString(10))

    // check addition of token addr to bank contract (KIV)
    // expect(bankContractStateBeforeTx.tokens_held).not.toHaveProperty(hunyAddress)
    // expect(bankContractStateAfterTx.tokens_held).toHaveProperty(hunyAddress)
  })
})

describe('existing member leaves and joins guild again', () => {
  test('member leaves guild', async () => {
    const bankContractStateBeforeTx = await bankContract.getState()
    const txLeaveGuild = await callContract(memberPrivateKey, bankContract, "LeaveGuild", [], 0, false, false)
    const bankContractStateAfterTx = await bankContract.getState()
    
    expect(bankContractStateBeforeTx.members).toHaveProperty(memberAddress)
    expect(bankContractStateAfterTx.members).not.toHaveProperty(memberAddress)
  })

  test('member rejoins guild; void of joining fee', async () => {
    const bankContractStateBeforeTx = await bankContract.getState()
    const hunyContractStateBeforeTx = await hunyContract.getState()
    expect(bankContractStateBeforeTx.joining_fee_paid).toHaveProperty(memberAddress)
    
    const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)
    const txApproveMember = await callContract(privateKey, bankContract, "ApproveAndReceiveJoiningFee", [{
      vname: "member",
      type: "ByStr20",
      value: memberAddress,
    }], 0, false, false)
    
    const bankContractStateAfterTx = await bankContract.getState()
    const hunyContractStateAfterTx = await hunyContract.getState()

    expect(bankContractStateAfterTx.members).toHaveProperty(memberAddress)

    // check NO huny deduction from member; NO huny increment for bank and captain
    const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
    const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
    const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
    expect(memberBalanceBeforeTx).toEqual(memberBalanceAfterTx)
    expect(bankBalanceBeforeTx).toEqual(bankBalanceAfterTx)
    expect(captainBalanceBeforeTx).toEqual(captainBalanceAfterTx)
  })
})

test('existing member attempts to apply for membership', async () => {
  const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)

  expect(txApplyMembership.status).toEqual(3)
  expect(txApplyMembership.receipt.exceptions[0].message).toEqual(generateErrorMsg(12)) // throws CodeIsAlreadyMember (12)
  expect(txApplyMembership.receipt.success).toEqual(false)
}) 
