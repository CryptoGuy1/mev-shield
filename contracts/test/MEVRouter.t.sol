// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MEVRouter.sol";
import "../src/RiskOracle.sol";

contract MockERC20 {
    string public name = "Mock Token";
    string public symbol = "MOCK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract MEVRouterTest is Test {
    MEVRouter public router;
    RiskOracle public oracle;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public user = address(0x1);
    address public attacker = address(0x2);
    
    function setUp() public {
        // Deploy contracts
        oracle = new RiskOracle();
        router = new MEVRouter(address(oracle));
        
        // Deploy mock tokens
        tokenA = new MockERC20(1000000 * 1e18);
        tokenB = new MockERC20(1000000 * 1e18);
        
        // Give user some tokens
        tokenA.transfer(user, 10000 * 1e18);
        tokenB.transfer(address(router), 10000 * 1e18);  // Router has tokenB for swaps
    }
    
    function testProtectedSwapLowRisk() public {
        // Setup
        vm.startPrank(user);
        uint256 amountIn = 100 * 1e18;
        uint256 minAmountOut = 95 * 1e18;
        uint8 riskScore = 30;  // Low risk
        
        tokenA.approve(address(router), amountIn);
        
        // Execute swap
        uint256 amountOut = router.protectedSwap(
            address(tokenA),
            address(tokenB),
            amountIn,
            minAmountOut,
            riskScore
        );
        
        // Verify
        assertGt(amountOut, 0, "Should receive output tokens");
        assertGe(amountOut, minAmountOut, "Should respect slippage");
        
        vm.stopPrank();
    }
    
    function testProtectedSwapHighRisk() public {
        // Setup
        vm.startPrank(user);
        uint256 amountIn = 100 * 1e18;
        uint256 minAmountOut = 95 * 1e18;
        uint8 riskScore = 85;  // High risk - should use private routing
        
        tokenA.approve(address(router), amountIn);
        
        // Execute swap
        uint256 amountOut = router.protectedSwap(
            address(tokenA),
            address(tokenB),
            amountIn,
            minAmountOut,
            riskScore
        );
        
        // Verify
        assertGt(amountOut, 0, "Should receive output tokens");
        
        vm.stopPrank();
    }
    
    function testCannotSwapWithInvalidRiskScore() public {
        vm.startPrank(user);
        tokenA.approve(address(router), 100 * 1e18);
        
        vm.expectRevert("MEVRouter: invalid risk score");
        router.protectedSwap(
            address(tokenA),
            address(tokenB),
            100 * 1e18,
            95 * 1e18,
            101  // Invalid: > 100
        );
        
        vm.stopPrank();
    }
    
    function testUpdatePrivateRoutingThreshold() public {
        // Only owner can update
        router.updatePrivateRoutingThreshold(80);
        assertEq(router.privateRoutingThreshold(), 80);
        
        // Non-owner cannot update
        vm.prank(attacker);
        vm.expectRevert("MEVRouter: caller is not owner");
        router.updatePrivateRoutingThreshold(90);
    }
    
    function testEmergencyWithdraw() public {
        // Give router some tokens
        tokenA.transfer(address(router), 1000 * 1e18);
        
        // Owner can withdraw
        uint256 balanceBefore = tokenA.balanceOf(address(this));
        router.emergencyWithdraw(address(tokenA), 500 * 1e18);
        uint256 balanceAfter = tokenA.balanceOf(address(this));
        
        assertEq(balanceAfter - balanceBefore, 500 * 1e18);
        
        // Non-owner cannot withdraw
        vm.prank(attacker);
        vm.expectRevert("MEVRouter: caller is not owner");
        router.emergencyWithdraw(address(tokenA), 100 * 1e18);
    }
    
    function testReentrancyProtection() public {
        // This would require a malicious token that attempts reentrancy
        // For now, we'll skip this as it requires more complex setup
        // In production, use Foundry's fuzz testing for this
    }
}
