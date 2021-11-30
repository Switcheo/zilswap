# Zilswap

Zilswap is a fully decentralized protocol for ZRC-2 token exchanges on Zilliqa.

## Documentation

API docs can be found at [docs.zilswap.org](https://docs.zilswap.org).

## Deployed Contracts

### MainNet

- Zilswap: [zil1gkwt95a67lnpe774lcmz72y6ay4jh2asmmjw6u](https://devex.zilliqa.com/address/0x459cb2d3baf7e61cfbd5fe362f289ae92b2babb0?network=https://api.zilliqa.com) ~~[zil1hgg7k77vpgpwj3av7q7vv5dl4uvunmqqjzpv2w](https://devex.zilliqa.com/address/0xba11eb7bcc0a02e947acf03cc651bfaf19c9ec00?network=https://api.zilliqa.com)~~
- ARK: [zil1jna6pq6fsjsxdkvkz2wyt6tg80p762neqkz2qh](https://devex.zilliqa.com/address/0x94fba0834984a066d996129c45e9683bc3ed2a79?network=https://api.zilliqa.com)
- TokenProxy: [zil1yrqlm8cxpqt8wq5y6axejvcs2h350ykj9cc758](https://devex.zilliqa.com/address/0x20c1fd9f060816770284d74d99331055e34792d2?network=https://api.zilliqa.com)

### TestNet

- ZilSwap: ~~[zil1rf3dm8yykryffr94rlrxfws58earfxzu5lw792](https://devex.zilliqa.com/address/0x1a62dd9c84b0c8948cb51fc664ba143e7a34985c?network=https://dev-api.zilliqa.com)~~
- ARK: [zil1nyapz27kck9tteejccfr354tnx89s2sddfzqpl](https://devex.zilliqa.com/address/0x993a112bd6c58ab5e732c61238d2ab998e582a0d?network=https://dev-api.zilliqa.com)
- TokenProxy: [zil1hfp8fn6026kvel2zc25xztk3lss68nlmqmm2fn](https://devex.zilliqa.com/address/0xba4274cf4f56acccfd42c2a8612ed1fc21a3cffb?network=https://dev-api.zilliqa.com)

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
