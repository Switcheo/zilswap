const { default: BigNumber } = require("bignumber.js");
const { getDefaultAccount, createRandomAccount } = require('../../../scripts/account');
const { callContract } = require("../../../scripts/call");
const { zilliqa } = require("../../../scripts/zilliqa");
const { ZERO_ADDRESS, ONE_HUNY, initialEpochNumber } = require("./config");
const { deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, matchObject, getSubState } = require("./helper")

let privateKey, memberPrivateKey, address, memberAddress, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, newBankAddress, hunyContract, authorityContract, bankContract, newBankContract

const ZERO_IN_QA = (0).toString(10)
const ONE_THOUSAND_IN_QA = new BigNumber(1).shiftedBy(12 + 3).toString(10)

async function mintAndDonate(tokenContract) {
  tokenAddress = tokenContract.address.toLowerCase()

  const txAddMinter = await callContract(privateKey, tokenContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  const txMintCaptain = await callContract(privateKey, tokenContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)

  // allow member to transfer token to bank (spender)
  const txAllowanceCaptain = await callContract(privateKey, tokenContract, "IncreaseAllowance", [{
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
    value: tokenAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: ONE_HUNY.toString(10),
  }], 0, false, false)
}

async function migrateToken(senderAddress, tokenAddress) {
  const txMigrateToken = await callContract(privateKey, authorityContract, "MigrateBankToken", [{
    vname: "bank",
    type: "ByStr20",
    value: senderAddress,
  }, {
    vname: "token",
    type: "ByStr20",
    value: tokenAddress,
  }], 0, false, false)

  return txMigrateToken
}

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
    initialMembers: [address],
    initialEpochNumber,
    authorityAddress
  })
  bankAddress = bankContract.address.toLowerCase()

  const txMintAndDonate = await mintAndDonate(hunyContract)

  const txMakeZilDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: ZERO_ADDRESS,
  }, {
    vname: "amount",
    type: "Uint128",
    value: ONE_THOUSAND_IN_QA, // 1000 ZIL
  }], 1000, false, false)
  console.log("make donation zil tx", txMakeZilDonation.id)

  const txMintMember = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: memberAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)

  const txAllowanceMember = await callContract(memberPrivateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)

  // add joining request
  // add joining fee paid
  // setEpoch
  // collectTax from member (tax_owed should contain captain address)
  const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)

  const txApproveMember = await callContract(privateKey, bankContract, "ApproveAndReceiveJoiningFee", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)

  const nextEpoch = initialEpochNumber + 1
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: nextEpoch.toString(),
  }], 0, false, false)

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [
      {
        constructor: `${bankAddress}.TaxParam`,
        argtypes: [],
        arguments: [memberAddress, nextEpoch.toString()]
      }],
  }], 0, false, false)
})

test('migrate bank', async () => {
  const epoch = (await zilliqa.blockchain.getSmartContractSubState(bankAddress, "last_updated_epoch")).result.last_updated_epoch;
  const members = (await zilliqa.blockchain.getSmartContractSubState(bankAddress, "members")).result.members;
  const officers = (await zilliqa.blockchain.getSmartContractSubState(bankAddress, "officers")).result.officers;

  newBankContract = await deployGuildBank({
    initialMembers: Object.keys(members),
    initialOfficers: Object.keys(officers),
    initialEpochNumber: epoch,
    authorityAddress
  });

  newBankAddress = newBankContract.address.toLowerCase();

  const bankContractStateBeforeTx = await bankContract.getState()

  const txMigrateBank = await callContract(privateKey, authorityContract, "MigrateBank", [{
    vname: "old_bank",
    type: "ByStr20",
    value: bankAddress,
  }, {
    vname: "new_bank",
    type: "ByStr20",
    value: newBankAddress,
  }], 0, false, false)
  console.log("migrate bank tx", txMigrateBank.id)

  const bankContractStateAfterTx = await bankContract.getState()
  const newBankContractStateAfterTx = await newBankContract.getState()

  expect(bankContractStateBeforeTx.migrated_to_bank.arguments.length === 0)
  expect(bankContractStateAfterTx.migrated_to_bank.arguments.length === 1)
  expect(bankContractStateAfterTx.migrated_to_bank.arguments[0] === newBankAddress)

  expect(bankContractStateAfterTx.last_updated_epoch).toEqual(newBankContractStateAfterTx.last_updated_epoch)

  const joiningRequestMatch = matchObject(...getSubState("joining_requests", bankContractStateBeforeTx, bankContractStateAfterTx))
  const joiningFeePaidMatch = matchObject(...getSubState("joining_fee_paid", bankContractStateBeforeTx, bankContractStateAfterTx))
  const taxCollectedMatch = matchObject(...getSubState("tax_collected", bankContractStateBeforeTx, bankContractStateAfterTx))
  const taxOwedMatch = matchObject(...getSubState("tax_owed", bankContractStateBeforeTx, bankContractStateAfterTx))

  expect(joiningRequestMatch).toEqual(true)
  expect(joiningFeePaidMatch).toEqual(true)
  expect(taxCollectedMatch).toEqual(true)
  expect(taxOwedMatch).toEqual(true)
})

test('migrate huny token to new bank', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txMigrateToken = await migrateToken(bankAddress, hunyAddress)
  console.log('txMigrateToken id ', txMigrateToken.id)

  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check token deduction for old bank; huny increment for new bank
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [newBankBalanceBeforeTx, newBankBalanceAfterTx] = getBalanceFromStates(newBankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)

  const migratedFromBank = bankBalanceBeforeTx - bankBalanceAfterTx
  const migratedToNewBank = newBankBalanceAfterTx - newBankBalanceBeforeTx

  expect(migratedFromBank.toString()).toEqual(migratedToNewBank.toString())

  // check removal of token addr from bank contract
  expect(bankContractStateBeforeTx.tokens_held).toHaveProperty(hunyAddress)
  expect(bankContractStateAfterTx.tokens_held).not.toHaveProperty(hunyAddress)
})

test('migrate zil to new bank', async () => {
  const bankContractStateBeforeTx = await bankContract.getState()
  const newBankContractStateBeforeTx = await newBankContract.getState()

  const txMigrateToken = await migrateToken(bankAddress, ZERO_ADDRESS)
  console.log('txMigrateToken id ', txMigrateToken.id)

  const bankContractStateAfterTx = await bankContract.getState()
  const newBankContractStateAfterTx = await newBankContract.getState()

  expect(bankContractStateBeforeTx._balance).toEqual(ONE_THOUSAND_IN_QA)
  expect(bankContractStateAfterTx._balance).toEqual(ZERO_IN_QA)

  expect(newBankContractStateBeforeTx._balance).toEqual(ZERO_IN_QA)
  expect(newBankContractStateAfterTx._balance).toEqual(ONE_THOUSAND_IN_QA)
})