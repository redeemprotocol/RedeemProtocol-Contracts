// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "./IERC721.sol";

interface IERC721Ownable is IERC721 {
    function owner() external view returns (address);
}