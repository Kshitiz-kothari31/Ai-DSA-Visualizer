const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import Routes (We will create these next)
const authRoutes = require('./routes/authRoutes');

const app = express();

// --- 1. Middleware ---
// Allows us to receive JSON data in req.body
app.use(express.json());

// Allows us to parse cookies from the frontend
app.use(cookieParser());

// CORS Configuration: Essential for MERN stack communication
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,               // Allows cookies to be sent back and forth
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- 2. MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ AlgoAI MongoDB Connected Successfully"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:");
        console.error(err.message);
    });

// --- 3. API Routes ---
// This handles all signup and login requests
app.use('/api/auth', authRoutes);

// Health Check Route
app.get('/', (req, res) => {
    res.send('AlgoAI Visualizer Server is running...');
});

// --- 4. Global Error Handler ---
// Catch-all for any server errors to prevent the app from crashing
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong on the server!' });
});

// --- 5. Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is active at: http://localhost:${PORT}`);
});