const fs = require("fs");
const Crypto = require("crypto");
const { compress } = require("../../scripts/compile");

const getContractCodeHash = (file) => {
  const code = fs.readFileSync(file).toString()
  const compressedFile = compress(code)
  const buffer = Buffer.from(compressedFile)
  return "0x" + Crypto.createHash("sha256").update(buffer).digest("hex");
};

module.exports = {
  getContractCodeHash,
};
