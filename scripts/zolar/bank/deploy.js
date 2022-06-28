const fs = require("fs");
const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { deployContract } = require("../../deploy");
const { default: BigNumber } = require("bignumber.js");
const { callContract } = require("../../call");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const getPrivateKey = () => {
  const privateKey = process.env.PRIVATE_KEY;
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
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

  console.info(`Deploying GuildBank...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
}

async function deployGuildBank({
  hiveAddress,
  hunyAddress,
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
      vname: 'initial_hive',
      type: 'ByStr20',
      value: `${hiveAddress}`,
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: `${hunyAddress}`,
    },
    {
      vname: 'initial_joining_fee',
      type: 'Uint128',
      value: new BigNumber(1).shiftedBy(12).toString(10),
    },
    {
      vname: 'initial_weekly_tax',
      type: 'Uint128',
      value: new BigNumber(1).shiftedBy(12).toString(10),
    },
    {
      vname: 'initial_control_mode_power',
      type: 'Uint32',
      value: '3',
    },
    {
      vname: 'initial_officers',
      type: 'List ByStr20',
      value: [],
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
  const bankContract = await deployGuildBank({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address });
  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);
  console.log("add minter", txAddMinter.id)

  const txMint = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)
  console.log("mint", txMint.id)

  const bankAddress = bankContract.address.toLowerCase();

  const txAllowance = await callContract(privateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)
  console.log("allowance", txAllowance.id)

  const txPayJoiningFee = await callContract(privateKey, bankContract, "PayJoiningFee", [], 0, false, false)
  console.log("pay joining fee", txPayJoiningFee.id)

  const txInitiateWithdrawTx = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.WithdrawTxParams`,
      argtypes: [],
      arguments: [address, hunyAddress, new BigNumber(1).shiftedBy(12).toString(10)]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New withdraw request",
  }], 0, false, false)
  console.log("initiate withdraw tx", txInitiateWithdrawTx.id)

  const txInitiateUpdateGuildSettings = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.UpdateConfigTxParams`,
      argtypes: [],
      arguments: [{
        constructor: `${bankAddress}.GuildBankSettings`,
        argtypes: [],
        arguments: [
          new BigNumber(1).shiftedBy(12).toString(10),
          new BigNumber(1).shiftedBy(12).toString(10), {
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
  console.log("initiate update settings tx", txInitiateUpdateGuildSettings.id)
})().catch(console.error).finally(() => process.exit(0));
