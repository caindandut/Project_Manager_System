import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/authorizeMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { getCompany, updateCompany } from '../controllers/companyController';
import { updateCompanySchema } from '../validators/companyValidator';

const router: Router = express.Router();

router.get('/', getCompany);

router.use(protect);
router.put('/', authorizeRoles('Admin'), validate(updateCompanySchema), updateCompany);

export default router;
