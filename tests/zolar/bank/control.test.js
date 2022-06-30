const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ZERO_ADDRESS, ONE_HUNY, getPrivateKey, newEpochNumber, deployHuny, deployBankAuthority, deployGuildBank } = require("../../../scripts/zolar/bank/deploy");
const {callContract} = require('../../../scripts/call')
const { generateErrorMsg, generatePendingTx } = require("./helper")

let privateKey, memberPrivateKey, address, memberAddress, hunyContract, authorityContract, bankContract, hunyAddress, bankAddress

async function initiateUpdateControlModeTx (initiator, controlMode) {
  const txInitiateUpdateControlModeTx = await callContract(initiator, bankContract, "InitiateTx", [{
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
            newEpochNumber.toString(), // first epoch
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
            ONE_HUNY.toString(10), // initial amount
            ONE_HUNY.toString(10), // inflation
            newEpochNumber.toString(), // first epoch
            {
              constructor: `${bankAddress}.FeeAllocation`,
              argtypes: [],
              arguments: ["50", "10"],
            }, // fee allocation
          ],
        }, {
          constructor: `${bankAddress}.${controlMode}`,
          argtypes: [],
          arguments: [],
        },
        ],
      }],
    },
  }, {
    vname: "message",
    type: "String",
    value: "Change control mode to Captain + two Officers",
  }], 0, false, false)
  
  return txInitiateUpdateControlModeTx
}

beforeAll(async () => {
  privateKey = getPrivateKey();
  memberPrivateKey = getPrivateKey("PRIVATE_KEY_MEMBER")
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  memberAddress = getAddressFromPrivateKey(memberPrivateKey).toLowerCase();
  
  hunyContract = await deployHuny()
  authorityContract = await deployBankAuthority({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address });
  bankContract = await deployGuildBank({ authorityAddress: authorityContract.address })

  hunyAddress = hunyContract.address.toLowerCase()
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
    value: bankContract.address.toLowerCase(),
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)

  const txApproveMember = await callContract(privateKey, bankContract, "ApproveMember", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)

  const txJoinAndPayJoiningFee = await callContract(memberPrivateKey, bankContract, "JoinAndPayJoiningFee", [], 0, false, false)
})

afterEach(async () => {
  // cancel pending tx
  const txCancelPendingTx = await callContract(privateKey, bankContract, "CancelTx", [], 0, false, false)
})

test('sign tx with officer when controlMode = CaptainOnly', async () => {
  // promote member to officer
  // officer initiates update guild setting tx
  // tx is pending; no change in controlMode
  const txPromote = await callContract(privateKey, bankContract, "PromoteMember", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)

  const bankContractStateBeforeTx = await bankContract.getState()
  const txInitiateUpdateControlMode4Tx = await initiateUpdateControlModeTx(memberPrivateKey, 'CaptainAndOneOfficer')
  const bankContractStateAfterTx = await bankContract.getState()

  expect(bankContractStateBeforeTx.pending_tx.arguments.length).toEqual(0)
  expect(bankContractStateBeforeTx.pending_tx.arguments[0]).toMatchObject(generatePendingTx(bankTx, signer))
  expect(bankContractStateBeforeTx.control_mode.constructor).toEqual(bankContractStateAfterTx.control_mode.constructor)
})

test('sign tx with captain after updating controlMode = CaptainAndOneOfficer', async () => {
  // captain initiates update guild setting tx (controlMode = CaptainAndOneOfficer); tx approved
  // captain initiates update guild setting tx (controlMode = CaptainOnly); tx is pending
  // officer signs pending tx; tx approved
  const txInitiateUpdateControlMode4Tx = await initiateUpdateControlModeTx(privateKey, 'CaptainAndOneOfficer')
  const txInitiateUpdateControlMode3Tx = await initiateUpdateControlModeTx(privateKey, 'CaptainOnly')

  const bankContractStateBeforeTx = await bankState.getState()
  expect(bankContractStateBeforeTx.)
  expect(bankContractStateBeforeTx.control_mode.constructor).toEqual(`${bankAddress}.CaptainAndOneOfficer`)

  const txSignPendingTx = await callContract(memberPrivateKey, bankContract, "SignTx", [], 0, false, false)
})

test('sign tx with member', async () => {
  // officer initiates update guild setting tx (controlMode = CaptainAndOneOfficer); tx is pending
  // captain demotes officer; pending tx resets
  // member (demoted officer) attempts to signs tx; throw CodeNotCaptainOrOfficer
  const txInitiateUpdateControlMode4Tx = await initiateUpdateControlModeTx(memberPrivateKey, 'CaptainAndOneOfficer')
  const txDemote = await callContract(privateKey, bankContract, "DemoteMember", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)
  const txSignPendingTx = await callContract(memberPrivateKey, bankContract, "SignTx", [], 0, false, false)
})


