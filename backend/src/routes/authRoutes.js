const express = require('express');
const {
  registerUser,
  loginUser,
  loginGoogle,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', loginGoogle);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.get('/me', protect, getMe);

module.exports = router;