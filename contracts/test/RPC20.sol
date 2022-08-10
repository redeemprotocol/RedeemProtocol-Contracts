// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract RPC20 is ERC20, Ownable, ERC20Permit {
    constructor() ERC20("RPC20", "RPC") ERC20Permit("RPC20") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}