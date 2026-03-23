const jwt = require("jsonwebtoken");

// ========================================
// VERIFY JWT TOKEN
// ========================================
exports.verifyToken = (req, res, next) => {

  try {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(403).json({ error: "Token required" });
    }

    // Extract token from "Bearer token"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

      if (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      req.user = decoded;
      next();

    });

  } catch (error) {

    console.error("AUTH ERROR:", error);
    res.status(500).json({ error: "Authentication failed" });

  }

};


// ========================================
// ADMIN ACCESS ONLY
// ========================================
exports.isAdmin = (req, res, next) => {

  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin access only" });
  }

  next();

};


// ========================================
// VIEWER OR ADMIN ACCESS
// ========================================
exports.isViewerOrAdmin = (req, res, next) => {

  if (!["Admin", "Viewer"].includes(req.user.role)) {
    return res.status(403).json({ error: "Viewer or Admin access only" });
  }

  next();

};