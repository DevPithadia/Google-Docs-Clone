const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @route   POST /auth/google
 * @desc    Verify Google ID token and return local JWT + user info
 * @access  Public
 */
router.post("/google", async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ message: "ID Token is required" });
    }

    try {
        // Verify Google ID token using google-auth-library
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        // Extract user info from Google payload
        const { sub: googleId, email, name, picture } = payload;

        // Find existing user by googleId in PostgreSQL using Prisma
        let user = await prisma.user.findUnique({
            where: { googleId }
        });

        // If user does not exist, create a new one in PostgreSQL
        if (!user) {
            user = await prisma.user.create({
                data: {
                    googleId,
                    email,
                    name,
                    picture,
                },
            });
        }

        // Generate JWT with 7d expiration
        // Note: userId is now an Integer (PostgreSQL ID)
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Return token and user data
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    } catch (error) {
        console.error("Google auth error:", error);
        res.status(401).json({ message: "Authentication failed: Invalid token" });
    }
});

module.exports = router;
