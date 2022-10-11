const { TransactionError } = require("@zilliqa-js/core");
const { getAddressFromPrivateKey } = require("@zilliqa-js/crypto");
const { getDeployTx, getZilliqaInstance, param, ZERO_ADDRESS, sendTxs, verifyDeployment } = require("../../../scripts/utils");

const deployZilo = async (privateKey, {
  tokenAddress, tokenAmount,
  targetZilAmount, minZilAmount,
  lpZilAmount, lpTokenAmount,
  treasuryZilAmount, treasuryAddress,
  receiverAddress, liquidityAddress,
  startBlock, endBlock,
  discountBps, discountWhitelist = [],
}) => {
  const zilliqa = getZilliqaInstance(privateKey);

  const deployTx = await getDeployTx(zilliqa, "src/zilo/ZILOv2.scilla", [
    param("_scilla_version", "Uint32", "0"),
    param("token_address", "ByStr20", tokenAddress),
    param("token_amount", "Uint128", tokenAmount),
    param("target_zil_amount", "Uint128", targetZilAmount),
    param("minimum_zil_amount", "Uint128", minZilAmount),
    param("liquidity_zil_amount", "Uint128", lpZilAmount),
    param("liquidity_token_amount", "Uint128", lpTokenAmount),
    param("treasury_zil_amount", "Uint128", treasuryZilAmount),
    param("receiver_address", "ByStr20", receiverAddress),
    param("liquidity_address", "ByStr20", liquidityAddress),
    param("treasury_address", "ByStr20", treasuryAddress),
    param("start_block", "BNum", startBlock),
    param("end_block", "BNum", endBlock),
    param("discount_bps", "Uint128", discountBps),
    param("disc_whitelist", "List ByStr20", discountWhitelist),
  ]);

  const [confirmedDeployTx] = await sendTxs(privateKey, [deployTx]);
  verifyDeployment(confirmedDeployTx);

  const { result: contractAddress } = await zilliqa.blockchain.getContractAddressFromTransactionID(confirmedDeployTx.id);
  return [zilliqa.contracts.at(contractAddress), confirmedDeployTx]
};

const deployZiloSeedLP = async (privateKey, {
  tokenAddress, zilswapAddress,
}) => {
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  const zilliqa = getZilliqaInstance(privateKey);

  const deployTx = await getDeployTx(zilliqa, "src/zilo/ZiloSeedLP.scilla", [
    param("_scilla_version", "Uint32", "0"),
    param("init_owner", "ByStr20", address),
    param("token_address", "ByStr20", tokenAddress),
    param("zilswap_address", "ByStr20", zilswapAddress),
  ]);

  const [confirmedDeployTx] = await sendTxs(privateKey, [deployTx]);
  verifyDeployment(confirmedDeployTx);

  const { result: contractAddress } = await zilliqa.blockchain.getContractAddressFromTransactionID(confirmedDeployTx.id);
  return [zilliqa.contracts.at(contractAddress), confirmedDeployTx]
};

const deployZRC2Token = async (privateKey, {
  name = "ZRC2 Token", symbol = "TKN",
  decimals = "12", initSupply = "0",
} = {}) => {
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  const zilliqa = getZilliqaInstance(privateKey);

  const deployTx = await getDeployTx(zilliqa, "src/ZRC2.scilla", [
    param("_scilla_version", "Uint32", "0"),
    param("contract_owner", "ByStr20", address),
    param("name", "String", name),
    param("symbol", "String", symbol),
    param("decimals", "Uint32", decimals),
    param("init_supply", "Uint128", initSupply),
  ]);

  const [confirmedDeployTx] = await sendTxs(privateKey, [deployTx]);
  verifyDeployment(confirmedDeployTx);

  const { result: contractAddress } = await zilliqa.blockchain.getContractAddressFromTransactionID(confirmedDeployTx.id);
  return [zilliqa.contracts.at(contractAddress), confirmedDeployTx]
};

const deployZilSwap = async (privateKey, {
  initialFee = "300",
} = {}) => {
  const address = getAddressFromPrivateKey(privateKey).toLowerCase();
  const zilliqa = getZilliqaInstance(privateKey);

  const deployTx = await getDeployTx(zilliqa, "src/zilswap-v1/ZilSwapV1.1.scilla", [
    param("_scilla_version", "Uint32", "0"),
    param("initial_owner", "ByStr20", address),
    param("initial_fee", "Uint256", initialFee),
  ]);

  const [confirmedDeployTx] = await sendTxs(privateKey, [deployTx]);
  verifyDeployment(confirmedDeployTx);

  const { result: contractAddress } = await zilliqa.blockchain.getContractAddressFromTransactionID(confirmedDeployTx.id);
  return [zilliqa.contracts.at(contractAddress), confirmedDeployTx]
};

module.exports = {
  deployZilo,
  deployZiloSeedLP,
  deployZRC2Token,
  deployZilSwap,
};
