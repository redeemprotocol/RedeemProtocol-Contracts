# EVM - Redeem Protocol v2 w/Solidity

## Redeem with burn
Burn an RNFT to finish the redeeming process, meaning an RNFT can only be redeemed once.

## Redeem with marked
We provide an option for the customer to redeem their RNFT without burning it, which will record the redemption status on the smart contract.
That is why we only support the `ERC721` standard as an RNFT instead of the `ERC1155` because the utility is one of one to redeem. The multiple tokens are hard to ensure which one is redeemed without burning it.

## Redeem with transferred
Let RNFT as a utility token. Not only can the NFT issuer provide the service for this token, but all of the people can also provide service to collect RNFTs and then redeem others' services.

For example, if I want to redeem The Remade's sneakers within their RNFT, I can buy the RNFT from OpenSea or provide a service with Redeem Protocol to let RNFT holders redeem my service by transferring their RNFT to my address.

## Overview

### Installation
```
npm install
```
### Complie
```
npx hardhat complie
```

### Test
```
cd contracts
npx hardhat test
```