const fs = require("fs");
const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { deployContract } = require("../../deploy");
const { default: BigNumber } = require("bignumber.js");
const { callContract } = require("../../call");
const { useKey, zilliqa } = require("../../zilliqa");

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

async function deployRecovery({
  refineryAddress,
  hunyAddress,
  oracleAddress,
}) {
  const privateKey = getPrivateKey();

  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/tbm-v2/HUG3Recovery.scilla')).toString()
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
      vname: 'initial_oracle',
      type: 'ByStr20',
      value: `${oracleAddress}`,
    },
    {
      vname: 'initial_refinery',
      type: 'ByStr20',
      value: refineryAddress,
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: hunyAddress,
    },
  ]

  console.info(`Deploying Recovery...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
};

(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  const hunyContract = await deployHuny();
  const hunyAddress = hunyContract.address.toLowerCase();

  const refineryContract = await deployRefinery({ hunyAddress });
  const refineryAddress = refineryContract.address.toLowerCase();

  const memberPrivateKey = getPrivateKey("PRIVATE_KEY_MEMBER");
  const memberAddress = getAddressFromPrivateKey(memberPrivateKey).toLowerCase();

  const recoveryContract = await deployRecovery({ oracleAddress: address, refineryAddress, hunyAddress });
  const recoveryAddress = recoveryContract.address.toLowerCase();

  const txAddHarvester = await callContract(privateKey, refineryContract, "AddHarvester", [{
    vname: 'address',
    type: 'ByStr20',
    value: recoveryAddress,
  }, {
    vname: 'required_refinement_percentage',
    type: 'Uint128',
    value: "100",
  }, {
    vname: 'blocks_to_reduce_required_refinement',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(8).toString(10),
  }], 0, false, false);
  console.log("add harvester", txAddHarvester.id)

  const txAddMinterRecovery = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: recoveryAddress,
  }], 0, false, false);
  console.log("add minter recovery", txAddMinterRecovery.id)

  const txAddMinterRefinery = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: refineryAddress,
  }], 0, false, false);
  console.log("add minter refinery", txAddMinterRefinery.id)

  const fakeHarvestTxHash1 = txAddMinterRefinery.id;
  const fakeHarvestTxHash2 = txAddMinterRecovery.id;

  const txAddRecoveredHuny1 = await callContract(privateKey, recoveryContract, "AddRecoveredHuny", [{
    vname: "pot",
    type: `${recoveryAddress}.RecoveredHuny`,
    value: {
      constructor: `${recoveryAddress}.RecoveredHuny`,
      argtypes: [],
      arguments: [
        memberAddress,
        `0x${fakeHarvestTxHash1}`,
        ONE_HUNY.toString(10),
        ONE_HUNY.toString(10),
      ],
    },
  }], 0, false, false)
  console.log("add recovered huny 1", txAddRecoveredHuny1.id);

  const txAddRecoveredHuny2 = await callContract(privateKey, recoveryContract, "AddRecoveredHuny", [{
    vname: "pot",
    type: `${recoveryAddress}.RecoveredHuny`,
    value: {
      constructor: `${recoveryAddress}.RecoveredHuny`,
      argtypes: [],
      arguments: [
        memberAddress,
        `0x${fakeHarvestTxHash2}`,
        ONE_HUNY.toString(10),
        ONE_HUNY.toString(10),
      ],
    },
  }], 0, false, false)
  console.log("add recovered huny 2", txAddRecoveredHuny2.id);

  const txClaimPot = await callContract(memberPrivateKey, recoveryContract, "RecoverHuny", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: memberAddress,
  }], 0, false, false)
  console.log("recover huny", txClaimPot.id)
})().catch(console.error).finally(() => process.exit(0));
