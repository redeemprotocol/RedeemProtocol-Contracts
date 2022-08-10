// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import { RedeemProtocolType } from "./libraries/RedeemProtocolType.sol";
import "./interfaces/IERC20Permit.sol";
import "./interfaces/IERC721Ownable.sol";
import "./RedeemProtocolReverse.sol";

contract RedeemProtocolFactory is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    using RedeemProtocolType for RedeemProtocolType.Fee;
    
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant OPERATOR = keccak256("OPERATOR");
    bytes32 public constant ROOT_CREATOR = keccak256("ROOT_CREATOR");
    bytes32 public constant REVERSE_CREATOR = keccak256("REVERSE_CREATOR");

    Counters.Counter private reverseSalt;
    bool public approveOnly = true;
    RedeemProtocolType.Fee public defaultSetupFee;
    RedeemProtocolType.Fee public defaultUpdateFee;
    RedeemProtocolType.Fee public defaultBaseRedeemFee;
    mapping(address => RedeemProtocolType.Fee) public designateSetupFee;
    mapping(address => RedeemProtocolType.Fee) public designateUpdateFee;
    mapping(address => RedeemProtocolType.Fee) public designateBaseRedeemFee;
    mapping(address => bool) public validRedeemToken;

    address[] public allReverses;

    event ReverseCreated(address indexed creator, address reverse);

    constructor(
        RedeemProtocolType.Fee memory _defaultSetupFee,
        RedeemProtocolType.Fee memory _defaultUpdateFee,
        RedeemProtocolType.Fee memory _defaultBaseRedeemFee
    ) {
        _grantRole(ADMIN, msg.sender);
        _grantRole(OPERATOR, msg.sender);

        _setRoleAdmin(ADMIN, ADMIN);
        _setRoleAdmin(OPERATOR, ADMIN);
        _setRoleAdmin(ROOT_CREATOR, OPERATOR);
        _setRoleAdmin(REVERSE_CREATOR, OPERATOR);

        defaultSetupFee = _defaultSetupFee;
        defaultUpdateFee = _defaultUpdateFee;
        defaultBaseRedeemFee = _defaultBaseRedeemFee;
        validRedeemToken[_defaultBaseRedeemFee.token] = true;
    }

    function createReverse(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address[] calldata _erc721,
        address _tokenReceiver,
        address _forwarder,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external returns (address reverse) {
        if (approveOnly && !hasRole(ROOT_CREATOR, msg.sender)) {
            require(hasRole(REVERSE_CREATOR, msg.sender), "not reverse operator");
        }
        if (!hasRole(ROOT_CREATOR, msg.sender) && (_method == RedeemProtocolType.RedeemMethod.Transfer || _method == RedeemProtocolType.RedeemMethod.Burn)) {
            for (uint i = 0; i < _erc721.length; i++) {
                require(IERC721Ownable(_erc721[i]).owner() == msg.sender, "not ERC721 owner");
            }
        }
        if (_method == RedeemProtocolType.RedeemMethod.Transfer) {
            require(_tokenReceiver != address(0), "tokenReceiver must be set");
        }

        // avoid stack too deep error
        {
        RedeemProtocolType.Fee memory baseRedeemFee = designateBaseRedeemFee[msg.sender].token == address(0) ? defaultBaseRedeemFee : designateBaseRedeemFee[msg.sender];
        RedeemProtocolType.Fee memory updateFee = defaultUpdateFee;
        if (designateUpdateFee[msg.sender].token != address(0)) {
            updateFee.token = designateUpdateFee[msg.sender].token;
            updateFee.amount = designateUpdateFee[msg.sender].amount;
        }
        // bytecode must be encoded with abi.encodePacked
        bytes memory bytecode = abi.encodePacked(type(RedeemProtocolReverse).creationCode, abi.encode(msg.sender, _forwarder, updateFee, baseRedeemFee));
        bytes32 salt = keccak256(abi.encode(msg.sender, block.chainid, reverseSalt.current()));
        reverseSalt.increment();
        reverse = Create2.deploy(0, salt, bytecode);
        }
        RedeemProtocolReverse(reverse).initialize(_method, _redeemAmount, _erc721, _tokenReceiver);
        allReverses.push(reverse);

        // avoid stack too deep error
        {
        RedeemProtocolType.Fee memory setupFee = defaultSetupFee;
        if (designateSetupFee[msg.sender].token != address(0)) {
            setupFee.token = designateSetupFee[msg.sender].token;
            setupFee.amount = designateSetupFee[msg.sender].amount;
        }

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(setupFee.token).permit(msg.sender, address(this), setupFee.amount, _deadline, _v, _r, _s);
        }
        IERC20Permit(setupFee.token).transferFrom(msg.sender, address(this), setupFee.amount);
        }
        emit ReverseCreated(msg.sender, reverse);
    }


    // operator methods
    function flipApprovedOnly() public onlyRole(OPERATOR) {
        approveOnly = !approveOnly;
    }

    // NOTE: combine setDefault* as a single function for reducing code size?
    function setDefaultSetupFee(uint256 _amount, address _token) external onlyRole(OPERATOR) {
        require(_token != address(0), "invalid token");
        defaultSetupFee.amount = _amount;
        defaultSetupFee.token = _token;
    }

    function setDefaultUpdateFee(uint256 _amount, address _token) external onlyRole(OPERATOR) {
        require(_token != address(0), "invalid token");
        defaultUpdateFee.amount = _amount;
        defaultUpdateFee.token = _token;
    }

    function setDefaultBaseRedeemFee(uint256 _amount, address _token) external onlyRole(OPERATOR) {
        require(_token != address(0), "invalid token");
        require(validRedeemToken[_token], "not acceptable token");
        defaultBaseRedeemFee.amount = _amount;
        defaultBaseRedeemFee.token = _token;
    }

    function setDesignateSetupFee(address _account, uint256 _amount, address _token) external onlyRole(OPERATOR) {
        require(_token != address(0), "invalid token");
        designateSetupFee[_account].amount = _amount;
        designateSetupFee[_account].token = _token;
    }

    function setDesignateUpdateFee(address _account, uint256 _amount, address _token) external onlyRole(OPERATOR) {
        require(_token != address(0), "invalid token");
        designateUpdateFee[_account].amount = _amount;
        designateUpdateFee[_account].token = _token;
    }

    function setDesignateBaseRedeemFee(address _account, uint256 _amount, address _token) external onlyRole(OPERATOR) {
        require(_token != address(0), "invalid token");
        require(validRedeemToken[_token], "not acceptable token");
        designateBaseRedeemFee[_account].amount = _amount;
        designateBaseRedeemFee[_account].token = _token;
    }

    function flipValidRedeemToken(address _token) external onlyRole(OPERATOR) {
        validRedeemToken[_token] = !validRedeemToken[_token];
    }

    // reverse methods
    // NOTE: can we just manipunate the reverse directly?
    function setUpdateFee(address _reverse, uint256 _amount, address _token) external onlyRole(OPERATOR) {
        RedeemProtocolReverse(_reverse).setUpdateFee(_amount, _token);
    }

    function setBaseRedeemFee(address _reverse, uint256 _amount, address _token) external onlyRole(OPERATOR) {
        RedeemProtocolReverse(_reverse).setBaseRedeemFee(_amount, _token);
    }

    function setRedeemAmount(address _reverse, uint256 _amount) external onlyRole(OPERATOR) {
        RedeemProtocolReverse(_reverse).setRedeemAmount(_amount);
    }

    // admin methods
    function pauseReverse(address _reverse) external onlyRole(ADMIN) {
        RedeemProtocolReverse(_reverse).pause();
    }

    function withdraw(address _token, uint256 _amount, address _receiver) external nonReentrant onlyRole(ADMIN) {
        require(IERC20Permit(_token).balanceOf(address(this)) >= _amount, "not enough balance");
        IERC20Permit(_token).transfer(_receiver, _amount);
    }

    function withdrawReverse(address _reverse, address _token, uint256 _amount, address _receiver) external nonReentrant onlyRole(ADMIN) {
        RedeemProtocolReverse(_reverse).withdrawByFactory(_token, _amount, _receiver);
    }

    function depositReverse(address _reverse, address _token, uint256 _amount) external nonReentrant onlyRole(ADMIN) {
        RedeemProtocolReverse(_reverse).depositByFactory(_token, _amount);
        IERC20Permit(_token).transferFrom(msg.sender, _reverse, _amount);
    }
}