// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IERC721.sol";

interface IERC721Ownable is IERC721 {
    function owner() external view returns (address);
}