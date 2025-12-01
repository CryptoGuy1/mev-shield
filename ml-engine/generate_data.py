"""
MEV Attack Data Generator

Generates realistic simulated MEV attack transactions for model training.
Creates 100k+ labeled examples with realistic feature distributions.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
from pathlib import Path

# Set random seeds for reproducibility
np.random.seed(42)
random.seed(42)


class MEVDataGenerator:
    """Generate synthetic MEV attack transaction data"""
    
    def __init__(self, n_samples=100000):
        self.n_samples = n_samples
        self.attack_ratio = {
            'sandwich': 0.15,      # 15% sandwich attacks
            'frontrun': 0.10,      # 10% frontrunning
            'backrun': 0.08,       # 8% backrunning
            'arbitrage': 0.07,     # 7% arbitrage extraction
            'normal': 0.60         # 60% normal transactions
        }
        
    def generate(self):
        """Generate complete dataset with all features"""
        print(f"Generating {self.n_samples:,} transactions...")
        
        # Calculate samples per class
        samples_per_class = {
            k: int(v * self.n_samples) 
            for k, v in self.attack_ratio.items()
        }
        
        # Generate each attack type
        all_data = []
        for attack_type, n_samples in samples_per_class.items():
            if attack_type == 'normal':
                data = self._generate_normal_transactions(n_samples)
            elif attack_type == 'sandwich':
                data = self._generate_sandwich_attacks(n_samples)
            elif attack_type == 'frontrun':
                data = self._generate_frontrun_attacks(n_samples)
            elif attack_type == 'backrun':
                data = self._generate_backrun_attacks(n_samples)
            elif attack_type == 'arbitrage':
                data = self._generate_arbitrage_attacks(n_samples)
            
            all_data.append(data)
        
        # Combine and shuffle
        df = pd.concat(all_data, ignore_index=True)
        df = df.sample(frac=1).reset_index(drop=True)
        
        print(f"Generated {len(df):,} total transactions")
        print("\nClass distribution:")
        print(df['attack_type'].value_counts())
        
        return df
    
    def _generate_normal_transactions(self, n):
        """Generate normal user transactions"""
        return pd.DataFrame({
            'gas_price_gwei': np.random.normal(30, 10, n).clip(10, 100),
            'gas_limit': np.random.normal(150000, 50000, n).clip(21000, 500000),
            'value_eth': np.random.exponential(0.5, n).clip(0.01, 100),
            'slippage_tolerance': np.random.normal(0.5, 0.2, n).clip(0.1, 5.0),
            'priority_fee_gwei': np.random.normal(2, 1, n).clip(0.1, 10),
            
            # Timing features (normal users spread throughout blocks)
            'position_in_block': np.random.uniform(0, 1, n),
            'block_congestion': np.random.normal(0.5, 0.2, n).clip(0, 1),
            
            # Token pair features
            'token_pair_volatility': np.random.normal(0.02, 0.01, n).clip(0.001, 0.1),
            'liquidity_depth': np.random.lognormal(10, 2, n),
            
            # Sender reputation (normal users have good history)
            'sender_tx_count': np.random.lognormal(5, 2, n).clip(1, 10000),
            'sender_success_rate': np.random.beta(8, 2, n),  # skewed toward high success
            'sender_avg_gas_price': np.random.normal(30, 5, n).clip(10, 100),
            
            # Contract interaction
            'is_contract': np.random.choice([0, 1], n, p=[0.9, 0.1]),
            'contract_age_days': np.random.exponential(100, n).clip(0, 1000),
            
            # Network conditions
            'network_gas_price': np.random.normal(30, 10, n).clip(10, 100),
            'pending_tx_count': np.random.poisson(150, n),
            
            # Time features
            'hour_of_day': np.random.randint(0, 24, n),
            'day_of_week': np.random.randint(0, 7, n),
            
            # MEV bot indicators (low for normal)
            'uses_flashbots': np.zeros(n),
            'has_bundle': np.zeros(n),
            
            # Labels
            'attack_type': ['normal'] * n,
            'is_attack': np.zeros(n, dtype=int)
        })
    
    def _generate_sandwich_attacks(self, n):
        """Generate sandwich attack patterns"""
        return pd.DataFrame({
            # Sandwich attacks use HIGH gas to frontrun
            'gas_price_gwei': np.random.normal(50, 15, n).clip(30, 200),
            'gas_limit': np.random.normal(200000, 30000, n).clip(100000, 500000),
            'value_eth': np.random.exponential(2, n).clip(0.1, 50),  # Larger trades
            'slippage_tolerance': np.random.normal(2.0, 1.0, n).clip(0.5, 10),  # Higher slippage
            'priority_fee_gwei': np.random.normal(5, 2, n).clip(1, 20),  # High priority
            
            # Timing: sandwiches target specific positions
            'position_in_block': np.random.beta(2, 5, n),  # Early in block
            'block_congestion': np.random.normal(0.7, 0.15, n).clip(0.3, 1),
            
            # Target high-volatility pairs
            'token_pair_volatility': np.random.normal(0.05, 0.02, n).clip(0.02, 0.15),
            'liquidity_depth': np.random.lognormal(9, 1.5, n),  # Moderate liquidity
            
            # Sandwich bots have specific patterns
            'sender_tx_count': np.random.lognormal(8, 1, n).clip(100, 50000),  # Very active
            'sender_success_rate': np.random.beta(9, 1, n),  # Very high success
            'sender_avg_gas_price': np.random.normal(45, 10, n).clip(25, 150),  # Aggressive gas
            
            # Usually EOAs (externally owned accounts), not contracts
            'is_contract': np.zeros(n),
            'contract_age_days': np.zeros(n),
            
            # Network conditions
            'network_gas_price': np.random.normal(35, 12, n).clip(15, 100),
            'pending_tx_count': np.random.poisson(200, n),  # Higher pending during attacks
            
            # Time features (attacks happen during high activity)
            'hour_of_day': np.random.choice([8,9,10,14,15,16,20,21], n),  # Peak hours
            'day_of_week': np.random.choice([0,1,2,3,4], n),  # Weekdays
            
            # MEV bot indicators
            'uses_flashbots': np.random.choice([0, 1], n, p=[0.7, 0.3]),
            'has_bundle': np.random.choice([0, 1], n, p=[0.6, 0.4]),  # Sometimes bundled
            
            # Labels
            'attack_type': ['sandwich'] * n,
            'is_attack': np.ones(n, dtype=int)
        })
    
    def _generate_frontrun_attacks(self, n):
        """Generate frontrunning attack patterns"""
        return pd.DataFrame({
            # Frontrunning uses VERY high gas to get ahead
            'gas_price_gwei': np.random.normal(60, 20, n).clip(40, 300),
            'gas_limit': np.random.normal(180000, 40000, n).clip(80000, 400000),
            'value_eth': np.random.exponential(1.5, n).clip(0.05, 30),
            'slippage_tolerance': np.random.normal(1.5, 0.8, n).clip(0.3, 8),
            'priority_fee_gwei': np.random.normal(7, 3, n).clip(2, 30),  # Very high
            
            # Must be FIRST in block
            'position_in_block': np.random.beta(1, 10, n),  # Very early
            'block_congestion': np.random.normal(0.65, 0.2, n).clip(0.2, 1),
            
            # Token features
            'token_pair_volatility': np.random.normal(0.04, 0.015, n).clip(0.015, 0.12),
            'liquidity_depth': np.random.lognormal(9.5, 1.8, n),
            
            # Frontrun bots are sophisticated
            'sender_tx_count': np.random.lognormal(7.5, 1.2, n).clip(50, 30000),
            'sender_success_rate': np.random.beta(8, 2, n),
            'sender_avg_gas_price': np.random.normal(50, 12, n).clip(30, 150),
            
            # Contract interaction
            'is_contract': np.random.choice([0, 1], n, p=[0.8, 0.2]),
            'contract_age_days': np.random.exponential(80, n).clip(0, 500),
            
            # Network
            'network_gas_price': np.random.normal(38, 13, n).clip(15, 100),
            'pending_tx_count': np.random.poisson(180, n),
            
            # Time
            'hour_of_day': np.random.choice([9,10,11,14,15,16], n),
            'day_of_week': np.random.choice([0,1,2,3,4], n),
            
            # MEV indicators
            'uses_flashbots': np.random.choice([0, 1], n, p=[0.5, 0.5]),
            'has_bundle': np.random.choice([0, 1], n, p=[0.7, 0.3]),
            
            # Labels
            'attack_type': ['frontrun'] * n,
            'is_attack': np.ones(n, dtype=int)
        })
    
    def _generate_backrun_attacks(self, n):
        """Generate backrunning attack patterns"""
        return pd.DataFrame({
            # Backrunning uses moderate-high gas
            'gas_price_gwei': np.random.normal(40, 12, n).clip(25, 150),
            'gas_limit': np.random.normal(160000, 35000, n).clip(70000, 400000),
            'value_eth': np.random.exponential(1.0, n).clip(0.05, 20),
            'slippage_tolerance': np.random.normal(1.0, 0.5, n).clip(0.2, 5),
            'priority_fee_gwei': np.random.normal(3, 1.5, n).clip(0.5, 15),
            
            # Comes AFTER target transaction
            'position_in_block': np.random.beta(5, 2, n),  # Later in block
            'block_congestion': np.random.normal(0.6, 0.18, n).clip(0.2, 1),
            
            # Token features
            'token_pair_volatility': np.random.normal(0.035, 0.012, n).clip(0.01, 0.1),
            'liquidity_depth': np.random.lognormal(9.8, 1.6, n),
            
            # Bot characteristics
            'sender_tx_count': np.random.lognormal(7, 1.3, n).clip(40, 25000),
            'sender_success_rate': np.random.beta(7, 2, n),
            'sender_avg_gas_price': np.random.normal(38, 9, n).clip(20, 120),
            
            # Contract
            'is_contract': np.random.choice([0, 1], n, p=[0.85, 0.15]),
            'contract_age_days': np.random.exponential(90, n).clip(0, 600),
            
            # Network
            'network_gas_price': np.random.normal(33, 11, n).clip(15, 100),
            'pending_tx_count': np.random.poisson(170, n),
            
            # Time
            'hour_of_day': np.random.randint(0, 24, n),
            'day_of_week': np.random.randint(0, 7, n),
            
            # MEV indicators
            'uses_flashbots': np.random.choice([0, 1], n, p=[0.6, 0.4]),
            'has_bundle': np.random.choice([0, 1], n, p=[0.8, 0.2]),
            
            # Labels
            'attack_type': ['backrun'] * n,
            'is_attack': np.ones(n, dtype=int)
        })
    
    def _generate_arbitrage_attacks(self, n):
        """Generate arbitrage extraction patterns"""
        return pd.DataFrame({
            # Arbitrage is competitive but not always highest gas
            'gas_price_gwei': np.random.normal(45, 13, n).clip(28, 180),
            'gas_limit': np.random.normal(220000, 50000, n).clip(100000, 600000),  # Complex routing
            'value_eth': np.random.exponential(3, n).clip(0.2, 100),  # Large trades
            'slippage_tolerance': np.random.normal(0.8, 0.4, n).clip(0.1, 4),
            'priority_fee_gwei': np.random.normal(4, 2, n).clip(0.5, 18),
            
            # Position varies
            'position_in_block': np.random.uniform(0, 1, n),
            'block_congestion': np.random.normal(0.55, 0.2, n).clip(0.1, 1),
            
            # Targets multiple pairs (high volatility opportunities)
            'token_pair_volatility': np.random.normal(0.045, 0.018, n).clip(0.02, 0.13),
            'liquidity_depth': np.random.lognormal(10.5, 1.5, n),  # Prefers deep liquidity
            
            # Arb bots are highly active
            'sender_tx_count': np.random.lognormal(8.5, 0.8, n).clip(200, 100000),  # Very active
            'sender_success_rate': np.random.beta(9, 1, n),  # Very successful
            'sender_avg_gas_price': np.random.normal(42, 11, n).clip(25, 130),
            
            # Often uses contracts (routers)
            'is_contract': np.random.choice([0, 1], n, p=[0.3, 0.7]),
            'contract_age_days': np.random.exponential(120, n).clip(10, 800),
            
            # Network
            'network_gas_price': np.random.normal(36, 12, n).clip(15, 100),
            'pending_tx_count': np.random.poisson(160, n),
            
            # Time (opportunities arise anytime)
            'hour_of_day': np.random.randint(0, 24, n),
            'day_of_week': np.random.randint(0, 7, n),
            
            # MEV indicators
            'uses_flashbots': np.random.choice([0, 1], n, p=[0.4, 0.6]),  # Often use flashbots
            'has_bundle': np.random.choice([0, 1], n, p=[0.5, 0.5]),
            
            # Labels
            'attack_type': ['arbitrage'] * n,
            'is_attack': np.ones(n, dtype=int)
        })
    
    def save(self, df, output_dir='data'):
        """Save dataset to CSV"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        filepath = output_path / 'mev_transactions.csv'
        df.to_csv(filepath, index=False)
        print(f"\nSaved dataset to {filepath}")
        print(f"Shape: {df.shape}")
        
        return filepath


def main():
    """Generate and save MEV transaction dataset"""
    generator = MEVDataGenerator(n_samples=100000)
    df = generator.generate()
    
    # Display statistics
    print("\n" + "="*50)
    print("Dataset Statistics")
    print("="*50)
    print(df.describe())
    
    print("\n" + "="*50)
    print("Feature Correlations with Attack")
    print("="*50)
    correlations = df.corr()['is_attack'].sort_values(ascending=False)
    print(correlations.head(10))
    
    # Save dataset
    generator.save(df)
    
    print("\n✓ Data generation complete!")


if __name__ == '__main__':
    main()
