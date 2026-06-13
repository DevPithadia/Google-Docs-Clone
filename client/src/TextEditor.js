import { useCallback, useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import "quill/dist/quill.snow.css"
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import './TextEditor.css'

const SAVE_INTERVAL_MS = 1000
const FONT_SIZES = ['8px', '10px', '12px', '14px', '18px', '24px', '36px'];
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ size: FONT_SIZES }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["image", "blockquote", "code-block"],
    ["clean"],
]

// Register size whitelist
const Size = Quill.import('attributors/style/size');
Size.whitelist = FONT_SIZES;
Quill.register(Size, true);

export default function TextEditor() {
    const { id: documentId } = useParams()
    const [socket, setSocket] = useState(null)
    const [isSocketReady, setIsSocketReady] = useState(false);
    const [quill, setQuill] = useState()
    const [title, setTitle] = useState("Untitled Document")
    const [isTitleEditing, setIsTitleEditing] = useState(false)
    const [role, setRole] = useState(null)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [shareEmail, setShareEmail] = useState('')
    const [shareRole, setShareRole] = useState('viewer')
    const [shareError, setShareError] = useState('')
    const [shareSuccess, setShareSuccess] = useState('')
    const titleRef = useRef(null)
    const navigate = useNavigate();
    const { token, logout, user } = useAuth();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        document.title = title ? `${title} - Google Docs Clone` : "Google Docs Clone"
    }, [title])

    // Fetch title and role on mount
    useEffect(() => {
        if (!token) return;

        fetch(`${process.env.REACT_APP_API_URL}/documents/${documentId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then((res) => {
                if (res.status === 401) {
                    logout();
                    navigate("/login");
                    throw new Error("Unauthorized");
                }
                if (res.status === 403) {
                    navigate("/");
                    throw new Error("Forbidden");
                }
                return res.json();
            })
            .then((doc) => {
                setTitle(doc.title || "Untitled Document")
                setRole(doc.role)
                // Check if owner (for share button)
            })
            .catch((err) => {
                console.error("Failed to fetch document:", err);
                if (err.message !== "Unauthorized" && err.message !== "Forbidden") {
                    setTitle("Untitled Document");
                }
            })
    }, [documentId, token, logout, navigate])

    // Save title to backend
    const saveTitle = (newTitle) => {
        if (!token) return;
        setTitle(newTitle)
        fetch(`${process.env.REACT_APP_API_URL}/documents/${documentId}/title`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ title: newTitle }),
        }).then(res => {
            if (res.status === 401) {
                logout();
                navigate("/login");
            }
        })
    }

    // Focus the input when editing starts
    useEffect(() => {
        if (isTitleEditing && titleRef.current) {
            titleRef.current.focus()
        }
    }, [isTitleEditing])

    // Native WebSocket connection setup
    useEffect(() => {
        if (!token) return;

        const wsUrl = `${process.env.REACT_APP_WS_URL || "ws://localhost:8000"}/ws/${documentId}?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WebSocket connected");
            setIsSocketReady(true);
            // Request document loading
            ws.send(JSON.stringify({ event: 'get-document' }));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const { event: eventType, data } = message;

            if (eventType === 'load-document') {
                // Instead of checking quill here, we'll use the cached data effect
                window.cachedDocumentData = data;
                // If quill is already ready, apply immediately
                if (window.quillInstance) {
                    const validData = window.cachedDocumentData && window.cachedDocumentData.ops
                        ? window.cachedDocumentData
                        : { ops: [] };
                    window.quillInstance.setContents(validData);
                    if (role !== "viewer") {
                        window.quillInstance.enable();
                    } else {
                        window.quillInstance.disable();
                    }
                }
            } else if (eventType === 'receive-changes' && window.quillInstance) {
                window.quillInstance.updateContents(data);
            } else if (eventType === 'error') {
                console.error("Socket error:", data);
                if (data.includes("Authentication error")) {
                    logout();
                    navigate("/login");
                } else if (data.includes("Access denied")) {
                    navigate("/");
                }
            }
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
            setIsSocketReady(false);
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [token, documentId, logout, navigate, role])

    // When quill is ready, apply cached data and set enabled state based on role
    useEffect(() => {
        if (quill) {
            window.quillInstance = quill;
            if (window.cachedDocumentData) {
                const validData = window.cachedDocumentData && window.cachedDocumentData.ops
                    ? window.cachedDocumentData
                    : { ops: [] };
                quill.setContents(validData);
            }
            if (role === "viewer") {
                quill.disable();
            } else {
                quill.enable();
            }
        }
    }, [quill, role])

    // Save document at intervals (only for editors/owners)
    useEffect(() => {
        if (!socket || !quill || !isSocketReady || role === "viewer") {
            return;
        }

        const interval = setInterval(() => {
            socket.send(JSON.stringify({
                event: 'save-document',
                data: quill.getContents()
            }))
        }, SAVE_INTERVAL_MS)

        return () => {
            clearInterval(interval)
        };
    }, [socket, quill, isSocketReady, role])

    // Send text changes via WebSocket (only for editors/owners)
    useEffect(() => {
        if (!socket || !quill || !isSocketReady || role === "viewer") return;

        const handler = (delta, oldDelta, source) => {
            if (source !== 'user') return;
            socket.send(JSON.stringify({
                event: "send-changes",
                data: delta
            }))
        };
        quill.on('text-change', handler)

        return () => {
            quill.off('text-change', handler)
        };
    }, [socket, quill, isSocketReady, role])

    // Share document handler
    const handleShare = async () => {
        if (!token) return;
        setShareError('');
        setShareSuccess('');

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/documents/${documentId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ email: shareEmail, role: shareRole })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to share document');
            }

            setShareSuccess('Document shared successfully!');
            setShareEmail('');
            setTimeout(() => {
                setIsShareModalOpen(false);
                setShareSuccess('');
            }, 1500);
        } catch (err) {
            setShareError(err.message || 'Failed to share document');
        }
    };

    const wrapperRef = useCallback((wrapper) => {
        if (wrapper == null) return;

        wrapper.innerHTML = '';
        const editor = document.createElement('div');
        wrapper.append(editor);
        const q = new Quill(editor, { theme: "snow", modules: { toolbar: TOOLBAR_OPTIONS } });
        q.disable();
        q.setText('Loading...');
        setQuill(q);
    }, [])

    function openDashboard() {
        navigate("/")
    }

    return (
        <div className="container">
            <div className="document-title-wrapper" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: "sticky",
                height: "55px",
                top: "0",
                zIndex: "1",
                backgroundColor: "#F3F3F3"
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="dashboard-button" style={{
                        margin: "10px", padding: "0.5rem 1.2rem",
                        background: "#4285f4",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "1rem",
                        cursor: "pointer",
                        fontFamily: "inherit"
                    }} onClick={() => openDashboard()}>Dashboard</div>
                    {/* Only allow owner/editor to edit title */}
                    {role !== "viewer" && isTitleEditing ? (
                        <input
                            ref={titleRef}
                            className="document-title-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onBlur={() => { setIsTitleEditing(false); saveTitle(title); }}
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    setIsTitleEditing(false);
                                    saveTitle(title);
                                }
                            }}
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                width: "100%",
                                maxWidth: "600px",
                                border: "none",
                                background: "transparent",
                                outline: "none",
                                margin: "10px",
                                padding: "5px"
                            }}
                        />
                    ) : (
                        <h2
                            className="document-title"
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                cursor: role !== "viewer" ? "pointer" : "default",
                                width: "100%",
                                maxWidth: "600px",
                                margin: "10px",
                                padding: "5px"
                            }}
                            onClick={() => role !== "viewer" && setIsTitleEditing(true)}
                            title={role !== "viewer" ? "Click to edit title" : ""}
                        >
                            {title}
                        </h2>
                    )}
                    {role === "viewer" && (
                        <span style={{
                            background: "#e0e0e0",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            marginLeft: "10px",
                            color: "#555",
                            fontWeight: "bold",
                            whiteSpace: "nowrap"
                        }}>
                            View Only
                        </span>
                    )}
                </div>
                {/* Only show share button to owner */}
                {role === "owner" && (
                    <button
                        className="share-button"
                        style={{
                            margin: "10px",
                            padding: "0.5rem 1.2rem",
                            background: "#4285f4",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            cursor: "pointer",
                            fontFamily: "inherit"
                        }}
                        onClick={() => setIsShareModalOpen(true)}
                    >
                        Share
                    </button>
                )}
            </div>
            <div id="container" ref={wrapperRef}></div>

            {/* Share Modal */}
            {isShareModalOpen && (
                <div className="share-modal-overlay">
                    <div className="share-modal">
                        <h2 className="share-modal-title">Share Document</h2>
                        {shareError && <div className="share-error">{shareError}</div>}
                        {shareSuccess && <div className="share-success">{shareSuccess}</div>}
                        <div className="share-form-group">
                            <label className="share-label">User Email</label>
                            <input
                                type="email"
                                className="share-input"
                                value={shareEmail}
                                onChange={(e) => setShareEmail(e.target.value)}
                                placeholder="Enter user email"
                            />
                        </div>
                        <div className="share-form-group">
                            <label className="share-label">Role</label>
                            <select
                                className="share-select"
                                value={shareRole}
                                onChange={(e) => setShareRole(e.target.value)}
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                        </div>
                        <div className="share-modal-buttons">
                            <button
                                className="share-button-cancel"
                                onClick={() => {
                                    setIsShareModalOpen(false);
                                    setShareError('');
                                    setShareSuccess('');
                                    setShareEmail('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="share-button-confirm"
                                onClick={handleShare}
                            >
                                Share
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
