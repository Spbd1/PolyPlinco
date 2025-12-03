// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PolyPlinko Token (PPL)
 * @notice ERC-20 token with FIXED capped supply of 1,000,000 PPL
 * @dev Only the game contract can mint tokens via loss-mining (max 900k)
 * 
 * ALLOCATION:
 * - 10,000 PPL: Developer allocation
 * - 90,000 PPL: Vault/AMM reserve (initial liquidity)
 * - 900,000 PPL: Loss-mining pool (emitted over 9 tiers)
 * 
 * SECURITY: Supply is hard-capped at 1M, no further minting possible after cap
 */
contract PolyPlinkoToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18;
    uint256 public constant DEV_ALLOCATION = 10_000 * 1e18;
    uint256 public constant VAULT_ALLOCATION = 90_000 * 1e18;
    uint256 public constant MINING_ALLOCATION = 900_000 * 1e18;
    
    address public gameContract;
    bool private _initialized;
    
    uint256 public totalMintedFromMining;
    
    event GameContractSet(address indexed gameContract);
    event TokensBurned(address indexed from, uint256 amount);
    event TokensMintedFromLoss(address indexed to, uint256 amount, uint256 totalMinted);
    
    constructor(address _devAddress) ERC20("PolyPlinko Token", "PPL") Ownable(_devAddress) {
        // Mint dev allocation immediately
        _mint(_devAddress, DEV_ALLOCATION);
    }
    
    /**
     * @notice Set the game contract address (only once)
     * @param _gameContract Address of the PolyPlinkoGame contract
     */
    function setGameContract(address _gameContract) external onlyOwner {
        require(gameContract == address(0), "Game contract already set");
        require(_gameContract != address(0), "Invalid game contract");
        gameContract = _gameContract;
        emit GameContractSet(_gameContract);
    }
    
    /**
     * @notice Initialize vault allocation (transfer to game contract for AMM)
     * @dev Called once during deployment setup
     */
    function initializeVaultAllocation() external onlyOwner {
        require(!_initialized, "Already initialized");
        require(gameContract != address(0), "Game contract not set");
        _initialized = true;
        _mint(gameContract, VAULT_ALLOCATION);
    }
    
    /**
     * @notice Mint tokens for loss-mining rewards
     * @dev Only callable by the game contract
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mintFromLossMining(address to, uint256 amount) external {
        require(msg.sender == gameContract, "Only game contract can mint");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        require(totalMintedFromMining + amount <= MINING_ALLOCATION, "Mining allocation exceeded");
        
        totalMintedFromMining += amount;
        _mint(to, amount);
        
        emit TokensMintedFromLoss(to, amount, totalMintedFromMining);
    }
    
    /**
     * @notice Burn tokens (for deflationary mechanics)
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @notice Burn tokens from a specific address (used by swap contract)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) external {
        require(msg.sender == gameContract, "Only game contract can burn");
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
}
