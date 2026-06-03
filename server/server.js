require("dotenv").config();
const express = require('express');
const prisma = require("./prisma/client");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Register Auth Routes
app.use("/auth", authRoutes);

// Get all documents (owned by the user)
app.get("/documents", requireAuth, async (req, res) => {
  try {
    const docs = await prisma.document.findMany({
      where: { ownerId: req.user.userId }
    });
    // Map 'id' to '_id' for frontend compatibility
    const formattedDocs = docs.map(doc => ({ ...doc, _id: doc.id }));
    res.json(formattedDocs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

app.post("/documents", requireAuth, async (req, res) => {
  try {
    const doc = await prisma.document.create({
      data: {
        id: req.body.id,
        data: req.body.data || {},
        title: req.body.title || "Untitled Document",
        ownerId: req.user.userId
      }
    });
    // Map 'id' to '_id' for frontend compatibility
    res.json({ ...doc, _id: doc.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create document" });
  }
});

// show document title (only if owned)
app.get("/documents/:id", requireAuth, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.ownerId !== req.user.userId) {
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

    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.ownerId !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedDoc = await prisma.document.update({
      where: { id: req.params.id },
      data: { title }
    });

    res.json({ title: updatedDoc.title });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a document (only if owned)
app.delete("/documents/:id", requireAuth, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.ownerId !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.document.delete({
      where: { id: req.params.id }
    });

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
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      // Verify ownership before joining room
      if (!document || document.ownerId !== socket.user.userId) {
        return socket.emit('error', 'Access denied: You do not own this document');
      }

      socket.join(documentId)
      socket.emit('load-document', document.data)

      socket.on('send-changes', delta => {
        socket.broadcast.to(documentId).emit('receive-changes', delta)
      })

      socket.on('save-document', async data => {
        try {
          // Also check ownership on save
          const doc = await prisma.document.findUnique({
            where: { id: documentId }
          });

          if (doc && doc.ownerId === socket.user.userId) {
            await prisma.document.update({
              where: { id: documentId },
              data: { data }
            });
          }
        } catch (err) {
          console.error("Socket save-document error:", err);
        }
      })
    } catch (err) {
      console.error("Socket get-document error:", err);
      socket.emit('error', 'Server error while loading document');
    }
  })
})

// --- Start Server ---
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});