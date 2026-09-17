import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/check-username', UserController.checkUsername);
router.post('/auth/signup', UserController.signUp);
router.post('/auth/login', UserController.login);

router.put('/users/profile', authenticateToken, UserController.updateProfile);
router.get('/contacts', UserController.getRegisteredUsers);

export default router;
