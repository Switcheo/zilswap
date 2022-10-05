require("dotenv").config();
const fs = require("fs");
const { getAddressFromPrivateKey, getPubKeyFromPrivateKey, schnorr } = require("@zilliqa-js/crypto");
const { TxStatus, Transaction } = require("@zilliqa-js/account");
const { Zilliqa, units, bytes, BN, Long } = require("@zilliqa-js/zilliqa");
const { default: BigNumber } = require("bignumber.js");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const getPrivateKey = (key = "PRIVATE_KEY") => {
  const privateKey = process.env[key];
  if (!privateKey || privateKey === '') {
    throw new Error(`private key not found:${key}`);
  }
  return privateKey;
}

const getDefaultAccount = () => {
  const key = getPrivateKey();
  const address = getAddressFromPrivateKey(key);
  return { key, address };
}

const getNetwork = () => {
  const network = (process.env.NETWORK || '').toLowerCase()
  switch (network) {
    case 'testnet':
    case 'mainnet':
      return network
    default:
      return 'localhost'
  }
}

const getRpcUrl = (network = getNetwork()) => {
  switch (network) {
    case "mainnet": return "https://api.zilliqa.com/"
    case "testnet": return "https://dev-api.zilliqa.com/"
    case "localhost": return "http://localhost:5555/"
    default: throw new Error(`invalid network:${network}`);
  }
}

const getChainId = (network = getNetwork()) => {
  switch (network) {
    case 'mainnet': return 1;
    case 'testnet': return 333;
    default: return 222;
  }
}

const getTxVersion = (network = getNetwork()) => {
  return bytes.pack(getChainId(network), 1);
}

const zilInstances = {};

const getZilliqaInstance = (privateKey) => {
  let address = "";

  if (privateKey) {
    address = getAddressFromPrivateKey(privateKey).toLowerCase();
  }

  const instance = zilInstances[address];
  if (instance) return instance;

  const rpcUrl = getRpcUrl();
  const zilliqa = new Zilliqa(rpcUrl);

  if (privateKey)
    zilliqa.wallet.addByPrivateKey(privateKey);

  zilInstances[address] = zilliqa;

  return zilliqa;
}

const sendTxs = async (privateKey, txList) => {
  const zilliqa = getZilliqaInstance(privateKey);
  const signedTxList = await zilliqa.wallet.signBatch(txList);

  // send batch transaction
  return await zilliqa.blockchain.createBatchTransaction(signedTxList);
}

const verifyDeployment = (tx) => {
  // Check for txn execution success
  if (!tx.txParams.receipt.success) {
    const errors = tx.txParams.receipt.errors
    const errMsgs = errors
      ? Object.keys(errors).reduce((acc, depth) => {
        const errorMsgList = errors[depth].map(num => TransactionError[num])
        return { ...acc, [depth]: errorMsgList }
      }, {})
      : 'failed to deploy contract!'
    throw new Error(JSON.stringify(errMsgs, null, 2))
  }
}

const transfer = async (privateKey, toAddr, amount) => {
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }
  const zilliqa = getZilliqaInstance(privateKey);
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const tx = await zilliqa.blockchain.createTransaction(
    zilliqa.transactions.new({
      version: getTxVersion(),
      toAddr,
      amount: new BN(units.toQa(amount, units.Units.Zil)),
      gasPrice: new BN(minGasPrice.result),
      gasLimit: Long.fromNumber(80000),
    }, false),
  );

  await nextBlock()

  return tx
}

const createRandomAccount = async (privateKey, initAmount = '10000') => {
  const key = schnorr.generatePrivateKey()
  const address = getAddressFromPrivateKey(key)
  const pubKey = getPubKeyFromPrivateKey(key)

  if (initAmount != '0') await transfer(privateKey, address, initAmount)

  return { key, pubKey, address: address.toLowerCase() }
}

const getDeployTx = async (zilliqa, filepath, init, opts = {}) => {
  let gasPrice = opts.gasPrice;
  if (!gasPrice) {
    const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
    gasPrice = new BN(minGasPrice.result);
  }

  const codeBuffer = await fs.promises.readFile(filepath);
  const deployTx = new Transaction({
    version: getTxVersion(),
    toAddr: ZERO_ADDRESS,
    data: JSON.stringify(init),
    code: codeBuffer.toString(),
    amount: units.toQa(0, units.Units.Zil),
    gasPrice,
    gasLimit: Long.fromNumber(80000),
    nonce: opts.nonce,
  },
    zilliqa.provider,
    TxStatus.Initialised,
    false,
    false
  );

  return deployTx;
}

const getTransitionTx = async (zilliqa, contract, transition, params = [], opts = {}) => {
  let gasPrice = opts.gasPrice;
  if (!gasPrice) {
    const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
    gasPrice = new BN(minGasPrice.result);
  }

  const newTx = new Transaction({
    version: getTxVersion(),
    toAddr: contract.address,
    data: JSON.stringify({
      _tag: transition,
      params,
    }),
    amount: new BN(opts.amount ?? 0),
    gasPrice: new BN(gasPrice),
    gasLimit: Long.fromNumber(80000),
    nonce: opts.nonce,
  },
    zilliqa.provider,
    TxStatus.Initialised,
    false,
    false
  );

  return newTx;
};

const callContract = async (privateKey, contract, transition, params, opts) => {
  const zilliqa = getZilliqaInstance(privateKey);
  const tx = await getTransitionTx(zilliqa, contract, transition, params, opts);

  const [txResult] = await sendTxs(privateKey, [tx]);
  return txResult;
};

const nextBlock = async (n = 1, network = getNetwork()) => {
  const zilliqa = getZilliqaInstance();
  if (network === 'localhost') {
    console.debug('Advancing block...')
    const response = await zilliqa.provider.send('IncreaseBlocknum', n);
    if (!response.result) {
      throw new Error(`Failed to advanced block! Error: ${JSON.stringify(response.error)}`)
    }
  }
}

const getLatestBlockHeight = async () => {
  const zilliqa = getZilliqaInstance();
  const rpcResponse = await zilliqa.blockchain.getLatestTxBlock();
  if (rpcResponse.error?.message?.startsWith("METHOD_NOT_FOUND")) {
    // manual mode
    const { result: { TxnHashes } } = await zilliqa.blockchain.getRecentTransactions();
    const latestTx = await getZilliqaInstance().blockchain.getTransaction(TxnHashes[0]);
    return parseInt(latestTx.receipt.epoch_num);
  }
  return parseInt(rpcResponse.result.header.BlockNum);
}

const param = (vname, type, value) => {
  return { vname, type, value };
}

const noneParam = (address) => {
  return {
    constructor: `${address}.None`,
    argtypes: [],
    arguments: [],
  }
}

const hexNumeric = (number, bytes = 4) => {
  const length = bytes * 2;
  return ("0".repeat(length) + new BigNumber(number).toString(16)).substr(-length);
}

module.exports = {
  ZERO_ADDRESS,

  getZilliqaInstance,
  getDefaultAccount,
  getTxVersion,
  getRpcUrl,
  getDeployTx,
  getTransitionTx,
  getPrivateKey,
  getLatestBlockHeight,

  createRandomAccount,
  transfer,
  sendTxs,
  callContract,
  nextBlock,
  verifyDeployment,

  param,
  noneParam,
};
