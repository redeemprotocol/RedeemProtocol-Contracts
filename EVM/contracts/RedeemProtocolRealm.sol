// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

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
import "./interfaces/IERC6672.sol";

// NOTE: probably don't use ERC2771Context since _trustedForwarder is immutable
contract RedeemProtocolRealm is
    AccessControl,
    ReentrancyGuard,
    ERC2771Context,
    Pausable
{
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant OPERATOR = keccak256("OPERATOR");

    bytes4 private constant erc721Interface = 0x80ac58cd;
    bytes4 private constant erc6672Interface = 0x4dddf83f;

    address public factory;

    RedeemProtocolType.Fee public updateFee;
    RedeemProtocolType.Fee public baseRedeemFee;

    uint256 public redeemAmount;
    RedeemProtocolType.RedeemMethod public redeemMethod;
    address public tokenReceiver;

    mapping(address => mapping(uint256 => mapping(bytes32 => bool)))
        private isRedeemed;

    event Redeemed(
        address indexed contractAddress,
        uint256 indexed tokenId,
        RedeemProtocolType.RedeemMethod indexed redeemMethod,
        address redeemer,
        bytes32 redemptionId
    );

    event Updated(
        uint256 indexed redeemAmount,
        RedeemProtocolType.RedeemMethod indexed redeemMethod,
        address indexed tokenReceiver
    );

    event Cancel(
        address indexed contractAddress,
        uint256 indexed tokenId,
        RedeemProtocolType.RedeemMethod indexed redeemMethod,
        address redeemer,
        bytes32 redemptionId
    );

    constructor(
        address realmOp,
        address forwarder,
        RedeemProtocolType.Fee memory _updateFee,
        RedeemProtocolType.Fee memory _baseRedeemFee
    ) ERC2771Context(forwarder) {
        factory = msg.sender;

        _grantRole(ADMIN, realmOp);
        _grantRole(OPERATOR, realmOp);
        _setRoleAdmin(ADMIN, ADMIN);
        _setRoleAdmin(OPERATOR, ADMIN);

        updateFee = _updateFee;
        baseRedeemFee = _baseRedeemFee;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "only factory");
        _;
    }

    function isRedeemable(
        address _contractAddress,
        uint256 _tokenId,
        bytes32 _redemptionId
    ) public view returns (bool) {
        if (IERC165(_contractAddress).supportsInterface(erc6672Interface)) {
            return
                IERC6672(_contractAddress).isRedeemed(
                    address(this),
                    _redemptionId,
                    _tokenId
                ) == false;
        } else {
            require(
                IERC165(_contractAddress).supportsInterface(erc721Interface),
                "Realm: not ERC721 token"
            );
            require(
                IERC721(_contractAddress).ownerOf(_tokenId) != address(0),
                "Realm: Invalid token ID"
            );
            return
                isRedeemed[_contractAddress][_tokenId][_redemptionId] == false;
        }
    }

    function redeemWithMark(
        address _contractAddress,
        uint256 _tokenId,
        bytes32 _redemptionId,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external whenNotPaused {
        require(
            redeemMethod == RedeemProtocolType.RedeemMethod.Mark,
            "Realm: method is not mark"
        );
        require(
            isRedeemable(_contractAddress, _tokenId, _redemptionId),
            "Realm: token has been redeemed"
        );
        if (hasRole(OPERATOR, msg.sender) == false) {
            require(
                IERC721(_contractAddress).ownerOf(_tokenId) == _msgSender(),
                "Realm: not token owner"
            );
        }

        isRedeemed[_contractAddress][_tokenId][_redemptionId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0) {
            IERC20Permit(baseRedeemFee.token).permit(
                msg.sender,
                address(this),
                redeemAmount,
                _deadline,
                _v,
                _r,
                _s
            );
        }
        bool ok = IERC20Permit(baseRedeemFee.token).transferFrom(
            msg.sender,
            address(this),
            redeemAmount
        );
        require(ok, "Realm: fee payment failed");
        ok = IERC20(baseRedeemFee.token).transfer(
            RedeemProtocolFactory(factory).feeReceiver(),
            baseRedeemFee.amount
        );
        require(ok, "Realm: base redeem fee payment failed");
        if (IERC165(_contractAddress).supportsInterface(erc6672Interface)) {
            IERC6672(_contractAddress).redeem(
                _redemptionId,
                _tokenId,
                "Redeem With Mark"
            );
        }
        emit Redeemed(
            _contractAddress,
            _tokenId,
            RedeemProtocolType.RedeemMethod.Mark,
            _msgSender(),
            _redemptionId
        );
    }

    function redeemWithTransfer(
        address _contractAddress,
        uint256 _tokenId,
        bytes32 _redemptionId,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external whenNotPaused {
        require(
            redeemMethod == RedeemProtocolType.RedeemMethod.Transfer,
            "Realm: method is not transfer"
        );
        require(
            isRedeemable(_contractAddress, _tokenId, _redemptionId),
            "Realm: token has been redeemed"
        );

        isRedeemed[_contractAddress][_tokenId][_redemptionId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0) {
            IERC20Permit(baseRedeemFee.token).permit(
                msg.sender,
                address(this),
                redeemAmount,
                _deadline,
                _v,
                _r,
                _s
            );
        }
        bool ok = IERC20Permit(baseRedeemFee.token).transferFrom(
            msg.sender,
            address(this),
            redeemAmount
        );
        require(ok, "fee payment failed");
        ok = IERC20(baseRedeemFee.token).transfer(
            RedeemProtocolFactory(factory).feeReceiver(),
            baseRedeemFee.amount
        );
        require(ok, "base redeem fee payment failed");

        IERC721(_contractAddress).safeTransferFrom(
            _msgSender(),
            tokenReceiver,
            _tokenId
        );
        if (IERC165(_contractAddress).supportsInterface(erc6672Interface)) {
            IERC6672(_contractAddress).redeem(
                _redemptionId,
                _tokenId,
                "Redeem With Transfer"
            );
        }
        emit Redeemed(
            _contractAddress,
            _tokenId,
            RedeemProtocolType.RedeemMethod.Transfer,
            _msgSender(),
            _redemptionId
        );
    }

    function redeemWithBurn(
        address _contractAddress,
        uint256 _tokenId,
        bytes32 _redemptionId,
        uint _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external whenNotPaused {
        require(
            redeemMethod == RedeemProtocolType.RedeemMethod.Burn,
            "Realm: method is not burn"
        );
        require(
            isRedeemable(_contractAddress, _tokenId, _redemptionId),
            "Realm: token has been redeemed"
        );

        isRedeemed[_contractAddress][_tokenId][_redemptionId] = true;

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0) {
            IERC20Permit(baseRedeemFee.token).permit(
                msg.sender,
                address(this),
                redeemAmount,
                _deadline,
                _v,
                _r,
                _s
            );
        }
        bool ok = IERC20Permit(baseRedeemFee.token).transferFrom(
            msg.sender,
            address(this),
            redeemAmount
        );
        require(ok, "fee payment failed");
        ok = IERC20(baseRedeemFee.token).transfer(
            RedeemProtocolFactory(factory).feeReceiver(),
            baseRedeemFee.amount
        );
        require(ok, "base redeem fee payment failed");
        if (IERC165(_contractAddress).supportsInterface(erc6672Interface)) {
            IERC6672(_contractAddress).redeem(
                _redemptionId,
                _tokenId,
                "Redeem With Burn"
            );
        }
        IERC721Burnable(_contractAddress).burn(_tokenId);

        emit Redeemed(
            _contractAddress,
            _tokenId,
            RedeemProtocolType.RedeemMethod.Burn,
            _msgSender(),
            _redemptionId
        );
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
            require(
                _tokenReceiver != address(0),
                "Realm: tokenReceiver must be set"
            );
        }
        require(
            _redeemAmount >= baseRedeemFee.amount,
            "Realm: redeemAmount must be greater than baseRedeemFee"
        );
        _updateRealm(_method, _redeemAmount, _tokenReceiver);

        if (_deadline != 0 && _v != 0 && _r[0] != 0 && _s[0] != 0) {
            IERC20Permit(updateFee.token).permit(
                msg.sender,
                address(this),
                updateFee.amount,
                _deadline,
                _v,
                _r,
                _s
            );
        }

        bool ok = IERC20Permit(updateFee.token).transferFrom(
            msg.sender,
            RedeemProtocolFactory(factory).feeReceiver(),
            updateFee.amount
        );
        require(ok, "Realm: fee payment failed");
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
    function grantOperator(
        address _operator
    ) external onlyRole(ADMIN) whenNotPaused {
        grantRole(OPERATOR, _operator);
    }

    function withdraw(
        address _token,
        uint256 _amount,
        address _receiver
    ) external nonReentrant onlyRole(ADMIN) whenNotPaused {
        bool ok = IERC20(_token).transfer(_receiver, _amount);
        require(ok, "Realm: withdraw failed");
    }

    // factory methods
    function initialize(
        RedeemProtocolType.RedeemMethod _method,
        uint256 _redeemAmount,
        address _tokenReceiver
    ) external onlyFactory whenNotPaused {
        require(
            _redeemAmount >= baseRedeemFee.amount,
            "Realm: redeemAmount must be greater than baseRedeemFee"
        );
        _updateRealm(_method, _redeemAmount, _tokenReceiver);
    }

    function pause() external onlyFactory {
        _pause();
    }

    function setUpdateFee(
        uint256 _amount,
        address _token
    ) external onlyFactory {
        require(_token != address(0), "Realm: invalid token");
        updateFee.amount = _amount;
        updateFee.token = _token;
    }

    function setBaseRedeemFee(
        uint256 _amount,
        address _token
    ) external onlyFactory {
        require(_token != address(0), "Realm: invalid token");
        baseRedeemFee.amount = _amount;
        baseRedeemFee.token = _token;
        if (_amount > redeemAmount) {
            redeemAmount = _amount;
        }
    }

    function setRedeemAmount(uint256 _amount) external onlyFactory {
        require(
            _amount >= baseRedeemFee.amount,
            "Realm: redeemAmount must be greater than baseRedeemFee"
        );
        redeemAmount = _amount;
    }

    function editRedemption(
        address _contractAddress,
        uint256 _tokenId,
        bytes32 _redemptionId,
        bool _isRedeemed
    ) external onlyRole(OPERATOR) {
        isRedeemed[_contractAddress][_tokenId][_redemptionId] = _isRedeemed;
        if (IERC165(_contractAddress).supportsInterface(erc6672Interface)) {
            if (_isRedeemed) {
                IERC6672(_contractAddress).redeem(
                    _redemptionId,
                    _tokenId,
                    "Redeem With Operator admin"
                );
            } else {
                IERC6672(_contractAddress).cancel(
                    _redemptionId,
                    _tokenId,
                    "Cancel With Operator admin"
                );
            }
        }
    }

    // others
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }
}
