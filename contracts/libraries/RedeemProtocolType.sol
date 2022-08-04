// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library RedeemProtocolType {
  enum RedeemMethod {
    Mark,
    Transfer,
    Burn
  }

  struct Fee {
    uint256 amount;
    address token;
  }
}
