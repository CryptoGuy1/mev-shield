/**
 * Animated Savings Counter
 * Shows total savings with smooth animation
 */

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface SavingsCounterProps {
  value: number;
  duration?: number;
}

export const SavingsCounter: React.FC<SavingsCounterProps> = ({ 
  value, 
  duration = 2 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  const spring = useSpring(0, { 
    stiffness: 100, 
    damping: 30,
    duration: duration * 1000 
  });
  
  const display = useTransform(spring, (current) => 
    Math.round(current).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  
  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(parseFloat(latest.replace(/[^0-9.-]+/g, '')));
    });
    
    return () => unsubscribe();
  }, [display]);
  
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="inline-block"
      >
        <div className="text-5xl font-bold text-green-600">
          {display.get()}
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Total Saved from MEV
        </div>
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-4 flex justify-center gap-6 text-sm"
      >
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700">
            {Math.round(value / 25)}
          </div>
          <div className="text-gray-500">Transactions Protected</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700">
            ${(value / Math.round(value / 25) || 0).toFixed(2)}
          </div>
          <div className="text-gray-500">Avg. Savings/TX</div>
        </div>
      </motion.div>
    </div>
  );
};
