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
import { validate } from '../middlewares/validateMiddleware';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  loginGoogleSchema,
} from '../validators/authValidator';

const router: Router = express.Router();

router.post('/register', registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/google', validate(loginGoogleSchema), loginGoogle);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.get('/me', protect, getMe);

export default router;
