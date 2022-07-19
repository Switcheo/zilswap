const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, generateErrorMsg } = require("./helper")

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

describe('throws error when initial_epoch > current_epoch', () => {
  test('deploy contract with initial_epoch > current_epoch', async () => {
    const invalidEpoch = initialEpochNumber + 1
    bankContract = await deployGuildBank({ initialMembers: [address], initialEpochNumber: invalidEpoch, authorityAddress })
    bankAddress = bankContract.address.toLowerCase()
    
    const state = await bankContract.getState()
    expect(state.last_updated_epoch).toEqual(invalidEpoch.toString())
  })

  test('throws error when approving join request', async () => {
    const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)
    
    const txApproveMember = await callContract(privateKey, bankContract, "ApproveAndReceiveJoiningFee", [{
      vname: "member",
      type: "ByStr20",
      value: memberAddress,
    }], 0, false, false)

    expect(txApproveMember.status).toEqual(3)
    expect(txApproveMember.receipt.exceptions[0].message).toEqual(generateErrorMsg(24)) // throws CodeInvalidEpoch
    expect(txApproveMember.receipt.success).toEqual(false)
  })  
})