import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/authorizeMiddleware';
import { getCompany, updateCompany } from '../controllers/companyController';

const router: Router = express.Router();

router.get('/', getCompany);

router.use(protect);
router.put('/', authorizeRoles('Admin'), updateCompany);

export default router;
