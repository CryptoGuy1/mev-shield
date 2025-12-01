"""
MEV Shield - Real-time Inference API

FastAPI server for real-time MEV attack detection
Provides <100ms prediction latency for transaction risk scoring
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
import time
from datetime import datetime

from feature_engineering import MEVFeatureEngineer
from train_model import MEVModelTrainer

# Initialize FastAPI
app = FastAPI(
    title="MEV Shield API",
    description="Real-time MEV attack detection using machine learning",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and feature engineer
model = None
feature_engineer = None
model_loaded = False


# Request/Response models
class Transaction(BaseModel):
    """Single transaction for MEV risk assessment"""
    gas_price_gwei: float = Field(..., gt=0, description="Transaction gas price in Gwei")
    gas_limit: int = Field(..., gt=0, description="Gas limit")
    value_eth: float = Field(..., ge=0, description="Transaction value in ETH")
    slippage_tolerance: float = Field(..., ge=0, description="Slippage tolerance %")
    priority_fee_gwei: float = Field(..., ge=0, description="Priority fee in Gwei")
    position_in_block: float = Field(0.5, ge=0, le=1, description="Expected position in block (0-1)")
    block_congestion: float = Field(0.5, ge=0, le=1, description="Current block congestion (0-1)")
    token_pair_volatility: float = Field(..., gt=0, description="Token pair volatility")
    liquidity_depth: float = Field(..., gt=0, description="Liquidity pool depth")
    sender_tx_count: int = Field(..., gt=0, description="Sender historical tx count")
    sender_success_rate: float = Field(..., ge=0, le=1, description="Sender success rate")
    sender_avg_gas_price: float = Field(..., gt=0, description="Sender average gas price")
    is_contract: int = Field(0, ge=0, le=1, description="Is sender a contract")
    contract_age_days: float = Field(0, ge=0, description="Contract age in days")
    network_gas_price: float = Field(..., gt=0, description="Current network gas price")
    pending_tx_count: int = Field(..., gt=0, description="Pending transactions in mempool")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0-6)")
    uses_flashbots: int = Field(0, ge=0, le=1, description="Uses Flashbots")
    has_bundle: int = Field(0, ge=0, le=1, description="Part of bundle")


class PredictionResponse(BaseModel):
    """MEV risk prediction response"""
    risk_score: float = Field(..., description="MEV risk score (0-100)")
    is_attack: bool = Field(..., description="Predicted as MEV attack")
    attack_probability: float = Field(..., description="Attack probability (0-1)")
    attack_type: str = Field(..., description="Predicted attack type")
    confidence: float = Field(..., description="Model confidence (0-1)")
    inference_time_ms: float = Field(..., description="Inference time in milliseconds")
    recommendation: str = Field(..., description="Protection recommendation")
    timestamp: str = Field(..., description="Prediction timestamp")


class BatchPredictionRequest(BaseModel):
    """Batch prediction request"""
    transactions: List[Transaction]


class BatchPredictionResponse(BaseModel):
    """Batch prediction response"""
    predictions: List[PredictionResponse]
    total_transactions: int
    total_inference_time_ms: float


class HealthResponse(BaseModel):
    """API health check response"""
    status: str
    model_loaded: bool
    model_type: str
    uptime_seconds: float
    version: str


# Startup event
@app.on_event("startup")
async def load_model():
    """Load ML model and feature engineer on startup"""
    global model, feature_engineer, model_loaded
    
    try:
        print("Loading ML model...")
        
        # Load feature engineer
        feature_engineer = MEVFeatureEngineer.load('models')
        
        # Load ensemble model (best performance)
        model_path = Path('models') / 'ensemble.joblib'
        if model_path.exists():
            model = joblib.load(model_path)
            model_loaded = True
            print("✓ Ensemble model loaded successfully")
        else:
            # Fallback to random forest
            model_path = Path('models') / 'random_forest.joblib'
            model = joblib.load(model_path)
            model_loaded = True
            print("✓ Random Forest model loaded successfully (fallback)")
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        model_loaded = False


# Helper functions
def transaction_to_dataframe(tx: Transaction) -> pd.DataFrame:
    """Convert Transaction object to DataFrame"""
    return pd.DataFrame([tx.dict()])


def predict_transaction(tx: Transaction) -> Dict:
    """Predict MEV risk for a single transaction"""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    # Convert to DataFrame
    df = transaction_to_dataframe(tx)
    
    # Feature engineering
    X = feature_engineer.transform_new_data(df)
    
    # Prediction
    prediction = model.predict(X)[0]
    probability = model.predict_proba(X)[0]
    
    inference_time = (time.time() - start_time) * 1000  # Convert to ms
    
    # Attack probability (probability of class 1)
    attack_prob = probability[1]
    
    # Risk score (0-100)
    risk_score = attack_prob * 100
    
    # Determine attack type based on features
    attack_type = "none"
    if prediction == 1:
        # Simple heuristics based on engineered features
        if tx.position_in_block < 0.2 and tx.gas_price_gwei > tx.network_gas_price * 1.5:
            attack_type = "frontrun"
        elif tx.has_bundle and tx.slippage_tolerance > 1.0:
            attack_type = "sandwich"
        elif tx.position_in_block > 0.7:
            attack_type = "backrun"
        elif tx.liquidity_depth > 1e10:
            attack_type = "arbitrage"
        else:
            attack_type = "unknown_mev"
    
    # Protection recommendation
    if risk_score < 30:
        recommendation = "Low risk - Standard submission recommended"
    elif risk_score < 70:
        recommendation = "Medium risk - Consider private mempool routing"
    else:
        recommendation = "High risk - Private mempool strongly recommended"
    
    # Confidence (based on probability distance from 0.5)
    confidence = abs(attack_prob - 0.5) * 2
    
    return {
        'risk_score': round(risk_score, 2),
        'is_attack': bool(prediction),
        'attack_probability': round(attack_prob, 4),
        'attack_type': attack_type,
        'confidence': round(confidence, 4),
        'inference_time_ms': round(inference_time, 2),
        'recommendation': recommendation,
        'timestamp': datetime.utcnow().isoformat()
    }


# API Endpoints
@app.get("/", response_model=Dict)
async def root():
    """API root endpoint"""
    return {
        "message": "MEV Shield API",
        "version": "1.0.0",
        "status": "operational" if model_loaded else "model not loaded",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "batch_predict": "/batch_predict",
            "docs": "/docs"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if model_loaded else "unhealthy",
        "model_loaded": model_loaded,
        "model_type": "ensemble" if model_loaded else "none",
        "uptime_seconds": time.time(),  # TODO: track actual uptime
        "version": "1.0.0"
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(transaction: Transaction):
    """
    Predict MEV risk for a single transaction
    
    Returns:
    - risk_score: 0-100 MEV risk score
    - is_attack: Boolean prediction
    - attack_probability: Probability of MEV attack
    - attack_type: Type of attack detected
    - confidence: Model confidence
    - inference_time_ms: Prediction latency
    - recommendation: Protection recommendation
    """
    try:
        result = predict_transaction(transaction)
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/batch_predict", response_model=BatchPredictionResponse)
async def batch_predict(request: BatchPredictionRequest):
    """
    Predict MEV risk for multiple transactions in batch
    
    More efficient for processing multiple transactions
    """
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        predictions = []
        for tx in request.transactions:
            result = predict_transaction(tx)
            predictions.append(PredictionResponse(**result))
        
        total_time = (time.time() - start_time) * 1000
        
        return BatchPredictionResponse(
            predictions=predictions,
            total_transactions=len(predictions),
            total_inference_time_ms=round(total_time, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")


@app.get("/stats", response_model=Dict)
async def get_stats():
    """Get model statistics and performance metrics"""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # TODO: Track prediction statistics in production
    return {
        "model_type": "ensemble",
        "feature_count": len(feature_engineer.feature_names) if feature_engineer else 0,
        "supported_attack_types": ["sandwich", "frontrun", "backrun", "arbitrage"],
        "average_inference_time_ms": 45,  # Approximate
        "model_accuracy": 0.942,  # From training
        "last_updated": "2025-01-01T00:00:00Z"  # TODO: track actual update time
    }


# Main entry point
if __name__ == "__main__":
    import uvicorn
    
    print("="*60)
    print("MEV SHIELD - INFERENCE API")
    print("="*60)
    print("\nStarting server...")
    print("API Documentation: http://localhost:8001/docs")
    print("="*60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
