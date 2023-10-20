
const { Transaction, TxStatus } = require('@zilliqa-js/account')
const { bytes, BN, Long, toBech32Address, fromBech32Address, Zilliqa } = require('@zilliqa-js/zilliqa')
const { VERSION } = require('../../zilliqa');
const { deployContract } = require("../../deploy");
const fs = require('fs');
const { default: BigNumber } = require('bignumber.js');

const zilliqa = new Zilliqa("https://api.zilliqa.com")
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const bankAuthorityAddress = "0x5892ebe997ed765aafe4e0151a86088c981ae6d5";

const privateKey = process.env.PRIVATE_KEY
if (!privateKey) throw new Error('PRIVATE_KEY env var missing!')

const migrate = async (oldBankContract) => {
  const { last_updated_epoch } = await oldBankContract.getSubState("last_updated_epoch");
  const { control_mode } = await oldBankContract.getSubState("control_mode");
  const { joining_fee } = await oldBankContract.getSubState("joining_fee");
  const { weekly_tax } = await oldBankContract.getSubState("weekly_tax");
  const { contract_owner } = await oldBankContract.getSubState("contract_owner");
  const { members } = await oldBankContract.getSubState("members");
  const { officers } = await oldBankContract.getSubState("officers");

  let controlModePower = 0;
  switch (control_mode.constructor.substring(control_mode.constructor.indexOf(".") + 1)) {
    case "CaptainAndTwoOfficer": controlModePower = 5; break;
    case "CaptainAndOneOfficer": controlModePower = 4; break;
    case "CaptainOnly": controlModePower = 3; break;
  }

  console.log("last_updated_epoch", last_updated_epoch);
  console.log("contract_owner", contract_owner);
  console.log("control_mode", control_mode);
  console.log("joining_fee", joining_fee);
  console.log("weekly_tax", weekly_tax);
  console.log("members", members);
  console.log("officers", officers);

  const file = './src/zolar/GuildBank.scilla'
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: contract_owner.arguments[0],
    },
    {
      vname: 'bank_authority',
      type: 'ByStr20',
      value: bankAuthorityAddress,
    },
    {
      vname: 'initial_epoch',
      type: 'Uint32',
      value: last_updated_epoch,
    },
    {
      vname: 'initial_joining_fee',
      type: 'List Uint128',
      value: [
        joining_fee.arguments[0],
        joining_fee.arguments[3].arguments[0],
        joining_fee.arguments[3].arguments[1],
      ],
    },
    {
      vname: 'initial_weekly_tax',
      type: 'List Uint128',
      value: [
        weekly_tax.arguments[0],
        weekly_tax.arguments[3].arguments[0],
        weekly_tax.arguments[3].arguments[1],
      ],
    },
    {
      vname: 'initial_control_mode_power',
      type: 'Uint32',
      value: controlModePower.toString(),
    },
    {
      vname: 'initial_members',
      type: 'List ByStr20',
      value: Object.keys(members),
    },
    {
      vname: 'initial_officers',
      type: 'List ByStr20',
      value: Object.keys(officers),
    },
  ]

  console.info(`Deploying new GuildBank...`)
  // const [newBankContract] = await deployContract(privateKey, code, init)
  const newBankContract = zilliqa.contracts.at("0xc12220b111ed7ac502a83bf305ce50644c6f143b")

  const { tokens_held: tokensHeld } = await oldBankContract.getSubState("tokens_held");

  const tokens = Object.keys(tokensHeld);
  if (!tokens.length) {
    console.log("no tokens held at", oldBankContract.address);
  }

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()
  const params = {
    version: VERSION,
    amount: new BN(0),
    gasPrice: new BN(minGasPrice.result),
    gasLimit: Long.fromNumber(20000),
  };

  const txList = [new Transaction({
      ...params,
      toAddr: fromBech32Address(toBech32Address(bankAuthorityAddress)),
      data: JSON.stringify({
        _tag: "MigrateBank",
        params: [{
          vname: 'old_bank',
          type: 'ByStr20',
          value: oldBankContract.address,
        }, {
          vname: 'new_bank',
          type: 'ByStr20',
          value: newBankContract.address,
        }],
      }),
    },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    // ), new Transaction({
    //   ...params,
    //   toAddr: fromBech32Address(toBech32Address(bankAuthorityAddress)),
    //   data: JSON.stringify({
    //     _tag: "MigrateBankToken",
    //     params: [{
    //       vname: 'bank',
    //       type: 'ByStr20',
    //       value: oldBankContract.address,
    //     }, {
    //       vname: 'token',
    //       type: 'ByStr20',
    //       value: ZERO_ADDRESS,
    //     }],
    //   }),
    // },
    //   zilliqa.provider,
    //   TxStatus.Initialised,
    //   true,
    )];
  for (const token of tokens) {
    const tx = new Transaction({
      ...params,
      toAddr: fromBech32Address(toBech32Address(bankAuthorityAddress)),
      data: JSON.stringify({
        _tag: "MigrateBankToken",
        params: [{
          vname: 'bank',
          type: 'ByStr20',
          value: oldBankContract.address,
        }, {
          vname: 'token',
          type: 'ByStr20',
          value: token,
        }],
      }),
    },
      zilliqa.provider,
      TxStatus.Initialised,
      true,
    );

    txList.push(tx);
  }
  zilliqa.wallet.addByPrivateKey(privateKey);
  const signedTxList = await zilliqa.wallet.signBatch(txList);

  // send batch transaction
  await zilliqa.blockchain.createBatchTransaction(signedTxList);

  const { tokens_held: oldTokensHeld } = await oldBankContract.getSubState("tokens_held");
  const { tokens_held: newTokensHeld } = await newBankContract.getSubState("tokens_held");
  console.log(`Old contract: ${Object.keys(oldTokensHeld).length} | New contract: ${Object.keys(newTokensHeld).length}`)
}

;
(async () => {
  const response = await fetch("https://api.zolar.io/guild/list?limit=10000");
  const { result: { models } } = await response.json();

  const hiveAddress = process.env.HIVE_CONTRACT_HASH;
  for (const guild of models) {
    if (guild.id == 2 || guild.id == 1) continue;

    const { guildBank: bank } = guild;
    if (!bank?.address) {
      console.log(`guild ${guild.id} no bank contract, skipping…`);
      continue;
    }
    const bankAddress = bank.address.toLowerCase();

    const { result } = await zilliqa.blockchain.getSmartContractSubState(hiveAddress, "balances", [bankAddress]);
    const balance = result?.[bankAddress] ?? "0";
    console.log(`guild ${guild.id} hive balance: ${bankAddress} ${balance}`);

    const oldBankContract = zilliqa.contracts.at(bankAddress);

    await migrate(oldBankContract);

    break;
  }
})().catch(console.error).finally(() => process.exit(1));
