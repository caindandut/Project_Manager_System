import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  createChatGroup,
  getChatGroups,
  getMessages,
  getOrCreateDirectChat,
  markGroupAsRead,
  sendDirectMessage,
  sendMessage,
} from '../controllers/chatController';
import {
  chatMessagesQuerySchema,
  createChatGroupSchema,
  sendMessageSchema,
} from '../validators/chatValidator';

const router: Router = express.Router();

router.use(protect);

router.get('/groups', getChatGroups);
router.post('/groups', validate(createChatGroupSchema), createChatGroup);

router.get('/groups/:id/messages', validate(chatMessagesQuerySchema, 'query'), getMessages);
router.post('/groups/:id/messages', validate(sendMessageSchema), sendMessage);
router.put('/groups/:id/read', markGroupAsRead);

router.get('/direct/:userId', getOrCreateDirectChat);
router.post('/direct/:userId/messages', validate(sendMessageSchema), sendDirectMessage);

export default router;

