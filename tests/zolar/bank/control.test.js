const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, generateErrorMsg } = require("./helper")

let privateKey, memberPrivateKey, address, memberAddress, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

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
    value: `Change control mode to ${controlMode}`,
  }], 0, false, false)
  
  return txInitiateUpdateControlModeTx
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
})

afterEach(async () => {
  // cancel pending tx
  const txCancelPendingTx = await callContract(privateKey, bankContract, "CancelTx", [], 0, false, false)
})

test('sign tx with officer when controlMode = CaptainOnly', async () => {
  // officer initiates update guild setting tx
  // tx is pending; no change in controlMode
  const bankContractStateBeforeTx = await bankContract.getState()
  const txInitiateUpdateControlMode4Tx = await initiateUpdateControlModeTx(memberPrivateKey, 'CaptainAndOneOfficer')
  const bankContractStateAfterTx = await bankContract.getState()

  expect(bankContractStateBeforeTx.pending_tx.arguments.length).toEqual(0)
  expect(bankContractStateAfterTx.pending_tx.arguments.length).toEqual(1)
  expect(bankContractStateBeforeTx.control_mode.constructor).toEqual(bankContractStateAfterTx.control_mode.constructor)
})

test('sign tx with captain after updating controlMode = CaptainAndOneOfficer', async () => {
  // captain initiates update guild setting tx (controlMode = CaptainAndOneOfficer); tx approved
  // captain initiates update guild setting tx (controlMode = CaptainOnly); tx is pending
  // officer signs pending tx; tx approved
  const txInitiateUpdateControlMode4Tx = await initiateUpdateControlModeTx(privateKey, 'CaptainAndOneOfficer')
  const txInitiateUpdateControlMode3Tx = await initiateUpdateControlModeTx(privateKey, 'CaptainOnly')
  const bankContractStateBeforeTx = await bankContract.getState()
  
  expect(bankContractStateBeforeTx.control_mode.constructor).toEqual(`${bankAddress}.CaptainAndOneOfficer`)
  expect(bankContractStateBeforeTx.pending_tx.arguments.length).toEqual(1)

  const txOfficerSignPendingTx = await callContract(memberPrivateKey, bankContract, "SignTx", [], 0, false, false)
  const bankContractStateAfterTx = await bankContract.getState()
  
  expect(bankContractStateAfterTx.control_mode.constructor).toEqual(`${bankAddress}.CaptainOnly`)
  expect(bankContractStateAfterTx.pending_tx.arguments.length).toEqual(0)
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
  const bankContractStateBeforeTx = await bankContract.getState()
  
  expect(bankContractStateBeforeTx.control_mode.constructor).toEqual(`${bankAddress}.CaptainOnly`)
  expect(bankContractStateBeforeTx.pending_tx.arguments.length).toEqual(1)

  const txSignPendingTx = await callContract(memberPrivateKey, bankContract, "SignTx", [], 0, false, false)

  expect(txSignPendingTx.status).toEqual(3)
  expect(txSignPendingTx.receipt.exceptions[0].message).toEqual(generateErrorMsg(21)) // throws CodeNotCaptainOrOfficer
  expect(txSignPendingTx.receipt.success).toEqual(false)
})


