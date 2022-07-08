const fs = require("fs");
const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { deployContract } = require("../../deploy");
const { default: BigNumber } = require("bignumber.js");
const { callContract } = require("../../call");
const { useKey, zilliqa } = require("../../zilliqa");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const randomAddress = "0xd793f378a925b9f0d3c4b6ee544d31c707899386"
const ONE_HUNY = new BigNumber(1).shiftedBy(12);

const getPrivateKey = (key = "PRIVATE_KEY") => {
  const privateKey = process.env[key];
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided - ' + key)
  }
  return privateKey;
}

const deployHuny = async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/tbm-v2/Huny.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'name',
      type: 'String',
      value: `Huny Token`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: "HUNY",
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: "12",
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: "0",
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
  ]

  console.info(`Deploying Huny...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
}

const deployZilswap = async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/ZilSwapV1.1.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'initial_fee',
      type: 'Uint256',
      value: "200",
    },
  ]

  console.info(`Deploying ZilSwap...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
}

const deployRefinery = async ({
  hunyAddress,
}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const { result: blockHeight } = await zilliqa.blockchain.getNumTxBlocks();
  const code = (await fs.promises.readFile('./src/tbm-v2/Refinery.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: address,
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: hunyAddress,
    },
  ]

  console.info(`Deploying Refinery...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
}

const deployHive = async ({
  hunyAddress,
  zilswapAddress,
  refineryAddress,
}) => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey)
  const { result: blockHeight } = await zilliqa.blockchain.getNumTxBlocks();
  const code = (await fs.promises.readFile('./src/tbm-v2/MagicHiveV2.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: address,
    },
    {
      vname: 'initial_refinery',
      type: 'ByStr20',
      value: refineryAddress,
    },
    {
      vname: 'reward_start_block',
      type: 'BNum',
      value: blockHeight ?? "100",
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: hunyAddress,
    },
    {
      vname: 'zilswap_contract',
      type: 'ByStr20',
      value: zilswapAddress,
    },
  ]

  console.info(`Deploying Hive...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
}

async function deployBankAuthority({
  hiveAddress,
  hunyAddress,
  initialEpochNumber,
}) {
  const privateKey = getPrivateKey();

  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/tbm-v2/BankAuthority.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'initial_epoch_number',
      type: 'Uint32',
      value: initialEpochNumber.toString(),
    },
    {
      vname: 'initial_hive',
      type: 'ByStr20',
      value: `${hiveAddress}`,
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: `${hunyAddress}`,
    },
  ]

  console.info(`Deploying BankAuthority...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
};

async function deployGuildBank({
  authorityAddress,
  initialEpochNumber,
  initialMembers = [],
}) {
  const privateKey = getPrivateKey();

  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/tbm-v2/GuildBank.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'bank_authority',
      type: 'ByStr20',
      value: `${authorityAddress}`,
    },
    {
      vname: 'initial_joining_fee',
      type: 'List Uint128',
      value: [
        ONE_HUNY.toString(10), // initial amount
        ONE_HUNY.toString(10), // inflation amount
        "50", // captain allocation bps
        "10", // officer allocation bps
      ],
    },
    {
      vname: 'initial_weekly_tax',
      type: 'List Uint128',
      value: [
        ONE_HUNY.toString(10), // initial amount
        ONE_HUNY.toString(10), // inflation amount
        "50", // captain allocation bps
        "10", // officer allocation bps
      ],
    },
    {
      vname: 'initial_epoch',
      type: 'Uint32',
      value: initialEpochNumber.toString(),
    },
    {
      vname: 'initial_control_mode_power',
      type: 'Uint32',
      value: '3',
    },
    {
      vname: 'initial_members',
      type: 'List ByStr20',
      value: initialMembers,
    },
    {
      vname: 'initial_officers',
      type: 'List ByStr20',
      value: initialMembers,
    },
  ]

  console.info(`Deploying GuildBank...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
};

(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  const hunyContract = await deployHuny();
  const hunyAddress = hunyContract.address.toLowerCase();

  const zilswapContract = await deployZilswap();
  const zilswapAddress = zilswapContract.address;

  const refineryContract = await deployRefinery({ hunyAddress });
  const refineryAddress = refineryContract.address.toLowerCase();

  const hiveContract = await deployHive({ hunyAddress, zilswapAddress, refineryAddress });
  const hiveAddress = hiveContract.address.toLowerCase();

  const memberPrivateKey = getPrivateKey("PRIVATE_KEY_MEMBER");
  const memberAddress = getAddressFromPrivateKey(memberPrivateKey).toLowerCase();

  const initialEpochNumber = 1;
  const newEpochNumber = 2;
  const authorityContract = await deployBankAuthority({ initialEpochNumber, hiveAddress, hunyAddress });
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: newEpochNumber.toString(),
  }], 0, false, false)
  console.log("set epoch number tx", txSetEpochNumber.id)

  const initialMembers = [memberAddress];
  const bankContract = await deployGuildBank({ initialMembers, initialEpochNumber: newEpochNumber, authorityAddress: authorityContract.address });
  const bankAddress = bankContract.address.toLowerCase();

  console.log("epoch", (await zilliqa.blockchain.getSmartContractSubState(bankAddress, "last_updated_epoch")).result.last_updated_epoch);
  const txSetEpochNumberAgain = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: (newEpochNumber + 1).toString(),
  }], 0, false, false)
  console.log("set epoch number again tx", txSetEpochNumberAgain.id)
  console.log("epoch", (await zilliqa.blockchain.getSmartContractSubState(bankAddress, "last_updated_epoch")).result.last_updated_epoch);

  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);
  console.log("add minter", txAddMinter.id)

  const txMintCaptain = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)
  console.log("mint", txMintCaptain.id)

  const txMintMember = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: memberAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)
  console.log("mint", txMintMember.id)

  const txAllowanceCaptain = await callContract(privateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)
  console.log("allowance", txAllowanceCaptain.id)

  const txAllowanceMember = await callContract(memberPrivateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)
  console.log("allowance", txAllowanceMember.id)

  const txRemoveMember = await callContract(privateKey, bankContract, "RemoveMember", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)
  console.log("remove member", txRemoveMember.id);

  const txApplyMembership = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)
  console.log("apply membership", txApplyMembership.id)

  const txRejectApplication = await callContract(privateKey, bankContract, "RejectJoinRequest", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)
  console.log("reject application", txRejectApplication.id)

  const txApplyMembershipAgain = await callContract(memberPrivateKey, bankContract, "ApplyForMembership", [], 0, false, false)
  console.log("apply membership again", txApplyMembershipAgain.id)

  const txApproveMember = await callContract(privateKey, bankContract, "ApproveAndReceiveJoiningFee", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)
  console.log("approve member", txApproveMember.id)

  const txSetEpochNumberAfter = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: (newEpochNumber + 2).toString(),
  }], 0, false, false)
  console.log("set epoch number after member join tx", txSetEpochNumberAfter.id)

  // test updating multiple epochs
  const txSetEpochNumberAfterAgain = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: (newEpochNumber + 3).toString(),
  }], 0, false, false)
  console.log("set epoch number after member join again tx", txSetEpochNumberAfterAgain.id)

  const txInitiateWithdrawTx = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.WithdrawTxParams`,
      argtypes: [],
      arguments: [address, hunyAddress, new BigNumber(0.1).shiftedBy(12).toString(10)]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New withdraw request",
  }], 0, false, false)
  console.log("initiate withdraw tx", txInitiateWithdrawTx.id)

  console.log("epoch", (await zilliqa.blockchain.getSmartContractSubState(bankAddress, "last_updated_epoch")).result.last_updated_epoch);
  const txInitiateUpdateGuildSettingsTx = await callContract(privateKey, bankContract, "InitiateTx", [{
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
          constructor: `${bankAddress}.CaptainAndTwoOfficers`,
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
  console.log("initiate update settings tx", txInitiateUpdateGuildSettingsTx.id)

  const txInitiateWithdrawAgainTx = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.WithdrawTxParams`,
      argtypes: [],
      arguments: [address, hunyAddress, new BigNumber(0.5).shiftedBy(12).toString(10)]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New withdraw request",
  }], 0, false, false)
  console.log("initiate withdraw again tx", txInitiateWithdrawAgainTx.id)

  const txCancelTx = await callContract(privateKey, bankContract, "CancelTx", [], 0, false, false)
  console.log("initiate cancel tx", txCancelTx.id)

  const txMakeHunyDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: ONE_HUNY.toString(10),
  }], 0, false, false)
  console.log("make donation huny tx", txMakeHunyDonation.id)

  const txMakeZilDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: ZERO_ADDRESS,
  }, {
    vname: "amount",
    type: "Uint128",
    value: new BigNumber(1).shiftedBy(12).toString(10), // 1 ZIL
  }], 1, false, false)
  console.log("make donation zil tx", txMakeZilDonation.id)

  console.log("epoch", (await zilliqa.blockchain.getSmartContractSubState(bankAddress, "last_updated_epoch")).result.last_updated_epoch);
  const txCollectTax = await callContract(privateKey, bankContract, "CollectTax", [{
    vname: "params",
    type: `List ${bankAddress}.TaxParam`,
    value: [{
      constructor: `${bankAddress}.TaxParam`,
      argtypes: [],
      arguments: [memberAddress, (newEpochNumber + 2).toString()]
    }],
  }], 0, false, false)
  console.log("collect tax tx", txCollectTax.id)

  const txPromote = await callContract(privateKey, bankContract, "PromoteMember", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)
  console.log("promote tx", txPromote.id)

  const txDemote = await callContract(privateKey, bankContract, "DemoteMember", [{
    vname: "member",
    type: "ByStr20",
    value: memberAddress,
  }], 0, false, false)
  console.log("demote tx", txDemote.id)

  const txLeaveGuild = await callContract(memberPrivateKey, bankContract, "LeaveGuild", [], 0, false, false)
  console.log("demote tx", txLeaveGuild.id)

  // will not work without adding liquidity to hive.
  const txClaimHive = await callContract(privateKey, bankContract, "ClaimHive", [], 0, false, false)
  console.log("claim hive tx", txClaimHive.id)

  const txMigrate = await callContract(privateKey, authorityContract, "MigrateBank", [{
    vname: "bank",
    type: "ByStr20",
    value: bankAddress,
  }, {
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "recipient",
    type: "ByStr20",
    value: address,
  }], 0, false, false)
  console.log("migrate huny tx", txMigrate.id)
})().catch(console.error).finally(() => process.exit(0));
