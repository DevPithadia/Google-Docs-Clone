import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import { useAuth } from "./context/AuthContext";
import "./Dashboard.css";

export default function Dashboard() {
  const [myDocuments, setMyDocuments] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filteredMyDocs, setFilteredMyDocs] = useState([]);
  const [filteredSharedDocs, setFilteredSharedDocs] = useState([]);
  const searchTimeout = useRef(null);
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  useEffect(() => {
    document.title = "Google Docs Clone";
  }, []);

  // Fetch both my documents and shared documents
  useEffect(() => {
    if (!token) return;

    // Fetch my documents (owned by me)
    fetch(`${process.env.REACT_APP_API_URL}/documents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter to only owned documents and sort descending by createdAt
          const owned = data
            .filter(doc => doc.ownerId === user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setMyDocuments(owned);
        } else {
          setMyDocuments([]);
        }
      })
      .catch(() => setMyDocuments([]));

    // Fetch shared documents
    fetch(`${process.env.REACT_APP_API_URL}/documents/shared`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort shared documents by shareCreatedAt (or fallback to updatedAt)
          const shared = [...data].sort((a, b) => {
            const dateA = new Date(a.shareCreatedAt || a.updatedAt);
            const dateB = new Date(b.shareCreatedAt || b.updatedAt);
            return dateB - dateA;
          });
          setSharedDocuments(shared);
        } else {
          setSharedDocuments([]);
        }
      })
      .catch(() => setSharedDocuments([]));
  }, [token, user.id]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {
      if (!searchInput.trim()) {
        setFilteredMyDocs(myDocuments);
        setFilteredSharedDocs(sharedDocuments);
      } else {
        const searchLower = searchInput.trim().toLowerCase();
        setFilteredMyDocs(
          myDocuments.filter((doc) =>
            (doc.title || "Untitled Document").toLowerCase().includes(searchLower)
          )
        );
        setFilteredSharedDocs(
          sharedDocuments.filter((doc) =>
            (doc.title || "Untitled Document").toLowerCase().includes(searchLower)
          )
        );
      }
    }, 500);

    return () => clearTimeout(searchTimeout.current);
  }, [searchInput, myDocuments, sharedDocuments]);

  // Set filtered docs when data loads
  useEffect(() => {
    setFilteredMyDocs(myDocuments);
    setFilteredSharedDocs(sharedDocuments);
  }, [myDocuments, sharedDocuments]);

  function handleNewDocument() {
    const title = prompt("Enter document title:", "Untitled Document");
    if (title === null) return;

    const newId = uuidV4();
    fetch(`${process.env.REACT_APP_API_URL}/documents/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: newId, title: title || "Untitled Document" }),
    }).then(() => navigate(`/documents/${newId}`));
  }

  function handleOpenDocument(id) {
    navigate(`/documents/${id}`);
  }

  function handleDeleteDocument(id) {
    if (window.confirm("Are you sure you want to delete this document?")) {
      fetch(`${process.env.REACT_APP_API_URL}/documents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then(() => {
          setMyDocuments((prev) => prev.filter((doc) => doc.id !== id));
        })
        .catch(() => alert("Failed to delete document"));
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function getPreview(data) {
    if (!data || !data.ops) return "";
    return data.ops
      .map((op) => (typeof op.insert === "string" ? op.insert : ""))
      .join("")
      .slice(0, 40);
  }

  // Reusable document card component
      function DocumentCard({ doc, isOwner, role }) {
        return (
          <div key={doc.id} className="document-item">
            <div className="document-title">
              {doc.title || "Untitled Document"}
            </div>
            {!isOwner && (
              <div className="document-owner">
                Shared by {doc.ownerName}
              </div>
            )}
            <div
              className="document-card"
              onClick={() => handleOpenDocument(doc.id)}
            >
              <div className="document-preview">{getPreview(doc.data)}</div>
              {isOwner && (
                <button
                  className="delete-document-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(doc.id);
                  }}
                  title="Delete document"
                >
                  &#128465;
                </button>
              )}
            </div>
          </div>
        );
      }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <div style={{ fontSize: "22px" }}>My Documents</div>
        </div>
        <div className="header-right">
          <div className="user-profile">
            {user?.picture && (
              <img src={user.picture} alt={user.name} className="user-avatar" />
            )}
            <span className="user-name">{user?.name}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <button className="new-document-btn" onClick={handleNewDocument}>
            New Document
          </button>
        </div>
      </div>
      <div className="searchbar-center-container">
        <input
          type="text"
          placeholder="Search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="dashboard-searchbar"
        />
      </div>

      {/* My Documents Section */}
      <div className="documents-section">
        <h3 className="section-title">My Documents</h3>
        <div className="documents-grid">
          {filteredMyDocs.length === 0 ? (
            <div className="no-documents-message">
              No Documents Found
            </div>
          ) : (
            filteredMyDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} isOwner={true} />
            ))
          )}
        </div>
      </div>

      {/* Shared With Me Section */}
      <div className="documents-section">
        <h3 className="section-title">Shared With Me</h3>
        <div className="documents-grid">
          {filteredSharedDocs.length === 0 ? (
            <div className="no-documents-message">
              No Shared Documents Found
            </div>
          ) : (
            filteredSharedDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} isOwner={false} role={doc.role} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
