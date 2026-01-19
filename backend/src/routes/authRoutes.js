const express = require('express');
const { registerUser, loginUser, loginGoogle } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', loginGoogle);

module.exports = router;