// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimeLock
 * @notice Time-delayed order execution for MEV protection
 * @dev Orders are submitted now but executed after delay period
 */
contract TimeLock {
    
    // Order structure
    struct Order {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 executeAfter;
        bool executed;
        bool cancelled;
    }
    
    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 executeAfter
    );
    
    event OrderExecuted(uint256 indexed orderId, uint256 amountOut);
    event OrderCancelled(uint256 indexed orderId);
    
    // State variables
    address public owner;
    address public router;
    uint256 public defaultDelay = 60;  // 60 seconds default delay
    uint256 public orderCount;
    
    // Orders mapping
    mapping(uint256 => Order) public orders;
    
    // User orders
    mapping(address => uint256[]) public userOrders;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "TimeLock: not owner");
        _;
    }
    
    modifier onlyRouter() {
        require(msg.sender == router, "TimeLock: not router");
        _;
    }
    
    constructor(address _router) {
        owner = msg.sender;
        router = _router;
    }
    
    /**
     * @notice Create time-locked order
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @param minAmountOut Minimum output amount
     * @param delay Custom delay in seconds (0 = use default)
     */
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 delay
    ) external returns (uint256 orderId) {
        require(tokenIn != address(0), "TimeLock: invalid tokenIn");
        require(tokenOut != address(0), "TimeLock: invalid tokenOut");
        require(amountIn > 0, "TimeLock: invalid amount");
        
        // Use default delay if not specified
        if (delay == 0) {
            delay = defaultDelay;
        }
        
        orderId = orderCount++;
        uint256 executeAfter = block.timestamp + delay;
        
        orders[orderId] = Order({
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            executeAfter: executeAfter,
            executed: false,
            cancelled: false
        });
        
        userOrders[msg.sender].push(orderId);
        
        emit OrderCreated(orderId, msg.sender, tokenIn, tokenOut, amountIn, executeAfter);
        
        return orderId;
    }
    
    /**
     * @notice Execute time-locked order
     * @param orderId Order ID
     */
    function executeOrder(uint256 orderId) external onlyRouter returns (bool) {
        Order storage order = orders[orderId];
        
        require(!order.executed, "TimeLock: already executed");
        require(!order.cancelled, "TimeLock: cancelled");
        require(block.timestamp >= order.executeAfter, "TimeLock: too early");
        
        order.executed = true;
        
        // TODO: Actually execute swap via router
        // For now, just mark as executed
        
        emit OrderExecuted(orderId, 0);  // TODO: return actual amount
        
        return true;
    }
    
    /**
     * @notice Cancel pending order
     * @param orderId Order ID
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        
        require(msg.sender == order.user, "TimeLock: not order owner");
        require(!order.executed, "TimeLock: already executed");
        require(!order.cancelled, "TimeLock: already cancelled");
        
        order.cancelled = true;
        
        emit OrderCancelled(orderId);
    }
    
    /**
     * @notice Check if order can be executed
     * @param orderId Order ID
     */
    function canExecute(uint256 orderId) external view returns (bool) {
        Order storage order = orders[orderId];
        
        return !order.executed 
            && !order.cancelled 
            && block.timestamp >= order.executeAfter;
    }
    
    /**
     * @notice Get user's orders
     * @param user User address
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }
    
    /**
     * @notice Update default delay
     * @param newDelay New delay in seconds
     */
    function updateDefaultDelay(uint256 newDelay) external onlyOwner {
        require(newDelay > 0 && newDelay <= 3600, "TimeLock: invalid delay");
        defaultDelay = newDelay;
    }
    
    /**
     * @notice Update router address
     * @param newRouter New router
     */
    function updateRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "TimeLock: invalid router");
        router = newRouter;
    }
}
