const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, getAllocationFee, generateErrorMsg, getInflatedFeeAmt } = require("./helper")

let privateKey, memberPrivateKey, address, memberAddress, officerOnePrivateKey, officerOneAddress, officerTwoPrivateKey, officerTwoAddress, zilswapAddress, refineryAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, zilswapContract, refineryContract, hiveContract, hunyContract, authorityContract, bankContract

const epoch_one = initialEpochNumber
const epoch_two = epoch_one + 1
const epoch_three = epoch_two + 1
const epoch_four = epoch_three + 1
const epoch_five = epoch_four + 1
const epoch_six = epoch_five + 1
const epoch_seven = epoch_six + 1

const OFFICER_COUNT = 2

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
            epoch_one.toString(), // first epoch
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
  
  officerOnePrivateKey = getPrivateKey("PRIVATE_KEY_OFFICER_ONE")
  officerOneAddress = getAddressFromPrivateKey(officerOnePrivateKey).toLowerCase();
  
  officerTwoPrivateKey = getPrivateKey("PRIVATE_KEY_OFFICER_TWO")
  officerTwoAddress = getAddressFromPrivateKey(officerTwoPrivateKey).toLowerCase();

  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()
  
  zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  refineryContract = await deployRefinery({ hunyAddress });
  refineryAddress = refineryContract.address.toLowerCase();

  hiveContract = await deployHive({ hunyAddress, zilswapAddress, refineryAddress });
  hiveAddress = hiveContract.address.toLowerCase();
  
  authorityContract = await deployBankAuthority({ 
    initialEpochNumber: epoch_one, 
    hiveAddress, 
    hunyAddress 
  })
  authorityAddress = authorityContract.address.toLowerCase()

  bankContract = await deployGuildBank({ 
    initialMembers: [address, officerOneAddress, officerTwoAddress, memberAddress], 
    initialOfficers: [officerOneAddress, officerTwoAddress], 
    initialEpochNumber: epoch_one, 
    authorityAddress 
  })
  bankAddress = bankContract.address.toLowerCase()

  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  const membersPrivateKeys = [
    privateKey, officerOnePrivateKey, officerTwoPrivateKey, memberPrivateKey
  ]

  for (const key of membersPrivateKeys) {
    const addr = getAddressFromPrivateKey(key).toLowerCase()

    const txMintMember = await callContract(privateKey, hunyContract, "Mint", [{
      vname: 'recipient',
      type: 'ByStr20',
      value: addr,
    }, {
      vname: 'amount',
      type: 'Uint128',
      value: new BigNumber(1).shiftedBy(12 + 6),
    }], 0, false, false)
    
    const txAllowanceMember = await callContract(key, hunyContract, "IncreaseAllowance", [{
      vname: 'spender',
      type: 'ByStr20',
      value: bankAddress,
    }, {
      vname: 'amount',
      type: 'Uint128',
      value: new BigNumber(2).pow(64).minus(1).toString(),
    }], 0, false, false)
  }

  const txMakeHunyDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: new BigNumber(1).shiftedBy(12 + 5).toString(10),
  }], 0, false, false)

  const txAddMinterAuthority = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: authorityAddress,
  }], 0, false, false);
})

test('members are not required to pay tax for the first epoch (epoch_one)', async () => {
  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [address, epoch_one.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [officerOneAddress, epoch_one.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, epoch_one.toString()]
    }],
  }], 0, false, false)
  console.log('txCollectTax: members are not required to pay tax for the first epoch (epoch_one) ', txCollectTax.id)
  expect(txCollectTax.status).toEqual(3)
  expect(txCollectTax.receipt.exceptions[0].message).toEqual(generateErrorMsg(23)) // throws CodeInvalidTaxParam
  expect(txCollectTax.receipt.success).toEqual(false)
})

test('epoch advances to epoch_two. guildbank updates epoch when collectTax invoked with empty array', async () => {
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_two.toString(),
  }], 0, false, false)

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [],
  }], 0, false, false)
  console.log('txCollectTax: submit collect tax with empty array ', txCollectTax.id)
  expect(txCollectTax.status).toEqual(2)
  expect(txCollectTax.receipt.success).toEqual(true)
})

test('captain collects tax from members for epoch_two', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()

  console.log('hunyContractStateBeforeTx', hunyContractStateBeforeTx) 
  const arrCollectTax = [{
    constructor: `${bankAddress}.TaxParam`,
    argtypes: [],
    arguments: [address, epoch_two.toString()]
  }, 
  {
    constructor: `${bankAddress}.TaxParam`,
    argtypes: [],
    arguments: [officerOneAddress, epoch_two.toString()]
  }, 
  {
    constructor: `${bankAddress}.TaxParam`,
    argtypes: [],
    arguments: [officerTwoAddress, epoch_two.toString()]
  }, 
  {
    constructor: `${bankAddress}.TaxParam`,
    argtypes: [],
    arguments: [memberAddress, epoch_two.toString()]
  }
  ]

  const taxCount = arrCollectTax.length

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: arrCollectTax
  }], 0, false, false)

  console.log("txCollectTax id: captain collects tax from all members for epoch_two ", txCollectTax.id)

  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check tax_collected updated
  const tax_epochTwo = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, epoch_one, epoch_two)

  const totalTaxInflated = tax_epochTwo * taxCount

  const captainAllocationFee = getAllocationFee(50, tax_epochTwo)
  const officerAllocationFee = getAllocationFee(10, tax_epochTwo)

  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [officerOneBalanceBeforeTx, officerOneBalanceAfterTx] = getBalanceFromStates(officerOneAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [officerTwoBalanceBeforeTx, officerTwoBalanceAfterTx] = getBalanceFromStates(officerTwoAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(memberAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)

  const captainPaidActual = captainBalanceBeforeTx - captainBalanceAfterTx
  const officerOnePaidActual = officerOneBalanceBeforeTx - officerOneBalanceAfterTx
  const officerTwoPaidActual = officerTwoBalanceBeforeTx - officerTwoBalanceAfterTx
  const memberPaidActual = memberBalanceBeforeTx - memberBalanceAfterTx
  const bankReceivedActual = bankBalanceAfterTx - bankBalanceBeforeTx
  
  const captainPaidExpected = tax_epochTwo - taxCount * captainAllocationFee
  const officerPaidExpected = tax_epochTwo - taxCount * officerAllocationFee
  const memberPaidExpected = tax_epochTwo
  const bankReceivedExpected = totalTaxInflated - taxCount * (captainAllocationFee + OFFICER_COUNT * officerAllocationFee)
  
  // check huny deduction for officer; huny increment for bank (capped 95%), captain (0.5%) and officer (0.1% each; if any)
  expect(captainPaidActual).toEqual(captainPaidExpected)
  expect(officerPaidExpected).toEqual(officerOnePaidActual)
  expect(officerPaidExpected).toEqual(officerTwoPaidActual)
  expect(memberPaidExpected).toEqual(memberPaidActual)
  expect(bankReceivedActual).toEqual(bankReceivedExpected)

  // console.log(util.inspect(bankContractStateBeforeTx, {showHidden: false, depth: null, colors: true}))
  // console.log(util.inspect(bankContractStateAfterTx, {showHidden: false, depth: null, colors: true}))
})

test('epoch advances to epoch_three. captain updates weekly tax and member is charged with prev tax (before update) for epoch_three', async () => {
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_three.toString(),
  }], 0, false, false)

  const newInitialAmt = ONE_HUNY.plus(ONE_HUNY)
  const newWeeklyTaxConfig = {
    initialAmt: newInitialAmt.toString(),
    inflation: ONE_HUNY.toString(),
    firstEpoch: epoch_one.toString(),
    captainAlloc: "50",
    officerAlloc: "10" 
  }
  const txInitiateUpdateWeeklyTaxTx = await initiateUpdateWeeklyTaxTx(privateKey, newWeeklyTaxConfig)
  console.log('txInitiateUpdateWeeklyTaxTx id: ', txInitiateUpdateWeeklyTaxTx.id)
  const hunyContractStateBeforeTx = await hunyContract.getState()

  const arrCollectTax = [{
    constructor: `${bankAddress}.TaxParam`,
    argtypes: [],
    arguments: [address, epoch_three.toString()]
  }]

  const taxCount = arrCollectTax.length

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: arrCollectTax
  }], 0, false, false)

  console.log("txCollectTax id: captain collects tax from captain for epoch_three ", txCollectTax.id)
  
  const hunyContractStateAfterTx = await hunyContract.getState()
  const tax_beforeUpdate = getInflatedFeeAmt(ONE_HUNY, ONE_HUNY, epoch_one, epoch_three)
  const totalTax = tax_beforeUpdate * taxCount

  const captainAllocationFee = getAllocationFee(50, tax_beforeUpdate)
  const officerAllocationFee = getAllocationFee(10, tax_beforeUpdate)

  // check huny deduction for officer; huny increment for bank (capped 95%), captain (5%) and officer (1% each; if any)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)

  const captainPaidActual = captainBalanceBeforeTx - captainBalanceAfterTx
  const bankReceivedActual = bankBalanceAfterTx - bankBalanceBeforeTx
  
  const captainPaidExpected = tax_beforeUpdate - taxCount * captainAllocationFee
  const bankReceivedExpected = totalTax - taxCount * (captainAllocationFee + OFFICER_COUNT * officerAllocationFee)
  
  // check huny deduction for officer; huny increment for bank (capped 95%), captain (0.5%) and officer (0.1% each; if any)
  expect(captainPaidActual).toEqual(captainPaidExpected)
  expect(bankReceivedActual).toEqual(bankReceivedExpected)
})

test('epoch advances to epoch_four; captain is charged with updated tax for epoch_four', async () => {
  const newInitialAmt = ONE_HUNY.plus(ONE_HUNY)

  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_four.toString(),
  }], 0, false, false)
  
  const hunyContractStateBeforeTx = await hunyContract.getState()

  const arrCollectTax = [{
    constructor: `${bankAddress}.TaxParam`,
    argtypes: [],
    arguments: [address, epoch_four.toString()]
  }]

  const taxCount = arrCollectTax.length

  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: arrCollectTax
  }], 0, false, false)

  console.log("txCollectTax id: captain collects tax from captain for epoch_four ", txCollectTax.id)
  
  const hunyContractStateAfterTx = await hunyContract.getState()
  const tax_afterUpdate = getInflatedFeeAmt(newInitialAmt, ONE_HUNY, epoch_one, epoch_four)
  const totalTax = tax_afterUpdate * taxCount

  const captainAllocationFee = getAllocationFee(50, tax_afterUpdate)
  const officerAllocationFee = getAllocationFee(10, tax_afterUpdate)

  // check huny deduction for officer; huny increment for bank (capped 95%), captain (5%) and officer (1% each; if any)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)

  const captainPaidActual = captainBalanceBeforeTx - captainBalanceAfterTx
  const bankReceivedActual = bankBalanceAfterTx - bankBalanceBeforeTx
  
  const captainPaidExpected = tax_afterUpdate - taxCount * captainAllocationFee
  const bankReceivedExpected = totalTax - taxCount * (captainAllocationFee + OFFICER_COUNT * officerAllocationFee)
  
  // check huny deduction for officer; huny increment for bank (capped 95%), captain (0.5%) and officer (0.1% each; if any)
  expect(captainPaidActual).toEqual(captainPaidExpected)
  expect(bankReceivedActual).toEqual(bankReceivedExpected)
})

describe('test max depth limit for CollectTax transition', () => {
  test('epoch advances to epoch_five. guildbank updates epoch', async () => {
    const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
      vname: "epoch_number",
      type: "Uint32",
      value: epoch_five.toString(),
    }], 0, false, false)

    const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
      vname: "params",
      type: `List ${bankAddress}.TaxParam`,
      value: [],
    }], 0, false, false)
    console.log('txCollectTax: submit collect tax with empty array ', txCollectTax.id)
    expect(txCollectTax.status).toEqual(2)
    expect(txCollectTax.receipt.success).toEqual(true)
  })

  test('epoch advances to epoch_six. guildbank updates epoch', async () => {
    const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
      vname: "epoch_number",
      type: "Uint32",
      value: epoch_six.toString(),
    }], 0, false, false)

    const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
      vname: "params",
      type: `List ${bankAddress}.TaxParam`,
      value: [],
    }], 0, false, false)
    console.log('txCollectTax: submit collect tax with empty array ', txCollectTax.id)
    expect(txCollectTax.status).toEqual(2)
    expect(txCollectTax.receipt.success).toEqual(true)
  })

  test('epoch advances to epoch_seven. guildbank updates epoch', async () => {
    const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
      vname: "epoch_number",
      type: "Uint32",
      value: epoch_seven.toString(),
    }], 0, false, false)

    const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
      vname: "params",
      type: `List ${bankAddress}.TaxParam`,
      value: [],
    }], 0, false, false)
    console.log('txCollectTax: submit collect tax with empty array ', txCollectTax.id)
    expect(txCollectTax.status).toEqual(2)
    expect(txCollectTax.receipt.success).toEqual(true)
  })

  test('(success) test max depth limit (= 4) for CollectTax transition', async () => {
    const hunyContractStateBeforeTx = await hunyContract.getState()
    const bankContractStateBeforeTx = await bankContract.getState()

    const arrCollectTax = [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [address, epoch_five.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [officerOneAddress, epoch_five.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [officerTwoAddress, epoch_five.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, epoch_five.toString()]
    },
    // {
    //   constructor: `${bankAddress}.TaxParam`,
    //   argtypes: [],
    //   arguments: [address, epoch_six.toString()]
    // }, 
    // {
    //   constructor: `${bankAddress}.TaxParam`,
    //   argtypes: [],
    //   arguments: [officerOneAddress, epoch_six.toString()]
    // }, 
    // {
    //   constructor: `${bankAddress}.TaxParam`,
    //   argtypes: [],
    //   arguments: [officerTwoAddress, epoch_six.toString()]
    // }, 
    // {
    //   constructor: `${bankAddress}.TaxParam`,
    //   argtypes: [],
    //   arguments: [memberAddress, epoch_six.toString()]
    // }
  ]

    const taxCount = arrCollectTax.length

    const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
      vname: "params",
      type: `List ${bankAddress}.TaxParam`,
      value: arrCollectTax
    }], 0, false, false)

    console.log("txCollectTax id: test max depth limit for CollectTax transition ", txCollectTax.id)
    expect(txCollectTax.status).toEqual(2)
    expect(txCollectTax.receipt.success).toEqual(true)
  })

  test('(failure) test max depth limit (= 5) for CollectTax transition', async () => {
    const hunyContractStateBeforeTx = await hunyContract.getState()
    const bankContractStateBeforeTx = await bankContract.getState()

    const arrCollectTax = [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [address, epoch_six.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [officerOneAddress, epoch_six.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [officerTwoAddress, epoch_six.toString()]
    }, 
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, epoch_six.toString()]
    },
    {
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [address, epoch_seven.toString()]
    }, 
    // {
    //   constructor: `${bankAddress}.TaxParam`,
    //   argtypes: [],
    //   arguments: [officerOneAddress, epoch_seven.toString()]
    // }, 
    // {
    //   constructor: `${bankAddress}.TaxParam`,
    //   argtypes: [],
    //   arguments: [officerTwoAddress, epoch_seven.toString()]
    // }, 
    // {
    //   constructor: `${bankAddress}.TaxParam`,
    //   argtypes: [],
    //   arguments: [memberAddress, epoch_seven.toString()]
    // }
  ]

    const taxCount = arrCollectTax.length

    const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
      vname: "params",
      type: `List ${bankAddress}.TaxParam`,
      value: arrCollectTax
    }], 0, false, false)

    console.log("txCollectTax id: test max depth limit for CollectTax transition ", txCollectTax.id)
    expect(txCollectTax.status).toEqual(3)
    expect(txCollectTax.receipt.success).toEqual(false)
  })
})