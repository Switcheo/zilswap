const fs = require("fs");
const Crypto = require("crypto");
const { compress } = require("../../scripts/compile");


const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const getContractCodeHash = (file) => {
  const code = fs.readFileSync(file).toString()
  const compressedCode = compress(code)
  const buffer = Buffer.from(compressedCode)
  return "0x" + Crypto.createHash("sha256").update(buffer).digest("hex");
};

module.exports = {
  ZERO_ADDRESS,
  getContractCodeHash,
};
