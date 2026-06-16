const express = require('express');
const router = express.Router();

const consultationController = require('../controllers/consultation.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/summary', consultationController.getSummary);

router.get(
    '/my',
    roleMiddleware('REQUESTER'),
    consultationController.getMyConversation
);

router.post(
    '/my/messages',
    roleMiddleware('REQUESTER'),
    consultationController.sendMyMessage
);

router.get(
    '/',
    roleMiddleware('SUPPORT', 'MANAGER', 'ADMIN'),
    consultationController.listConversations
);

router.put(
    '/:id/unread',
    roleMiddleware('SUPPORT', 'MANAGER', 'ADMIN'),
    consultationController.markStaffUnread
);

router.put(
    '/:id/archive',
    roleMiddleware('SUPPORT', 'MANAGER', 'ADMIN'),
    consultationController.archiveConversation
);

router.delete(
    '/:id',
    roleMiddleware('SUPPORT', 'MANAGER', 'ADMIN'),
    consultationController.deleteConversation
);

router.put(
    '/:id/restore',
    roleMiddleware('SUPPORT', 'MANAGER', 'ADMIN'),
    consultationController.restoreConversation
);

router.get('/:id', consultationController.getConversation);

router.post('/:id/messages', consultationController.sendMessage);

module.exports = router;
