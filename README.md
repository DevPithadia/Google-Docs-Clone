# Google Docs Clone

A real-time collaborative document editor inspired by Google Docs, built with React, Node.js, MongoDB, Socket.io, and Quill.js. Users can create, edit, and manage documents with live synchronization across multiple clients.

## Features

### Authentication

* Google OAuth Login
* JWT Authentication
* Protected Routes
* Document Ownership
* Protected REST APIs
* Protected Socket.io Connections

### Documents

* Create Documents
* Edit Documents
* Rename Documents
* Delete Documents
* Search Documents
* Auto Save

### Real-Time Collaboration

* Live Document Synchronization
* Socket.io Based Communication
* Automatic Content Updates
* Multi-Client Editing Support

## Tech Stack

### Frontend

* React
* React Router
* Quill.js
* Socket.io Client
* Google OAuth

### Backend

* Node.js
* Express.js
* Socket.io
* JWT Authentication
* Google Auth Library

### Database

* MongoDB
* Mongoose

## Project Structure

```text
google-docs-clone/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── App.js
│   │   ├── Dashboard.js
│   │   └── TextEditor.js
│   └── package.json
│
├── server/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

* Node.js 18+
* MongoDB
* Google OAuth Client ID

### Installation

#### Clone Repository

```bash
git clone https://github.com/DevPithadia/Google-Docs-Clone.git
cd Google-Docs-Clone
```

#### Install Dependencies

Frontend:

```bash
cd client
npm install
```

Backend:

```bash
cd server
npm install
```

### Environment Variables

#### Server (.env)

```env
PORT=3001
MONGODB_URI=mongodb://localhost/google-docs-clone
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
JWT_SECRET=YOUR_JWT_SECRET
```

#### Client (.env)

```env
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
REACT_APP_API_URL=http://localhost:3001
```

### Run Application

Backend:

```bash
cd server
nodemon server.js
```

Frontend:

```bash
cd client
npm start
```

### Access Application

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3001
```

## Authentication Flow

```text
User
  ↓
Google OAuth Login
  ↓
Google ID Token
  ↓
Backend Verification
  ↓
JWT Generation
  ↓
Protected Session
  ↓
Document Access
```

## Current Roadmap

### Completed

* Real-time collaborative editor
* Document CRUD operations
* Auto-save functionality
* Search functionality
* Google OAuth authentication
* JWT authentication
* Protected routes
* Document ownership
* Socket authentication

### Planned

* PostgreSQL Migration
* FastAPI Backend Migration
* Docker Containerization
* Vercel Deployment
* Render Deployment
* GitHub Actions CI/CD
* AI Features

## Screenshots

Add screenshots here:

### Login Page

<img width="1031" height="771" alt="image" src="https://github.com/user-attachments/assets/8ed6e782-d97c-48e9-af0c-bb4c0fc223b1" />


### Dashboard

<img width="1397" height="720" alt="image" src="https://github.com/user-attachments/assets/4687aa38-7929-4736-829c-96a62e559eee" />


### Editor

<img width="1876" height="910" alt="image" src="https://github.com/user-attachments/assets/1bd12cf5-cc0a-4c33-88c2-6a760c88576f" />


## Author

**Devkumar Pithadia**

GitHub: https://github.com/DevPithadia
