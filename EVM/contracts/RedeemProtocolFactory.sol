// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import { RedeemProtocolType } from "./libraries/RedeemProtocolType.sol";
import "./interfaces/IERC20Permit.sol";
import "./RedeemProtocolRealm.sol";

contract RedeemProtocolFactory is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    using RedeemProtocolType for RedeemProtocolType.Fee;
    
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant OPERATOR = keccak256("OPERATOR");
    bytes32 public constant ROOT_CREATOR = keccak256("ROOT_CREATOR");
    bytes32 public constant REALM_CREATOR = keccak256("REALM_CREATOR");

    Counters.Counter private realmSalt;
    bool public approveOnly = true;
    RedeemProtocolType.Fee public defaultSetupFee;
    RedeemProtocolType.Fee public defaultUpdateFee;
    RedeemProtocolType.Fee public defaultBaseRedeemFee;
    mapping(address => RedeemProtocolType.Fee) public designateSetupFee;
    mapping(address => RedeemProtocolType.Fee) public designateUpdateFee;
    mapping(address => RedeemProtocolType.Fee) public designateBaseRedeemFee;
    mapping(address => bool) public validRedeemToken;
    address public feeReceiver;

    address[] public allRealms;

    event RealmCreated(address indexed creator, address realm);

    constructor(
        RedeemProtocolType.Fee memory _defaultSetupFee,
        RedeemProtocolType.Fee memory _defaultUpdateFee,
        RedeemProtocolType.Fee memory _defaultBaseRedeemFee,
        address _feeReceiver
    ) {
        _grantRole(ADMIN, msg.sender);
        _grantRole(OPERATOR, msg.sender);

        _setRoleAdmin(ADMIN, ADMIN);
        _setRoleAdmin(OPERATOR, ADMIN);
        _setRoleAdmin(ROOT_CREATOR, OPERATOR);
        _setRoleAdmin(REALM_CREATOR, OPERATOR);

        defaultSetupFee = _defaultSetupFee;
        defaultUpdateFee = _defaultUpdateFee;
        defaultBaseRedeemFee = _defaultBaseRedeemFee;
        validRedeemToken[_defaultBaseRedeemFee.token] = true;
        feeReceiver = _feeReceiver;
    }

    function createRealm(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address _tokenReceiver,
        address _forwarder,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external returns (address realm) {
        if (approveOnly && !hasRole(ROOT_CREATOR, msg.sender)) {
            require(hasRole(REALM_CREATOR, msg.sender), "not realm operator");
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
        bytes memory bytecode = abi.encodePacked(type(RedeemProtocolRealm).creationCode, abi.encode(msg.sender, _forwarder, updateFee, baseRedeemFee));
        bytes32 salt = keccak256(abi.encode(msg.sender, block.chainid, realmSalt.current()));
        realmSalt.increment();
        realm = Create2.deploy(0, salt, bytecode);
        }
        RedeemProtocolRealm(realm).initialize(_method, _redeemAmount, _tokenReceiver);
        allRealms.push(realm);

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
        bool ok = IERC20Permit(setupFee.token).transferFrom(msg.sender, feeReceiver, setupFee.amount);
        require(ok, "fee payment failed");
        }
        emit RealmCreated(msg.sender, realm);
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

    // realm methods
    // NOTE: can we just manipunate the realm directly?
    function setUpdateFee(address _realm, uint256 _amount, address _token) external onlyRole(OPERATOR) {
        RedeemProtocolRealm(_realm).setUpdateFee(_amount, _token);
    }

    function setBaseRedeemFee(address _realm, uint256 _amount, address _token) external onlyRole(OPERATOR) {
        RedeemProtocolRealm(_realm).setBaseRedeemFee(_amount, _token);
    }

    function setRedeemAmount(address _realm, uint256 _amount) external onlyRole(OPERATOR) {
        RedeemProtocolRealm(_realm).setRedeemAmount(_amount);
    }

    // admin methods
    function pauseRealm(address _realm) external onlyRole(ADMIN) {
        RedeemProtocolRealm(_realm).pause();
    }

    function withdraw(address _token, uint256 _amount, address _receiver) external nonReentrant onlyRole(ADMIN) {
        require(IERC20Permit(_token).balanceOf(address(this)) >= _amount, "not enough balance");
        bool ok = IERC20Permit(_token).transfer(_receiver, _amount);
        require(ok, "withdraw failed");
    }

    function setFeeReceiver(address _feeReceiver) external onlyRole(ADMIN) {
        feeReceiver = _feeReceiver;
    }
}
