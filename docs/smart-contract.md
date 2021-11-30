# Smart Contract

## Addresses

The zilswap smart contract is currently located at:

- TestNet: [zil1rf3dm8yykryffr94rlrxfws58earfxzu5lw792](https://viewblock.io/zilliqa/address/zil1rf3dm8yykryffr94rlrxfws58earfxzu5lw792?network=testnet)
- MainNet: [zil1gkwt95a67lnpe774lcmz72y6ay4jh2asmmjw6u](https://viewblock.io/zilliqa/address/zil1gkwt95a67lnpe774lcmz72y6ay4jh2asmmjw6u)

## Events

Frontend dApps may listen to the following smart contract events to watch for changes in state due to user interaction.

### FeeSet

The `FeeSet` is emitted when the contract owner sets a new fee. It is emitted even if the new
fee is the same as the old fee.

| Parameter | Type    | Description                         |
|-----------|---------|-------------------------------------|
| fee       | Uint256 | The fee in basis points (1 = 0.01%) |

### OwnershipTransferred

The `OwnershipTransferred` is emitted when the existing contract owner transfers ownership to a
new address.

| Parameter | Type    | Description                  |
|-----------|---------|------------------------------|
| new_owner | ByStr20 | The address of the new owner |

### PoolCreated

The `PoolCreated` event is emitted when liquidity is first added for a ZRC-2 token.

Pools are indexed by the ZRC-2 token's smart contract address, emitted in the parameter, `pool`.

| Parameter | Type    | Description                                           |
|-----------|---------|-------------------------------------------------------|
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created |

### Minted

The `Minted` event is emitted when liquidity is added to a pool and "liquidity tokens" are "minted".

The amount of liquidity tokens minted is calculated by taking the ratio of pool tokens added as compared to that already residing in the pool.

The share of liquidity contribution for a pool can then be found by dividing `amount` with the smart contract variable `total_contributions[token_address]`.

| Parameter | Type    | Description                                                    |
|-----------|---------|----------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool that has had liquidity added to  |
| address   | ByStr20 | The address that contributed liquidity                         |
| amount    | Uint128 | The amount of liquidity contributed                            |

### Burnt

The `Burnt` event is emitted when liquidity is removed from a pool and "liquidity tokens" are "burnt".

The amount of liquidity tokens burnt is calculated by taking the ratio of pool tokens removed as compared to the total pool tokens residing in the pool.

The share of liquidity contribution removed for the address can be found by dividing `amount` with the smart contract variable `total_contributions[token_address]`.

| Parameter | Type    | Description                                                   |
|-----------|---------|---------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool that has had liquidity removed  |
| address   | ByStr20 | The address that removed liquidity                            |
| amount    | Uint128 | The amount of liquidity removed                               |

### Swapped

The `Swapped` event is emitted when a swap is made in a pool.

Since pools are already balanced against `ZIL`, all events have a `zil_in` and `zil_out` amount to signify the amount of `ZIL` sent to or received from the pool during the swap respectively.

All events also have the `token_in` and `token_out` to signify the corresponding token amounts sent to or received from the pool.

The address of the token sent or received in `token_in` and `token_out` is given by `token_address`.

Note that if `zil_in` is non-zero, then `zil_out` will always be zero, and vice versa. The same goes for `token_in` and `token_out`.

| Parameter | Type    | Description                                                       |
|-----------|---------|-------------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool where the swap took place           |
| address   | ByStr20 | The address that initiated the swap                               |
| zil_in    | Uint128 | The amount of zil transferred into the pool for the swap in `QA`  |
| zil_out   | Uint128 | The amount of zil removed from the pool for the swap in `QA`      |
| token_in  | Uint128 | The amount of tokens transferred into the pool for the swap       |
| token_out | Uint128 | The amount of tokens removed rrom the pool for the swap           |

## Transitions

The following are the public transitions that can be called via smart contract invocations.

Each transition has a `deadline_block` parameter that can be used to set the block for which the signed transaction is no longer valid be executed by the Zilliqa blockchain.

This can be used to prevent a "transaction withholding attack" by miners, where a transaction can be withheld indefinitely, to only be confirmed when it may benefit other parties in ways unexpected or detrimental to the sender.

### AddLiquidity

This transition adds liquidity to the pool for the ZRC-2 token given by `token_address`. Liquidity providers deposit ZIL and ZRC-2 tokens using the exchange rate of the liquidity pool (i.e. the ratios between the two tokens' reserve amounts) at the moment of the transition.

The ZIL `_amount` sent is the exact amount of ZIL that the sender wishes to add to the liquidity pool and it should be 50% of the total value that they wish to deposit into the pool.

Because the ratio of tokens in a liquidity pool can fluctutate between when the sender signs the transaction and when it is processed by the blockchain, the parameter bound `max_token_amount` is used to bound the exchange rate. For the first liquidity provider, `max_token_amount` is the exact amount of ZRC-2 tokens that will be deposited.

The `min_contribution_amount` can be used to set the lower bound of the sender's the contribution share (given by `min_contribution_amount/total_contributions[pool_address]`) when the transaction is executed. For the first liquidity provider, `min_contribution_amount` is ignored.

Note that liquidity providers should aim to deposit what they believe to be **equal values** of both ZIL and the ZRC-2 tokens. While the initial exchange rate is set by the first liquidity provider that creates a pool, arbitrage traders will bring the prices to equilibrium at the expense of the initial liquidity provider(s), should this ratio be irreflective of their true value.

| Parameter        | Type    | Description                                                       |
|------------------|---------|-------------------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to                 |
| `_amount`        | Uint128 | The amount of ZIL to contribute to the pool                       |
| min_contribution_amount | ByStr20 | The minimum liquidity tokens that needs to be minted       |
| max_token_amount | Uint128 | The maximum amount of ZRC-2 token to contribute to the pool       |
| deadline_block   | BNum    | The deadline that this transaction must be executed by            |

### RemoveLiquidity

This transition removes liquidity from the pool for the ZRC-2 token given by `token_address`. Liquidity providers can withdraw their share of ZIL and ZRC-2 tokens based on the exchange rate of the liquidity pool (i.e. the ratios between the two tokens' reserve amounts) at the moment of the transition.

The `contribution_amount` can be used to redraw all or some of the sender's tokens based on his previous contributions found in `balances[pool_address][_sender]`.

Because the ratio of tokens in a liquidity pool can fluctutate between when the sender signs the transaction and when it is processed by the blockchain, the parameter bounds `min_zil_amount` and `min_token_amount` is used to bound the exchange rate.

| Parameter        | Type    | Description                                            |
|------------------|---------|--------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to      |
| contribution_amount | Uint128 | The share of contribution to remove                 |
| min_zil_amount   | ByStr20 | The minimum amount of ZIL to be withdrawn              |
| min_token_amount | Uint128 | The minimum amount of ZRC-2 tokens to be withdrawn     |
| deadline_block   | BNum    | The deadline that this transaction must be executed by |

### SwapExactZILForTokens

This transition swaps an exact amount of Zilliqa tokens (ZIL) for ZRC-2 tokens given by `token_address` at the prevailing exchange rate that is determined by the constant product formula of the liquidity pool.

The minimum amount of ZRC-2 tokens to be taken in return is given by `min_token_amount`, which can be used to bound the swap exchange rate that may fluctuate from the time of the sender signs the transaction and when it is processed by the blockchain. The transaction reverts with an error `RequestedRatesCannotBeFulfilled` if the prevailing exchange rate during transaction execution does not allow this condition to be satisfied.

| Parameter        | Type    | Description                                                    |
|------------------|---------|----------------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to              |
| `_amount`        | Uint128 | The exact amount of ZIL to be sent (sold)                      |
| min_token_amount | Uint128 | The minimum amount of ZRC-2 tokens to be taken (bought)        |
| deadline_block   | BNum    | The deadline that this transaction must be executed by         |

### SwapExactTokensForZIL

This transition swaps an exact amount of ZRC-2 tokens given by `token_address` for Zilliqa tokens (ZIL) at the prevailing exchange rate that is determined by the constant product formula of the liquidity pool.

The minimum amount of ZIL to be taken in return is given by `min_zil_amount`, which can be used to bound the swap exchange rate that may fluctuate from the time of the sender signs the transaction and when it is processed by the blockchain. The transaction reverts with an error `RequestedRatesCannotBeFulfilled` if the prevailing exchange rate during transaction execution does not allow this condition to be satisfied.

| Parameter        | Type    | Description                                            |
|------------------|---------|--------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to      |
| token_amount     | Uint128 | The exact amount of ZRC-2 tokens to be sent (sold)     |
| min_zil_amount   | Uint128 | The minimum amount of ZIL tokens to be taken (bought)  |
| deadline_block   | BNum    | The deadline that this transaction must be executed by |

### SwapZILForExactTokens

This transition swaps Zilliqa tokens (ZIL) for an exact amount of ZRC-2 tokens given by `token_address` at the prevailing exchange rate that is determined by the constant product formula of the liquidity pool.

The maximum amount of ZIL to be given for the swap is capped by `_amount`, which can be used to bound the swap exchange rate that may fluctuate from the time of the sender signs the transaction and when it is processed by the blockchain. The transaction reverts with an error `RequestedRatesCannotBeFulfilled` if the prevailing exchange rate during transaction execution does not allow this condition to be satisfied.

| Parameter        | Type    | Description                                            |
|------------------|---------|--------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to      |
| `_amount`        | Uint128 | The maximum amount of ZIL to be sent (sold)            |
| token_amount     | Uint128 | The exact amount of ZRC-2 tokens to be taken (bought)  |
| deadline_block   | BNum    | The deadline that this transaction must be executed by |

### SwapTokensForExactZIL

This transition swaps ZRC-2 tokens given by `token_address` for an exact amount of Zilliqa tokens (ZIL) at the prevailing exchange rate that is determined by the constant product formula of the liquidity pool.

The maximum amount of ZRC-2 tokens to be given for the swap is capped by `max_token_amount`, which can be used to bound the swap exchange rate that may fluctuate from the time of the sender signs the transaction and when it is processed by the blockchain. The transaction reverts with an error `RequestedRatesCannotBeFulfilled` if the prevailing exchange rate during transaction execution does not allow this condition to be satisfied.

| Parameter        | Type    | Description                                            |
|------------------|---------|--------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to      |
| max_token_amount | Uint128 | The maximum amount of ZRC-2 tokens to be sent (sold)   |
| zil_amount       | Uint128 | The exact amount of ZIL tokens to be taken (bought)    |
| deadline_block   | BNum    | The deadline that this transaction must be executed by |

### SwapExactTokensForTokens

This transition swaps an exact amount of ZRC-2 tokens given by `token_address0` for another ZRC-2 token given by `token_address1` at the prevailing exchange rate that is determined by the constant product formula of the liquidity pools.

The minimum amount of `token1` to be taken in return is given by `min_token1_amount`, which can be used to bound the swap exchange rate that may fluctuate from the time of the sender signs the transaction and when it is processed by the blockchain. The transaction reverts with an error `RequestedRatesCannotBeFulfilled` if the prevailing exchange rate during transaction execution does not allow this condition to be satisfied.

| Parameter         | Type    | Description                                            |
|-------------------|---------|--------------------------------------------------------|
| token0_address    | ByStr20 | The token address of the ZRC-2 token to send (sell)    |
| token1_address    | ByStr20 | The token address of the ZRC-2 token to take (buy)     |
| token0_amount     | Uint128 | The exact amount of `token0` to be sent (sold)         |
| min_token1_amount | Uint128 | The minimum amount of `token1` to be taken (bought)    |
| deadline_block    | BNum    | The deadline that this transaction must be executed by |

### SwapTokensForExactTokens

This transition swaps ZRC-2 tokens given by `token_address0` for an exact amount of another ZRC-2 token given by `token_address1` at the prevailing exchange rate that is determined by the constant product formula of the liquidity pools.

The maximum amount of `token0` to be given for the swap is capped by `max_token0_amount`, which can be used to bound the swap exchange rate that may fluctuate from the time of the sender signs the transaction and when it is processed by the blockchain. The transaction reverts with an error `RequestedRatesCannotBeFulfilled` if the prevailing exchange rate during transaction execution does not allow this condition to be satisfied.

| Parameter         | Type    | Description                                            |
|-------------------|---------|--------------------------------------------------------|
| token0_address    | ByStr20 | The token address of the ZRC-2 token to send (sell)    |
| token1_address    | ByStr20 | The token address of the ZRC-2 token to take (buy)     |
| max_token0_amount | Uint128 | The maximum amount of `token0` to be sent (sold)       |
| token1_amount     | Uint128 | The exact amount of `token1` to be taken (bought)      |
| deadline_block    | BNum    | The deadline that this transaction must be executed by |

## Errors

### RequestedRatesCannotBeFulfilled

The prevailing exchange rate determined by the constant product formula of the liquidity pool reserves is too unfavourable for the given transition parameters.

Ensure that the given parameters are correct, and that enough buffer (slippage allowance) is given to prevent unneccessary reverts. Using amounts that are bounded to be exactly the exchange rate at submission time is unlikely to succeed.

### TransactionExpired

The transaction took too long to confirm and exceeded the given `deadline_block` parameter.

Retry the transition with a later `deadline_block`.

### ReceiveFailed

A transfer of ZRC-2 tokens to the Zilswap smart contract failed.

Ensure that the sender has approved a sufficient amount of token transfers via `IncreaseAllowance`.

### InvalidParameter

A parameter is invalid, most likely due to being zero `0`.

Ensure that all transition parameters are valid.

### MissingPool

The pool does not exist for swapping of tokens.

Liquidity needs to be added through `AddLiquidity` first.

### IntegerOverflow

The pool size is too large.

Retry with smaller amounts.
