const { forbidden } = require('../utils/response');

module.exports = (...allowedRoles) => (req, res, next) => {
    const userRole = req.user && (req.user.role_code || req.user.roleCode || req.user.role);
    const normalized = String(userRole || '').toUpperCase();
    const allowed = allowedRoles.map((role) => String(role).toUpperCase());

    if (!normalized || !allowed.includes(normalized)) {
        return forbidden(res, 'Bạn không có quyền thực hiện thao tác này');
    }

    return next();
};
