# Zilswap

Zilswap is a fully decentralized protocol for ZRC-2 token exchanges on Zilliqa.

## Documentation

API docs can be found at [docs.zilswap.org](https://docs.zilswap.org).

## Deployed Contracts

### MainNet

Zilswap: [zil1hgg7k77vpgpwj3av7q7vv5dl4uvunmqqjzpv2w]

### TestNet

ZilSwap: [zil1rf3dm8yykryffr94rlrxfws58earfxzu5lw792](https://devex.zilliqa.com/address/0x1a62dd9c84b0c8948cb51fc664ba143e7a34985c?network=https://dev-api.zilliqa.com)
ARK: [zil1sgf3zpgt6qeflg053pxjwx9s9pxclx3p7s06gp](https://devex.zilliqa.com/address/0x821311050bd0329fa1f4884d2718b0284d8f9a21?network=https://dev-api.zilliqa.com)
TokenProxy: [zil1zmult8jp8q7wjpvjfalnaaue8v72nlcau53qcu](https://devex.zilliqa.com/address/0x16f9f59e41383ce905924f7f3ef7993b3ca9ff1d?network=https://dev-api.zilliqa.com)

## Testing

Test suite can be ran with: `yarn test`. To run only one test: `yarn test -t nameOfTest`.

### On Zilliqa TestNet

To run tests on Zilliqa TestNet, get some testnet ZILs first.

Set the private key of your test account using the `PRIVATE_KEY` env var.

Set the `NETWORK` env var to `testnet`.

These can be done in a `.env` file in the root of the project, or run inline via: `PRIVATE_KEY=xxx NETWORK=testnet yarn test`.

### On Local Isolated Server

Ensure your isolated server is running without the `-t` flag (or disable it via `-t=0`) so that there is no auto-block progression.

For docker builds, this can be modified by running `sed -i 's/-t 5000 //' run.sh` within the container and then restarting the docker process.

Find the private key of a genesis account and set `PRIVATE_KEY=xxx` in a `.env` file in the root of the project or run inline via `PRIVATE_KEY=xxx yarn test`.
