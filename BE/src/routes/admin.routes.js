const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const {
    validateCreateUser,
    validateUpdateUserStatus,
    validateResetPassword,
    validateChangeRole,
    validateRole,
    validateDepartment,
    validateServiceCategory,
    validateService,
    validatePriority,
    validateTicketStatus,
    validateSlaPolicy
} = require('../validators/admin.validator');

router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

router.get('/support-users', adminController.getSupportUsers);

// Users
router.get('/users', adminController.getUsers);
router.post('/users', validateCreateUser, adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/status', validateUpdateUserStatus, adminController.updateUserStatus);
router.put('/users/:id/reset-password', validateResetPassword, adminController.resetUserPassword);
router.put('/users/:id/change-role', validateChangeRole, adminController.changeUserRole);
router.put('/users/:id/departments', adminController.updateUserDepartments);

// Roles
router.get('/roles', adminController.getRoles);
router.post('/roles', validateRole, adminController.createRole);
router.put('/roles/:id', adminController.updateRole);
router.delete('/roles/:id', adminController.deleteRole);

// Departments
router.get('/departments', adminController.getDepartments);
router.post('/departments', validateDepartment, adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

// Service Categories
router.get('/service-categories', adminController.getServiceCategories);
router.post('/service-categories', validateServiceCategory, adminController.createServiceCategory);
router.put('/service-categories/:id', adminController.updateServiceCategory);
router.delete('/service-categories/:id', adminController.deleteServiceCategory);

// Services
router.get('/services', adminController.getServices);
router.post('/services', validateService, adminController.createService);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// Priorities
router.get('/priorities', adminController.getPriorities);
router.post('/priorities', validatePriority, adminController.createPriority);
router.put('/priorities/:id', adminController.updatePriority);
router.delete('/priorities/:id', adminController.deletePriority);

// Ticket Statuses
router.get('/ticket-statuses', adminController.getTicketStatuses);
router.post('/ticket-statuses', validateTicketStatus, adminController.createTicketStatus);
router.put('/ticket-statuses/:id', adminController.updateTicketStatus);
router.delete('/ticket-statuses/:id', adminController.deleteTicketStatus);

// SLA Policies
router.get('/sla-policies', adminController.getSlaPolicies);
router.post('/sla-policies', validateSlaPolicy, adminController.createSlaPolicy);
router.put('/sla-policies/:id', adminController.updateSlaPolicy);
router.delete('/sla-policies/:id', adminController.deleteSlaPolicy);

module.exports = router;
