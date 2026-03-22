import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  createTask,
  reorderTasksInGroup,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskProgress,
  archiveTask,
  assignTask,
  unassignTask,
  createSubtask,
  getSubtasks,
  addDependency,
  removeDependency,
  moveTask,
} from '../controllers/taskController';
import {
  createTaskSchema,
  reorderTasksInGroupSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskProgressSchema,
  assignTaskSchema,
  createSubtaskSchema,
  addDependencySchema,
  moveTaskSchema,
} from '../validators/taskValidator';

const router: Router = express.Router();

router.use(protect);

router.post('/task-groups/:groupId/tasks', validate(createTaskSchema), createTask);
router.put(
  '/task-groups/:groupId/tasks/reorder',
  validate(reorderTasksInGroupSchema),
  reorderTasksInGroup,
);

router.get('/tasks/:id/subtasks', getSubtasks);
router.post('/tasks/:id/subtasks', validate(createSubtaskSchema), createSubtask);

router.post('/tasks/:id/dependencies', validate(addDependencySchema), addDependency);
router.delete('/tasks/:id/dependencies/:predecessorId', removeDependency);

router.post('/tasks/:id/move', validate(moveTaskSchema), moveTask);

router.post('/tasks/:id/assignees', validate(assignTaskSchema), assignTask);
router.delete('/tasks/:id/assignees/:userId', unassignTask);

router.put('/tasks/:id/archive', archiveTask);
router.put('/tasks/:id/progress', validate(updateTaskProgressSchema), updateTaskProgress);
router.put('/tasks/:id/status', validate(updateTaskStatusSchema), updateTaskStatus);

router.get('/tasks/:id', getTaskById);
router.put('/tasks/:id', validate(updateTaskSchema), updateTask);
router.delete('/tasks/:id', deleteTask);

export default router;
