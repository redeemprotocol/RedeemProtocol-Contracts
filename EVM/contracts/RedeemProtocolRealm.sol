// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libraries/RedeemProtocolType.sol";
import "./interfaces/IERC20Permit.sol";
import "./interfaces/IERC721Burnable.sol";
import "./RedeemProtocolFactory.sol";

// NOTE: probably don't use ERC2771Context since _trustedForwarder is immutable
contract RedeemProtocolRealm is AccessControl, ReentrancyGuard, ERC2771Context, Pausable {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant OPERATOR = keccak256("OPERATOR");
    bytes32 private constant DEFAULT_CUSTOM_ID = "DEFAULT_CUSTOM_ID";

    bytes4 private constant erc721Interface = 0x80ac58cd;

    address public factory;

    RedeemProtocolType.Fee public updateFee;
    RedeemProtocolType.Fee public baseRedeemFee;

    uint256 public redeemAmount;
    RedeemProtocolType.RedeemMethod public redeemMethod;
    address public tokenReceiver;

    mapping(address => mapping(uint256 => mapping(bytes32 => bool))) public isRedeemed;

    event Redeemed(
        address indexed contractAddress,
        uint256 indexed tokenId,
        RedeemProtocolType.RedeemMethod indexed redeemMethod,
        address redeemer,
        bytes32 customId
    );

    event Updated(
        uint256 indexed redeemAmount,
        RedeemProtocolType.RedeemMethod indexed redeemMethod,
        address indexed tokenReceiver
    );

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
        require(IERC165(_contractAddr).supportsInterface(erc721Interface), "not ERC721 token");
        require(redeemMethod == RedeemProtocolType.RedeemMethod.Mark, "method is not mark");
        require(!isRedeemed[_contractAddr][_tokenId][_customId], "token has been redeemed");
        require(IERC721(_contractAddr).ownerOf(_tokenId) == _msgSender(), "not token owner");

        isRedeemed[_contractAddr][_tokenId][_customId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(baseRedeemFee.token).permit(msg.sender, address(this), redeemAmount, _deadline, _v, _r, _s);
        }
        bool ok = IERC20Permit(baseRedeemFee.token).transferFrom(msg.sender, address(this), redeemAmount);
        require(ok, "fee payment failed");
        ok = IERC20(baseRedeemFee.token).transfer(RedeemProtocolFactory(factory).feeReceiver(), baseRedeemFee.amount);
        require(ok, "base redeem fee payment failed");
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
        require(IERC165(_contractAddr).supportsInterface(erc721Interface), "not ERC721 token");
        require(redeemMethod == RedeemProtocolType.RedeemMethod.Transfer, "method is not transfer");
        require(!isRedeemed[_contractAddr][_tokenId][_customId], "token has been redeemed");

        isRedeemed[_contractAddr][_tokenId][_customId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(baseRedeemFee.token).permit(msg.sender, address(this), redeemAmount, _deadline, _v, _r, _s);
        }
        bool ok = IERC20Permit(baseRedeemFee.token).transferFrom(msg.sender, address(this), redeemAmount);
        require(ok, "fee payment failed");
        ok = IERC20(baseRedeemFee.token).transfer(RedeemProtocolFactory(factory).feeReceiver(), baseRedeemFee.amount);
        require(ok, "base redeem fee payment failed");

        IERC721(_contractAddr).safeTransferFrom(_msgSender(), tokenReceiver, _tokenId);
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
        require(IERC165(_contractAddr).supportsInterface(erc721Interface), "not ERC721 token");
        require(redeemMethod == RedeemProtocolType.RedeemMethod.Burn, "method is not burn");
        require(!isRedeemed[_contractAddr][_tokenId][_customId], "token has been redeemed");

        isRedeemed[_contractAddr][_tokenId][_customId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(baseRedeemFee.token).permit(msg.sender, address(this), redeemAmount, _deadline, _v, _r, _s);
        }
        bool ok = IERC20Permit(baseRedeemFee.token).transferFrom(msg.sender, address(this), redeemAmount);
        require(ok, "fee payment failed");
        ok = IERC20(baseRedeemFee.token).transfer(RedeemProtocolFactory(factory).feeReceiver(), baseRedeemFee.amount);
        require(ok, "base redeem fee payment failed");

        IERC721Burnable(_contractAddr).burn(_tokenId);
        emit Redeemed(_contractAddr, _tokenId, RedeemProtocolType.RedeemMethod.Burn, _msgSender(), _customId);
    }

    function updateRealm(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address _tokenReceiver,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external onlyRole(OPERATOR) whenNotPaused {
        if (_method == RedeemProtocolType.RedeemMethod.Transfer) {
            require(_tokenReceiver != address(0), "tokenReceiver must be set");
        }
        require(_redeemAmount >= baseRedeemFee.amount, "redeemAmount must be greater than baseRedeemFee");
        _updateRealm(_method, _redeemAmount, _tokenReceiver);

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0){
            IERC20Permit(updateFee.token).permit(msg.sender, address(this), updateFee.amount, _deadline, _v, _r, _s);
        }

        bool ok = IERC20Permit(updateFee.token).transferFrom(msg.sender, RedeemProtocolFactory(factory).feeReceiver(), updateFee.amount);
        require(ok, "fee payment failed");
    }

    function _updateRealm(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address _tokenReceiver
    ) private {
        redeemMethod = _method;
        redeemAmount = _redeemAmount;
        tokenReceiver = _tokenReceiver;

        emit Updated(_redeemAmount, _method, _tokenReceiver);
    }

    // admin methods
    function grantOperator(address _operator) external onlyRole(ADMIN) whenNotPaused {
        grantRole(OPERATOR, _operator);
    }

    function withdraw(address _token, uint256 _amount, address _receiver) external nonReentrant onlyRole(ADMIN) whenNotPaused {
        bool ok = IERC20(_token).transfer(_receiver, _amount);
        require(ok, "withdraw failed");
    }

    // factory methods
    function initialize(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address _tokenReceiver
    ) external onlyFactory whenNotPaused {
        require(_redeemAmount >= baseRedeemFee.amount, "redeemAmount must be greater than baseRedeemFee");
        _updateRealm(_method, _redeemAmount, _tokenReceiver);
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
        if (_amount > redeemAmount) {
            redeemAmount = _amount;
        }
    }

    function setRedeemAmount(uint256 _amount) external onlyFactory {
        require(_amount >= baseRedeemFee.amount, "redeemAmount must be greater than baseRedeemFee");
        redeemAmount = _amount;
    }

    // others
    function _msgSender() internal view override(Context, ERC2771Context) returns(address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns(bytes calldata) {
        return ERC2771Context._msgData();
    }
}
