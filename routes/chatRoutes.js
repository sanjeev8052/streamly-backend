import { Router } from 'express';
import { ChatController } from '../controllers/chatController.js';

const router = Router();

router.get('/messages/:contactId', ChatController.getMessages);
router.post('/messages', ChatController.sendMessage);

export default router;
