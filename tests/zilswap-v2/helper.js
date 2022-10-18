const fs = require("fs");
const Crypto = require("crypto");

const getContractCodeHash = (file) => {
  return "0x" + Crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
};

module.exports = {
  getContractCodeHash,
};
