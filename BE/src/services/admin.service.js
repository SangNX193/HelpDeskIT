const adminRepository = require('../repositories/admin.repository');
const { hashPassword } = require('../utils/password');

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const valueOf = (data, ...fields) => {
    for (const field of fields) {
        if (data[field] !== undefined && data[field] !== null && String(data[field]).trim() !== '') {
            return data[field];
        }
    }
    return undefined;
};

const nullableValueOf = (data, ...fields) => {
    for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== undefined) {
            if (data[field] === null || String(data[field]).trim() === '') {
                return null;
            }
            return data[field];
        }
    }
    return undefined;
};

const boolValue = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'active'].includes(value.toLowerCase()) ? 1 : 0;
    }

    return value ? 1 : 0;
};

const normalizeCode = (code) => (code === undefined ? undefined : String(code).trim().toUpperCase());
const normalizeUserStatus = (status) => {
    const normalized = String(status || '').trim().toUpperCase();
    if (!['ACTIVE', 'LOCKED'].includes(normalized)) {
        throw httpError(400, 'Trạng thái tài khoản chỉ được là ACTIVE hoặc LOCKED');
    }
    return normalized;
};

const resolveRoleId = async (payload) => {
    const roleId = valueOf(payload, 'roleId', 'role_id');
    if (roleId) {
        return Number(roleId);
    }

    const roleCode = valueOf(payload, 'roleCode', 'role_code');
    if (!roleCode) {
        throw httpError(400, 'Vui lòng chọn vai trò');
    }

    const role = await adminRepository.findByCode('roles', normalizeCode(roleCode));
    if (!role) {
        throw httpError(404, 'Không tìm thấy vai trò');
    }

    return role.id;
};

const sanitizeUserPayload = async (payload, includePassword = false) => {
    const data = {
        full_name: valueOf(payload, 'fullName', 'full_name', 'name'),
        email: valueOf(payload, 'email'),
        phone: nullableValueOf(payload, 'phone'),
        role_id: valueOf(payload, 'roleId', 'role_id', 'roleCode', 'role_code') === undefined
            ? undefined
            : await resolveRoleId(payload),
        department_id: nullableValueOf(payload, 'departmentId', 'department_id'),
        status: valueOf(payload, 'status') ? normalizeUserStatus(valueOf(payload, 'status')) : undefined
    };

    if (includePassword) {
        data.password_hash = await hashPassword(valueOf(payload, 'password'));
    }

    return data;
};

const getUsers = (query) => adminRepository.getUsers({
    roleCode: query.roleCode || query.role_code,
    status: query.status,
    keyword: query.keyword || query.q
});

const createUser = async (payload) => {
    const data = await sanitizeUserPayload(payload, true);
    const id = await adminRepository.createUser(data);
    const departmentIds = [...new Set(normalizeDepartmentIds(payload))];
    const selectedDepartmentIds = departmentIds.length
        ? departmentIds
        : (data.department_id ? [data.department_id] : []);

    if (selectedDepartmentIds.length) {
        await adminRepository.setUserDepartments(id, selectedDepartmentIds);
    }
    return adminRepository.getUserById(id);
};

const updateUser = async (id, payload) => {
    const data = await sanitizeUserPayload(payload, false);
    await adminRepository.updateUser(id, data);
    if (data.department_id !== undefined) {
        await adminRepository.setUserDepartments(id, data.department_id ? [data.department_id] : []);
    }
    return adminRepository.getUserById(id);
};

const deleteUser = async (id) => {
    const user = await adminRepository.getUserById(id);
    if (!user) {
        throw httpError(404, 'Không tìm thấy người dùng');
    }

    const references = await adminRepository.getUserDeleteReferences(id);
    const totalReferences = Object.values(references).reduce((sum, value) => sum + Number(value || 0), 0);
    if (totalReferences > 0) {
        throw httpError(409, 'Không thể xóa hẳn người dùng đã phát sinh ticket, bình luận, phản hồi hoặc lịch sử xử lý. Hãy dùng Khóa để ngăn tài khoản đăng nhập.');
    }

    return adminRepository.deleteUser(id);
};

const updateUserStatus = (id, status) => adminRepository.updateUserStatus(id, normalizeUserStatus(status));

const resetUserPassword = async (id, newPassword) => {
    const passwordHash = await hashPassword(newPassword);
    return adminRepository.resetUserPassword(id, passwordHash);
};

const changeUserRole = async (id, payload) => {
    const roleId = await resolveRoleId(payload);
    return adminRepository.changeUserRole(id, roleId);
};

const normalizeDepartmentIds = (payload) => {
    const raw = valueOf(payload, 'departmentIds', 'department_ids', 'departmentId', 'department_id');
    if (raw === undefined) {
        return [];
    }

    const values = Array.isArray(raw) ? raw : String(raw).split(',');
    return values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
};

const updateUserDepartments = async (id, payload) => {
    const user = await adminRepository.getUserById(id);
    if (!user) {
        throw httpError(404, 'Không tìm thấy người dùng');
    }

    const departmentIds = [...new Set(normalizeDepartmentIds(payload))];

    await adminRepository.setUserDepartments(id, departmentIds);
    return adminRepository.getUserById(id);
};

const rolePayload = (payload) => ({
    code: normalizeCode(valueOf(payload, 'code')),
    name: valueOf(payload, 'name'),
    description: valueOf(payload, 'description'),
    is_system: boolValue(valueOf(payload, 'isSystem', 'is_system'))
});

const namedPayload = (payload) => ({
    code: normalizeCode(valueOf(payload, 'code')),
    name: valueOf(payload, 'name'),
    description: nullableValueOf(payload, 'description'),
    is_active: boolValue(valueOf(payload, 'isActive', 'is_active'))
});

const servicePayload = (payload) => ({
    category_id: valueOf(payload, 'categoryId', 'category_id'),
    code: normalizeCode(valueOf(payload, 'code')),
    name: valueOf(payload, 'name'),
    description: nullableValueOf(payload, 'description'),
    is_active: boolValue(valueOf(payload, 'isActive', 'is_active'))
});

const priorityPayload = (payload) => ({
    code: normalizeCode(valueOf(payload, 'code')),
    name: valueOf(payload, 'name'),
    level: valueOf(payload, 'level'),
    color: valueOf(payload, 'color'),
    response_time_minutes: valueOf(payload, 'responseTimeMinutes', 'response_time_minutes'),
    resolve_time_minutes: valueOf(payload, 'resolveTimeMinutes', 'resolve_time_minutes'),
    is_active: boolValue(valueOf(payload, 'isActive', 'is_active'))
});

const ticketStatusPayload = (payload) => ({
    code: normalizeCode(valueOf(payload, 'code')),
    name: valueOf(payload, 'name'),
    color: valueOf(payload, 'color'),
    sort_order: valueOf(payload, 'sortOrder', 'sort_order'),
    is_default: boolValue(valueOf(payload, 'isDefault', 'is_default')),
    is_closed: boolValue(valueOf(payload, 'isClosed', 'is_closed')),
    is_system: boolValue(valueOf(payload, 'isSystem', 'is_system'))
});

const slaPayload = (payload) => ({
    service_id: valueOf(payload, 'serviceId', 'service_id') || null,
    priority_id: valueOf(payload, 'priorityId', 'priority_id'),
    response_time_minutes: valueOf(payload, 'responseTimeMinutes', 'response_time_minutes'),
    resolve_time_minutes: valueOf(payload, 'resolveTimeMinutes', 'resolve_time_minutes'),
    is_active: boolValue(valueOf(payload, 'isActive', 'is_active'))
});

const createAndFetch = async (createFn, findTable, payload) => {
    const id = await createFn(payload);
    return adminRepository.findById(findTable, id);
};

module.exports = {
    getUsers,
    getSupportUsers: (query = {}) => adminRepository.getSupportUsers({
        room: valueOf(query, 'room')
    }),
    createUser,
    updateUser,
    deleteUser,
    updateUserStatus,
    resetUserPassword,
    changeUserRole,
    updateUserDepartments,

    getRoles: adminRepository.getRoles,
    createRole: (payload) => createAndFetch(adminRepository.createRole, 'roles', rolePayload(payload)),
    updateRole: async (id, payload) => {
        await adminRepository.updateRole(id, rolePayload(payload));
        return adminRepository.findById('roles', id);
    },
    deleteRole: adminRepository.deleteRole,

    getDepartments: adminRepository.getDepartments,
    createDepartment: (payload) => createAndFetch(adminRepository.createDepartment, 'departments', namedPayload(payload)),
    updateDepartment: async (id, payload) => {
        await adminRepository.updateDepartment(id, namedPayload(payload));
        return adminRepository.findById('departments', id);
    },
    deleteDepartment: adminRepository.deleteDepartment,

    getServiceCategories: adminRepository.getServiceCategories,
    createServiceCategory: (payload) => createAndFetch(adminRepository.createServiceCategory, 'service_categories', namedPayload(payload)),
    updateServiceCategory: async (id, payload) => {
        await adminRepository.updateServiceCategory(id, namedPayload(payload));
        return adminRepository.findById('service_categories', id);
    },
    deleteServiceCategory: adminRepository.deleteServiceCategory,

    getServices: adminRepository.getServices,
    createService: (payload) => createAndFetch(adminRepository.createService, 'services', servicePayload(payload)),
    updateService: async (id, payload) => {
        await adminRepository.updateService(id, servicePayload(payload));
        return adminRepository.findById('services', id);
    },
    deleteService: adminRepository.deleteService,

    getPriorities: adminRepository.getPriorities,
    createPriority: (payload) => createAndFetch(adminRepository.createPriority, 'priorities', priorityPayload(payload)),
    updatePriority: async (id, payload) => {
        await adminRepository.updatePriority(id, priorityPayload(payload));
        return adminRepository.findById('priorities', id);
    },
    deletePriority: adminRepository.deletePriority,

    getTicketStatuses: adminRepository.getTicketStatuses,
    createTicketStatus: (payload) => createAndFetch(adminRepository.createTicketStatus, 'ticket_statuses', ticketStatusPayload(payload)),
    updateTicketStatus: async (id, payload) => {
        await adminRepository.updateTicketStatus(id, ticketStatusPayload(payload));
        return adminRepository.findById('ticket_statuses', id);
    },
    deleteTicketStatus: adminRepository.deleteTicketStatus,

    getSlaPolicies: adminRepository.getSlaPolicies,
    createSlaPolicy: (payload) => createAndFetch(adminRepository.createSlaPolicy, 'sla_policies', slaPayload(payload)),
    updateSlaPolicy: async (id, payload) => {
        await adminRepository.updateSlaPolicy(id, slaPayload(payload));
        return adminRepository.findById('sla_policies', id);
    },
    deleteSlaPolicy: adminRepository.deleteSlaPolicy
};
