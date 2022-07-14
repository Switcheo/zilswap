const fs = require("fs");
const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { deployContract } = require("../../deploy");
const { default: BigNumber } = require("bignumber.js");
const { callContract } = require("../../call");

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

async function deployTbmFeeDistributor({
  hunyAddress,
}) {
  const privateKey = getPrivateKey();

  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/tbm-v2/TbmFeeDistributor.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'token_contract',
      type: 'ByStr20',
      value: `${hunyAddress}`,
    },
    {
      vname: 'init_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
  ]

  console.info(`Deploying TbmFeeDistributor...`)
  const [contract] = await deployContract(privateKey, code, init)

  return contract;
};

(async () => {
  const privateKey = getPrivateKey();
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  const hunyContract = await deployHuny();
  const hunyAddress = hunyContract.address.toLowerCase();

  const tbmFeeDistributorContract = await deployTbmFeeDistributor({ hunyAddress });
  const tbmFeeDistributorAddress = tbmFeeDistributorContract.address.toLowerCase();

  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);
  console.log("add minter", txAddMinter.id)

  const txMintSelf = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(6 + 12),
  }], 0, false, false)
  console.log("mint", txMintSelf.id)

  const txTransferDistributor = await callContract(privateKey, hunyContract, "Transfer", [{
    vname: 'to',
    type: 'ByStr20',
    value: tbmFeeDistributorAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(6 + 12),
  }], 0, false, false)
  console.log("mint", txTransferDistributor.id)

  const root = "0x6913a68bcddb84c0bd1f73cfe2c0d12e2362ccf7321c8627771af7d6f8cbb147"
  const proof = [
    "0xc3db0b62c8f1ce2e7337bd7897501098320393e8bc5691e42f427a3e8227631f",
    "0x03e33d7c2fec1b6293ccc51535ad276c103e445991923c7339b3d729a4875ca4",
    "0x5533ae4aff1be94c74f6ed7aabebaa8fb46925bda2f5e360244b3cd794c13b9d",
    "0xc1a2ae83bb1fe0e7798ae3f09071c0d607b3690c4f3241648bdb55c90da290b6",
    "0xcbb2ed3372b6c208f2c63c0f30c0105037049368fad990c2387da645fb74d0ca",
    "0xb69adb18e52b476b4db52a88b871fa77ed836ad0af00d34bcf2461f09b6e207a",
    "0x0a43e42ce523c42ea6f105857f0c69430c0e0181a490bcd463238e26266e90b4",
    "0x97abc4d2256d75331c0188fa20d122e2f4b383944c48a5e6f710ecf438dbcd44",
    "0x8909f2aab8b8e9fc91b468a0f06d87bf5c2a402685a7c0db772461bb35ed5523",
    "0x6bd02b28793401cb433e4d118b7aaabd3bfc98973205e121467105a0869bdb92",
    "0xddb61a62f0b102b4ab8060f7053d93784dccfd6e91c507af9c387b6a049c28c8"
  ];
  const epochNumber = "0";
  const recipientAddress = "0x0007a8f9c4abe135a717d2eeab3af16799b4d42a";
  const amount = "874861852123";

  const txSetMerkleRoot = await callContract(privateKey, tbmFeeDistributorContract, "SetMerkleRoot", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epochNumber,
  }, {
    vname: "merkle_root",
    type: "ByStr32",
    value: root,
  }], 0, false, false)
  console.log("set merkle root tx", txSetMerkleRoot.id)

  const txClaimLeaf = await callContract(privateKey, tbmFeeDistributorContract, "ClaimMulti", [{
      vname: "account",
      type: "ByStr20",
      value: recipientAddress,
    }, {
      vname: "claims",
      type: "List (Pair (Pair Uint32 Uint128) (List ByStr32))",
      value: [{
        constructor: "Pair",
        argtypes: ["Pair Uint32 Uint128", "List ByStr32"],
        arguments: [{
          constructor: "Pair",
          argtypes: ["Uint32", "Uint128"],
          arguments: [epochNumber, amount]
        }, proof]
      }],

    // vname: "claim",
    // type: `${tbmFeeDistributorAddress}.Claim`,
    // value: {
    //   constructor: `${tbmFeeDistributorAddress}.Claim`,
    //   argtypes: [],
    //   arguments: [
    //     epochNumber,
    //     {
    //       constructor: `${tbmFeeDistributorAddress}.DistributionLeaf`,
    //       argtypes: [],
    //       arguments: [recipientAddress, amount],
    //     }, proof,
    //   ],
    // },
  }], 0, false, false)
  console.log("claim leaf tx", txClaimLeaf.id)
})().catch(console.error).finally(() => process.exit(0));
