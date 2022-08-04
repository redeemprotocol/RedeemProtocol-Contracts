// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./RedeemProtocolReverse.sol";
import { RedeemProtocolType } from "./libraries/RedeemProtocolType.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IERC20Permit.sol";
import "./interfaces/IERC721Ownable.sol";

contract RedeemProtocolFactory is AccessControl {
    using Counters for Counters.Counter;
    using RedeemProtocolType for RedeemProtocolType.Fee;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");
    bytes32 public constant REVERSE_OPERATOR = keccak256("REVERSE_OPERATOR");

    Counters.Counter private reverseSalt;
    bool public approveOnly = true;
    RedeemProtocolType.Fee public defaultSetupFee;
    RedeemProtocolType.Fee public defaultUpdateFee;
    RedeemProtocolType.Fee public defaultBaseRedeemFee;
    // NOTE: designate fee only defines amount, token type is defined in default fee
    // you must set both designateFeeToken and one of amount (setup, update)
    mapping(address => RedeemProtocolType.Fee) public designateSetupFee;
    mapping(address => RedeemProtocolType.Fee) public designateUpdateFee;
    // mapping(address => address) public designateFeeToken;
    mapping(address => RedeemProtocolType.Fee) public designateBaseRedeemFee;
    mapping(address => bool) public validRedeemToken;

    address[] public allReverses;

    event ReverseCreated(address indexed creator, address reverse);

    // NOTE: implement paybale function for receiving ETH to deploy reverse?
    constructor(
        RedeemProtocolType.Fee memory _defaultSetupFee,
        RedeemProtocolType.Fee memory _defaultUpdateFee,
        RedeemProtocolType.Fee memory _defaultBaseRedeemFee
    ) {
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _setRoleAdmin(OPERATOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(REVERSE_OPERATOR, OPERATOR_ROLE);

        defaultSetupFee = _defaultSetupFee;
        defaultUpdateFee = _defaultUpdateFee;
        defaultBaseRedeemFee = _defaultBaseRedeemFee;
        validRedeemToken[_defaultBaseRedeemFee.token] = true;
    }

    function allReversesLength() external view returns (uint) {
        return allReverses.length;
    }

    function createReverse(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address[] calldata _erc721,
        address _tokenReceiver
    ) external returns (address reverse) {
        if (approveOnly) {
            require(hasRole(REVERSE_OPERATOR, msg.sender), "approved only");
        }
        if (_method == RedeemProtocolType.RedeemMethod.Transfer || _method == RedeemProtocolType.RedeemMethod.Burn) {
            for (uint i = 0; i < _erc721.length; i++) {
                require(IERC721Ownable(_erc721[i]).owner() == msg.sender, "must be owner of ERC721");
            }
        }
        if (_method == RedeemProtocolType.RedeemMethod.Transfer) {
            require(_tokenReceiver != address(0), "tokenReceiver must be set");
        }

        // avoid stack too deep error
        {
        RedeemProtocolType.Fee memory setupFee = defaultSetupFee;
        if (designateSetupFee[msg.sender].token != address(0)) {
            setupFee.token = designateSetupFee[msg.sender].token;
            setupFee.amount = designateSetupFee[msg.sender].amount;
        }
        IERC20(setupFee.token).transferFrom(msg.sender, address(this), setupFee.amount);
        }

        RedeemProtocolType.Fee memory updateFee = defaultUpdateFee;
        if (designateUpdateFee[msg.sender].token != address(0)) {
            updateFee.token = designateUpdateFee[msg.sender].token;
            updateFee.amount = designateUpdateFee[msg.sender].amount;
        }
        RedeemProtocolType.Fee memory baseRedeemFee = designateBaseRedeemFee[msg.sender].token == address(0) ? defaultBaseRedeemFee : designateBaseRedeemFee[msg.sender];
        bytes memory bytecode = abi.encodePacked(type(RedeemProtocolReverse).creationCode, abi.encode(msg.sender, updateFee, baseRedeemFee));
        // NOTE: use counter as reverse ID?
        bytes32 salt = keccak256(abi.encodePacked(reverseSalt.current()));
        reverseSalt.increment();
        reverse = Create2.deploy(0, salt, bytecode);
        RedeemProtocolReverse(reverse).initialize(_method, _redeemAmount, _erc721, _tokenReceiver);

        allReverses.push(reverse);
        emit ReverseCreated(msg.sender, reverse);
    }

    // NOTE: do we really need create with permit?
    function createReverse(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address[] calldata _erc721,
        address _tokenReceiver,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external returns (address reverse) {
        if (approveOnly) {
            require(hasRole(REVERSE_OPERATOR, msg.sender));
        }
        if (_method == RedeemProtocolType.RedeemMethod.Transfer || _method == RedeemProtocolType.RedeemMethod.Burn) {
            for (uint i = 0; i < _erc721.length; i++) {
                require(IERC721Ownable(_erc721[i]).owner() == msg.sender, "must be owner of ERC721");
            }
        }
        if (_method == RedeemProtocolType.RedeemMethod.Transfer) {
            require(_tokenReceiver != address(0), "token receiver must be set");
        }

        // avoid stack too deep error
        {
        RedeemProtocolType.Fee memory setupFee = defaultSetupFee;
        if (designateSetupFee[msg.sender].token != address(0)) {
            setupFee.token = designateSetupFee[msg.sender].token;
            setupFee.amount = designateSetupFee[msg.sender].amount;
        }
        IERC20Permit(setupFee.token).permit(msg.sender, address(this), setupFee.amount, _deadline, _v, _r, _s);
        IERC20Permit(setupFee.token).transferFrom(msg.sender, address(this), setupFee.amount);
        }

        RedeemProtocolType.Fee memory baseRedeemFee = designateBaseRedeemFee[msg.sender].token == address(0) ? defaultBaseRedeemFee : designateBaseRedeemFee[msg.sender];
        RedeemProtocolType.Fee memory updateFee = defaultUpdateFee;
        if (designateUpdateFee[msg.sender].token != address(0)) {
            updateFee.token = designateUpdateFee[msg.sender].token;
            updateFee.amount = designateUpdateFee[msg.sender].amount;
        }
        bytes memory bytecode = abi.encodePacked(type(RedeemProtocolReverse).creationCode, abi.encode(msg.sender, updateFee, baseRedeemFee));
        bytes32 salt = keccak256(abi.encodePacked(reverseSalt.current()));
        reverseSalt.increment();
        reverse = Create2.deploy(0, salt, bytecode);
        RedeemProtocolReverse(reverse).initialize(_method, _redeemAmount, _erc721, _tokenReceiver);

        allReverses.push(reverse);
        emit ReverseCreated(msg.sender, reverse);
    }


    // operator methods
    function flipApprovedOnly() public onlyRole(OPERATOR_ROLE) {
        approveOnly = !approveOnly;
    }

    // NOTE: combine setDefault* as a single function for reducing code size?
    function setDefaultSetupFee(uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        defaultSetupFee.amount = _amount;
        defaultSetupFee.token = _token;
    }

    function setDefaultUpdateFee(uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        defaultUpdateFee.amount = _amount;
        defaultUpdateFee.token = _token;
    }

    function setDefaultBaseRedeemFee(uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        require(validRedeemToken[_token], "token is not valid");
        defaultBaseRedeemFee.amount = _amount;
        defaultBaseRedeemFee.token = _token;
    }

    function setDesignateSetupFee(address _account, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        designateSetupFee[_account].amount = _amount;
        designateSetupFee[_account].token = _token;
    }

    function setDesignateUpdateFee(address _account, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        designateUpdateFee[_account].amount = _amount;
        designateUpdateFee[_account].token = _token;
    }

    function setDesignateBaseRedeemFee(address _account, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        require(validRedeemToken[_token], "token is not valid");
        designateBaseRedeemFee[_account].amount = _amount;
        designateBaseRedeemFee[_account].token = _token;
    }

    function flipValidRedeemToken(address _token) external onlyRole(OPERATOR_ROLE) {
        validRedeemToken[_token] = !validRedeemToken[_token];
    }

    // reverse methods
    // NOTE: can we just manipunate the reverse directly?
    function setUpdateFee(address _reverse, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        RedeemProtocolReverse(_reverse).setUpdateFee(_amount, _token);
    }

    function setBaseRedeemFee(address _reverse, uint256 _amount, address _token) external onlyRole(OPERATOR_ROLE) {
        RedeemProtocolReverse(_reverse).setBaseRedeemFee(_amount, _token);
    }

    function setRedeemAmount(address _reverse, uint256 _amount) external onlyRole(OPERATOR_ROLE) {
        RedeemProtocolReverse(_reverse).setRedeemAmount(_amount);
    }

    // admin methods
    function transferAdmin(address _nextAdmin) external onlyRole(ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, _nextAdmin);
        renounceRole(ADMIN_ROLE, msg.sender);
    }

    function pauseReverse(address _reverse) external onlyRole(ADMIN_ROLE) {
        RedeemProtocolReverse(_reverse).pause();
    }

    function withdraw(address _token, uint256 _amount, address _receiver) external onlyRole(ADMIN_ROLE) {
        require(IERC20(_token).balanceOf(address(this)) >= _amount, "not enough balance");
        IERC20(_token).transferFrom(address(this), _receiver, _amount);
    }

    function withdrawReverse(address _reverse, address _token, uint256 _amount, address _receiver) external onlyRole(ADMIN_ROLE) {
        RedeemProtocolReverse(_reverse).withdrawByFactory(_token, _amount, _receiver);
    }
}
