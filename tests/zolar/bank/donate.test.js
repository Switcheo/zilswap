const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ONE_HUNY, getPrivateKey, initialEpochNumber, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank } = require("../../../scripts/zolar/bank/deploy");
const {callContract} = require("../../../scripts/call")
const { getBalanceFromStates } = require("./helper")

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

  bankContract = await deployGuildBank({ initialMembers: [memberAddress], initialEpochNumber, authorityAddress })
  bankAddress = bankContract.address.toLowerCase()

  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
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
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)

  // allow captain to transfer token to bank (spender)
  const txAllowanceCaptain = await callContract(privateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)
  
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

test('member makes huny donation', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txMakeHunyDonation = await callContract(memberPrivateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: ONE_HUNY.toString(10),
  }], 0, false, false)

  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check huny deduction for member; huny increment for bank
  const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const memberDonated = memberBalanceBeforeTx - memberBalanceAfterTx
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx

  expect(memberDonated.toString()).toEqual(ONE_HUNY.toString(10))
  expect(bankReceived.toString()).toEqual(ONE_HUNY.toString(10))

  // check addition of token addr to bank contract 
  expect(bankContractStateBeforeTx.tokens_held).not.toHaveProperty(hunyAddress)
  expect(bankContractStateAfterTx.tokens_held).toHaveProperty(hunyAddress)
})

test('non-member makes huny donation', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txLeaveGuild = await callContract(memberPrivateKey, bankContract, "LeaveGuild", [], 0, false, false)

  const txMakeHunyDonation = await callContract(memberPrivateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: ONE_HUNY.toString(10),
  }], 0, false, false)

  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check huny deduction for non-member; huny increment for bank
  const [nonMemberBalanceBeforeTx, nonMemberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const nonMemberDonated = nonMemberBalanceBeforeTx - nonMemberBalanceAfterTx
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx

  expect(nonMemberDonated.toString()).toEqual(ONE_HUNY.toString(10))
  expect(bankReceived.toString()).toEqual(ONE_HUNY.toString(10))
})

test('captain makes huny donation', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txMakeHunyDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: ONE_HUNY.toString(10),
  }], 0, false, false)

  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check huny deduction for captain; huny increment for bank
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const captainDonated = captainBalanceBeforeTx - captainBalanceAfterTx
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx

  expect(captainDonated.toString()).toEqual(ONE_HUNY.toString(10))
  expect(bankReceived.toString()).toEqual(ONE_HUNY.toString(10))
})