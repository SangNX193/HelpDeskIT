const { badRequest } = require('../utils/response');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const validate = (rules) => (req, res, next) => {
    const errors = [];

    rules.forEach((rule) => {
        const value = req.body[rule.field];

        if (rule.required && isBlank(value)) {
            errors.push({ field: rule.field, message: `Vui lòng nhập ${rule.label || rule.field}` });
            return;
        }

        if (!isBlank(value) && rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
            errors.push({ field: rule.field, message: 'Email không đúng định dạng' });
        }

        if (!isBlank(value) && rule.minLength && String(value).length < rule.minLength) {
            errors.push({ field: rule.field, message: `${rule.label || rule.field} phải có ít nhất ${rule.minLength} ký tự` });
        }
    });

    if (errors.length > 0) {
        return badRequest(res, 'Dữ liệu không hợp lệ', errors);
    }

    return next();
};

const validateLogin = validate([
    { field: 'email', label: 'email', required: true, email: true },
    { field: 'password', label: 'mật khẩu', required: true }
]);

const validateChangePassword = validate([
    { field: 'currentPassword', label: 'mật khẩu hiện tại', required: true },
    { field: 'newPassword', label: 'mật khẩu mới', required: true, minLength: 6 }
]);

const validateUpdateProfile = validate([
    { field: 'email', label: 'email', email: true },
    { field: 'fullName', label: 'họ tên', minLength: 2 },
    { field: 'full_name', label: 'họ tên', minLength: 2 },
    { field: 'name', label: 'họ tên', minLength: 2 }
]);

module.exports = {
    validateLogin,
    validateUpdateProfile,
    validateChangePassword
};
