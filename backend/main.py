"""
MEV Shield Backend API

Main FastAPI application integrating:
- ML inference API
- WebSocket for real-time updates
- Mempool monitoring
- Transaction routing
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import asyncio
import httpx
import json
from datetime import datetime

# Initialize FastAPI
app = FastAPI(
    title="MEV Shield Backend",
    description="Complete MEV protection system backend",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
ML_API_URL = "http://localhost:8001"  # ML inference API

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


# Request/Response Models
class ProtectTransactionRequest(BaseModel):
    """Request to protect a transaction"""
    from_address: str
    to_address: str
    value: str
    data: str
    gas_price: str
    gas_limit: int
    chain_id: int


class ProtectTransactionResponse(BaseModel):
    """Protected transaction response"""
    protected_tx: Dict
    risk_score: float
    protection_method: str  # "public", "private", "timelock"
    estimated_savings_usd: float
    tx_hash: Optional[str] = None


class NetworkStatsResponse(BaseModel):
    """Network statistics"""
    current_gas_price: float
    pending_tx_count: int
    block_number: int
    mev_detected_last_hour: int
    total_protected_tx: int
    total_savings_usd: float


# Helper functions
async def call_ml_api(endpoint: str, data: dict) -> dict:
    """Call ML inference API"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{ML_API_URL}{endpoint}",
                json=data,
                timeout=5.0
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"ML API error: {str(e)}")


def estimate_savings(risk_score: float, value_eth: float) -> float:
    """Estimate $ savings from MEV protection"""
    # Simple heuristic: higher risk = more potential MEV extraction
    # Assume average MEV is 0.5-2% of transaction value
    if risk_score < 30:
        mev_percentage = 0.001  # 0.1%
    elif risk_score < 70:
        mev_percentage = 0.005  # 0.5%
    else:
        mev_percentage = 0.015  # 1.5%
    
    # Assume ETH = $2000 (would use price oracle in production)
    eth_price_usd = 2000
    savings_usd = value_eth * eth_price_usd * mev_percentage
    
    return round(savings_usd, 2)


# API Endpoints
@app.get("/")
async def root():
    """API root"""
    return {
        "message": "MEV Shield Backend API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "protect": "/api/protect",
            "stats": "/api/stats",
            "history": "/api/history",
            "websocket": "/ws"
        }
    }


@app.get("/health")
async def health_check():
    """Health check"""
    # Check ML API health
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ML_API_URL}/health", timeout=2.0)
            ml_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        ml_status = "unreachable"
    
    return {
        "status": "healthy",
        "ml_api": ml_status,
        "websocket_connections": len(manager.active_connections),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/protect", response_model=ProtectTransactionResponse)
async def protect_transaction(request: ProtectTransactionRequest):
    """
    Protect transaction from MEV attacks
    
    1. Analyze transaction for MEV risk
    2. Determine optimal protection method
    3. Return protected transaction
    """
    try:
        # Convert transaction to ML API format
        # In production, extract actual features from transaction
        ml_request = {
            "gas_price_gwei": float(request.gas_price) / 1e9,
            "gas_limit": request.gas_limit,
            "value_eth": float(request.value) / 1e18,
            "slippage_tolerance": 0.5,  # TODO: extract from transaction
            "priority_fee_gwei": 2.0,
            "position_in_block": 0.5,
            "block_congestion": 0.6,
            "token_pair_volatility": 0.03,
            "liquidity_depth": 1e10,
            "sender_tx_count": 100,
            "sender_success_rate": 0.95,
            "sender_avg_gas_price": 30,
            "is_contract": 0,
            "contract_age_days": 0,
            "network_gas_price": 30,
            "pending_tx_count": 150,
            "hour_of_day": datetime.utcnow().hour,
            "day_of_week": datetime.utcnow().weekday(),
            "uses_flashbots": 0,
            "has_bundle": 0
        }
        
        # Get ML prediction
        ml_response = await call_ml_api("/predict", ml_request)
        
        risk_score = ml_response["risk_score"]
        
        # Determine protection method
        if risk_score < 30:
            protection_method = "public"  # Standard mempool
        elif risk_score < 70:
            protection_method = "timelock"  # Delayed execution
        else:
            protection_method = "private"  # Private mempool
        
        # Calculate savings
        value_eth = float(request.value) / 1e18
        savings_usd = estimate_savings(risk_score, value_eth)
        
        # Create protected transaction
        # In production, this would actually route through smart contracts
        protected_tx = {
            "from": request.from_address,
            "to": request.to_address,
            "value": request.value,
            "data": request.data,
            "gasPrice": request.gas_price,
            "gasLimit": request.gas_limit,
            "chainId": request.chain_id,
            "protectionMethod": protection_method
        }
        
        # Broadcast to WebSocket clients
        await manager.broadcast({
            "type": "transaction_protected",
            "data": {
                "risk_score": risk_score,
                "protection_method": protection_method,
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
        return ProtectTransactionResponse(
            protected_tx=protected_tx,
            risk_score=risk_score,
            protection_method=protection_method,
            estimated_savings_usd=savings_usd,
            tx_hash=None  # Would be populated after submission
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats", response_model=NetworkStatsResponse)
async def get_network_stats():
    """Get current network statistics"""
    # In production, these would come from actual blockchain monitoring
    return NetworkStatsResponse(
        current_gas_price=32.5,
        pending_tx_count=156,
        block_number=19234567,
        mev_detected_last_hour=42,
        total_protected_tx=1247,
        total_savings_usd=18945.67
    )


@app.get("/api/history")
async def get_transaction_history(
    user_address: Optional[str] = None,
    limit: int = 50
):
    """Get protected transaction history"""
    # In production, query from database
    # For now, return mock data
    return {
        "transactions": [
            {
                "tx_hash": "0x123...",
                "timestamp": "2025-01-15T10:30:00Z",
                "risk_score": 85,
                "protection_method": "private",
                "savings_usd": 45.23,
                "status": "success"
            }
        ],
        "total": 1,
        "page": 1
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket for real-time MEV monitoring
    
    Streams:
    - New MEV attacks detected
    - Protected transactions
    - Network statistics
    """
    await manager.connect(websocket)
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to MEV Shield real-time feed",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive and send periodic updates
        while True:
            # In production, this would stream real data
            await asyncio.sleep(5)
            
            # Send periodic update
            await websocket.send_json({
                "type": "stats_update",
                "data": {
                    "current_gas_price": 32.5,
                    "pending_tx_count": 156,
                    "mev_detected_last_minute": 3
                },
                "timestamp": datetime.utcnow().isoformat()
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Background task for mempool monitoring
async def monitor_mempool():
    """
    Monitor mempool for MEV opportunities
    (Would run as background task in production)
    """
    while True:
        # In production:
        # 1. Connect to Ethereum node
        # 2. Monitor pending transactions
        # 3. Run ML model on each transaction
        # 4. Broadcast alerts via WebSocket
        await asyncio.sleep(1)


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    print("="*60)
    print("MEV SHIELD BACKEND")
    print("="*60)
    print(f"ML API: {ML_API_URL}")
    print("WebSocket: ws://localhost:8000/ws")
    print("="*60)
    
    # In production, start background tasks
    # asyncio.create_task(monitor_mempool())


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
