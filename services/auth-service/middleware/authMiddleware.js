const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    let token;

    token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token found" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(401).json({ message: "Not authorized, token failed" });
    }
};