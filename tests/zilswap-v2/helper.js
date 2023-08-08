const fs = require("fs");
const Crypto = require("crypto");
const { compress } = require("../../scripts/compile");
const { callContract } = require('../../scripts/call.js')
const { deployZilswapV2Pool, deployContract } = require('../../scripts/deploy.js');

const getContractCodeHash = (file) => {
  const code = fs.readFileSync(file).toString()
  const compressedCode = compress(code)
  const buffer = Buffer.from(compressedCode)
  return "0x" + Crypto.createHash("sha256").update(buffer).digest("hex");
};

const getPoolContractCodeHash = async (owner) => {
  pool = (await deployZilswapV2Pool(owner.key))[0]

  // Deploy CodeHash contract
  const [codeHashContract] = await deployContract(
    owner.key,
    './src/zilswap-v2/TestCodeHash.scilla',
    [{
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    }])

  // Call GetCodeHash transition
  const txGetCodeHash = await callContract(
    owner.key, codeHashContract,
    'foo',
    [{
      vname: 'addr',
      type: 'ByStr20',
      value: `${pool.address.toLowerCase()}`,
    }],
    0, false, false
  )
  return txGetCodeHash.receipt.event_logs.find(e => e._eventname === "Success")?.params?.[0]?.value;
}

module.exports = {
  getContractCodeHash,
  getPoolContractCodeHash
};
