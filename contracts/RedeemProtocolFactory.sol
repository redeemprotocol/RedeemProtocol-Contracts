// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./interfaces/IRedeemProtocolCampaign.sol";
import "./RedeemProtocolCampaign.sol";

contract RedeemProtocolFactory is AccessControl {
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
  bytes32 public constant CAMPAIGN_OPERATOR = keccak256("CAMPAIGN_OPERATOR");

  bool public approveOnly = true;

  RedeemProtocolType.Fee public defaultSetupFee;
  RedeemProtocolType.Fee public defaultUpdateFee;
  RedeemProtocolType.Fee public defaultBaseRedeemFee;
  mapping(address => uint256) public designateSetupFeeAmount;
  mapping(address => uint256) public designateUpdateFeeAmount;
  mapping(address => address) public designateFeeToken;
  mapping(address => RedeemProtocolType.Fee) public designateBaseRedeemFee;
  mapping(address => bool) public validRedeemToken;

  address[] public allCampaigns;

  // TODO: implement this
  constructor() public {
    _setupRole(ADMIN_ROLE, msg.sender);
    _setupRole(OPERATOR_ROLE, msg.sender);
    _setRoleAdmin(OPERATOR_ROLE, ADMIN_ROLE);
  }

  
  function flipApprovedOnly() public onlyRole(OPERATOR_ROLE) {
    approveOnly = !approveOnly;
  }

  function setDefaultSetupFee(uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
    defaultSetupFee.amount = _amount;
    defaultSetupFee.token = _token;
  }

  function setDefaultUpdateFee(uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
    defaultUpdateFee.amount = _amount;
    defaultUpdateFee.token = _token;
  }
  
  function setDesignateSetupFeeAmount(address _account, uint256 _amount) external onlyRole(OPERATOR_ROLE) {
    designateSetupFeeAmount[_account] = _amount;
  }

  function setDesignateUpdateFeeAmount(address _account, uint256 _amount) external onlyRole(OPERATOR_ROLE) {
    designateUpdateFeeAmount[_account] = _amount;
  }
  
  function setDesignateFeeToken(address _account, address _token) external onlyRole(OPERATOR_ROLE) {
    designateFeeToken[_account] = _token;
  }

  function setDesignateBaseRedeemFee(address _account, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
    designateBaseRedeemFee[_account].amount = _amount;
    designateBaseRedeemFee[_account].token = _token;
  }

  function flipValidRedeemToken(address _token) external onlyRole(OPERATOR_ROLE) {
    validRedeemToken[_token] = !validRedeemToken[_token];
  }


  // TODO: implement this
  // TODO: better naming
  function createCampaign(
    RedeemProtocolType.RedeemMethod _method,
    uint256 _redeemAmount,
    address _redeemToken
  ) external returns (address campaign) {
    if (approveOnly) {
      require(hasRole(CAMPAIGN_OPERATOR, msg.sender));
    }

    RedeemProtocolType.Fee _baseRedeemFee = designateBaseRedeemFee[msg.sender].token == address(0) ? defaultBaseRedeemFee : designateBaseRedeemFee[msg.sender];
    bytes memory bytecode = abi.encodePacked(type(UniswapV2Pair).creationCode, abi.encode(msg.sender, _baseRedeemFee));
    address instance = Create2.deploy(0, _salt, bytecode);
    IRedeemProtocolCampaign(instance).initialize(defaultSetupFee, defaultUpdateFee, designateBaseRedeemFee[_redeemToken]);

    allCampaigns.push(campaign);
  }

  function setUpdateFee(address campaign, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
    IRedeemProtocolCampaign(campaign).setUpdateFee(_amount, _token);
  }

  function setBaseRedeemFee(address campaign, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
    IRedeemProtocolCampaign(campaign).setBaseRedeemFee(_amount, _token);
  }
}
