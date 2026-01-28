import express, { Router } from 'express';
import {
  registerUser,
  loginUser,
  loginGoogle,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getMe,
} from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', loginGoogle);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.get('/me', protect, getMe);

export default router;
