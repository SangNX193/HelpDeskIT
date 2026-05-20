const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('MANAGER', 'ADMIN'));

router.get('/overview', dashboardController.getOverview);

router.get('/sla-statistics', dashboardController.getSlaStatistics);

router.get('/support-performance', dashboardController.getSupportPerformance);

router.get('/tickets-by-status', dashboardController.getTicketsByStatus);

router.get('/tickets-by-priority', dashboardController.getTicketsByPriority);

router.get('/tickets-by-service', dashboardController.getTicketsByService);

module.exports = router;
