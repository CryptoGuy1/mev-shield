/**
 * History Page - Transaction history and details
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { format } from 'date-fns';

export const History: React.FC = () => {
  const { transactions, selectedTx, setSelectedTx } = useStore();
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'timelock'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'risk' | 'savings'>('date');
  
  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(tx => filter === 'all' || tx.protectionMethod === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          return b.riskScore - a.riskScore;
        case 'savings':
          return b.savingsUsd - a.savingsUsd;
        case 'date':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });
  
  const totalSavings = filteredTransactions.reduce((sum, tx) => sum + tx.savingsUsd, 0);
  const avgRisk = filteredTransactions.length > 0
    ? filteredTransactions.reduce((sum, tx) => sum + tx.riskScore, 0) / filteredTransactions.length
    : 0;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Transaction History
          </h1>
          <p className="text-gray-600 mt-2">
            View all your protected transactions and detailed analytics
          </p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="card"
          >
            <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
            <div className="text-3xl font-bold text-gray-900">
              {filteredTransactions.length}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="text-sm text-gray-600 mb-1">Total Saved</div>
            <div className="text-3xl font-bold text-green-600">
              ${totalSavings.toFixed(2)}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="text-sm text-gray-600 mb-1">Average Risk</div>
            <div className="text-3xl font-bold text-orange-600">
              {avgRisk.toFixed(0)}
            </div>
          </motion.div>
        </div>
        
        {/* Filters and Sort */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('private')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'private'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Private
              </button>
              <button
                onClick={() => setFilter('timelock')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'timelock'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Time-Lock
              </button>
              <button
                onClick={() => setFilter('public')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'public'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Public
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date">Date</option>
                <option value="risk">Risk Score</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Transactions Table */}
        <div className="card">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-xl font-semibold text-gray-900 mb-2">
                No transactions found
              </div>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'Start protecting transactions to see them here'
                  : `No ${filter} transactions yet`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TX Hash
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Protection
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Savings
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((tx, index) => (
                    <motion.tr
                      key={tx.txHash}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {format(new Date(tx.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
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
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                            tx.protectionMethod === 'private'
                              ? 'bg-purple-100 text-purple-800'
                              : tx.protectionMethod === 'timelock'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {tx.protectionMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        ${tx.savingsUsd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
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
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Transaction Detail Modal */}
        {selectedTx && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTx(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-lg max-w-2xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Transaction Details</h2>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Transaction Hash</div>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {selectedTx.txHash}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Risk Score</div>
                    <div className="text-2xl font-bold">
                      <span
                        className={
                          selectedTx.riskScore < 30
                            ? 'text-green-600'
                            : selectedTx.riskScore < 70
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      >
                        {selectedTx.riskScore}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Savings</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${selectedTx.savingsUsd.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Protection Method</div>
                  <div className="capitalize font-semibold">{selectedTx.protectionMethod}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Timestamp</div>
                  <div>{format(new Date(selectedTx.timestamp), 'PPpp')}</div>
                </div>
                
                {selectedTx.attackType && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Attack Type Detected</div>
                    <div className="capitalize font-semibold text-red-600">
                      {selectedTx.attackType}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
