# Zilswap

Zilswap is a fully decentralized protocol for ZRC-2 token exchanges on Zilliqa.

## Documentation

API docs can be found at [docs.zilswap.org](https://docs.zilswap.org).

## Deployed Contracts

### MainNet

Zilswap: [zil1hgg7k77vpgpwj3av7q7vv5dl4uvunmqqjzpv2w]

### TestNet

ZilSwap: [zil1rf3dm8yykryffr94rlrxfws58earfxzu5lw792](https://devex.zilliqa.com/address/0x1a62dd9c84b0c8948cb51fc664ba143e7a34985c?network=https://dev-api.zilliqa.com)
ARK: [zil1vf968mkk2372whae5ncd6w2h39p4nnqx2ut666](https://devex.zilliqa.com/address/0x624ba3eed6547ca75fb9a4f0dd3957894359cc06?network=https://dev-api.zilliqa.com)
TokenProxy: [zil1uvkgnwx3k0u2jpcw6fy9qw5vrm2mmkclq696d8](https://devex.zilliqa.com/address/0xe32c89b8d1b3f8a9070ed248503a8c1ed5bddb1f?network=https://dev-api.zilliqa.com)

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
