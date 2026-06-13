# Google Docs Clone

A real-time collaborative document editor inspired by Google Docs. Users can create, edit, share, and collaborate on documents in real time with role-based permissions and live synchronization across multiple clients.

## Features

### Authentication

* Google OAuth Login
* JWT Authentication
* Protected Routes
* Protected APIs
* Protected WebSocket Connections

### Document Management

* Create Documents
* Edit Documents
* Rename Documents
* Delete Documents
* Search Documents
* Auto Save

### Sharing & Permissions

* Share Documents with Other Users
* Owner / Editor / Viewer Roles
* Shared With Me Dashboard
* Role-Based Access Control
* View-Only Mode

### Real-Time Collaboration

* Live Multi-User Editing
* Native WebSocket Communication
* Real-Time Content Synchronization
* Automatic Document Updates
* Multi-Client Collaboration

---

## Tech Stack

### Frontend

* React
* React Router
* Quill.js
* Native WebSockets
* Google OAuth

### Backend

* FastAPI
* SQLAlchemy
* PostgreSQL
* JWT Authentication
* Google OAuth Verification
* Native WebSockets

### Database

* PostgreSQL

---

## Architecture

```text
React Client
      │
      ▼
FastAPI Backend
      │
 ┌────┴────┐
 ▼         ▼
PostgreSQL WebSockets
```

---

## Project Structure

```text
google-docs-clone/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── App.js
│   │   ├── Dashboard.js
│   │   └── TextEditor.js
│   └── package.json
│
├── fastapi-server/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── websockets/
│   │
│   ├── requirements.txt
│   └── .env
│
└── README.md
```

---

## Getting Started

### Prerequisites

* Node.js 18+
* Python 3.11+
* PostgreSQL
* Google OAuth Client ID

---

## Installation

### Clone Repository

```bash
git clone https://github.com/DevPithadia/Google-Docs-Clone.git
cd Google-Docs-Clone
```

### Frontend

```bash
cd client
npm install
```

### Backend

```bash
cd fastapi-server
pip install -r requirements.txt
```

---

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/google_docs_clone

JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:8000

REACT_APP_WS_URL=ws://localhost:8000

REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Run Application

### Backend

```bash
cd fastapi-server
py -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd client
npm start
```

---

## Access Application

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
```

---

## Authentication Flow

```text
User
  │
  ▼
Google OAuth Login
  │
  ▼
Google ID Token
  │
  ▼
FastAPI Verification
  │
  ▼
JWT Generation
  │
  ▼
Protected Session
  │
  ▼
Document Access
```

---

## Collaboration Flow

```text
Owner
  │
  ▼
Share Document
  │
  ▼
Assign Role
(Editor / Viewer)
  │
  ▼
Shared User Opens Document
  │
  ▼
WebSocket Connection
  │
  ▼
Real-Time Collaboration
```

---

## Screenshots

### Login Page

<img width="1031" height="771" alt="image" src="https://github.com/user-attachments/assets/8ed6e782-d97c-48e9-af0c-bb4c0fc223b1" />

### Dashboard

<img width="1397" height="720" alt="image" src="https://github.com/user-attachments/assets/4687aa38-7929-4736-829c-96a62e559eee" />

### Editor

<img width="1876" height="910" alt="image" src="https://github.com/user-attachments/assets/1bd12cf5-cc0a-4c33-88c2-6a760c88576f" />

---

## Roadmap

### Completed

* Google OAuth Authentication
* JWT Authentication
* PostgreSQL Migration
* FastAPI Migration
* Document CRUD Operations
* Auto Save
* Real-Time Collaboration
* Document Sharing
* Owner / Editor / Viewer Permissions
* Shared With Me Dashboard
* Native WebSocket Synchronization

### Planned

* Manage Access Modal
* Active Collaborators Indicator
* Docker Containerization
* GitHub Actions CI/CD
* Cloud Deployment
* AI Features

---

## Author

**Devkumar Pithadia**

GitHub: https://github.com/DevPithadia
