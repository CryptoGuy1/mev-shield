/**
 * Home Page - Landing page with overview
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import axios from 'axios';

export const Home: React.FC = () => {
  const { stats, setStats } = useStore();
  
  useEffect(() => {
    // Fetch initial stats
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10s
    
    return () => clearInterval(interval);
  }, [setStats]);
  
  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Detection',
      description: 'Machine learning models detect MEV attacks in real-time with 94%+ accuracy'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Sub-100ms inference time ensures your transactions are protected instantly'
    },
    {
      icon: '🔒',
      title: 'Multi-Layer Protection',
      description: 'Private routing, time-locks, and smart contract protection strategies'
    },
    {
      icon: '💰',
      title: 'Proven Savings',
      description: 'Users save an average of 1-2% on transaction value from MEV extraction'
    },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Protect Your DeFi Transactions
            <br />
            <span className="text-primary-600">From MEV Attacks</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-powered MEV detection and protection system that saves you money
            by preventing sandwich attacks, frontrunning, and other MEV exploits.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link
              to="/protect"
              className="btn-primary text-lg px-8 py-3"
            >
              Start Protecting →
            </Link>
            
            <Link
              to="/dashboard"
              className="btn-secondary text-lg px-8 py-3"
            >
              View Dashboard
            </Link>
          </div>
        </motion.div>
        
        {/* Live Stats */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-primary-600">
              {stats.totalProtectedTx.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Transactions Protected
            </div>
          </div>
          
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-green-600">
              ${stats.totalSavingsUsd.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Total Savings
            </div>
          </div>
          
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-orange-600">
              {stats.mevDetectedLastHour}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              MEV Attacks Detected (1h)
            </div>
          </div>
          
          <div className="stat-card text-center">
            <div className="text-3xl font-bold text-blue-600">
              {stats.currentGasPrice.toFixed(1)} Gwei
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Current Gas Price
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose MEV Shield?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                className="card text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* How It Works */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analyze</h3>
              <p className="text-gray-600">
                ML model analyzes your transaction for MEV risk patterns in real-time
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Protect</h3>
              <p className="text-gray-600">
                Automatically route through private mempool or time-lock if high risk detected
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Save</h3>
              <p className="text-gray-600">
                Execute safely while saving money that would have been extracted by MEV bots
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-primary-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Protect Your Transactions?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands of users already saving money with MEV Shield
          </p>
          <Link
            to="/protect"
            className="inline-block bg-white text-primary-600 font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started Now →
          </Link>
        </div>
      </div>
    </div>
  );
};
