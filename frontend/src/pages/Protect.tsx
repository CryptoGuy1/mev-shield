/**
 * Protect Page - Transaction protection interface
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useStore } from '../store';
import { RiskGauge } from '../components/RiskGauge';

export const Protect: React.FC = () => {
  const { riskThreshold, protectionLevel, setRiskThreshold, setProtectionLevel, addTransaction } = useStore();
  
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('');
  const [gasPrice, setGasPrice] = useState('30');
  const [gasLimit, setGasLimit] = useState('21000');
  
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [protecting, setProtecting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleProtect = async () => {
    setProtecting(true);
    setError(null);
    setResult(null);
    
    try {
      // Call protection API
      const response = await axios.post('/api/protect', {
        from_address: fromAddress,
        to_address: toAddress,
        value: value || '0',
        data: data || '0x',
        gas_price: (parseFloat(gasPrice) * 1e9).toString(),
        gas_limit: parseInt(gasLimit),
        chain_id: 1
      });
      
      setRiskScore(response.data.risk_score);
      setResult(response.data);
      
      // Add to transaction history
      addTransaction({
        txHash: response.data.tx_hash || '0x' + Math.random().toString(16).slice(2, 42),
        timestamp: new Date().toISOString(),
        riskScore: response.data.risk_score,
        protectionMethod: response.data.protection_method,
        savingsUsd: response.data.estimated_savings_usd,
        status: 'success'
      });
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to protect transaction');
      console.error('Protection error:', err);
    } finally {
      setProtecting(false);
    }
  };
  
  const isFormValid = fromAddress && toAddress && gasPrice && gasLimit;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Protect Your Transaction
          </h1>
          <p className="text-gray-600 mt-2">
            Analyze and protect your transaction from MEV attacks before submitting
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div>
            {/* Settings Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="card mb-6"
            >
              <h2 className="text-lg font-semibold mb-4">Protection Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protection Level
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProtectionLevel('auto')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        protectionLevel === 'auto'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setProtectionLevel('always')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        protectionLevel === 'always'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Always
                    </button>
                    <button
                      onClick={() => setProtectionLevel('manual')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        protectionLevel === 'manual'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {protectionLevel === 'auto' && 'Automatically protect based on risk score'}
                    {protectionLevel === 'always' && 'Always use MEV protection'}
                    {protectionLevel === 'manual' && 'You decide when to protect'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Risk Threshold: {riskThreshold}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low (0)</span>
                    <span>Medium (50)</span>
                    <span>High (100)</span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Transaction Form */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Address *
                  </label>
                  <input
                    type="text"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Address *
                  </label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value (ETH)
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0.0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data (Optional)
                  </label>
                  <input
                    type="text"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gas Price (Gwei) *
                    </label>
                    <input
                      type="number"
                      value={gasPrice}
                      onChange={(e) => setGasPrice(e.target.value)}
                      placeholder="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gas Limit *
                    </label>
                    <input
                      type="number"
                      value={gasLimit}
                      onChange={(e) => setGasLimit(e.target.value)}
                      placeholder="21000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleProtect}
                  disabled={!isFormValid || protecting}
                  className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {protecting ? 'Analyzing...' : '🛡️ Protect Transaction'}
                </button>
              </div>
            </motion.div>
          </div>
          
          {/* Right Column - Results */}
          <div>
            {/* Risk Analysis */}
            {riskScore !== null && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card mb-6"
              >
                <h2 className="text-lg font-semibold mb-4">Risk Analysis</h2>
                
                <div className="flex justify-center mb-4">
                  <RiskGauge score={riskScore} />
                </div>
                
                <div className="space-y-3">
                  {result && (
                    <>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Protection Method</span>
                        <span className="font-semibold capitalize">
                          {result.protection_method}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-600">Estimated Savings</span>
                        <span className="font-semibold text-green-600">
                          ${result.estimated_savings_usd.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start">
                          <span className="text-2xl mr-3">💡</span>
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Recommendation</h4>
                            <p className="text-sm text-gray-700">
                              {riskScore < 30 && 'Low risk detected. Standard routing is safe.'}
                              {riskScore >= 30 && riskScore < 70 && 'Moderate risk. Consider using time-lock protection.'}
                              {riskScore >= 70 && 'High risk! Strongly recommend private mempool routing.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card bg-red-50 border border-red-200 mb-6"
              >
                <div className="flex items-start">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">Error</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Info Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h2 className="text-lg font-semibold mb-4">How Protection Works</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-1">🔍 Risk Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Our AI model analyzes 37+ features including gas price, timing, and transaction patterns to predict MEV risk.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm mb-1">🔒 Private Routing</h3>
                  <p className="text-sm text-gray-600">
                    High-risk transactions bypass the public mempool and go directly to block builders via Flashbots.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm mb-1">⏰ Time-Lock</h3>
                  <p className="text-sm text-gray-600">
                    Medium-risk transactions are delayed to reduce sandwich attack opportunities.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm mb-1">💰 Savings</h3>
                  <p className="text-sm text-gray-600">
                    Protected transactions save an average of $25 that would have been extracted by MEV bots.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
