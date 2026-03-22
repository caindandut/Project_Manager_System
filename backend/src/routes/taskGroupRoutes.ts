/**
 * GĐ2 mục 2.4 — Nhóm công việc: nested `/api/projects` + flat `/api/task-groups`.
 */
import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  getTaskGroups,
  createTaskGroup,
  reorderTaskGroups,
  updateTaskGroup,
  deleteTaskGroup,
} from '../controllers/taskGroupController';
import {
  createTaskGroupSchema,
  updateTaskGroupSchema,
  reorderTaskGroupsSchema,
} from '../validators/taskValidator';

/**
 * Nested: mount tại `/api/projects` — đăng ký TRƯỚC projectRoutes để khớp `/:projectId/task-groups`.
 */
export const nestedTaskGroupRouter: Router = express.Router();
nestedTaskGroupRouter.use(protect);
nestedTaskGroupRouter.get('/:projectId/task-groups', getTaskGroups);
nestedTaskGroupRouter.post(
  '/:projectId/task-groups',
  validate(createTaskGroupSchema),
  createTaskGroup,
);
nestedTaskGroupRouter.put(
  '/:projectId/task-groups/reorder',
  validate(reorderTaskGroupsSchema),
  reorderTaskGroups,
);

/**
 * Flat: mount tại `/api/task-groups` — đổi tên / xóa theo id nhóm.
 */
export const flatTaskGroupRouter: Router = express.Router();
flatTaskGroupRouter.use(protect);
flatTaskGroupRouter.put('/:id', validate(updateTaskGroupSchema), updateTaskGroup);
flatTaskGroupRouter.delete('/:id', deleteTaskGroup);
