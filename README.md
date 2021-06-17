# Zilswap

Zilswap is a fully decentralized protocol for ZRC-2 token exchanges on Zilliqa.

## Documentation

API docs can be found at [docs.zilswap.org](https://docs.zilswap.org).

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
