from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # active_connections: { document_id: [websocket1, websocket2, ...] }
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, document_id: str):
        await websocket.accept()
        if document_id not in self.active_connections:
            self.active_connections[document_id] = []
        self.active_connections[document_id].append(websocket)

    def disconnect(self, websocket: WebSocket, document_id: str):
        if document_id in self.active_connections:
            if websocket in self.active_connections[document_id]:
                self.active_connections[document_id].remove(websocket)
            if not self.active_connections[document_id]:
                del self.active_connections[document_id]

    async def broadcast(self, message: dict, document_id: str, exclude_websocket: WebSocket = None):
        """
        Broadcasts a JSON message to all clients connected to a specific document.
        Optionally excludes the sender (exclude_websocket).
        """
        if document_id in self.active_connections:
            for connection in self.active_connections[document_id]:
                if connection != exclude_websocket:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        print(f"Broadcast error: {e}")
                        # If a connection is dead, it will be cleaned up by disconnect() 
                        # in the main loop, but we handle it here just in case.

manager = ConnectionManager()
