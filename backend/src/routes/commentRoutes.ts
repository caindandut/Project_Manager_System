import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  createComment,
  deleteComment,
  getCommentsByTask,
  updateComment,
} from '../controllers/commentController';
import {
  commentsQuerySchema,
  createCommentSchema,
  updateCommentSchema,
} from '../validators/commentValidator';

const router: Router = express.Router();

router.use(protect);

router.post('/tasks/:taskId/comments', validate(createCommentSchema), createComment);
router.get('/tasks/:taskId/comments', validate(commentsQuerySchema, 'query'), getCommentsByTask);
router.put('/comments/:id', validate(updateCommentSchema), updateComment);
router.delete('/comments/:id', deleteComment);

export default router;

