const { default: BigNumber } = require("bignumber.js");
const { getDefaultAccount, createRandomAccount } = require('../../../scripts/account');
const {callContract} = require("../../../scripts/call");
const { ZERO_ADDRESS, ONE_HUNY, initialEpochNumber } = require("./config");
const { deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates } = require("./helper")

let privateKey, memberPrivateKey, address, memberAddress, zilswapAddress, refineryAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, zilswapContract, refineryContract, hiveContract, hunyContract, authorityContract, bankContract

beforeAll(async () => {
  ;({key: privateKey, address} = getDefaultAccount())
  ;({key: memberPrivateKey, address: memberAddress} = await createRandomAccount(privateKey, '1000'))

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
    initialMembers: [address, memberAddress], 
    initialEpochNumber: initialEpochNumber, 
    authorityAddress 
  })
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

  // check addition of token addr to bank contract 
  expect(bankContractStateBeforeTx.tokens_held).not.toHaveProperty(hunyAddress)
  expect(bankContractStateAfterTx.tokens_held).toHaveProperty(hunyAddress)
})

test('captain makes zil donation', async () => {
  const bankContractStateBeforeTx = await bankContract.getState()

  const txMakeZilDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: ZERO_ADDRESS,
  }, {
    vname: "amount",
    type: "Uint128",
    value: new BigNumber(1).shiftedBy(12).toString(10), // 1 ZIL
  }], 1, false, false)

  const bankContractStateAfterTx = await bankContract.getState()
  // check zil increment for bank
  const bankBalanceBeforeTx = parseInt(bankContractStateBeforeTx._balance)
  const bankBalanceAfterTx = parseInt(bankContractStateAfterTx._balance)
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx

  expect(bankReceived.toString()).toEqual(new BigNumber(1).shiftedBy(12).toString(10))
})
