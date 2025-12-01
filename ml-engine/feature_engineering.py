"""
Feature Engineering for MEV Detection

Transforms raw transaction features into ML-ready format with:
- Feature scaling and normalization
- Derived features
- Feature selection
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.feature_selection import SelectKBest, f_classif
import joblib
from pathlib import Path


class MEVFeatureEngineer:
    """Feature engineering pipeline for MEV detection"""
    
    def __init__(self):
        self.scaler = RobustScaler()  # Robust to outliers
        self.feature_selector = None
        self.feature_names = None
        self.derived_feature_names = []
        
    def engineer_features(self, df):
        """
        Create derived features from raw transaction data
        
        Returns engineered DataFrame with additional features
        """
        df = df.copy()
        
        # Gas-related derived features
        df['gas_price_ratio'] = df['gas_price_gwei'] / df['network_gas_price']
        df['total_gas_cost'] = df['gas_price_gwei'] * df['gas_limit'] / 1e9  # ETH
        df['priority_ratio'] = df['priority_fee_gwei'] / df['gas_price_gwei']
        df['gas_efficiency'] = df['value_eth'] / (df['total_gas_cost'] + 0.001)  # Avoid div by zero
        
        # Timing features
        df['is_early_block'] = (df['position_in_block'] < 0.2).astype(int)
        df['is_late_block'] = (df['position_in_block'] > 0.8).astype(int)
        df['congestion_pressure'] = df['block_congestion'] * df['pending_tx_count'] / 100
        
        # Sender behavior features
        df['sender_activity_level'] = np.log1p(df['sender_tx_count'])  # Log transform
        df['sender_reliability'] = df['sender_success_rate'] * df['sender_activity_level']
        df['sender_gas_aggression'] = df['sender_avg_gas_price'] / df['network_gas_price']
        
        # Token/liquidity features  
        df['liquidity_volatility_ratio'] = df['token_pair_volatility'] * np.log1p(df['liquidity_depth'])
        df['slippage_premium'] = df['slippage_tolerance'] * df['value_eth']
        
        # MEV bot indicators (composite features)
        df['mev_score_v1'] = (
            df['gas_price_ratio'] * 0.3 +
            df['uses_flashbots'] * 0.25 +
            df['has_bundle'] * 0.25 +
            (df['sender_success_rate'] > 0.9).astype(int) * 0.2
        )
        
        df['frontrun_indicator'] = (
            (df['is_early_block'] == 1) &
            (df['gas_price_ratio'] > 1.5) &
            (df['priority_fee_gwei'] > 5)
        ).astype(int)
        
        df['sandwich_indicator'] = (
            (df['gas_price_ratio'] > 1.3) &
            (df['slippage_tolerance'] > 1.0) &
            (df['has_bundle'] == 1)
        ).astype(int)
        
        # Time-based features
        df['is_peak_hours'] = df['hour_of_day'].isin([9,10,14,15,16,20,21]).astype(int)
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Store derived feature names
        self.derived_feature_names = [
            'gas_price_ratio', 'total_gas_cost', 'priority_ratio', 'gas_efficiency',
            'is_early_block', 'is_late_block', 'congestion_pressure',
            'sender_activity_level', 'sender_reliability', 'sender_gas_aggression',
            'liquidity_volatility_ratio', 'slippage_premium',
            'mev_score_v1', 'frontrun_indicator', 'sandwich_indicator',
            'is_peak_hours', 'is_weekend'
        ]
        
        return df
    
    def select_features(self, df, target_col='is_attack', k=25):
        """
        Select top K most informative features
        
        Parameters:
        - df: DataFrame with features
        - target_col: Target column name
        - k: Number of top features to select
        
        Returns:
        - X: Feature matrix with selected features
        - y: Target vector
        - selected_features: List of selected feature names
        """
        # Separate features and target
        feature_cols = [col for col in df.columns 
                       if col not in ['attack_type', 'is_attack']]
        X = df[feature_cols]
        y = df[target_col]
        
        # Feature selection
        if self.feature_selector is None:
            self.feature_selector = SelectKBest(f_classif, k=k)
            self.feature_selector.fit(X, y)
        
        # Get selected features
        mask = self.feature_selector.get_support()
        selected_features = X.columns[mask].tolist()
        
        # Print feature importance scores
        scores = self.feature_selector.scores_
        feature_scores = pd.DataFrame({
            'feature': feature_cols,
            'score': scores
        }).sort_values('score', ascending=False)
        
        print("\nTop 15 Most Important Features:")
        print(feature_scores.head(15))
        
        self.feature_names = selected_features
        X_selected = X[selected_features]
        
        return X_selected, y, selected_features
    
    def scale_features(self, X, fit=True):
        """
        Scale features using RobustScaler (handles outliers well)
        
        Parameters:
        - X: Feature matrix
        - fit: Whether to fit the scaler (True for train, False for test)
        
        Returns:
        - X_scaled: Scaled feature matrix
        """
        if fit:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)
        
        return pd.DataFrame(X_scaled, columns=X.columns, index=X.index)
    
    def prepare_data(self, df, target_col='is_attack', test_size=0.2):
        """
        Complete pipeline: engineer features, select, scale
        
        Returns:
        - X_train, X_test, y_train, y_test
        """
        from sklearn.model_selection import train_test_split
        
        # Engineer features
        print("Engineering features...")
        df_engineered = self.engineer_features(df)
        
        # Select features
        print("\nSelecting features...")
        X, y, selected_features = self.select_features(df_engineered, target_col)
        
        # Split data
        print(f"\nSplitting data (test_size={test_size})...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Scale features
        print("Scaling features...")
        X_train_scaled = self.scale_features(X_train, fit=True)
        X_test_scaled = self.scale_features(X_test, fit=False)
        
        print(f"\nTrain set: {X_train_scaled.shape}")
        print(f"Test set: {X_test_scaled.shape}")
        print(f"Selected features: {len(selected_features)}")
        
        return X_train_scaled, X_test_scaled, y_train, y_test
    
    def transform_new_data(self, df):
        """
        Transform new data using fitted pipeline
        
        Use this for inference on new transactions
        """
        # Engineer features
        df_engineered = self.engineer_features(df)
        
        # Select same features as training
        if self.feature_names is None:
            raise ValueError("Feature engineer not fitted. Call prepare_data() first.")
        
        X = df_engineered[self.feature_names]
        
        # Scale using fitted scaler
        X_scaled = self.scale_features(X, fit=False)
        
        return X_scaled
    
    def save(self, output_dir='models'):
        """Save feature engineering artifacts"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save scaler
        joblib.dump(self.scaler, output_path / 'feature_scaler.joblib')
        
        # Save feature selector
        if self.feature_selector is not None:
            joblib.dump(self.feature_selector, output_path / 'feature_selector.joblib')
        
        # Save feature names
        if self.feature_names is not None:
            with open(output_path / 'feature_names.txt', 'w') as f:
                f.write('\n'.join(self.feature_names))
        
        print(f"✓ Saved feature engineering artifacts to {output_path}")
    
    @classmethod
    def load(cls, model_dir='models'):
        """Load pre-fitted feature engineering pipeline"""
        model_path = Path(model_dir)
        
        engineer = cls()
        engineer.scaler = joblib.load(model_path / 'feature_scaler.joblib')
        engineer.feature_selector = joblib.load(model_path / 'feature_selector.joblib')
        
        with open(model_path / 'feature_names.txt', 'r') as f:
            engineer.feature_names = [line.strip() for line in f]
        
        print(f"✓ Loaded feature engineering pipeline from {model_path}")
        
        return engineer


def main():
    """Test feature engineering pipeline"""
    print("Loading data...")
    df = pd.read_csv('data/mev_transactions.csv')
    
    print(f"Raw data shape: {df.shape}")
    
    # Initialize feature engineer
    engineer = MEVFeatureEngineer()
    
    # Prepare data
    X_train, X_test, y_train, y_test = engineer.prepare_data(df)
    
    # Save artifacts
    engineer.save()
    
    print("\n✓ Feature engineering complete!")


if __name__ == '__main__':
    main()
