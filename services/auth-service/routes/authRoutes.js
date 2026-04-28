const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // We'll need this for 'getMe'

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected route (checks if the user is still logged in)
// This is what makes your AlgoAI Visualizer feel like a real app
router.get('/me', protect, getMe);

module.exports = router;