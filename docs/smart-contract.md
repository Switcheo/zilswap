# Smart Contract

## Addresses

The zilswap smart contract is currently located at:

- TestNet: [zil1k7tvctylv6m84yf4l7wf26k7l6aafuukk63x5a](https://viewblock.io/zilliqa/address/zil1k7tvctylv6m84yf4l7wf26k7l6aafuukk63x5a?network=testnet)
- MainNet: Coming Soon

## Events

Frontend dApps may listen to the following smart contract events to watch for changes in state due to user interaction.

### PoolCreated

This event is emitted when liquidity is first added for a ZRC-2 token.

Pools are indexed by the ZRC-2 token's smart contract address, emitted in the parameter, `pool`.

| Parameter | Type    | Description                                           |
|-----------|---------|-------------------------------------------------------|
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created |

### Mint

The `mint` event is emitted when liquidity is added to a pool and "liquidity tokens" are "minted".

The amount of liquidity tokens minted is calculated by taking the ratio of pool tokens added as compared to that already residing in the pool.

The share of liquidity contribution for a pool can then be found by dividing `amount` with the smart contract variable `total_contributions[token_address]`.

| Parameter | Type    | Description                                                    |
|-----------|---------|----------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool that has had liquidity added to  |
| address   | ByStr20 | The address that contributed liquidity                         |
| amount    | Uint128 | The amount of liquidity contributed                            |

### Burn

The `burn` event is emitted when liquidity is removed from a pool and "liquidity tokens" are "burnt".

The amount of liquidity tokens burnt is calculated by taking the ratio of pool tokens removed as compared to the total pool tokens residing in the pool.

The share of liquidity contribution removed for the address can be found by dividing `amount` with the smart contract variable `total_contributions[token_address]`.

| Parameter | Type    | Description                                                   |
|-----------|---------|---------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool that has had liquidity removed  |
| address   | ByStr20 | The address that removed liquidity                            |
| amount    | Uint128 | The amount of liquidity removed                               |

### Swap

The `swap` event is emitted when a swap is made in a pool.

Since pools are already balanced against `ZIL`, all events have a `zil_in` and `zil_out` amount
to signify the amount of `ZIL` sent to or received from the pool during the swap respectively.
All events also have the `token_in` and `token_out` to signify the corresponding token amounts
sent to or received from the pool.

The address of the token sent or received in `token_in` and `token_out` is given by `token_address`.

Note that if `zil_in` is non-zero, then `zil_out` will always be zero, and vice versa. The
same goes for `amount_in` and `amount_out`.

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

### AddLiquidity

This transition adds liquidity to the pool for the ZRC-2 token given by `token_address`.
Liquidity providers deposit ZIL and ZRC-2 tokens using the exchange rate of the liquidity pool
(i.e. the ratios between the two tokens' reserve amounts) at the moment of the transition.

The ZIL `_amount` sent is the exact amount of ZIL that the sender wishes to add to the liquidity
pool and it should be 50% of the total value that they wish to deposit into the pool.

Because the ratio of tokens in a liquidity pool can fluctutate between when the sender signs
the transaction and when it is processed by the blockchain, the parameter bound `max_token_amount`
is used to bound the exchange rate. For the first liquidity provider, `max_token_amount`
is the exact amount of ZRC-2 tokens that will be deposited.

The `min_contribution_amount` can be used to set the lower bound of the sender's
the contribution share (given by `min_contribution_amount/total_contributions[pool_address]`)
when the transaction is executed. For the first liquidity provider, `min_contribution_amount` is ignored.

Additionally, a `deadline_block` can be used to set the time after which the transaction is no longer
valid to be executed by the Zilliqa blockchain. This can prevent a "transaction withholding attack" by miners.

Note that liquidity providers should aim to deposit what they believe to be **equal values** of
both ZIL and the ZRC-2 tokens. While the initial exchange rate is set by the first liquidity provider
that creates a pool, arbitrage traders will bring the prices to equilibrium at the expense of the
initial liquidity provider(s), should this ratio be irreflective of their true value.

| Parameter        | Type    | Description                                                       |
|------------------|---------|-------------------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to                 |
| `_amount`        | Uint128 | The amount of ZIL to contribute to the pool                       |
| min_contribution_amount | ByStr20 | The minimum liquidity tokens that needs to be minted       |
| max_token_amount | Uint128 | The maximum amount of ZRC-2 token to contribute to the pool       |
| deadline_block   | BNum    | The deadline that this transaction must be executed by            |

### RemoveLiquidity

This transition removes liquidity from the pool for the ZRC-2 token given by `token_address`.
Liquidity providers can withdraw their share of ZIL and ZRC-2 tokens based on the exchange rate
of the liquidity pool (i.e. the ratios between the two tokens' reserve amounts) at the moment of the transition.

The `contribution_amount` can be used to redraw all or some of the sender's tokens based on his
previous contributions found in `balances[pool_address][_sender]`.

Because the ratio of tokens in a liquidity pool can fluctutate between when the sender signs
the transaction and when it is processed by the blockchain, the parameter bounds `min_zil_amount`
and `min_token_amount` is used to bound the exchange rate.

Additionally, a `deadline_block` can be used to set the time after which the transaction is no longer
valid to be executed by the Zilliqa blockchain. This can prevent a "transaction withholding attack" by miners.

| Parameter        | Type    | Description                                            |
|------------------|---------|--------------------------------------------------------|
| token_address    | ByStr20 | The token address of the pool to add liquidity to      |
| contribution_amount | Uint128 | The share of contribution to remove                 |
| min_zil_amount   | ByStr20 | The minimum amount of ZIL to be withdrawn              |
| min_token_amount | Uint128 | The minimum amount of ZRC-2 tokens to be withdrawn     |
| deadline_block   | BNum    | The deadline that this transaction must be executed by |

### SwapExactZILForTokens

### SwapExactTokensForZIL

### SwapZILForExactTokens

### SwapTokensForExactZIL

### SwapExactTokensForTokens

### SwapTokensForExactTokens
