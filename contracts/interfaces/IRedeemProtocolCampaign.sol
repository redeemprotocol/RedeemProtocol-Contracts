// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IRedeemProtocolCampaign {
  function initialize(RedeemProtocolType.Fee memory, RedeemProtocolType.RedeemMethod, RedeemProtocolType.Fee memory) external
  function setUpdateFee(uint256, address) external
  function setBaseRedeemFee(uint256, address) external
}
