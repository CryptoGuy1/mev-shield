// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MEVRouter.sol";
import "../src/ProtectionVault.sol";
import "../src/TimeLock.sol";
import "../src/RiskOracle.sol";
import "../src/PrivateRelay.sol";

contract DeployMEVShield is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy RiskOracle first
        RiskOracle oracle = new RiskOracle();
        console.log("RiskOracle deployed at:", address(oracle));
        
        // Deploy MEVRouter
        MEVRouter router = new MEVRouter(address(oracle));
        console.log("MEVRouter deployed at:", address(router));
        
        // Deploy ProtectionVault
        ProtectionVault vault = new ProtectionVault(address(router));
        console.log("ProtectionVault deployed at:", address(vault));
        
        // Deploy TimeLock
        TimeLock timeLock = new TimeLock(address(router));
        console.log("TimeLock deployed at:", address(timeLock));
        
        // Deploy PrivateRelay
        PrivateRelay relay = new PrivateRelay(address(router));
        console.log("PrivateRelay deployed at:", address(relay));
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n=== MEV Shield Deployment Complete ===");
        console.log("RiskOracle:", address(oracle));
        console.log("MEVRouter:", address(router));
        console.log("ProtectionVault:", address(vault));
        console.log("TimeLock:", address(timeLock));
        console.log("PrivateRelay:", address(relay));
    }
}
