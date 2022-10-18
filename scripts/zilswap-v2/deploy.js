const { deployContract } = require("../deploy");

const getPrivateKey = (key = "PRIVATE_KEY") => {
  const privateKey = process.env[key];
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided - ' + key)
  }
  return privateKey;
}

const deployTestContract = async () => {
  const privateKey = getPrivateKey();
  const file = './src/zilswap-v2/TestCodeHash.scilla'
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
  ]

  console.info(`Deploying _codehash test contract...`)
  const [contract] = await deployContract(privateKey, file, init)

  return contract;
}

(async () => {
  const privateKey = getPrivateKey();
  const contract = await deployTestContract();
  console.log("contract address", contract.address.toLowerCase());
})().catch(console.error).finally(() => process.exit(0));
