// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyDAppToken
 * @dev ERC-20 Token cho DApp TokProp
 * Symbol: MDT
 * Decimals: 18
 * Initial Supply: 1,000,000 MDT
 */
contract MyDAppToken is ERC20, Ownable {
    /**
     * @dev Constructor mints initial supply cho deployer
     */
    constructor() ERC20("MyDAppToken", "MDT") Ownable(msg.sender) {
        // Mint 1,000,000 tokens với 18 decimals
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @dev Mint thêm token (chỉ owner)
     * @param to Địa chỉ nhận token
     * @param amount Số lượng token (đã bao gồm decimals)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn token
     * @param amount Số lượng token cần burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
    