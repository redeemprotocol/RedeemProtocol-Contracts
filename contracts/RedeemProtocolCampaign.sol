// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "./libraries/RedeemProtocolType.sol";

contract RedeemProtocolCampaign is AccessControl, ERC2771Context {
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

  address public factory;
  mapping(address => uint256) public lockedBalance;
  mapping(address => uint256) public freeBalance;

  RedeemProtocolType.Fee public baseRedeemFee;
  RedeemProtocolType.Fee public updateFee;
  RedeemProtocolType.Fee public redeemFee;

  address[] public validERC721;
  RedeemProtocolType.RedeemMethod public redeemMethod;
  uint256[] public testIDs;

  // TODO: support meta tx

  // TODO: implement this
  constructor(address campaignOp, RedeemProtocolType.Fee memory _baseRedeemFee) ERC2771Context(campaignOp) {
    factory = msg.sender;

    _setupRole(ADMIN_ROLE, campaignOp);
    _setupRole(OPERATOR_ROLE, campaignOp);
    _setRoleAdmin(OPERATOR_ROLE, ADMIN_ROLE);

    baseRedeemFee = _baseRedeemFee;
  }

  modifier onlyFactory(){
    require(msg.sender == factory, "only factory");
    _;
  }

  // TODO: implement this
  function initialize(
    RedeemProtocolType.Fee memory _updateFee,
    RedeemProtocolType.RedeemMethod _method,
    RedeemProtocolType.Fee memory _redeemFee
  ) external onlyFactory {
    updateFee = _updateFee;
    redeemMethod = _method;
    redeemFee = _redeemFee;
  }

  function redeemWithMark() external {
    require(redeemMethod == RedeemProtocolType.RedeemMethod.Mark, "redeem method is not mark");
    // TODO: require baseRedeemToken == redeemToken?
  }

  function redeemWithTransfer() external {
    require(redeemMethod == RedeemProtocolType.RedeemMethod.Transfer, "redeem method is not transfer");
    // TODO: require baseRedeemToken == redeemToken?
  }

  function redeemWithBurn() external {
    require(redeemMethod == RedeemProtocolType.RedeemMethod.Burn, "redeem method is not burn");
    // TODO: require baseRedeemToken == redeemToken?
  }

  function setUpdateFee(uint256 _amount, address _token) external onlyFactory {
    updateFee.amount = _amount;
    updateFee.token = _token;
  }

  function setBaseRedeemFee(uint256 _amount, address _token) external onlyFactory {
    baseRedeemFee.amount = _amount;
    baseRedeemFee.token = _token;
  }

  function updateCampaign(
    RedeemProtocolType.Fee memory _updateFee,
    RedeemProtocolType.RedeemMethod _method,
    RedeemProtocolType.Fee memory _redeemFee
  ) external {
    updateFee = _updateFee;
    redeemMethod = _method;
    redeemFee = _redeemFee;
  }

  function _msgSender() internal view override(Context, ERC2771Context) returns(address) {
    return ERC2771Context._msgSender();
  }

  function _msgData() internal view override(Context, ERC2771Context) returns(bytes calldata) {
    return ERC2771Context._msgData();
  }
}
