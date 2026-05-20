const db = require('../config/db');

const cleanData = (data) => Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
);

const insertRecord = async (table, data) => {
    const payload = cleanData(data);
    const columns = Object.keys(payload);
    const placeholders = columns.map(() => '?').join(', ');
    const result = await db.query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        Object.values(payload)
    );
    return result.insertId;
};

const updateRecord = async (table, id, data) => {
    const payload = cleanData(data);
    const columns = Object.keys(payload);

    if (columns.length === 0) {
        return { affectedRows: 0 };
    }

    const setClause = columns.map((column) => `${column} = ?`).join(', ');
    return db.query(
        `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        [...Object.values(payload), id]
    );
};

const deleteRecord = async (table, id) => db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);

const findById = async (table, id) => {
    const rows = await db.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
};

const findByCode = async (table, code) => {
    const rows = await db.query(`SELECT * FROM ${table} WHERE code = ? LIMIT 1`, [code]);
    return rows[0] || null;
};

const roomMatchesDepartmentCode = (roomExpression) => `
    assigned_department.code REGEXP '[0-9]'
    AND LOCATE(
        REPLACE(REPLACE(UPPER(TRIM(assigned_department.code)), ' ', ''), '-', ''),
        REPLACE(REPLACE(UPPER(TRIM(${roomExpression})), ' ', ''), '-', '')
    ) > 0
`;

const getUsers = async (filters = {}) => {
    const conditions = [];
    const params = [];

    if (filters.id) {
        conditions.push('u.id = ?');
        params.push(filters.id);
    }

    if (filters.roleCode) {
        conditions.push('r.code = ?');
        params.push(String(filters.roleCode).toUpperCase());
    }

    if (filters.status) {
        conditions.push('u.status = ?');
        params.push(String(filters.status).toUpperCase());
    }

    if (filters.keyword) {
        conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
        const keyword = `%${filters.keyword}%`;
        params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return db.query(`
        SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.status,
            u.role_id,
            r.code AS role_code,
            r.name AS role_name,
            u.department_id,
            d.name AS department_name,
            (
                SELECT GROUP_CONCAT(ud.department_id ORDER BY assigned_department.name)
                FROM user_departments ud
                INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
                WHERE ud.user_id = u.id
            ) AS assigned_department_ids,
            (
                SELECT GROUP_CONCAT(assigned_department.code ORDER BY assigned_department.name SEPARATOR ', ')
                FROM user_departments ud
                INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
                WHERE ud.user_id = u.id
            ) AS assigned_department_codes,
            (
                SELECT GROUP_CONCAT(assigned_department.name ORDER BY assigned_department.name SEPARATOR ', ')
                FROM user_departments ud
                INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
                WHERE ud.user_id = u.id
            ) AS assigned_department_names,
            u.last_login_at,
            u.created_at,
            u.updated_at
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        LEFT JOIN departments d ON d.id = u.department_id
        ${whereClause}
        ORDER BY u.created_at DESC
    `, params);
};

const getUserById = async (id) => {
    const rows = await getUsers({ id });
    return rows[0] || null;
};

const getSupportUsers = async (filters = {}) => {
    const conditions = ['r.code = ?', 'u.status = ?'];
    const params = ['SUPPORT', 'ACTIVE'];

    if (filters.room) {
        conditions.push(`EXISTS (
            SELECT 1
            FROM user_departments ud
            INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
            WHERE ud.user_id = u.id
              AND assigned_department.is_active = 1
              AND ${roomMatchesDepartmentCode('?')}
        )`);
        params.push(filters.room);
    }

    return db.query(`
        SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.status,
            u.role_id,
            r.code AS role_code,
            r.name AS role_name,
            u.department_id,
            d.name AS department_name,
            (
                SELECT GROUP_CONCAT(assigned_department.name ORDER BY assigned_department.name SEPARATOR ', ')
                FROM user_departments ud
                INNER JOIN departments assigned_department ON assigned_department.id = ud.department_id
                WHERE ud.user_id = u.id
            ) AS assigned_department_names,
            u.created_at,
            u.updated_at
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY u.full_name
    `, params);
};

const createUser = (data) => insertRecord('users', data);
const updateUser = (id, data) => updateRecord('users', id, data);
const deleteUser = (id) => deleteRecord('users', id);
const updateUserStatus = (id, status) => updateRecord('users', id, { status });
const resetUserPassword = (id, passwordHash) => updateRecord('users', id, { password_hash: passwordHash });
const changeUserRole = (id, roleId) => updateRecord('users', id, { role_id: roleId });

const getUserDeleteReferences = async (id) => {
    const rows = await db.query(`
        SELECT
            (SELECT COUNT(*) FROM tickets WHERE requester_id = ? OR assigned_to = ? OR assigned_by = ?) AS tickets,
            (SELECT COUNT(*) FROM ticket_comments WHERE user_id = ?) AS comments,
            (SELECT COUNT(*) FROM ticket_attachments WHERE uploaded_by = ?) AS attachments,
            (SELECT COUNT(*) FROM ticket_feedback WHERE user_id = ?) AS feedback,
            (SELECT COUNT(*) FROM ticket_history WHERE user_id = ?) AS history,
            (
                SELECT COUNT(*)
                FROM ticket_assignment_history
                WHERE from_support_id = ? OR to_support_id = ? OR assigned_by = ?
            ) AS assignments
    `, [id, id, id, id, id, id, id, id, id, id]);

    return rows[0] || {};
};

const setUserDepartments = async (userId, departmentIds = []) => db.transaction(async (connection) => {
    await connection.execute('DELETE FROM user_departments WHERE user_id = ?', [userId]);

    for (const departmentId of departmentIds) {
        await connection.execute(
            'INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)',
            [userId, departmentId]
        );
    }

    await connection.execute(
        'UPDATE users SET department_id = ? WHERE id = ?',
        [departmentIds[0] || null, userId]
    );
});

const getUserDepartmentIds = async (userId) => {
    const rows = await db.query('SELECT department_id FROM user_departments WHERE user_id = ? ORDER BY department_id', [userId]);
    return rows.map((row) => row.department_id);
};

const getRoles = () => db.query('SELECT * FROM roles ORDER BY id');
const createRole = (data) => insertRecord('roles', data);
const updateRole = (id, data) => updateRecord('roles', id, data);
const deleteRole = (id) => deleteRecord('roles', id);

const getDepartments = () => db.query('SELECT * FROM departments ORDER BY name');
const createDepartment = (data) => insertRecord('departments', data);
const updateDepartment = (id, data) => updateRecord('departments', id, data);
const deleteDepartment = (id) => updateRecord('departments', id, { is_active: 0 });

const getServiceCategories = () => db.query('SELECT * FROM service_categories ORDER BY name');
const createServiceCategory = (data) => insertRecord('service_categories', data);
const updateServiceCategory = (id, data) => updateRecord('service_categories', id, data);
const deleteServiceCategory = (id) => updateRecord('service_categories', id, { is_active: 0 });

const getServices = () => db.query(`
    SELECT
        s.*,
        c.code AS category_code,
        c.name AS category_name
    FROM services s
    INNER JOIN service_categories c ON c.id = s.category_id
    ORDER BY c.name, s.name
`);
const createService = (data) => insertRecord('services', data);
const updateService = (id, data) => updateRecord('services', id, data);
const deleteService = (id) => updateRecord('services', id, { is_active: 0 });

const getPriorities = () => db.query('SELECT * FROM priorities ORDER BY level ASC');
const createPriority = (data) => insertRecord('priorities', data);
const updatePriority = (id, data) => updateRecord('priorities', id, data);
const deletePriority = (id) => updateRecord('priorities', id, { is_active: 0 });

const getTicketStatuses = () => db.query('SELECT * FROM ticket_statuses ORDER BY sort_order ASC, id ASC');
const createTicketStatus = (data) => insertRecord('ticket_statuses', data);
const updateTicketStatus = (id, data) => updateRecord('ticket_statuses', id, data);
const deleteTicketStatus = (id) => deleteRecord('ticket_statuses', id);

const getSlaPolicies = () => db.query(`
    SELECT
        sp.*,
        s.code AS service_code,
        s.name AS service_name,
        p.code AS priority_code,
        p.name AS priority_name
    FROM sla_policies sp
    LEFT JOIN services s ON s.id = sp.service_id
    INNER JOIN priorities p ON p.id = sp.priority_id
    ORDER BY s.name IS NULL DESC, s.name, p.level
`);
const createSlaPolicy = (data) => insertRecord('sla_policies', data);
const updateSlaPolicy = (id, data) => updateRecord('sla_policies', id, data);
const deleteSlaPolicy = (id) => updateRecord('sla_policies', id, { is_active: 0 });

module.exports = {
    findById,
    findByCode,
    getUsers,
    getUserById,
    getSupportUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserDeleteReferences,
    updateUserStatus,
    resetUserPassword,
    changeUserRole,
    setUserDepartments,
    getUserDepartmentIds,
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
