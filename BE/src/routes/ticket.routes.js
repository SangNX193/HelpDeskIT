const express = require('express');
const router = express.Router();

const ticketController = require('../controllers/ticket.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const upload = require('../middlewares/upload.middleware');
const { aiSuggestionRateLimit } = require('../middlewares/rate-limit.middleware');

const {
    validateCreateTicket,
    validateComment,
    validateFeedback,
    validateAssignTicket,
    validateUpdateStatus,
    validateUpdatePriority
} = require('../validators/ticket.validator');

router.use(authMiddleware);

router.post(
    '/',
    roleMiddleware('REQUESTER', 'ADMIN'),
    validateCreateTicket,
    ticketController.createTicket
);

router.get(
    '/',
    roleMiddleware('MANAGER', 'ADMIN'),
    ticketController.getAllTickets
);

router.get(
    '/my',
    roleMiddleware('REQUESTER'),
    ticketController.getMyTickets
);

router.get(
    '/assigned-to-me',
    roleMiddleware('SUPPORT'),
    ticketController.getAssignedToMe
);

router.get(
    '/unassigned',
    roleMiddleware('MANAGER', 'ADMIN'),
    ticketController.getUnassignedTickets
);

router.get(
    '/overdue',
    roleMiddleware('MANAGER', 'ADMIN'),
    ticketController.getOverdueTickets
);

router.get(
    '/by-support/:supportId',
    roleMiddleware('MANAGER', 'ADMIN'),
    ticketController.getTicketsBySupport
);

router.get('/:id', ticketController.getTicketById);

router.put(
    '/:id',
    roleMiddleware('REQUESTER'),
    validateCreateTicket,
    ticketController.updateRequesterTicket
);

router.put(
    '/:id/assign',
    roleMiddleware('MANAGER', 'ADMIN'),
    validateAssignTicket,
    ticketController.assignTicket
);

router.put(
    '/:id/reassign',
    roleMiddleware('MANAGER', 'ADMIN'),
    validateAssignTicket,
    ticketController.reassignTicket
);

router.put(
    '/:id/priority',
    roleMiddleware('MANAGER', 'ADMIN'),
    validateUpdatePriority,
    ticketController.updatePriority
);

router.put(
    '/:id/status',
    roleMiddleware('SUPPORT', 'MANAGER', 'ADMIN'),
    validateUpdateStatus,
    ticketController.updateStatus
);

router.put(
    '/:id/start',
    roleMiddleware('SUPPORT'),
    ticketController.startTicket
);

router.put(
    '/:id/resolve',
    roleMiddleware('SUPPORT'),
    ticketController.resolveTicket
);

router.put(
    '/:id/cancel',
    roleMiddleware('REQUESTER'),
    ticketController.cancelTicket
);

router.post(
    '/:id/comments',
    validateComment,
    ticketController.addComment
);

router.get(
    '/:id/comments',
    ticketController.getComments
);

router.post(
    '/:id/attachments',
    upload.single('file'),
    ticketController.uploadAttachment
);

router.get(
    '/:id/attachments',
    ticketController.getAttachments
);

router.post(
    '/:id/ai-suggestions',
    aiSuggestionRateLimit,
    ticketController.generateAiSuggestion
);

router.post(
    '/:id/feedback',
    roleMiddleware('REQUESTER'),
    validateFeedback,
    ticketController.addFeedback
);

router.get(
    '/:id/history',
    ticketController.getTicketHistory
);

router.get(
    '/:id/assignment-history',
    ticketController.getAssignmentHistory
);

module.exports = router;
