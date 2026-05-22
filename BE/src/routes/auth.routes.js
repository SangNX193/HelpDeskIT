const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { loginRateLimit } = require('../middlewares/rate-limit.middleware');
const upload = require('../middlewares/upload.middleware');

const {
    validateLogin,
    validateChangePassword,
    validateUpdateProfile
} = require('../validators/auth.validator');

router.post(
    '/login',
    loginRateLimit,
    validateLogin,
    authController.login
);

router.get(
    '/profile',
    authMiddleware,
    authController.profile
);

router.put(
    '/profile',
    authMiddleware,
    upload.single('avatar'),
    validateUpdateProfile,
    authController.updateProfile
);

router.put(
    '/change-password',
    authMiddleware,
    validateChangePassword,
    authController.changePassword
);

router.post(
    '/logout',
    authMiddleware,
    authController.logout
);

module.exports = router;
