import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export const useWebSocket = (onEventCallback) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [notification, setNotification] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!token) return;

    // Build WS URL dynamically (supports local dev and Vercel -> Render production)
    let wsBaseUrl = import.meta.env.VITE_WS_URL;
    if (!wsBaseUrl) {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
        // Convert https://backend.onrender.com/api to wss://backend.onrender.com/ws/updates
        wsBaseUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws/updates';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        wsBaseUrl = `${protocol}//${host}:8000/ws/updates`;
      }
    }
    const separator = wsBaseUrl.includes('?') ? '&' : '?';
    const wsUrl = `${wsBaseUrl}${separator}token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start heartbeat ping every 25 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'db_change') {
            setLastEvent(data);
            
            // Format nice toast banner message
            let msg = `Live Update: ${data.table} #${data.id} ${data.action}d`;
            if (data.table === 'Bed' && data.details) {
              msg = `Bed #${data.details.bed_id} (${data.details.ward}) status changed: ${data.details.old_status} ➔ ${data.details.new_status}`;
            } else if (data.table === 'LabOrder' && data.details) {
              msg = `Lab Test '${data.details.test_name}' for ${data.details.patient_name} ➔ ${data.details.new_status}`;
            } else if (data.table === 'ActivityLog' && data.details) {
              msg = `Audit: ${data.details.description}`;
            }

            setNotification({
              id: Date.now(),
              message: msg,
              table: data.table,
              action: data.action,
              timestamp: new Date().toLocaleTimeString(),
            });

            // Automatically clear notification toast after 5s
            setTimeout(() => {
              setNotification((curr) => (curr && curr.id ? null : curr));
            }, 5000);

            if (onEventCallback) {
              onEventCallback(data);
            }
          }
        } catch (e) {
          console.error("WS message parse error:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Auto-reconnect after 3s if user is still logged in
        if (token) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket encounter error:", err);
        ws.close();
      };
    } catch (err) {
      console.error("WebSocket connection failure:", err);
    }
  }, [token, onEventCallback]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [connect]);

  const clearNotification = () => setNotification(null);

  return {
    isConnected,
    lastEvent,
    notification,
    clearNotification
  };
};
