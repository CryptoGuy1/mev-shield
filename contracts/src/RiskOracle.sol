// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RiskOracle
 * @notice On-chain registry for ML-predicted MEV risk scores
 * @dev Trusted operators submit risk scores from off-chain ML model
 */
contract RiskOracle {
    
    // Risk score entry
    struct RiskScore {
        uint8 score;  // 0-100
        uint256 timestamp;
        address operator;
    }
    
    // Events
    event RiskScoreSubmitted(
        bytes32 indexed txHash,
        uint8 score,
        address indexed operator,
        uint256 timestamp
    );
    
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    
    // State variables
    address public owner;
    
    // Authorized operators (can submit risk scores)
    mapping(address => bool) public operators;
    
    // Risk scores: tx hash => RiskScore
    mapping(bytes32 => RiskScore) public riskScores;
    
    // Operator reputation: operator => (total submissions, accurate predictions)
    mapping(address => uint256) public operatorSubmissions;
    mapping(address => uint256) public operatorAccurate;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "RiskOracle: not owner");
        _;
    }
    
    modifier onlyOperator() {
        require(operators[msg.sender], "RiskOracle: not authorized operator");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        operators[msg.sender] = true;  // Owner is default operator
    }
    
    /**
     * @notice Submit risk score for transaction
     * @param txHash Transaction hash (off-chain transaction being scored)
     * @param score Risk score (0-100)
     */
    function submitRiskScore(bytes32 txHash, uint8 score) external onlyOperator {
        require(score <= 100, "RiskOracle: invalid score");
        require(riskScores[txHash].timestamp == 0, "RiskOracle: score already exists");
        
        riskScores[txHash] = RiskScore({
            score: score,
            timestamp: block.timestamp,
            operator: msg.sender
        });
        
        operatorSubmissions[msg.sender]++;
        
        emit RiskScoreSubmitted(txHash, score, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Get risk score for transaction
     * @param txHash Transaction hash
     */
    function getRiskScore(bytes32 txHash) external view returns (uint8 score, uint256 timestamp) {
        RiskScore memory rs = riskScores[txHash];
        return (rs.score, rs.timestamp);
    }
    
    /**
     * @notice Update operator accuracy (called after validation)
     * @param operator Operator address
     * @param wasAccurate Whether prediction was accurate
     */
    function updateOperatorAccuracy(address operator, bool wasAccurate) external onlyOwner {
        if (wasAccurate) {
            operatorAccurate[operator]++;
        }
    }
    
    /**
     * @notice Get operator reputation score
     * @param operator Operator address
     */
    function getOperatorReputation(address operator) external view returns (uint256 percentage) {
        uint256 submissions = operatorSubmissions[operator];
        if (submissions == 0) return 0;
        
        return (operatorAccurate[operator] * 100) / submissions;
    }
    
    /**
     * @notice Add authorized operator
     * @param operator Operator address
     */
    function addOperator(address operator) external onlyOwner {
        require(operator != address(0), "RiskOracle: invalid operator");
        require(!operators[operator], "RiskOracle: already operator");
        
        operators[operator] = true;
        emit OperatorAdded(operator);
    }
    
    /**
     * @notice Remove operator
     * @param operator Operator address
     */
    function removeOperator(address operator) external onlyOwner {
        require(operators[operator], "RiskOracle: not operator");
        
        operators[operator] = false;
        emit OperatorRemoved(operator);
    }
    
    /**
     * @notice Check if address is operator
     * @param operator Address to check
     */
    function isOperator(address operator) external view returns (bool) {
        return operators[operator];
    }
}
