const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { callContract } = require("../../../scripts/call");
const { initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, generateErrorMsg } = require("./helper")

let privateKey, memberPrivateKey, address, memberAddress, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

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

  bankContract = await deployGuildBank({ initialMembers: [address], initialEpochNumber, authorityAddress })
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

test('captain initiates ownership transfer to non-member', async () => {
  const txTransferOwnership = await callContract(privateKey, bankContract, "TransferOwnership", [{
    vname: "new_owner",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)

  expect(txTransferOwnership.status).toEqual(3)
  expect(txTransferOwnership.receipt.exceptions[0].message).toEqual(generateErrorMsg(13)) // throws CodeNotMember
  expect(txTransferOwnership.receipt.success).toEqual(false)
})

describe('captain transfer ownership to member', async () => {
  test('captain initiates ownership transfer', async () => {
    const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)
    const txApproveMember = await callContract(privateKey, bankContract, "ApproveAndReceiveJoiningFee", [{
      vname: "member",
      type: "ByStr20",
      value: memberAddress,
    }], 0, false, false)

    const bankContractStateBeforeTx = await bankContract.getState()
    const txTransferOwnership = await callContract(privateKey, bankContract, "TransferOwnership", [{
      vname: "new_owner",
      type: "ByStr20",
      value: memberAddress,
    }], 0, false, false)

    const bankContractStateAfterTx = await bankContract.getState()
    expect(bankContractStateAfterTx.pending_owner.arguments[0]).toEqual(memberAddress)
  })

  test('member accepts ownership transfer', async () => {
    const bankContractStateBeforeTx = await bankContract.getState()
    const txAcceptOwnership = await callContract(memberPrivateKey, bankContract, "AcceptOwnership", [], 0, false, false)
    const bankContractStateAfterTx = await bankContract.getState()

    expect(bankContractStateBeforeTx.contract_owner.arguments[0]).toEqual(address)
    expect(bankContractStateAfterTx.contract_owner.arguments[0]).toEqual(memberAddress)
  })
})

test('captain transfer ownership to officer', async () => {
  bankContract = await deployGuildBank({ 
    initialMembers: [address, memberAddress],
    initialOfficers: [memberAddress], 
    initialEpochNumber, authorityAddress })
  bankAddress = bankContract.address.toLowerCase()

  const bankContractStateBeforeTx = await bankContract.getState()

  const txTransferOwnership = await callContract(privateKey, bankContract, "TransferOwnership", [{
    vname: "new_owner",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)

  const txAcceptOwnership = await callContract(memberPrivateKey, bankContract, "AcceptOwnership", [], 0, false, false)

  const bankContractStateAfterTx = await bankContract.getState()
  
  expect(bankContractStateBeforeTx.officers).toHaveProperty(memberAddress)
  expect(bankContractStateAfterTx.officers).not.toHaveProperty(memberAddress)
  expect(bankContractStateBeforeTx.contract_owner.arguments[0]).toEqual(address)
  expect(bankContractStateAfterTx.contract_owner.arguments[0]).toEqual(memberAddress)
})