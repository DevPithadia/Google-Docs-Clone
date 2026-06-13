# Collaboration Migration Guide

## Phase 1: Document Sharing Backend - Complete

### Files Created/Updated:
1. `fastapi-server/app/models/document_permission.py`: New SQLAlchemy model for document permissions
2. `fastapi-server/app/models/user.py`: Updated to include permissions relationship
3. `fastapi-server/app/models/document.py`: Updated to include permissions relationship
4. `fastapi-server/app/models/__init__.py`: Added DocumentPermission export
5. `fastapi-server/app/schemas/document_permission.py`: New Pydantic schemas
6. `fastapi-server/app/schemas/__init__.py`: Added permission schema exports
7. `fastapi-server/app/api/documents.py`: Updated existing endpoints and added sharing endpoints
8. `fastapi-server/app/api/websockets.py`: Updated to support permission checks
9. `docs/collaboration-migration.md`: This file

### Manual Steps - Database Migration:
Execute this SQL script in your PostgreSQL database to create the DocumentPermission table:

```sql
CREATE TABLE IF NOT EXISTS "DocumentPermission" (
    id SERIAL PRIMARY KEY,
    "documentId" VARCHAR NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
    "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_document_user_permission UNIQUE ("documentId", "userId")
);

CREATE INDEX IF NOT EXISTS idx_document_permission_document_id ON "DocumentPermission"("documentId");
CREATE INDEX IF NOT EXISTS idx_document_permission_user_id ON "DocumentPermission"("userId");
```

### New API Endpoints:
- `POST /documents/{document_id}/share`: Share a document with a user by email
- `GET /documents/{document_id}/permissions`: List all permissions for a document
- `PUT /documents/{document_id}/permissions/{permission_id}`: Update a user's role
- `DELETE /documents/{document_id}/permissions/{permission_id}`: Remove a user's permission

### Updated API Endpoints:
- `GET /documents`: Now returns both owned and shared documents
- `GET /documents/{document_id}`: Now allows shared users
- `PUT /documents/{document_id}/title`: Now allows editors
- `DELETE /documents/{document_id}`: Still only allows owner
- WebSocket endpoint: Now checks permissions and allows editors to save

## Phase 2: Shared Documents Dashboard - Complete

### Files Created/Updated:
1. `fastapi-server/app/api/documents.py`: Added GET /documents/shared endpoint and now includes owner info in responses
2. `client/src/Dashboard.js`: Updated to split into My Documents and Shared With Me sections
3. `client/src/Dashboard.css`: Added styles for new sections and document owner text
4. `docs/collaboration-migration.md`: Updated this file

### New API Endpoints:
- `GET /documents/shared`: Returns all documents shared with the current user

### Updated Dashboard Features:
- Split into two sections: "My Documents" and "Shared With Me"
- Shared documents show the owner's name
- Delete button only appears on owned documents
- Search works across both sections
- Documents still open in the editor normally

## Phase 3: Share Document UI - Complete

### Files Created/Updated:
1. `client/src/TextEditor.js`: Added Share button (only visible to owner) and Share modal
2. `client/src/TextEditor.css`: Added styles for Share modal
3. `docs/collaboration-migration.md`: Updated this file

### Share UI Features:
- Share button only visible to document owner
- Modal with user email input
- Role dropdown (editor/viewer)
- Share and Cancel buttons
- Success and error message handling
- Modal closes automatically after successful share (with 1.5s delay for success message)

## Phase 4: Viewer Permission Enforcement - Complete

### Files Updated:
1. `fastapi-server/app/api/documents.py`: Added `get_user_role` helper, updated all document endpoints to return user role
2. `fastapi-server/app/api/websockets.py`: Updated to check user role and only allow editors/owners to send changes and save
3. `client/src/TextEditor.js`: Updated to handle viewer role: disable Quill, hide share button, prevent title editing
4. `docs/collaboration-migration.md`: Updated this file

### Key Changes:
- Backend: Added `get_user_role` helper function to determine user's role for a document
- Backend: Updated all list and get endpoints to return user role
- Backend: All write endpoints are already protected by `check_editor_access` and `check_document_access` helpers which return 403 for viewers
- WebSocket: Only allows editors/owners to send changes and save
- Frontend: Quill is disabled for viewers
- Frontend: Share button only visible to owner
- Frontend: Title editing only allowed for owners/editors
- Frontend: Auto-save and change sending disabled for viewers

## Next Phase:
- Phase 5: Real-time Collaboration Enhancements (optional)
