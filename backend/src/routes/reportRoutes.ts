import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  getDashboardStats,
  getProjectReport,
  getBurndownData,
  getEmployeeReport,
} from '../controllers/reportController';

const router: Router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/projects/:id', getProjectReport);
router.get('/projects/:id/burndown', getBurndownData);
router.get('/employees/:id', getEmployeeReport);

export default router;
