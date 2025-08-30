const mongoose = require("mongoose")
const express = require('express');
const Document = require('./Document')
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

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

// Get all documents
app.get("/documents", async (req, res) => {
  try {
    const docs = await Document.find({});
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

app.post("/documents", async (req, res) => {
  try {
    const doc = await Document.create({ _id: req.body.id, data: req.body.data || {}, title: req.body.title || "Untitled Document" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to create document" });
  }
});

// Edit document title
app.patch("/documents/:id", async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to update title" });
  }
});

// Delete a document
app.delete("/documents/:id", async (req, res) => {
  try {
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

const defaultValue = ""

io.on("connection", socket => {
    socket.on('get-document', async documentId => {
        const document = await findOrCreateDocument(documentId)
        socket.join(documentId)
        socket.emit('load-document', document.data)

        socket.on('send-changes', delta => {
            socket.broadcast.to(documentId).emit('receive-changes', delta)
        })

        socket.on('save-document', async data => {
            await Document.findByIdAndUpdate(documentId, { data })
        })
    })
})

async function findOrCreateDocument(id) {
    if (id == null) return
    const document = await Document.findById(id)
    if (document) return document
    return await Document.create({ _id: id, data: defaultValue })
}

// --- Start Server ---
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});