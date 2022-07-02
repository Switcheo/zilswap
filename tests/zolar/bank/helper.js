function generateFee(bankAddress, initialAmt, inflationAmt, currentEpoch, captainAlloc, officerAlloc) {
  return {
    argtypes: [],
    arguments: [
      initialAmt,
      inflationAmt,
      currentEpoch,
      {
        argtypes: [],
        arguments: [
          captainAlloc,
          officerAlloc
        ],
        constructor: `${bankAddress}.FeeAllocation`
      }
    ],
    constructor: `${bankAddress}.Fee`
  }
}

function getBalanceFromStates(address, stateBeforeTx, stateAfterTx) {
  const balanceBeforeTx = parseInt(stateBeforeTx.balances[address] ?? "0" )
  const balanceAfterTx = parseInt(stateAfterTx.balances[address] ?? "0")

  return [balanceBeforeTx, balanceAfterTx]
}

function generateErrorMsg(errorCode) {
  return `Exception thrown: (Message [(_exception : (String "Error")) ; (code : (Int32 -${errorCode}))])`
}

exports.generateFee = generateFee
exports.getBalanceFromStates = getBalanceFromStates
exports.generateErrorMsg = generateErrorMsg