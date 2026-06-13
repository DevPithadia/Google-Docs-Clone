from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.db.session import get_db
from app.models.document import Document
from app.models.user import User
from app.models.document_permission import DocumentPermission
from app.schemas.document import (
    Document as DocumentSchema,
    DocumentCreate,
    DocumentTitleUpdate
)
from app.schemas.document_permission import (
    DocumentPermission as DocumentPermissionSchema,
    DocumentPermissionCreate,
    DocumentPermissionWithUser
)
from app.dependencies.auth import get_current_user

router = APIRouter()

# Helper function to get user's role for a document
def get_user_role(db: Session, document_id: str, user_id: int) -> str:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.ownerId == user_id:
        return "owner"
    
    permission = db.query(DocumentPermission).filter(
        DocumentPermission.documentId == document_id,
        DocumentPermission.userId == user_id
    ).first()
    
    if permission:
        return permission.role
    
    raise HTTPException(status_code=403, detail="Access denied")

# Helper function to check if user has access to document
def check_document_access(
    db: Session,
    document_id: str,
    user_id: int,
    require_owner: bool = False
) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.ownerId == user_id:
        return document
    
    if require_owner:
        raise HTTPException(status_code=403, detail="Access denied: Only document owner can perform this action")
    
    # Check if user has any permission
    permission = db.query(DocumentPermission).filter(
        DocumentPermission.documentId == document_id,
        DocumentPermission.userId == user_id
    ).first()
    
    if not permission:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return document

# Helper function to check if user has editor access or is owner
def check_editor_access(
    db: Session,
    document_id: str,
    user_id: int
) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.ownerId == user_id:
        return document
    
    # Check if user has editor permission
    permission = db.query(DocumentPermission).filter(
        DocumentPermission.documentId == document_id,
        DocumentPermission.userId == user_id,
        DocumentPermission.role == "editor"
    ).first()
    
    if not permission:
        raise HTTPException(status_code=403, detail="Access denied: Editor or owner access required")
    
    return document

@router.get("/", response_model=List[DocumentSchema])
async def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all documents owned by or shared with the current user.
    """
    # Get owned documents ordered by creation time descending
    owned_docs = db.query(Document).options(joinedload(Document.owner)).filter(Document.ownerId == current_user.id).order_by(Document.createdAt.desc()).all()
    owned_documents = []
    for doc in owned_docs:
        owned_documents.append({
            "id": doc.id,
            "_id": doc.id,
            "title": doc.title,
            "data": doc.data,
            "ownerId": doc.ownerId,
            "ownerName": doc.owner.name,
            "ownerEmail": doc.owner.email,
            "ownerPicture": doc.owner.picture,
            "createdAt": doc.createdAt,
            "updatedAt": doc.updatedAt,
            "role": "owner"
        })
    
    # Get shared documents ordered by share timestamp descending
    shared_permissions = db.query(DocumentPermission).filter(
        DocumentPermission.userId == current_user.id
    ).options(joinedload(DocumentPermission.document).joinedload(Document.owner)).order_by(DocumentPermission.createdAt.desc()).all()
    shared_documents = []
    for perm in shared_permissions:
        doc = perm.document
        shared_documents.append({
            "id": doc.id,
            "_id": doc.id,
            "title": doc.title,
            "data": doc.data,
            "ownerId": doc.ownerId,
            "ownerName": doc.owner.name,
            "ownerEmail": doc.owner.email,
            "ownerPicture": doc.owner.picture,
            "createdAt": doc.createdAt,
            "updatedAt": doc.updatedAt,
            "role": perm.role
        })
    
    # Combine and deduplicate (in case user is both owner and shared with, though that shouldn't happen)
    all_documents = owned_documents + shared_documents
    all_documents_dict = {doc["id"]: doc for doc in all_documents}
    sorted_documents = sorted(all_documents_dict.values(), key=lambda x: x["updatedAt"], reverse=True)
    
    return sorted_documents

@router.get("/shared", response_model=List[DocumentSchema])
async def list_shared_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all documents shared with the current user.
    """
    shared_permissions = db.query(DocumentPermission).filter(
        DocumentPermission.userId == current_user.id
    ).options(joinedload(DocumentPermission.document).joinedload(Document.owner)).order_by(DocumentPermission.createdAt.desc()).all()
    shared_documents = []
    for perm in shared_permissions:
        doc = perm.document
        shared_documents.append({
            "id": doc.id,
            "_id": doc.id,
            "title": doc.title,
            "data": doc.data,
            "ownerId": doc.ownerId,
            "ownerName": doc.owner.name,
            "ownerEmail": doc.owner.email,
            "ownerPicture": doc.owner.picture,
            "createdAt": doc.createdAt,
            "updatedAt": doc.updatedAt,
            "shareCreatedAt": perm.createdAt,
            "role": perm.role
        })
    return shared_documents

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
    db_doc_with_owner = db.query(Document).options(joinedload(Document.owner)).filter(Document.id == db_doc.id).first()
    return {
        "id": db_doc_with_owner.id,
        "_id": db_doc_with_owner.id,
        "title": db_doc_with_owner.title,
        "data": db_doc_with_owner.data,
        "ownerId": db_doc_with_owner.ownerId,
        "ownerName": db_doc_with_owner.owner.name,
        "ownerEmail": db_doc_with_owner.owner.email,
        "ownerPicture": db_doc_with_owner.owner.picture,
        "createdAt": db_doc_with_owner.createdAt,
        "updatedAt": db_doc_with_owner.updatedAt,
        "role": "owner"
    }

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific document by ID. Allows owners and shared users.
    """
    document = check_document_access(db, document_id, current_user.id)
    role = get_user_role(db, document_id, current_user.id)
    return {"title": document.title, "content": document.data, "role": role}

@router.put("/{document_id}/title")
async def update_document_title(
    document_id: str,
    title_update: DocumentTitleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the title of a specific document. Allows owners and editors.
    """
    document = check_editor_access(db, document_id, current_user.id)
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
    Delete a specific document. Only allows owner.
    """
    document = check_document_access(db, document_id, current_user.id, require_owner=True)
    db.delete(document)
    db.commit()
    return {"success": True}

# --- Document Sharing Endpoints ---

@router.post("/{document_id}/share", response_model=DocumentPermissionWithUser)
async def share_document(
    document_id: str,
    permission_in: DocumentPermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Share a document with another user. Only allows owner.
    """
    # Check ownership
    document = check_document_access(db, document_id, current_user.id, require_owner=True)
    
    # Find target user by email
    target_user = db.query(User).filter(User.email == permission_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    # Prevent sharing with self
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share document with yourself")
    
    # Check for existing permission
    existing_permission = db.query(DocumentPermission).filter(
        DocumentPermission.documentId == document_id,
        DocumentPermission.userId == target_user.id
    ).first()
    if existing_permission:
        raise HTTPException(status_code=409, detail="Document is already shared with this user")
    
    # Create new permission
    new_permission = DocumentPermission(
        documentId=document_id,
        userId=target_user.id,
        role=permission_in.role
    )
    db.add(new_permission)
    db.commit()
    db.refresh(new_permission)
    
    # Return with user info
    return {
        "id": new_permission.id,
        "documentId": new_permission.documentId,
        "userId": new_permission.userId,
        "role": new_permission.role,
        "createdAt": new_permission.createdAt,
        "updatedAt": new_permission.updatedAt,
        "userEmail": target_user.email,
        "userName": target_user.name,
        "userPicture": target_user.picture
    }

@router.get("/{document_id}/permissions", response_model=List[DocumentPermissionWithUser])
async def list_document_permissions(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all permissions for a document. Only allows owner.
    """
    document = check_document_access(db, document_id, current_user.id, require_owner=True)
    
    permissions = db.query(DocumentPermission).filter(
        DocumentPermission.documentId == document_id
    ).options(joinedload(DocumentPermission.user)).all()
    
    return [
        {
            "id": perm.id,
            "documentId": perm.documentId,
            "userId": perm.userId,
            "role": perm.role,
            "createdAt": perm.createdAt,
            "updatedAt": perm.updatedAt,
            "userEmail": perm.user.email,
            "userName": perm.user.name,
            "userPicture": perm.user.picture
        }
        for perm in permissions
    ]

@router.put("/{document_id}/permissions/{permission_id}")
async def update_permission_role(
    document_id: str,
    permission_id: int,
    role_update: DocumentPermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a user's role for a document. Only allows owner.
    """
    document = check_document_access(db, document_id, current_user.id, require_owner=True)
    
    permission = db.query(DocumentPermission).filter(
        DocumentPermission.id == permission_id,
        DocumentPermission.documentId == document_id
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    permission.role = role_update.role
    db.commit()
    db.refresh(permission)
    
    return {"success": True, "newRole": permission.role}

@router.delete("/{document_id}/permissions/{permission_id}")
async def remove_permission(
    document_id: str,
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a user's permission from a document. Only allows owner.
    """
    document = check_document_access(db, document_id, current_user.id, require_owner=True)
    
    permission = db.query(DocumentPermission).filter(
        DocumentPermission.id == permission_id,
        DocumentPermission.documentId == document_id
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    db.delete(permission)
    db.commit()
    return {"success": True}
