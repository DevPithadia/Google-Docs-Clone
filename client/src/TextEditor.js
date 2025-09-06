import { useCallback, useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import "quill/dist/quill.snow.css"
import { io } from 'socket.io-client'
import { Navigate, useNavigate, useParams } from 'react-router'

const SAVE_INTERVAL_MS = 1000
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["image", "blockquote", "code-block"],
    ["clean"],
]

export default function TextEditor() {
    const { id: documentId } = useParams()
    const [socket, setSocket] = useState()
    const [quill, setQuill] = useState()
    const [title, setTitle] = useState("Untitled Document")
    const [isTitleEditing, setIsTitleEditing] = useState(false)
    const titleRef = useRef(null)
    const navigate = useNavigate();

    // Fetch title on mount
    useEffect(() => {
        // You may need to update this URL to match your backend route
        fetch(`http://localhost:3001/documents/${documentId}`)
            .then(res => res.json())
            .then(doc => {
                setTitle(doc.title || "Untitled Document")
            })
            .catch(() => setTitle("Untitled Document"))
    }, [documentId])

    // Save title to backend
    const saveTitle = (newTitle) => {
        setTitle(newTitle)
        fetch(`http://localhost:3001/documents/${documentId}/title`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
        })
    }

    // Focus the input when editing starts
    useEffect(() => {
        if (isTitleEditing && titleRef.current) {
            titleRef.current.focus()
        }
    }, [isTitleEditing])

    useEffect(() => {
        if (socket == null || quill == null) return
        socket.once('load-document', document => {
            quill.setContents(document)
            quill.enable()
        })
        socket.emit('get-document', documentId)
    }, [socket, quill, documentId])

    useEffect(() => {
        const s = io("http://localhost:3001")
        setSocket(s)

        return () => {
            s.disconnect()
        }
    }, [])

    useEffect(() => {
        if (socket == null || quill == null) return

        const interval = setInterval(() => {
            socket.emit('save-document', quill.getContents())
        }, SAVE_INTERVAL_MS)

        return () => {
            clearInterval(interval)
        }
    }, [socket, quill])

    useEffect(() => {
        if (socket == null || quill == null) return
        const handler = (delta) => {
            quill.updateContents(delta)
        }
        socket.on('receive-changes', handler)

        return () => {
            socket.off('receive-changes', handler)
        }
    }, [socket, quill])

    useEffect(() => {
        if (socket == null || quill == null) return
        const handler = (delta, oldDelta, source) => {
            if (source !== 'user') return
            socket.emit("send-changes", delta)
        }
        quill.on('text-change', handler)

        return () => {
            quill.off('text-change', handler)
        }
    }, [socket, quill])

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
            <div className='document-title-wrapper' style={{ display: 'flex', position: "sticky", boxSizing: "border-box", height: "55px", top: "0", zIndex: "1", backgroundColor: "#F3F3F3"}}>
                <div className='dashboard-button' style={{
                    margin: "10px", padding: "0.5rem 1.2rem",
                    background: "#4285f4",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    cursor: "pointer",
                    fontamily: "inherit"
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
            <div ref={wrapperRef}></div>
        </div>
    )
}