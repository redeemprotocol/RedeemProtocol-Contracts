// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "./IERC20.sol";

interface IERC20Permit is IERC20 {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function nonces(address owner) external view returns (uint);
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
}
