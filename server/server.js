require("dotenv").config();
const mongoose = require("mongoose")
const express = require('express');
const Document = require('./models/Document')
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");

// mongoose.connect('mongodb://localhost/google-docs-clone')

async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost/google-docs-clone');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process if connection fails
  }
}

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Register Auth Routes
app.use("/auth", authRoutes);

// Get all documents (owned by the user)
app.get("/documents", requireAuth, async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user.userId });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

app.post("/documents", requireAuth, async (req, res) => {
  try {
    const doc = await Document.create({
      _id: req.body.id,
      data: req.body.data || {},
      title: req.body.title || "Untitled Document",
      owner: req.user.userId
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to create document" });
  }
});

// show document title (only if owned)
app.get("/documents/:id", requireAuth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ title: document.title, content: document.data }); // 'data' for Quill content
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//edit document title (only if owned)
app.put("/documents/:id/title", requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    document.title = title;
    await document.save();

    res.json({ title: document.title });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a document (only if owned)
app.delete("/documents/:id", requireAuth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// const io = require('socket.io')('3001', {
//     cors: {
//         origin: 'http://localhost:3000',
//         methods: ['GET', 'POST']
//     }
// })

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("Authentication error: Token missing"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attach authenticated user to socket.user
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

const defaultValue = ""

io.on("connection", socket => {
  socket.on('get-document', async documentId => {
    const document = await Document.findById(documentId);

    // Verify ownership before joining room
    if (!document || document.owner.toString() !== socket.user.userId) {
      return socket.emit('error', 'Access denied: You do not own this document');
    }

    socket.join(documentId)
    socket.emit('load-document', document.data)

    socket.on('send-changes', delta => {
      socket.broadcast.to(documentId).emit('receive-changes', delta)
    })

    socket.on('save-document', async data => {
      // Also check ownership on save
      const doc = await Document.findById(documentId);
      if (doc && doc.owner.toString() === socket.user.userId) {
        await Document.findByIdAndUpdate(documentId, { data })
      }
    })
  })
})

// --- Start Server ---
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});