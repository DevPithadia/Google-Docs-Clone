const jwt = require("jsonwebtoken");

/**
 * Middleware to require authentication for REST routes.
 * Verifies the JWT from the Authorization header.
 */
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: Token missing" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};

module.exports = { requireAuth };
