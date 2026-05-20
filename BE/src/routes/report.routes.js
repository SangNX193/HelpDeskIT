const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('MANAGER', 'ADMIN'));

router.get('/tickets', reportController.getTicketReport);

router.get('/sla', reportController.getSlaReport);

router.get('/feedback', reportController.getFeedbackReport);

router.get('/support-performance', reportController.getSupportPerformanceReport);

module.exports = router;
