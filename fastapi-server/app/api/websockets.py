from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import jwt, JWTError
import json

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.document_permission import DocumentPermission
from app.core.config import settings
from app.websockets.manager import manager

router = APIRouter()

@router.websocket("/{document_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    document_id: str
):
    """
    Main WebSocket endpoint for real-time document collaboration.
    Handles authentication, ownership verification, and message routing.
    """
    # 1. Handshake Authentication
    token = websocket.query_params.get("token")
    if not token:
        await websocket.accept()
        await websocket.send_json({"event": "error", "data": "Authentication error: Token missing"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id = payload.get("userId")
    except JWTError:
        await websocket.accept()
        await websocket.send_json({"event": "error", "data": "Authentication error: Invalid token"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Access Verification
    db = SessionLocal()
    is_editor = False
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            await websocket.accept()
            await websocket.send_json({"event": "error", "data": "Document not found"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Get user role
        user_role = None
        if document.ownerId == user_id:
            user_role = "owner"
            is_editor = True
        else:
            permission = db.query(DocumentPermission).filter(
                DocumentPermission.documentId == document_id,
                DocumentPermission.userId == user_id
            ).first()
            if not permission:
                await websocket.accept()
                await websocket.send_json({"event": "error", "data": "Access denied: You do not have access to this document"})
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            user_role = permission.role
            is_editor = (permission.role == "editor")
        
        # We have access, proceed
        await manager.connect(websocket, document_id)
        
        try:
            while True:
                # Receive message (Socket.io-like JSON)
                # { "event": "...", "data": ... }
                data = await websocket.receive_json()
                event = data.get("event")
                payload_data = data.get("data")

                if event == "get-document":
                    # Send existing content to the client, ensure valid Quill Delta
                    valid_data = document.data if (document.data and isinstance(document.data, dict) and "ops" in document.data) else {"ops": []}
                    await websocket.send_json({
                        "event": "load-document",
                        "data": valid_data
                    })

                elif event == "send-changes":
                    # Only allow editors/owners to send changes
                    if is_editor:
                        await manager.broadcast(
                            {"event": "receive-changes", "data": payload_data},
                            document_id,
                            exclude_websocket=websocket
                        )

                elif event == "save-document":
                    # Only allow editors/owners to save
                    if is_editor and payload_data is not None:
                        db.query(Document).filter(
                            Document.id == document_id
                        ).update({Document.data: payload_data, Document.updatedAt: func.now()})
                        db.commit()

        except WebSocketDisconnect:
            manager.disconnect(websocket, document_id)
        except Exception as e:
            print(f"WebSocket processing error: {e}")
            manager.disconnect(websocket, document_id)
            
    finally:
        db.close()
