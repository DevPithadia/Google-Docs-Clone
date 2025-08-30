import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import "./Dashboard.css";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:3001/documents")
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch(() => setDocuments([]));
  }, []);

  function handleNewDocument() {
    const title = prompt("Enter document title:") || "Untitled Document";
    const newId = uuidV4();
    fetch("http://localhost:3001/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newId, title }),
    }).then(() => navigate(`/documents/${newId}`));
  }

  function handleOpenDocument(id) {
    navigate(`/documents/${id}`);
  }

  function handleDeleteDocument(id) {
    if (window.confirm("Are you sure you want to delete this document?")) {
      fetch(`http://localhost:3001/documents/${id}`, {
        method: "DELETE",
      })
      .then(res => res.json())
      .then(() => {
        setDocuments(prev => prev.filter(doc => doc._id !== id));
      })
      .catch(() => alert("Failed to delete document"));
    }
  }

  function getPreview(data) {
    if (!data || !data.ops) return "";
    return data.ops.map(op => typeof op.insert === "string" ? op.insert : "").join("").slice(0, 40);
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>My Documents</h2>
        <button className="new-document-btn" onClick={handleNewDocument}>
          + New Document
        </button>
      </div>
      <div className="documents-grid">
        {documents.map((doc) => (
          <div key={doc._id} className="document-item">
            <div className="document-title">{doc.title || "Untitled Document"}</div>
            <div className="document-card" onClick={() => handleOpenDocument(doc._id)}>
              <div className="document-preview">{getPreview(doc.data)}</div>
              <button
                className="delete-document-btn"
                onClick={e => {
                  e.stopPropagation(); // Prevent opening when deleting
                  handleDeleteDocument(doc._id);
                }}
                title="Delete document"
              >
                &#128465;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}