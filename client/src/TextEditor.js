import { useCallback, useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import "quill/dist/quill.snow.css"
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

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
    const [cachedDocumentData, setCachedDocumentData] = useState(null)
    const [title, setTitle] = useState("Untitled Document")
    const [isTitleEditing, setIsTitleEditing] = useState(false)
    const titleRef = useRef(null)
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    useEffect(() => {
        document.title = title ? `${title} - Google Docs Clone` : "Google Docs Clone"
    }, [title])

    // Fetch title on mount
    useEffect(() => {
        if (!token) return;

        fetch(`${process.env.REACT_APP_API_URL}/documents/${documentId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(res => {
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
            .then(doc => {
                setTitle(doc.title || "Untitled Document")
            })
            .catch(err => {
                console.error("Failed to fetch title:", err);
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

    // Apply cached document data when quill is ready
    useEffect(() => {
        if (quill && cachedDocumentData) {
            // Ensure data is a valid Quill Delta (has ops array)
            const validData = cachedDocumentData && cachedDocumentData.ops
                ? cachedDocumentData
                : { ops: [] };
            quill.setContents(validData);
            quill.enable();
        }
    }, [quill, cachedDocumentData])

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
                setCachedDocumentData(data);
            } else if (eventType === 'receive-changes' && quill) {
                quill.updateContents(data);
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
    }, [token, documentId, logout, navigate]); //removed - quill

    // Save document at intervals
    useEffect(() => {
        if (!socket || !quill || !isSocketReady) {
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
        }
    }, [socket, quill, isSocketReady])

    // Send text changes via WebSocket
    useEffect(() => {
        if (!socket || !quill || !isSocketReady) return;

        const handler = (delta, oldDelta, source) => {
            if (source !== 'user') return
            socket.send(JSON.stringify({
                event: "send-changes",
                data: delta
            }))
        }
        quill.on('text-change', handler)

        return () => {
            quill.off('text-change', handler)
        }
    }, [socket, quill, isSocketReady])

    const wrapperRef = useCallback((wrapper) => {
        if (wrapper == null) return

        wrapper.innerHTML = ''
        const editor = document.createElement('div');
        wrapper.append(editor)
        const q = new Quill(editor, { theme: "snow", modules: { toolbar: TOOLBAR_OPTIONS } })
        q.disable()
        q.setText('Loading...')
        setQuill(q);
    }, [])

    function openDashboard() {
        navigate("/")
    }

    return (
        <div className='container'>
            <div className='document-title-wrapper' style={{
                display: 'flex',
                position: "sticky",
                height: "55px",
                top: "0",
                zIndex: "1",
                backgroundColor: "#F3F3F3"
            }}>
                <div className='dashboard-button' style={{
                    margin: "10px", padding: "0.5rem 1.2rem",
                    background: "#4285f4",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    cursor: "pointer",
                    fontFamily: "inherit"
                }} onClick={() => openDashboard()}>Dashboard</div>
                {isTitleEditing ? (
                    <input
                        ref={titleRef}
                        className='document-title-input'
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
                        className='document-title'
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            cursor: "pointer",
                            width: "100%",
                            maxWidth: "600px",
                            margin: "10px",
                            padding: "5px"
                        }}
                        onClick={() => setIsTitleEditing(true)}
                        title="Click to edit title"
                    >
                        {title}
                    </h2>
                )}
            </div>
            <div id='container' ref={wrapperRef}></div>
        </div>
    )
}
