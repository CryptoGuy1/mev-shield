/**
 * MEV Shield SDK
 * 
 * Drop-in replacement for ethers.js provider with automatic MEV protection
 */

import { ethers } from 'ethers';
import axios, { AxiosInstance } from 'axios';

/**
 * Configuration options for MEVShieldProvider
 */
export interface MEVShieldConfig {
  /** Protection level: 'auto' (ML-based), 'always' (always protect), 'manual' (user decides) */
  protectionLevel?: 'auto' | 'always' | 'manual';
  
  /** Risk score threshold for automatic protection (0-100) */
  riskThreshold?: number;
  
  /** Backend API URL */
  apiUrl?: string;
  
  /** Enable real-time monitoring via WebSocket */
  enableMonitoring?: boolean;
  
  /** Custom provider (if not using default) */
  customProvider?: ethers.JsonRpcProvider;
}

/**
 * Transaction risk assessment result
 */
export interface RiskAssessment {
  riskScore: number;
  isAttack: boolean;
  attackType: string;
  confidence: number;
  recommendation: string;
}

/**
 * Protected transaction result
 */
export interface ProtectedTransaction {
  tx: ethers.TransactionRequest;
  riskScore: number;
  protectionMethod: 'public' | 'private' | 'timelock';
  estimatedSavingsUsd: number;
}

/**
 * MEVShieldProvider - Ethereum provider with automatic MEV protection
 * 
 * @example
 * ```typescript
 * import { MEVShieldProvider } from 'mev-shield-sdk';
 * 
 * const provider = new MEVShieldProvider({
 *   protectionLevel: 'auto',
 *   riskThreshold: 70
 * });
 * 
 * // All transactions automatically protected
 * const tx = await contract.swap(tokenIn, tokenOut, amount);
 * ```
 */
export class MEVShieldProvider extends ethers.JsonRpcProvider {
  private config: Required<MEVShieldConfig>;
  private api: AxiosInstance;
  private ws?: WebSocket;
  
  constructor(config: MEVShieldConfig = {}) {
    // Initialize base provider
    const rpcUrl = config.customProvider 
      ? (config.customProvider as any)._getConnection().url 
      : 'http://localhost:8545';
    
    super(rpcUrl);
    
    // Set default configuration
    this.config = {
      protectionLevel: config.protectionLevel || 'auto',
      riskThreshold: config.riskThreshold || 70,
      apiUrl: config.apiUrl || 'http://localhost:8000',
      enableMonitoring: config.enableMonitoring || false,
      customProvider: config.customProvider || this
    };
    
    // Initialize API client
    this.api = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 5000
    });
    
    // Initialize WebSocket if monitoring enabled
    if (this.config.enableMonitoring) {
      this.initializeWebSocket();
    }
  }
  
  /**
   * Assess MEV risk for a transaction
   */
  async assessRisk(tx: ethers.TransactionRequest): Promise<RiskAssessment> {
    try {
      // Extract transaction features
      const features = await this.extractFeatures(tx);
      
      // Call ML API
      const response = await this.api.post('/predict', features);
      
      return {
        riskScore: response.data.risk_score,
        isAttack: response.data.is_attack,
        attackType: response.data.attack_type,
        confidence: response.data.confidence,
        recommendation: response.data.recommendation
      };
    } catch (error) {
      console.error('Risk assessment failed:', error);
      // Return conservative estimate on error
      return {
        riskScore: 50,
        isAttack: false,
        attackType: 'unknown',
        confidence: 0,
        recommendation: 'Unable to assess risk - proceed with caution'
      };
    }
  }
  
  /**
   * Protect a transaction from MEV attacks
   */
  async protectTransaction(tx: ethers.TransactionRequest): Promise<ProtectedTransaction> {
    // Assess risk
    const risk = await this.assessRisk(tx);
    
    // Determine if protection is needed
    const needsProtection = this.config.protectionLevel === 'always' ||
      (this.config.protectionLevel === 'auto' && risk.riskScore >= this.config.riskThreshold);
    
    if (!needsProtection) {
      return {
        tx,
        riskScore: risk.riskScore,
        protectionMethod: 'public',
        estimatedSavingsUsd: 0
      };
    }
    
    // Call protection API
    try {
      const response = await this.api.post('/api/protect', {
        from_address: tx.from,
        to_address: tx.to,
        value: tx.value?.toString() || '0',
        data: tx.data || '0x',
        gas_price: tx.gasPrice?.toString() || '0',
        gas_limit: tx.gasLimit ? Number(tx.gasLimit) : 21000,
        chain_id: tx.chainId || 1
      });
      
      const protectedTx = response.data.protected_tx;
      
      return {
        tx: {
          ...tx,
          // Override with protected parameters if needed
          gasPrice: BigInt(protectedTx.gasPrice),
          gasLimit: BigInt(protectedTx.gasLimit)
        },
        riskScore: response.data.risk_score,
        protectionMethod: response.data.protection_method,
        estimatedSavingsUsd: response.data.estimated_savings_usd
      };
    } catch (error) {
      console.error('Protection failed:', error);
      // Return original transaction if protection fails
      return {
        tx,
        riskScore: risk.riskScore,
        protectionMethod: 'public',
        estimatedSavingsUsd: 0
      };
    }
  }
  
  /**
   * Override sendTransaction to add automatic protection
   */
  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    // Protect transaction
    const protected = await this.protectTransaction(tx);
    
    console.log(`MEV Shield: Risk score ${protected.riskScore}, using ${protected.protectionMethod} routing`);
    if (protected.estimatedSavingsUsd > 0) {
      console.log(`MEV Shield: Estimated savings $${protected.estimatedSavingsUsd.toFixed(2)}`);
    }
    
    // Send protected transaction
    return super.send('eth_sendTransaction', [protected.tx]);
  }
  
  /**
   * Extract transaction features for ML model
   */
  private async extractFeatures(tx: ethers.TransactionRequest): Promise<any> {
    // Get network data
    const feeData = await this.getFeeData();
    const blockNumber = await this.getBlockNumber();
    const block = await this.getBlock(blockNumber);
    
    // Extract features
    const gasPrice = tx.gasPrice || feeData.gasPrice || BigInt(0);
    const value = tx.value || BigInt(0);
    
    return {
      gas_price_gwei: Number(gasPrice) / 1e9,
      gas_limit: tx.gasLimit ? Number(tx.gasLimit) : 21000,
      value_eth: Number(value) / 1e18,
      slippage_tolerance: 0.5,  // TODO: extract from transaction data
      priority_fee_gwei: feeData.maxPriorityFeePerGas ? Number(feeData.maxPriorityFeePerGas) / 1e9 : 2,
      position_in_block: 0.5,
      block_congestion: block ? (block.gasUsed * BigInt(100) / block.gasLimit) / BigInt(100) : 0.5,
      token_pair_volatility: 0.03,
      liquidity_depth: 1e10,
      sender_tx_count: 100,  // TODO: get from etherscan/similar
      sender_success_rate: 0.95,
      sender_avg_gas_price: Number(gasPrice) / 1e9,
      is_contract: tx.to ? await this.isContract(tx.to) : 0,
      contract_age_days: 0,
      network_gas_price: Number(feeData.gasPrice || BigInt(0)) / 1e9,
      pending_tx_count: 150,  // TODO: get actual pending count
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      uses_flashbots: 0,
      has_bundle: 0
    };
  }
  
  /**
   * Check if address is a contract
   */
  private async isContract(address: string): Promise<number> {
    const code = await this.getCode(address);
    return code !== '0x' ? 1 : 0;
  }
  
  /**
   * Initialize WebSocket connection for real-time monitoring
   */
  private initializeWebSocket(): void {
    const wsUrl = this.config.apiUrl.replace('http', 'ws') + '/ws';
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('MEV Shield: Connected to real-time monitoring');
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };
      
      this.ws.onerror = (error) => {
        console.error('MEV Shield WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('MEV Shield: Disconnected from monitoring');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.initializeWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }
  
  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'transaction_protected':
        console.log('MEV Shield: Transaction protected in real-time', data.data);
        break;
      case 'stats_update':
        // Update internal statistics
        break;
      default:
        console.log('MEV Shield message:', data);
    }
  }
  
  /**
   * Get protection statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await this.api.get('/api/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }
  
  /**
   * Close connections
   */
  destroy(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

/**
 * Quick setup function for common use cases
 */
export function createMEVShieldProvider(config?: MEVShieldConfig): MEVShieldProvider {
  return new MEVShieldProvider(config);
}

// Export types
export * from './types';
