/**
 * Dashboard Page - Real-time MEV monitoring
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { RiskGauge } from '../components/RiskGauge';
import { AttackPatternChart } from '../components/AttackPatternChart';
import { GasPriceChart } from '../components/GasPriceChart';

export const Dashboard: React.FC = () => {
  const { stats, transactions, wsConnected } = useStore();
  const { send } = useWebSocket();
  
  // Calculate average risk score from recent transactions
  const avgRiskScore = transactions.length > 0
    ? transactions.slice(0, 10).reduce((sum, tx) => sum + tx.riskScore, 0) / Math.min(10, transactions.length)
    : 0;
  
  const recentTransactions = transactions.slice(0, 5);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Real-Time Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor MEV activity and protection status in real-time
          </p>
          
          {/* Connection Status */}
          <div className="mt-4 flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                wsConnected ? 'bg-green-500' : 'bg-red-500'
              } ${wsConnected ? 'animate-pulse' : ''}`}
            />
            <span className="text-sm text-gray-600">
              {wsConnected ? 'Live Updates Active' : 'Connecting...'}
            </span>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Gas Price</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.currentGasPrice.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Gwei</div>
              </div>
              <div className="text-4xl">⛽</div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Pending TXs</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.pendingTxCount}
                </div>
                <div className="text-xs text-gray-500">In mempool</div>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">MEV Detected</div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.mevDetectedLastHour}
                </div>
                <div className="text-xs text-gray-500">Last hour</div>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Block Height</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.blockNumber.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Latest block</div>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </motion.div>
        </div>
        
        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk Gauge */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <h2 className="text-lg font-semibold mb-4">Current Risk Level</h2>
            <div className="flex justify-center">
              <RiskGauge score={Math.round(avgRiskScore)} />
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              Average risk from last 10 transactions
            </div>
          </motion.div>
          
          {/* Attack Patterns */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h2 className="text-lg font-semibold mb-4">Attack Patterns</h2>
            <AttackPatternChart />
          </motion.div>
        </div>
        
        {/* Gas Price Chart - Full Width */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="card mb-8"
        >
          <h2 className="text-lg font-semibold mb-4">Gas Price Trend</h2>
          <div className="overflow-x-auto">
            <GasPriceChart width={1100} />
          </div>
        </motion.div>
        
        {/* Recent Transactions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="card"
        >
          <h2 className="text-lg font-semibold mb-4">Recent Protected Transactions</h2>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions yet. Start protecting transactions to see them here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      TX Hash
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Risk Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Protection
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Savings
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.txHash} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tx.riskScore < 30
                              ? 'bg-green-100 text-green-800'
                              : tx.riskScore < 70
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="capitalize">{tx.protectionMethod}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        ${tx.savingsUsd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tx.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : tx.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
