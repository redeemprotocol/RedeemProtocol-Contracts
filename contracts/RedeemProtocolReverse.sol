
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./libraries/RedeemProtocolType.sol";
import "./interfaces/IERC721.sol";
import "./interfaces/IERC721Burnable.sol";
import "./interfaces/IERC721Ownable.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IERC20Permit.sol";

// NOTE: probably don't use ERC2771Context since _trustedForwarder is immutable
contract RedeemProtocolReverse is AccessControl, ReentrancyGuard, ERC2771Context, Pausable {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant OPERATOR = keccak256("OPERATOR");
    bytes32 private constant DEFAULT_CUSTOM_ID = "DEFAULT_CUSTOM_ID";

    address public factory;
    mapping(address => uint256) public lockedBalance;
    mapping(address => uint256) public freeBalance;

    RedeemProtocolType.Fee public updateFee;
    RedeemProtocolType.Fee public baseRedeemFee;

    address[] public erc721;
    uint256 public redeemAmount;
    RedeemProtocolType.RedeemMethod public redeemMethod;
    address public tokenReceiver;

    mapping(address => mapping(uint256 => mapping(bytes32 => bool))) public isRedeemed;

    event Redeemed(
        address indexed contract_addr,
        uint256 indexed token_id,
        RedeemProtocolType.RedeemMethod indexed redeem_method,
        address redeemer,
        bytes32 customId
    );
    // TODO: check test ID purpose

    constructor(
        address reverseOp,
        address forwarder,
        RedeemProtocolType.Fee memory _updateFee,
        RedeemProtocolType.Fee memory _baseRedeemFee
    ) ERC2771Context(forwarder) {
        factory = msg.sender;

        _grantRole(ADMIN, reverseOp);
        _grantRole(OPERATOR, reverseOp);
        _setRoleAdmin(ADMIN, ADMIN);
        _setRoleAdmin(OPERATOR, ADMIN);

        updateFee = _updateFee;
        baseRedeemFee = _baseRedeemFee;
    }

    modifier onlyFactory(){
        require(msg.sender == factory, "only factory");
        _;
    }

    // end users methods
    // NOTE: do we really need this function?
    function getRedeemFee() public view returns (address, uint256) {
        uint256 total = redeemAmount + lockedBalance[baseRedeemFee.token] + freeBalance[baseRedeemFee.token];
        if (total < baseRedeemFee.amount) {
            return (baseRedeemFee.token, baseRedeemFee.amount);
        }

        return (baseRedeemFee.token, redeemAmount);
    }

    function _payFee(uint256 _redeemFee) private {
        if (_redeemFee < baseRedeemFee.amount) {
            uint256 gap = baseRedeemFee.amount - _redeemFee;
            uint256 deductLockedAmount = lockedBalance[baseRedeemFee.token] < gap ? lockedBalance[baseRedeemFee.token] : gap;
            uint256 deductFreeAmount = freeBalance[baseRedeemFee.token] < gap - deductLockedAmount ? freeBalance[baseRedeemFee.token] : gap - deductLockedAmount;
            // NOTE: this would be very likely to fail if _redeemFee was very old state
            require(_redeemFee + deductLockedAmount + deductFreeAmount == baseRedeemFee.amount, "fee error");
            lockedBalance[baseRedeemFee.token] -= deductLockedAmount;
            freeBalance[baseRedeemFee.token] -= deductFreeAmount;
        } else {
            freeBalance[baseRedeemFee.token] += _redeemFee - baseRedeemFee.amount;
        }
    }

    // NOTE: redeem fee also support meta tx?
    function redeemWithMark(
        address _contractAddr,
        uint256 _tokenId,
        bytes32 _customId,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external whenNotPaused {
        if (_customId[0] == 0) {
            _customId = DEFAULT_CUSTOM_ID;
        }
        require(redeemMethod == RedeemProtocolType.RedeemMethod.Mark, "redeem method is not mark");
        require(isRedeemed[_contractAddr][_tokenId][_customId] == false, "token has been redeemed");
        require(IERC721(_contractAddr).ownerOf(_tokenId) == _msgSender(), "not token owner");
        require(_validateERC721(_contractAddr), "not valid ERC721");

        (, uint256 redeemFee) = getRedeemFee();
        _payFee(redeemFee);
        isRedeemed[_contractAddr][_tokenId][_customId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(baseRedeemFee.token).permit(_msgSender(), address(this), redeemFee, _deadline, _v, _r, _s);
        }
        IERC20Permit(baseRedeemFee.token).transferFrom(_msgSender(), address(this), redeemFee);
        // // NOTE: do we really need this check?
        require(IERC20(baseRedeemFee.token).balanceOf(address(this)) >= lockedBalance[baseRedeemFee.token] + freeBalance[baseRedeemFee.token], "wrong balance");
        emit Redeemed(_contractAddr, _tokenId, RedeemProtocolType.RedeemMethod.Mark, _msgSender(), _customId);
    }

    function redeemWithTransfer(
        address _contractAddr,
        uint256 _tokenId,
        bytes32 _customId,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external whenNotPaused {
        if (_customId[0] == 0) {
            _customId = DEFAULT_CUSTOM_ID;
        }
        require(redeemMethod == RedeemProtocolType.RedeemMethod.Transfer, "redeem method is not transfer");
        require(isRedeemed[_contractAddr][_tokenId][_customId] == false, "token has been redeemed");
        require(_validateERC721(_contractAddr), "not valid ERC721");

        (, uint256 redeemFee) = getRedeemFee();
        _payFee(redeemFee);
        isRedeemed[_contractAddr][_tokenId][_customId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(baseRedeemFee.token).permit(_msgSender(), address(this), redeemFee, _deadline, _v, _r, _s);
        }
        IERC20Permit(baseRedeemFee.token).transferFrom(_msgSender(), address(this), redeemFee);
        IERC721(_contractAddr).safeTransferFrom(_msgSender(), tokenReceiver, _tokenId);
        // NOTE: do we really need this check?
        require(IERC20(baseRedeemFee.token).balanceOf(address(this)) >= lockedBalance[baseRedeemFee.token] + freeBalance[baseRedeemFee.token], "wrong balance");
        emit Redeemed(_contractAddr, _tokenId, RedeemProtocolType.RedeemMethod.Transfer, _msgSender(), _customId);
    }

    function redeemWithBurn(
        address _contractAddr,
        uint256 _tokenId,
        bytes32 _customId,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external whenNotPaused {
        if (_customId[0] == 0) {
            _customId = DEFAULT_CUSTOM_ID;
        }
        require(redeemMethod == RedeemProtocolType.RedeemMethod.Burn, "redeem method is not burn");
        require(isRedeemed[_contractAddr][_tokenId][_customId] == false, "token has been redeemed");
        require(_validateERC721(_contractAddr), "not valid ERC721");

        (, uint256 redeemFee) = getRedeemFee();
        _payFee(redeemFee);
        isRedeemed[_contractAddr][_tokenId][_customId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(baseRedeemFee.token).permit(_msgSender(), address(this), redeemFee, _deadline, _v, _r, _s);
        }
        IERC20Permit(baseRedeemFee.token).transferFrom(_msgSender(), address(this), redeemFee);
        IERC721Burnable(_contractAddr).burn(_tokenId);
        // NOTE: do we really need this check?
        require(IERC20(baseRedeemFee.token).balanceOf(address(this)) >= lockedBalance[baseRedeemFee.token] + freeBalance[baseRedeemFee.token], "wrong balance");
        emit Redeemed(_contractAddr, _tokenId, RedeemProtocolType.RedeemMethod.Burn, _msgSender(), _customId);
    }

    function updateReverse(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address[] calldata _erc721,
        address _tokenReceiver,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external onlyRole(OPERATOR) whenNotPaused {
        if (_method == RedeemProtocolType.RedeemMethod.Transfer || _method == RedeemProtocolType.RedeemMethod.Burn) {
            for (uint i = 0; i < _erc721.length; i++) {
                require(IERC721Ownable(_erc721[i]).owner() == msg.sender, "must be owner of ERC721");
            }
        }
        if (_method == RedeemProtocolType.RedeemMethod.Transfer) {
            require(_tokenReceiver != address(0), "not valid token receiver");
        }
        _updateReverse(_method, _redeemAmount, _erc721, _tokenReceiver);

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(updateFee.token).permit(msg.sender, address(this), updateFee.amount, _deadline, _v, _r, _s);
        }
        IERC20Permit(updateFee.token).transferFrom(msg.sender, address(this), updateFee.amount);
    }

    function _updateReverse(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address[] calldata _erc721,
        address _tokenReceiver
    ) private {
        redeemMethod = _method;
        redeemAmount = _redeemAmount;
        erc721 = _erc721;
        tokenReceiver = _tokenReceiver;
    }

    // admin methods
    function grantOperator(address _operator) external onlyRole(ADMIN) whenNotPaused {
        grantRole(OPERATOR, _operator);
    }

    function withdraw(address _token, uint256 _amount, address _receiver) external nonReentrant onlyRole(ADMIN) whenNotPaused {
        require(freeBalance[_token] >= _amount, "not enough balance");
        freeBalance[_token] -= _amount;
        IERC20(_token).transfer(_receiver, _amount);
    }

    // factory methods
    function initialize(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address[] calldata _erc721,
        address _tokenReceiver
    ) external onlyFactory whenNotPaused {
        _updateReverse(_method, _redeemAmount, _erc721, _tokenReceiver);
    }

    function pause() external onlyFactory {
        _pause();
    }

    function setUpdateFee(uint256 _amount, address _token) external onlyFactory {
        require(_token != address(0), "invalid token");
        updateFee.amount = _amount;
        updateFee.token = _token;
    }

    function setBaseRedeemFee(uint256 _amount, address _token) external onlyFactory {
        require(_token != address(0), "invalid token");
        baseRedeemFee.amount = _amount;
        baseRedeemFee.token = _token;
    }

    function setRedeemAmount(uint256 _amount) external onlyFactory {
        redeemAmount = _amount;
    }

    function withdrawByFactory(address _token, uint256 _amount, address _receiver) external nonReentrant onlyFactory {
        require(IERC20(_token).balanceOf(address(this)) - _amount >= lockedBalance[_token] + freeBalance[_token], "wrong balance");
        IERC20(_token).transfer(_receiver, _amount);
    }

    function depositByFactory(address _token, uint256 _amount) external nonReentrant onlyFactory {
        lockedBalance[_token] += _amount;
    }

    // others
    function _msgSender() internal view override(Context, ERC2771Context) returns(address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns(bytes calldata) {
        return ERC2771Context._msgData();
    }

    // NOTE: better way to determine if contractAddr in erc721?
    function _validateERC721(address _contractAddr) private view returns (bool) {
        for (uint i = 0; i < erc721.length; i++) {
            if (erc721[i] == _contractAddr) {
                return true;
            }
        }

        return false;
    }
}
