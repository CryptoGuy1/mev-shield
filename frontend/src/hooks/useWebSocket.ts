/**
 * Custom hook for WebSocket connection to backend
 */

import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const WS_URL = 'ws://localhost:8000/ws';
const RECONNECT_INTERVAL = 5000;

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { setWsConnected, setStats, addTransaction } = useStore();
  
  const connect = () => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        
        // Attempt to reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_INTERVAL);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setWsConnected(false);
    }
  };
  
  const handleMessage = (data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket handshake:', data.message);
        break;
        
      case 'stats_update':
        setStats(data.data);
        break;
        
      case 'transaction_protected':
        // Add to transaction history
        const tx = {
          txHash: '0x' + Math.random().toString(16).slice(2, 42),
          timestamp: data.data.timestamp,
          riskScore: data.data.risk_score,
          protectionMethod: data.data.protection_method,
          savingsUsd: data.data.estimated_savings_usd || 0,
          status: 'success' as const,
          attackType: data.data.attack_type
        };
        addTransaction(tx);
        break;
        
      case 'mev_detected':
        console.log('MEV attack detected:', data.data);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  return {
    send: (data: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    }
  };
};
