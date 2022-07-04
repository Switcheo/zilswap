const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ONE_HUNY, getPrivateKey, initialEpochNumber, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank } = require("../../../scripts/zolar/bank/deploy");
const {callContract} = require("../../../scripts/call")
const { getBalanceFromStates } = require("./helper")

let privateKey, address, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

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

async function migrateToken(tokenAddress, recipientAddress) {
  const txMigrate = await callContract(privateKey, authorityContract, "MigrateBank", [ {
    vname: "bank",
    type: "ByStr20",
    value: bankAddress,
  }, {
    vname: "token",
    type: "ByStr20",
    value: tokenAddress,
  }, {
    vname: "recipient",
    type: "ByStr20",
    value: recipientAddress,
  }], 0, false, false)
}

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  
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
})

test('migrate 1 token', async () => {
  const txMintAndDonate = await mintAndDonate(hunyContract) 
  const hunyContractStateBeforeTx = await hunyContract.getState()
  const bankContractStateBeforeTx = await bankContract.getState()
  
  const txMigrate = await migrateToken(hunyAddress, address)

  const hunyContractStateAfterTx = await hunyContract.getState()
  const bankContractStateAfterTx = await bankContract.getState()

  // check huny deduction for bank; huny increment for captain
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const migratedFromBank = bankBalanceBeforeTx - bankBalanceAfterTx
  const migratedToCaptain = captainBalanceAfterTx - captainBalanceBeforeTx

  expect(migratedFromBank.toString()).toEqual(ONE_HUNY.toString(10))
  expect(migratedToCaptain.toString()).toEqual(ONE_HUNY.toString(10))

  // check removal of token addr from bank contract
  expect(bankContractStateBeforeTx.tokens_held).toHaveProperty(hunyAddress)
  expect(bankContractStateAfterTx.tokens_held).not.toHaveProperty(hunyAddress)
})

test('migrate 10 tokens', async () => {
  const tokens = []

  for (let i = 0; i < 1; i++) {
    const tokenContract = await deployHuny()
    const txMintAndDonate = await mintAndDonate(tokenContract)
    tokens.push(tokenContract) 
  }

  const tokenContractStatesBeforeTx = await Promise.all(tokens.map(async token => await token.getState()))
  const bankContractStateBeforeTx = await bankContract.getState()
  
  // check bankContract.tokens_held is populated
  expect(Object.keys(bankContractStateBeforeTx.tokens_held).length).toEqual(tokens.length)
  expect(tokens.every(token => token.address.toLowerCase() in bankContractStateBeforeTx.tokens_held)).toEqual(true)
  
  for (let i = 0; i < tokens.length; i++) {
    const tokenContract = tokens[i]
    const tokenAddress = tokenContract.address.toLowerCase()
    const tokenContractStateBeforeTx = tokenContractStatesBeforeTx[i]

    const txMigrate = await migrateToken(tokenAddress, address)
    const tokenContractStateAfterTx = await tokenContract.getState()
    const bankContractStateAfterTx = await bankContract.getState()

    // check huny deduction for bank; huny increment for captain
    const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, tokenContractStateBeforeTx, tokenContractStateAfterTx)
    const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, tokenContractStateBeforeTx, tokenContractStateAfterTx)
    const migratedFromBank = bankBalanceBeforeTx - bankBalanceAfterTx
    const migratedToCaptain = captainBalanceAfterTx - captainBalanceBeforeTx

    // check huny deduction for bank; huny increment for captain
    expect(migratedFromBank.toString()).toEqual(ONE_HUNY.toString(10))
    expect(migratedToCaptain.toString()).toEqual(ONE_HUNY.toString(10))

    // check removal of token addr from bank contract
    expect(bankContractStateBeforeTx.tokens_held).toHaveProperty(tokenAddress)
    expect(bankContractStateAfterTx.tokens_held).not.toHaveProperty(tokenAddress)
  }
})