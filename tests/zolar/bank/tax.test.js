const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, generateErrorMsg, getInflatedFeeAmt } = require("./helper")

let privateKey, memberPrivateKey, address, memberAddress, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

async function initiateUpdateWeeklyTaxTx (initiator, {initialAmt, inflation, firstEpoch, captainAlloc, officerAlloc}) {
  const txInitiateUpdateWeeklyTaxTx = await callContract(initiator, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.UpdateConfigTxParams`,
      argtypes: [],
      arguments: [{
        constructor: `${bankAddress}.GuildBankSettings`,
        argtypes: [],
        arguments: [{
          constructor: `${bankAddress}.Fee`,
          argtypes: [],
          arguments: [
            ONE_HUNY.toString(10), // initial amount
            ONE_HUNY.toString(10), // inflation
            initialEpochNumber.toString(), // first epoch
            {
              constructor: `${bankAddress}.FeeAllocation`,
              argtypes: [],
              arguments: ["50", "10"],
            }, // fee allocation
          ],
        }, {
          constructor: `${bankAddress}.Fee`,
          argtypes: [],
          arguments: [
            initialAmt, // initial amount
            inflation, // inflation
            firstEpoch, // first epoch
            {
              constructor: `${bankAddress}.FeeAllocation`,
              argtypes: [],
              arguments: [captainAlloc, officerAlloc],
            }, // fee allocation
          ],
        }, {
          constructor: `${bankAddress}.CaptainOnly`,
          argtypes: [],
          arguments: [],
        },
        ],
      }],
    },
  }, {
    vname: "message",
    type: "String",
    value: "Update weekly tax",
  }], 0, false, false)
  
  return txInitiateUpdateWeeklyTaxTx
}

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

  bankContract = await deployGuildBank({ initialMembers: [address, memberAddress], initialOfficers: [memberAddress], initialEpochNumber, authorityAddress })
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

test('member (officer) is not required to pay tax for the first epoch (= 1)', async () => {
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

test('epoch advances (= 2); captain collects tax from member (officer) that has not paid', async () => {
  const epoch_two = initialEpochNumber + 1

  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_two.toString(),
  }], 0, false, false)
  
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, epoch_two.toString()]
    }],
  }], 0, false, false)
  
  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check tax_collected updated
  const weeklyTaxInflated = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, initialEpochNumber, epoch_two)
  
  expect(bankContractStateBeforeTx.tax_collected).not.toHaveProperty(epoch_two.toString())
  expect(bankContractStateAfterTx.tax_collected).toHaveProperty(epoch_two.toString())
  expect(bankContractStateAfterTx.tax_collected[epoch_two.toString()]).toMatchObject({[memberAddress]: weeklyTaxInflated.toString(10)})

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

test('captain collects tax from member (officer) that has already paid for current epoch (= 2)', async () => {
  const epoch_two = initialEpochNumber + 1
  const hunyContractStateBeforeTx = await hunyContract.getState()

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, epoch_two.toString()]
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

test('epoch advances (= 3); captain updates weekly tax and member is charged with prev tax (before update) for current epoch', async () => {
  const epoch_three = initialEpochNumber + 2
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_three.toString(),
  }], 0, false, false)

  const newWeeklyTaxConfig = {
    initialAmt: (ONE_HUNY.plus(ONE_HUNY)).toString(),
    inflation: ONE_HUNY.toString(),
    firstEpoch: initialEpochNumber.toString(),
    captainAlloc: "50",
    officerAlloc: "10" 
  }
  const txInitiateUpdateWeeklyTaxTx = await initiateUpdateWeeklyTaxTx(privateKey, newWeeklyTaxConfig)

  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, epoch_three.toString()]
    }],
  }], 0, false, false)
  
  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check tax_collected updated
  const weeklyTaxInflated = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, initialEpochNumber, epoch_three)

  expect(bankContractStateBeforeTx.tax_collected).not.toHaveProperty(epoch_three.toString())
  expect(bankContractStateAfterTx.tax_collected).toHaveProperty(epoch_three.toString())
  expect(bankContractStateAfterTx.tax_collected[epoch_three.toString()]).toMatchObject({[memberAddress]: weeklyTaxInflated.toString(10)})

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
  expect(bankContractStateAfterTx.tokens_held).toHaveProperty(hunyAddress)
})

test('epoch advances (= 4); member is charged with updated tax for current epoch', async () => {
  const epoch_four = initialEpochNumber + 3
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_four.toString(),
  }], 0, false, false)
  
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, epoch_four.toString()]
    }],
  }], 0, false, false)
  
  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check tax_collected updated
  const weeklyTaxInflated = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, initialEpochNumber, epoch_four)
  
  expect(bankContractStateBeforeTx.tax_collected).not.toHaveProperty(epoch_four.toString())
  expect(bankContractStateAfterTx.tax_collected).toHaveProperty(epoch_four.toString())
  expect(bankContractStateAfterTx.tax_collected[epoch_four.toString()]).toMatchObject({[memberAddress]: weeklyTaxInflated.toString(10)})

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
  expect(bankContractStateAfterTx.tokens_held).toHaveProperty(hunyAddress)
})