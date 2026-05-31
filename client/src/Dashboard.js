import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import { useAuth } from "./context/AuthContext";
import "./Dashboard.css";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filteredDocs, setFilteredDocs] = useState([]);
  const searchTimeout = useRef(null);
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  useEffect(() => {
    document.title = "Google Docs Clone";
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch(`${process.env.REACT_APP_API_URL}/documents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDocuments(data);
        } else {
          setDocuments([]);
        }
      })
      .catch(() => setDocuments([]));
  }, [token]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {
      if (!searchInput.trim()) {
        setFilteredDocs(documents);
      } else {
        setFilteredDocs(
          documents.filter((doc) =>
            (doc.title || "Untitled Document")
              .toLowerCase()
              .includes(searchInput.trim().toLowerCase())
          )
        );
      }
    }, 500); // 0.5 second debounce

    return () => clearTimeout(searchTimeout.current);
  }, [searchInput, documents]);

  // Show all docs by default
  useEffect(() => {
    setFilteredDocs(documents);
  }, [documents]);

  function handleNewDocument() {
    const title = prompt("Enter document title:", "Untitled Document");
    if (title === null) return;

    const newId = uuidV4();
    fetch(`${process.env.REACT_APP_API_URL}/documents`, {
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
          setDocuments((prev) => prev.filter((doc) => doc._id !== id));
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
      <div className="documents-grid">
        {filteredDocs.length === 0 ? (
          <div className="no-documents-message">
            No Relevant Documents Found
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div key={doc._id} className="document-item">
              <div className="document-title">
                {doc.title || "Untitled Document"}
              </div>
              <div
                className="document-card"
                onClick={() => handleOpenDocument(doc._id)}
              >
                <div className="document-preview">{getPreview(doc.data)}</div>
                <button
                  className="delete-document-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(doc._id);
                  }}
                  title="Delete document"
                >
                  &#128465;
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
