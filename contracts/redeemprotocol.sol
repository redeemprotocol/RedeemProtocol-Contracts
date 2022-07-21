// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;


import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract RedeemProtocol is Ownable {
    mapping(address => bool) public validContracts;
    mapping(address => mapping(uint256 => bool)) public isRedeemed;

    event Redeem(address indexed _contract, uint256 indexed _tokenId, address _from, address _to, string _type);

    function redeemWithTransfer(address _contract, uint256 _tokenId, address _to) public {
        require(validContracts[_contract], "invalid contract address");
        require(!isRedeemed[_contract][_tokenId], "already redeemed");
        require(_isApprovedOrOwner(_contract, _tokenId, msg.sender), "caller is not owner nor approved");
        IERC721(_contract).safeTransferFrom(msg.sender, _to, _tokenId);
        isRedeemed[_contract][_tokenId] = true;
        emit Redeem(_contract, _tokenId, msg.sender, _to, "transfer");
    }

    function redeemWithBurn(address _contract, uint256 _tokenId) public {
        require(validContracts[_contract], "invalid contract address");
        require(!isRedeemed[_contract][_tokenId], "already redeemed");
        require(_isApprovedOrOwner(_contract, _tokenId, msg.sender), "caller is not owner nor approved");
        ERC721Burnable(_contract).burn(_tokenId);
        isRedeemed[_contract][_tokenId] = true;
        emit Redeem(_contract, _tokenId, msg.sender, address(0), "burn");
    }

    function redeemWithMark(address _contract, uint256 _tokenId) public {
        require(validContracts[_contract], "invalid contract address");
        require(!isRedeemed[_contract][_tokenId], "already redeemed");
        require(_isApprovedOrOwner(_contract, _tokenId, msg.sender), "caller is not owner nor approved");
        isRedeemed[_contract][_tokenId] = true;
        emit Redeem(_contract, _tokenId, msg.sender, address(0), "mark");
    }

    function _isApprovedOrOwner(address _contract, uint256 _tokenId, address _spender) internal view virtual returns (bool) {
        address owner = IERC721(_contract).ownerOf(_tokenId);
        return (_spender == owner || IERC721(_contract).getApproved(_tokenId) == _spender || IERC721(_contract).isApprovedForAll(owner, _spender));
    }

    function setRedeemed(address _contract, uint256 _tokenId, bool _redeemed) public onlyOwner {
        isRedeemed[_contract][_tokenId] = _redeemed;
    }

    function flipValidContract(address _contract) public onlyOwner {
        validContracts[_contract] = !validContracts[_contract];
    }
}
