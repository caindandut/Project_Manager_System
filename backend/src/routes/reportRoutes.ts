import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  getDashboardStats,
  getProjectReport,
  getBurndownData,
  getEmployeeReport,
} from '../controllers/reportController';
import {
  reportIdParamSchema,
  employeeReportQuerySchema,
} from '../validators/reportValidator';

const router: Router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/projects/:id', validate(reportIdParamSchema, 'params'), getProjectReport);
router.get(
  '/projects/:id/burndown',
  validate(reportIdParamSchema, 'params'),
  getBurndownData,
);
router.get(
  '/employees/:id',
  validate(reportIdParamSchema, 'params'),
  validate(employeeReportQuerySchema, 'query'),
  getEmployeeReport,
);

export default router;
