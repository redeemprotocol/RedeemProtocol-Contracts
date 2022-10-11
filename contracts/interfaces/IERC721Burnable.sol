// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "./IERC721.sol";

interface IERC721Burnable is IERC721 {
    function burn(uint256) external;
}