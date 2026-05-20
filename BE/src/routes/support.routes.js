const express = require('express');
const router = express.Router();

const supportController = require('../controllers/support.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.get(
    '/support-users',
    authMiddleware,
    roleMiddleware('MANAGER', 'ADMIN'),
    supportController.getSupportUsers
);

module.exports = router;
