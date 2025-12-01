/**
 * Analytics Page - Advanced analytics and visualizations
 */

import { motion } from 'framer-motion';
import { useStore } from '../store';
import { MEVHeatmap } from '../components/MEVHeatmap';
import { SavingsCounter } from '../components/SavingsCounter';
import { AttackPatternChart } from '../components/AttackPatternChart';
import { GasPriceChart } from '../components/GasPriceChart';

export const Analytics: React.FC = () => {
  const { stats } = useStore();
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics & Insights
          </h1>
          <p className="text-gray-600 mt-2">
            Deep dive into MEV patterns, savings, and network activity
          </p>
        </div>
        
        {/* Savings Counter - Hero */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="card mb-8 bg-gradient-to-r from-green-50 to-emerald-50"
        >
          <SavingsCounter value={stats.totalSavingsUsd} />
        </motion.div>
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Protection Rate
            </h3>
            <div className="text-3xl font-bold text-primary-600 mb-1">
              98.7%
            </div>
            <div className="text-xs text-gray-500">
              Successfully protected transactions
            </div>
            <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-primary-600 h-full" style={{ width: '98.7%' }} />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Average Savings
            </h3>
            <div className="text-3xl font-bold text-green-600 mb-1">
              $25.43
            </div>
            <div className="text-xs text-gray-500">
              Per protected transaction
            </div>
            <div className="mt-4 text-sm text-green-600 flex items-center">
              <span className="mr-1">↑</span>
              +12.3% from last month
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Detection Accuracy
            </h3>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              94.2%
            </div>
            <div className="text-xs text-gray-500">
              ML model accuracy rate
            </div>
            <div className="mt-4 flex space-x-2">
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-500">Precision</div>
                <div className="font-semibold">92.8%</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-500">Recall</div>
                <div className="font-semibold">96.1%</div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Attack Patterns */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <h2 className="text-lg font-semibold mb-4">Attack Distribution</h2>
            <AttackPatternChart width={550} height={300} />
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">42</div>
                <div className="text-xs text-gray-600">Sandwich Attacks</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">28</div>
                <div className="text-xs text-gray-600">Frontrun Attacks</div>
              </div>
            </div>
          </motion.div>
          
          {/* Protection Methods */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h2 className="text-lg font-semibold mb-4">Protection Methods Used</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Private Routing</span>
                  <span className="font-semibold">62%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-full" 
                    style={{ width: '62%' }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Time-Lock</span>
                  <span className="font-semibold">25%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full" 
                    style={{ width: '25%' }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Standard (Low Risk)</span>
                  <span className="font-semibold">13%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-green-600 h-full" 
                    style={{ width: '13%' }}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <span className="text-2xl mr-3">💡</span>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Insight</h4>
                  <p className="text-xs text-gray-600">
                    62% of transactions used private routing, saving an average of $32 per transaction from MEV extraction.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Gas Price Trends - Full Width */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="card mb-8"
        >
          <h2 className="text-lg font-semibold mb-4">Gas Price Trends</h2>
          <div className="overflow-x-auto">
            <GasPriceChart width={1100} height={250} />
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">
                {stats.currentGasPrice.toFixed(1)} Gwei
              </div>
              <div className="text-xs text-gray-600">Current</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">32.8 Gwei</div>
              <div className="text-xs text-gray-600">24h Average</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">45.2 Gwei</div>
              <div className="text-xs text-gray-600">24h Peak</div>
            </div>
          </div>
        </motion.div>
        
        {/* MEV Heatmap - Full Width */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="card"
        >
          <h2 className="text-lg font-semibold mb-4">MEV Activity Heatmap</h2>
          <p className="text-sm text-gray-600 mb-4">
            MEV attack intensity by day and hour (darker = more attacks)
          </p>
          <div className="overflow-x-auto">
            <MEVHeatmap width={1100} height={250} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
