const fs = require("fs");
const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { deployContract } = require("../../../scripts/deploy");
const { zilliqa } = require("../../../scripts/zilliqa");
const { ZERO_ADDRESS, ONE_HUNY } = require("./config");

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

const deployHive = async ({
  hunyAddress,
  zilswapAddress,
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
      value: ZERO_ADDRESS,
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

const deployBankAuthority = async ({
  hiveAddress,
  hunyAddress,
  initialEpochNumber,
})=> {
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


const deployGuildBank = async ({
  authorityAddress,
  initialEpochNumber,
  initialMembers = [],
  initialOfficers = [],
}) => {
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
      value: initialOfficers,
    },
  ]

  console.info(`Deploying GuildBank...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
};

const generateFee = (bankAddress, initialAmt, inflationAmt, currentEpoch, captainAlloc, officerAlloc) => {
  return {
    argtypes: [],
    arguments: [
      initialAmt,
      inflationAmt,
      currentEpoch,
      {
        argtypes: [],
        arguments: [
          captainAlloc,
          officerAlloc
        ],
        constructor: `${bankAddress}.FeeAllocation`
      }
    ],
    constructor: `${bankAddress}.Fee`
  }
}

const getBalanceFromStates = (address, stateBeforeTx, stateAfterTx) => {
  const balanceBeforeTx = parseInt(stateBeforeTx.balances[address] ?? "0" )
  const balanceAfterTx = parseInt(stateAfterTx.balances[address] ?? "0")

  return [balanceBeforeTx, balanceAfterTx]
}

const generateErrorMsg = (errorCode) => {
  return `Exception thrown: (Message [(_exception : (String "Error")) ; (code : (Int32 -${errorCode}))])`
}

const getInflatedFeeAmt = (initialAmt, inflation, initialEpoch, currentEpoch) => {
  return initialAmt.plus(inflation * (currentEpoch - initialEpoch))
}

exports.getPrivateKey = getPrivateKey
exports.deployHuny = deployHuny
exports.deployZilswap = deployZilswap
exports.deployHive = deployHive
exports.deployBankAuthority = deployBankAuthority
exports.deployGuildBank = deployGuildBank
exports.generateFee = generateFee
exports.getBalanceFromStates = getBalanceFromStates
exports.generateErrorMsg = generateErrorMsg
exports.getInflatedFeeAmt = getInflatedFeeAmt