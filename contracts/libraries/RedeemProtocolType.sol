// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

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
