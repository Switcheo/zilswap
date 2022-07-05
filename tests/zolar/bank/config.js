const { default: BigNumber } = require("bignumber.js");

exports.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
exports.randomAddress = "0xd793f378a925b9f0d3c4b6ee544d31c707899386";
exports.ONE_HUNY = new BigNumber(1).shiftedBy(12);
exports.initialEpochNumber = 1;
exports.newEpochNumber = 2;
