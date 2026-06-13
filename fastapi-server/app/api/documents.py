from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    Document as DocumentSchema,
    DocumentCreate,
    DocumentTitleUpdate
)
from app.dependencies.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[DocumentSchema])
async def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all documents owned by the current user.
    """
    documents = db.query(Document).filter(Document.ownerId == current_user.id).order_by(Document.createdAt.desc()).all()
    # Map 'id' to '_id' for frontend compatibility if necessary
    # Since we are using Pydantic schemas, we can handle the mapping there or return as is
    # The frontend expects '_id' in the JSON response
    return [{"id": doc.id, "_id": doc.id, "title": doc.title, "data": doc.data, "ownerId": doc.ownerId, "createdAt": doc.createdAt, "updatedAt": doc.updatedAt} for doc in documents]

@router.post("/", response_model=DocumentSchema)
async def create_document(
    doc_in: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new document for the current user.
    """
    db_doc = Document(
        id=doc_in.id,
        title=doc_in.title,
        data=doc_in.data,
        ownerId=current_user.id,
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return {"id": db_doc.id, "_id": db_doc.id, "title": db_doc.title, "data": db_doc.data, "ownerId": db_doc.ownerId, "createdAt": db_doc.createdAt, "updatedAt": db_doc.updatedAt}

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific document by ID. Enforces ownership.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.ownerId != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Return structure matching Express: { title, content }
    return {"title": document.title, "content": document.data}

@router.put("/{document_id}/title")
async def update_document_title(
    document_id: str,
    title_update: DocumentTitleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the title of a specific document. Enforces ownership.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.ownerId != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    document.title = title_update.title
    db.commit()
    db.refresh(document)
    return {"title": document.title}

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific document. Enforces ownership.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.ownerId != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(document)
    db.commit()
    return {"success": True}
