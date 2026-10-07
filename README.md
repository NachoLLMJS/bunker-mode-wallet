# BUNKER MODE WALLET

BUNKER MODE WALLET is a non-custodial Ethereum wallet-migration interface.

It provides:

- Read-only source and destination inspection.
- User-initiated EIP-1193 wallet connection.
- Direct ETH, ERC-20, ERC-721 and ERC-1155 transfers.
- Live balance or ownership validation before assets enter a plan.
- A fresh-destination gate: empty bytecode and zero outgoing nonce.
- ETH-last ordering.
- Transaction estimation, wallet confirmation, receipt checks and transaction-field authentication.
- A local transaction journal containing only public addresses and transaction hashes.

Assets move directly from the connected source wallet to the destination. BUNKER MODE WALLET has no treasury, custody account, private key, seed phrase or unlimited approval flow.

## Run locally

```bash
npm start
```

Open `http://127.0.0.1:4177/`.

## Test

```bash
npm test
```

## Safety boundary

This is browser software, not an audit or a guarantee that a destination is controlled by the user. A zero outgoing nonce indicates that an address has not sent a transaction on Ethereum mainnet; it does not prove ownership. Verify the destination independently before signing.
