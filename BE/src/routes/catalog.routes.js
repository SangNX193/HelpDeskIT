const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const adminService = require('../services/admin.service');
const { success, asyncHandler } = require('../utils/response');

router.use(authMiddleware);

router.get('/service-categories', asyncHandler(async (req, res) => {
    return success(res, await adminService.getServiceCategories());
}));

router.get('/catalog/departments', asyncHandler(async (req, res) => {
    const departments = await adminService.getDepartments();
    return success(res, departments.filter((department) => Number(department.is_active) === 1));
}));

router.get('/services', asyncHandler(async (req, res) => {
    return success(res, await adminService.getServices());
}));

router.get('/priorities', asyncHandler(async (req, res) => {
    return success(res, await adminService.getPriorities());
}));

router.get('/ticket-statuses', asyncHandler(async (req, res) => {
    return success(res, await adminService.getTicketStatuses());
}));

module.exports = router;
