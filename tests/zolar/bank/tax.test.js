const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, generateErrorMsg } = require("./helper")

let privateKey, address, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

const newEpochNumber = initialEpochNumber + 1

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

test('member (officer) is not required to pay tax for the first epoch (i.e. when guild is set up)', async () => {
  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, (initialEpochNumber).toString()]
    }],
  }], 0, false, false)

  expect(txCollectTax.status).toEqual(3)
  expect(txCollectTax.receipt.exceptions[0].message).toEqual(generateErrorMsg(23)) // throws CodeInvalidTaxParam
  expect(txCollectTax.receipt.success).toEqual(false)
})

test('captain collects tax from member (officer) that has not paid for next epoch', async () => {
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: newEpochNumber.toString(),
  }], 0, false, false)
  
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, newEpochNumber.toString()]
    }],
  }], 0, false, false)
  
  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check tax_collected updated
  const weeklyTaxInflated = (ONE_HUNY).plus(ONE_HUNY)
  
  expect(bankContractStateBeforeTx.tax_collected).not.toHaveProperty(newEpochNumber.toString())
  expect(bankContractStateAfterTx.tax_collected).toHaveProperty(newEpochNumber.toString())
  expect(bankContractStateAfterTx.tax_collected[newEpochNumber.toString()]).toMatchObject({[memberAddress]: weeklyTaxInflated.toString(10)})

  // check huny deduction for officer; huny increment for bank (capped 95%), captain (5%) and officer (1% each; if any)
  const [officerBalanceBeforeTx, officerBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const officerPaid = officerBalanceBeforeTx - officerBalanceAfterTx
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx
  const captainReceived = captainBalanceAfterTx - captainBalanceBeforeTx
  expect(officerPaid.toString()).toEqual(weeklyTaxInflated.minus(weeklyTaxInflated * 0.01).toString(10))
  expect(bankReceived.toString()).toEqual((weeklyTaxInflated * 0.94).toString(10))
  expect(captainReceived.toString()).toEqual((weeklyTaxInflated * 0.05).toString(10))

  // check addition of token addr to bank contract
  expect(bankContractStateBeforeTx.tokens_held).not.toHaveProperty(hunyAddress)
  expect(bankContractStateAfterTx.tokens_held).toHaveProperty(hunyAddress)
})

test('captain collects tax from member (officer) that has already paid', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, newEpochNumber.toString()]
    }],
  }], 0, false, false)
  
  expect(txCollectTax.status).toEqual(3)
  expect(txCollectTax.receipt.exceptions[0].message).toEqual(generateErrorMsg(11)) // throws CodeInvalidTaxParam
  expect(txCollectTax.receipt.success).toEqual(false)

  const hunyContractStateAfterTx = await hunyContract.getState()

  // tx rollback; check NO huny deduction from bank; NO huny increment for bank and captain  
  const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  expect(memberBalanceBeforeTx).toEqual(memberBalanceAfterTx)
  expect(bankBalanceBeforeTx).toEqual(bankBalanceAfterTx)
  expect(captainBalanceBeforeTx).toEqual(captainBalanceAfterTx)
})