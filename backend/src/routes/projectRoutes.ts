import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/authorizeMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateMemberRole,
  getProjectStats,
} from '../controllers/projectController';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '../validators/projectValidator';

const router: Router = express.Router();

router.use(protect);

router.get('/', getAllProjects);
router.post('/', authorizeRoles('Admin', 'Director'), validate(createProjectSchema), createProject);

router.get('/:id', getProjectById);
router.put('/:id', authorizeRoles('Admin', 'Director'), validate(updateProjectSchema), updateProject);
router.delete('/:id', authorizeRoles('Admin', 'Director'), deleteProject);

router.get('/:id/members', getProjectMembers);
router.post('/:id/members', authorizeRoles('Admin', 'Director'), validate(addMemberSchema), addProjectMember);
router.delete('/:id/members/:userId', authorizeRoles('Admin', 'Director'), removeProjectMember);
router.put('/:id/members/:userId', authorizeRoles('Admin', 'Director'), validate(updateMemberRoleSchema), updateMemberRole);

router.get('/:id/stats', getProjectStats);

export default router;
