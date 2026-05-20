const adminService = require('../services/admin.service');
const { success, created, asyncHandler } = require('../utils/response');

const list = (serviceFn) => asyncHandler(async (req, res) => {
    const data = await serviceFn(req.query);
    return success(res, data);
});

const create = (serviceFn, message) => asyncHandler(async (req, res) => {
    const data = await serviceFn(req.body);
    return created(res, data, message);
});

const update = (serviceFn, message) => asyncHandler(async (req, res) => {
    const data = await serviceFn(req.params.id, req.body);
    return success(res, data, message);
});

const remove = (serviceFn, message) => asyncHandler(async (req, res) => {
    await serviceFn(req.params.id);
    return success(res, null, message);
});

const getSupportUsers = list(adminService.getSupportUsers);

const getUsers = list(adminService.getUsers);
const createUser = create(adminService.createUser, 'Tạo người dùng thành công');
const updateUser = update(adminService.updateUser, 'Cập nhật người dùng thành công');
const deleteUser = remove(adminService.deleteUser, 'Xóa người dùng thành công');

const updateUserStatus = asyncHandler(async (req, res) => {
    await adminService.updateUserStatus(req.params.id, req.body.status);
    return success(res, null, 'Cập nhật trạng thái tài khoản thành công');
});

const resetUserPassword = asyncHandler(async (req, res) => {
    await adminService.resetUserPassword(req.params.id, req.body.newPassword || req.body.password);
    return success(res, null, 'Đặt lại mật khẩu người dùng thành công');
});

const changeUserRole = asyncHandler(async (req, res) => {
    await adminService.changeUserRole(req.params.id, req.body);
    return success(res, null, 'Đổi vai trò người dùng thành công');
});

const updateUserDepartments = asyncHandler(async (req, res) => {
    const data = await adminService.updateUserDepartments(req.params.id, req.body);
    return success(res, data, 'Cập nhật phân công tòa thành công');
});

const getRoles = list(adminService.getRoles);
const createRole = create(adminService.createRole, 'Tạo vai trò thành công');
const updateRole = update(adminService.updateRole, 'Cập nhật vai trò thành công');
const deleteRole = remove(adminService.deleteRole, 'Xóa vai trò thành công');

const getDepartments = list(adminService.getDepartments);
const createDepartment = create(adminService.createDepartment, 'Tạo phòng ban thành công');
const updateDepartment = update(adminService.updateDepartment, 'Cập nhật phòng ban thành công');
const deleteDepartment = remove(adminService.deleteDepartment, 'Vô hiệu hóa phòng ban thành công');

const getServiceCategories = list(adminService.getServiceCategories);
const createServiceCategory = create(adminService.createServiceCategory, 'Tạo nhóm dịch vụ thành công');
const updateServiceCategory = update(adminService.updateServiceCategory, 'Cập nhật nhóm dịch vụ thành công');
const deleteServiceCategory = remove(adminService.deleteServiceCategory, 'Vô hiệu hóa nhóm dịch vụ thành công');

const getServices = list(adminService.getServices);
const createService = create(adminService.createService, 'Tạo dịch vụ thành công');
const updateService = update(adminService.updateService, 'Cập nhật dịch vụ thành công');
const deleteService = remove(adminService.deleteService, 'Vô hiệu hóa dịch vụ thành công');

const getPriorities = list(adminService.getPriorities);
const createPriority = create(adminService.createPriority, 'Tạo mức ưu tiên thành công');
const updatePriority = update(adminService.updatePriority, 'Cập nhật mức ưu tiên thành công');
const deletePriority = remove(adminService.deletePriority, 'Vô hiệu hóa mức ưu tiên thành công');

const getTicketStatuses = list(adminService.getTicketStatuses);
const createTicketStatus = create(adminService.createTicketStatus, 'Tạo trạng thái yêu cầu thành công');
const updateTicketStatus = update(adminService.updateTicketStatus, 'Cập nhật trạng thái yêu cầu thành công');
const deleteTicketStatus = remove(adminService.deleteTicketStatus, 'Xóa trạng thái yêu cầu thành công');

const getSlaPolicies = list(adminService.getSlaPolicies);
const createSlaPolicy = create(adminService.createSlaPolicy, 'Tạo chính sách SLA thành công');
const updateSlaPolicy = update(adminService.updateSlaPolicy, 'Cập nhật chính sách SLA thành công');
const deleteSlaPolicy = remove(adminService.deleteSlaPolicy, 'Vô hiệu hóa chính sách SLA thành công');

module.exports = {
    getSupportUsers,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    updateUserStatus,
    resetUserPassword,
    changeUserRole,
    updateUserDepartments,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getServiceCategories,
    createServiceCategory,
    updateServiceCategory,
    deleteServiceCategory,
    getServices,
    createService,
    updateService,
    deleteService,
    getPriorities,
    createPriority,
    updatePriority,
    deletePriority,
    getTicketStatuses,
    createTicketStatus,
    updateTicketStatus,
    deleteTicketStatus,
    getSlaPolicies,
    createSlaPolicy,
    updateSlaPolicy,
    deleteSlaPolicy
};
