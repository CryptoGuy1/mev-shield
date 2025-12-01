// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";
import {ReentrancyGuard} from "./security/ReentrancyGuard.sol";

/**
 * @title ProtectionVault
 * @notice Secure vault for holding user funds during MEV-protected transactions
 * @dev Provides emergency withdrawal and fee collection mechanisms
 */
contract ProtectionVault is ReentrancyGuard {
    
    // Events
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdrawal(address indexed user, address indexed token, uint256 amount);
    event EmergencyWithdrawal(address indexed user, address indexed token, uint256 amount);
    event FeeCollected(address indexed token, uint256 amount);
    
    // State variables
    address public owner;
    address public router;  // MEVRouter contract
    uint256 public protectionFee = 10;  // 0.1% (10 basis points)
    uint256 public constant MAX_FEE = 100;  // 1% maximum fee
    
    // User balances: user => token => amount
    mapping(address => mapping(address => uint256)) public balances;
    
    // Collected fees: token => amount
    mapping(address => uint256) public collectedFees;
    
    // Emergency pause
    bool public paused;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "ProtectionVault: not owner");
        _;
    }
    
    modifier onlyRouter() {
        require(msg.sender == router, "ProtectionVault: not router");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "ProtectionVault: paused");
        _;
    }
    
    constructor(address _router) {
        owner = msg.sender;
        router = _router;
    }
    
    /**
     * @notice Deposit tokens into vault
     * @param token Token address
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(token != address(0), "ProtectionVault: invalid token");
        require(amount > 0, "ProtectionVault: invalid amount");
        
        // Transfer tokens from user
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "ProtectionVault: transfer failed"
        );
        
        // Calculate fee
        uint256 fee = (amount * protectionFee) / 10000;
        uint256 netAmount = amount - fee;
        
        // Update balances
        balances[msg.sender][token] += netAmount;
        collectedFees[token] += fee;
        
        emit Deposit(msg.sender, token, netAmount);
        emit FeeCollected(token, fee);
    }
    
    /**
     * @notice Withdraw tokens from vault
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "ProtectionVault: invalid amount");
        require(balances[msg.sender][token] >= amount, "ProtectionVault: insufficient balance");
        
        // Update balance
        balances[msg.sender][token] -= amount;
        
        // Transfer tokens to user
        require(
            IERC20(token).transfer(msg.sender, amount),
            "ProtectionVault: transfer failed"
        );
        
        emit Withdrawal(msg.sender, token, amount);
    }
    
    /**
     * @notice Router-initiated withdrawal (for swap execution)
     * @param user User address
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function routerWithdraw(
        address user,
        address token,
        uint256 amount
    ) external onlyRouter nonReentrant returns (bool) {
        require(balances[user][token] >= amount, "ProtectionVault: insufficient balance");
        
        balances[user][token] -= amount;
        
        require(
            IERC20(token).transfer(router, amount),
            "ProtectionVault: transfer failed"
        );
        
        return true;
    }
    
    /**
     * @notice Emergency withdrawal (when paused)
     * @param token Token address
     */
    function emergencyWithdraw(address token) external nonReentrant {
        require(paused, "ProtectionVault: not in emergency mode");
        
        uint256 amount = balances[msg.sender][token];
        require(amount > 0, "ProtectionVault: no balance");
        
        balances[msg.sender][token] = 0;
        
        require(
            IERC20(token).transfer(msg.sender, amount),
            "ProtectionVault: transfer failed"
        );
        
        emit EmergencyWithdrawal(msg.sender, token, amount);
    }
    
    /**
     * @notice Owner withdraws collected fees
     * @param token Token address
     */
    function withdrawFees(address token) external onlyOwner {
        uint256 amount = collectedFees[token];
        require(amount > 0, "ProtectionVault: no fees");
        
        collectedFees[token] = 0;
        
        require(
            IERC20(token).transfer(owner, amount),
            "ProtectionVault: transfer failed"
        );
    }
    
    /**
     * @notice Update protection fee
     * @param newFee New fee in basis points (1 = 0.01%)
     */
    function updateProtectionFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "ProtectionVault: fee too high");
        protectionFee = newFee;
    }
    
    /**
     * @notice Pause/unpause vault
     */
    function togglePause() external onlyOwner {
        paused = !paused;
    }
    
    /**
     * @notice Update router address
     * @param newRouter New router address
     */
    function updateRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "ProtectionVault: invalid router");
        router = newRouter;
    }
    
    /**
     * @notice Get user balance
     * @param user User address
     * @param token Token address
     */
    function getBalance(address user, address token) external view returns (uint256) {
        return balances[user][token];
    }
}
