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
  getMemberCandidates,
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

/** Trước /:id để tránh id bị parse nhầm (Express khớp theo thứ tự) */
router.get('/:id/member-candidates', getMemberCandidates);

router.get('/:id', getProjectById);
router.put('/:id', authorizeRoles('Admin', 'Director'), validate(updateProjectSchema), updateProject);
router.delete('/:id', authorizeRoles('Admin', 'Director'), deleteProject);

router.get('/:id/members', getProjectMembers);
/** Quyền: assertManagerOrAdmin trong ProjectService (Manager dự án là Employee) */
router.post('/:id/members', validate(addMemberSchema), addProjectMember);
router.delete('/:id/members/:userId', removeProjectMember);
router.put('/:id/members/:userId', validate(updateMemberRoleSchema), updateMemberRole);

router.get('/:id/stats', getProjectStats);

export default router;
