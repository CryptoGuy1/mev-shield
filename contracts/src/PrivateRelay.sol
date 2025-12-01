// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PrivateRelay
 * @notice Flashbots-style private transaction relay
 * @dev Enables transactions to bypass public mempool for MEV protection
 */
contract PrivateRelay {
    
    // Bundle structure
    struct Bundle {
        bytes32 bundleHash;
        address submitter;
        uint256 blockNumber;
        uint256 timestamp;
        bool included;
    }
    
    // Events
    event BundleSubmitted(
        bytes32 indexed bundleHash,
        address indexed submitter,
        uint256 targetBlock
    );
    
    event BundleIncluded(bytes32 indexed bundleHash, uint256 blockNumber);
    event BundleFailed(bytes32 indexed bundleHash, string reason);
    
    // State variables
    address public owner;
    address public router;
    
    // Bundles mapping
    mapping(bytes32 => Bundle) public bundles;
    
    // Block => bundle hashes
    mapping(uint256 => bytes32[]) public blockBundles;
    
    // Statistics
    uint256 public totalBundlesSubmitted;
    uint256 public totalBundlesIncluded;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "PrivateRelay: not owner");
        _;
    }
    
    modifier onlyRouter() {
        require(msg.sender == router, "PrivateRelay: not router");
        _;
    }
    
    constructor(address _router) {
        owner = msg.sender;
        router = _router;
    }
    
    /**
     * @notice Submit bundle for private inclusion
     * @param bundleHash Hash of bundle contents
     * @param targetBlock Target block number
     */
    function submitBundle(bytes32 bundleHash, uint256 targetBlock) external onlyRouter {
        require(targetBlock > block.number, "PrivateRelay: invalid target block");
        require(bundles[bundleHash].timestamp == 0, "PrivateRelay: bundle exists");
        
        bundles[bundleHash] = Bundle({
            bundleHash: bundleHash,
            submitter: tx.origin,  // Original user, not router
            blockNumber: targetBlock,
            timestamp: block.timestamp,
            included: false
        });
        
        blockBundles[targetBlock].push(bundleHash);
        totalBundlesSubmitted++;
        
        emit BundleSubmitted(bundleHash, tx.origin, targetBlock);
    }
    
    /**
     * @notice Mark bundle as included (called by validator/builder)
     * @param bundleHash Bundle hash
     */
    function markBundleIncluded(bytes32 bundleHash) external onlyOwner {
        Bundle storage bundle = bundles[bundleHash];
        require(bundle.timestamp > 0, "PrivateRelay: bundle not found");
        require(!bundle.included, "PrivateRelay: already included");
        
        bundle.included = true;
        totalBundlesIncluded++;
        
        emit BundleIncluded(bundleHash, block.number);
    }
    
    /**
     * @notice Mark bundle as failed
     * @param bundleHash Bundle hash
     * @param reason Failure reason
     */
    function markBundleFailed(bytes32 bundleHash, string calldata reason) external onlyOwner {
        Bundle storage bundle = bundles[bundleHash];
        require(bundle.timestamp > 0, "PrivateRelay: bundle not found");
        
        emit BundleFailed(bundleHash, reason);
    }
    
    /**
     * @notice Get bundles for block
     * @param blockNumber Block number
     */
    function getBlockBundles(uint256 blockNumber) external view returns (bytes32[] memory) {
        return blockBundles[blockNumber];
    }
    
    /**
     * @notice Check if bundle was included
     * @param bundleHash Bundle hash
     */
    function wasBundleIncluded(bytes32 bundleHash) external view returns (bool) {
        return bundles[bundleHash].included;
    }
    
    /**
     * @notice Get inclusion rate (percentage)
     */
    function getInclusionRate() external view returns (uint256) {
        if (totalBundlesSubmitted == 0) return 0;
        return (totalBundlesIncluded * 100) / totalBundlesSubmitted;
    }
    
    /**
     * @notice Update router address
     * @param newRouter New router
     */
    function updateRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "PrivateRelay: invalid router");
        router = newRouter;
    }
}
