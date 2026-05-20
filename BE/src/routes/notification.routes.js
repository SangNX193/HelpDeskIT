const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', notificationController.getNotifications);

router.put('/read-all', notificationController.readAll);

router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
