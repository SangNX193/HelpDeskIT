const { badRequest } = require('../utils/response');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const valueOf = (body, ...fields) => {
    for (const field of fields) {
        if (!isBlank(body[field])) {
            return body[field];
        }
    }
    return undefined;
};

const validateRequired = (groups) => (req, res, next) => {
    const errors = [];

    groups.forEach((group) => {
        if (valueOf(req.body, ...group.fields) === undefined) {
            errors.push({
                field: group.fields[0],
                message: `Vui lòng nhập ${group.label || group.fields[0]}`
            });
        }
    });

    const email = req.body.email;
    if (!isBlank(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        errors.push({ field: 'email', message: 'Email không đúng định dạng' });
    }

    if (errors.length > 0) {
        return badRequest(res, 'Dữ liệu không hợp lệ', errors);
    }

    return next();
};

const validateCreateUser = validateRequired([
    { fields: ['fullName', 'full_name', 'name'], label: 'họ tên' },
    { fields: ['email'], label: 'email' },
    { fields: ['password'], label: 'mật khẩu' },
    { fields: ['roleId', 'role_id', 'roleCode', 'role_code'], label: 'vai trò' }
]);

const validateUpdateUserStatus = validateRequired([{ fields: ['status'], label: 'trạng thái' }]);
const validateResetPassword = validateRequired([{ fields: ['newPassword', 'password'], label: 'mật khẩu mới' }]);
const validateChangeRole = validateRequired([{ fields: ['roleId', 'role_id', 'roleCode', 'role_code'], label: 'vai trò' }]);
const validateRole = validateRequired([
    { fields: ['code'], label: 'mã' },
    { fields: ['name'], label: 'tên' }
]);
const validateDepartment = validateRole;
const validateServiceCategory = validateRole;
const validateService = validateRequired([
    { fields: ['categoryId', 'category_id'], label: 'nhóm dịch vụ' },
    { fields: ['code'], label: 'mã' },
    { fields: ['name'], label: 'tên' }
]);
const validatePriority = validateRequired([
    { fields: ['code'], label: 'mã' },
    { fields: ['name'], label: 'tên' },
    { fields: ['level'], label: 'cấp ưu tiên' }
]);
const validateTicketStatus = validateRole;
const validateSlaPolicy = validateRequired([
    { fields: ['priorityId', 'priority_id'], label: 'mức ưu tiên' },
    { fields: ['responseTimeMinutes', 'response_time_minutes'], label: 'thời gian phản hồi' },
    { fields: ['resolveTimeMinutes', 'resolve_time_minutes'], label: 'thời gian xử lý' }
]);

module.exports = {
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
};
