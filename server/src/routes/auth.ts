import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/password-reset/request', AuthController.requestPasswordReset);
router.post('/password-reset/reset', AuthController.resetPassword);
router.post('/newsletter/subscribe', AuthController.subscribeNewsletter);
router.post('/newsletter/unsubscribe', AuthController.unsubscribeNewsletter);
router.get('/newsletter/unsubscribe', AuthController.unsubscribeByToken);

// Protected routes
router.get('/profile', requireAuth, AuthController.getProfile);

export default router;
